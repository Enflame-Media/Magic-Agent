import { onShutdown } from "@/utils/shutdown";
import { Fastify } from "./types";
import { buildMachineActivityEphemeral, buildMachineStatusEphemeral, ClientConnection, eventRouter } from "@/app/events/eventRouter";
import { Server, Socket } from "socket.io";
import { log } from "@/utils/log";
import { auth } from "@/app/auth/auth";
import { db } from "@/storage/db";
import { decrementWebSocketConnection, incrementWebSocketConnection, websocketEventsCounter } from "../monitoring/metrics2";
import { usageHandler } from "./socket/usageHandler";
import { rpcHandler } from "./socket/rpcHandler";
import { pingHandler } from "./socket/pingHandler";
import { sessionUpdateHandler } from "./socket/sessionUpdateHandler";
import { machineUpdateHandler } from "./socket/machineUpdateHandler";
import { artifactUpdateHandler } from "./socket/artifactUpdateHandler";
import { accessKeyHandler } from "./socket/accessKeyHandler";
import { generateCorrelationId, isValidCorrelationId } from "@/utils/correlationId";
import { presenceTracker } from "@/app/social/presenceTracker";

export function startSocket(app: Fastify) {
    const io = new Server(app.server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "OPTIONS"],
            credentials: true,
            allowedHeaders: ["*"]
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 45000,
        pingInterval: 15000,
        path: '/v1/updates',
        allowUpgrades: true,
        upgradeTimeout: 10000,
        connectTimeout: 20000,
        serveClient: false // Don't serve the client files
    });

    let rpcListeners = new Map<string, Map<string, Socket>>();
    io.on("connection", async (socket) => {
        // Extract or generate correlation ID for this WebSocket connection
        const incomingCorrelationId = socket.handshake.auth.correlationId as string | undefined;
        const correlationId = (incomingCorrelationId && isValidCorrelationId(incomingCorrelationId))
            ? incomingCorrelationId
            : generateCorrelationId();

        log({ module: 'websocket', correlationId }, `New connection attempt from socket: ${socket.id}`);
        const token = socket.handshake.auth.token as string;
        const clientType = socket.handshake.auth.clientType as 'session-scoped' | 'user-scoped' | 'machine-scoped' | undefined;
        const sessionId = socket.handshake.auth.sessionId as string | undefined;
        const machineId = socket.handshake.auth.machineId as string | undefined;

        if (!token) {
            log({ module: 'websocket', correlationId }, `No token provided`);
            socket.emit('error', { message: 'Missing authentication token' });
            socket.disconnect();
            return;
        }

        // Validate session-scoped clients have sessionId
        if (clientType === 'session-scoped' && !sessionId) {
            log({ module: 'websocket', correlationId }, `Session-scoped client missing sessionId`);
            socket.emit('error', { message: 'Session ID required for session-scoped clients' });
            socket.disconnect();
            return;
        }

        // Validate machine-scoped clients have machineId
        if (clientType === 'machine-scoped' && !machineId) {
            log({ module: 'websocket', correlationId }, `Machine-scoped client missing machineId`);
            socket.emit('error', { message: 'Machine ID required for machine-scoped clients' });
            socket.disconnect();
            return;
        }

        const verified = await auth.verifyToken(token);
        if (!verified) {
            log({ module: 'websocket', correlationId }, `Invalid token provided`);
            socket.emit('error', { message: 'Invalid authentication token' });
            socket.disconnect();
            return;
        }

        const userId = verified.userId;
        log({ module: 'websocket', correlationId, userId, clientType: clientType || 'user-scoped', sessionId: sessionId || undefined, machineId: machineId || undefined }, `Token verified for socket ${socket.id}`);

        // Store connection based on type
        const metadata = { clientType: clientType || 'user-scoped', sessionId, machineId };
        let connection: ClientConnection;
        if (metadata.clientType === 'session-scoped' && sessionId) {
            connection = {
                connectionType: 'session-scoped',
                socket,
                userId,
                sessionId
            };
        } else if (metadata.clientType === 'machine-scoped' && machineId) {
            connection = {
                connectionType: 'machine-scoped',
                socket,
                userId,
                machineId
            };
        } else {
            connection = {
                connectionType: 'user-scoped',
                socket,
                userId
            };
        }
        eventRouter.addConnection(userId, connection);
        incrementWebSocketConnection(connection.connectionType);

        // HAP-778: Update machine online status in database and broadcast ephemeral event
        if (connection.connectionType === 'machine-scoped') {
            const now = new Date();
            // Update database to reflect machine is online
            void db.machine.updateMany({
                where: { id: machineId!, accountId: userId },
                data: { active: true, lastActiveAt: now }
            });
            // Broadcast machine-status (online/offline state for UI)
            const machineStatus = buildMachineStatusEphemeral(machineId!, true);
            eventRouter.emitEphemeral({
                userId,
                payload: machineStatus,
                recipientFilter: { type: 'user-scoped-only' }
            });
            // Also broadcast machine-activity (for activity tracking)
            const machineActivity = buildMachineActivityEphemeral(machineId!, true, now.getTime());
            eventRouter.emitEphemeral({
                userId,
                payload: machineActivity,
                recipientFilter: { type: 'user-scoped-only' }
            });
        }

        // Track user presence for friend status (user-scoped connections only)
        // User-scoped = mobile/web app clients that should show in friend lists
        if (connection.connectionType === 'user-scoped') {
            void presenceTracker.handleUserConnect(userId, socket.id);
        }

        socket.on('disconnect', () => {
            websocketEventsCounter.inc({ event_type: 'disconnect' });

            // Cleanup connections
            eventRouter.removeConnection(userId, connection);
            decrementWebSocketConnection(connection.connectionType);

            log({ module: 'websocket', correlationId, userId }, `User disconnected`);

            // HAP-778: Update machine offline status in database and broadcast ephemeral event
            if (connection.connectionType === 'machine-scoped') {
                const now = new Date();
                // Update database to reflect machine is offline
                void db.machine.updateMany({
                    where: { id: connection.machineId, accountId: userId },
                    data: { active: false, lastActiveAt: now }
                });
                // Broadcast machine-status (online/offline state for UI)
                const machineStatus = buildMachineStatusEphemeral(connection.machineId, false);
                eventRouter.emitEphemeral({
                    userId,
                    payload: machineStatus,
                    recipientFilter: { type: 'user-scoped-only' }
                });
                // Also broadcast machine-activity (for activity tracking)
                const machineActivity = buildMachineActivityEphemeral(connection.machineId, false, now.getTime());
                eventRouter.emitEphemeral({
                    userId,
                    payload: machineActivity,
                    recipientFilter: { type: 'user-scoped-only' }
                });
            }

            // Track user presence disconnect for friend status
            if (connection.connectionType === 'user-scoped') {
                void presenceTracker.handleUserDisconnect(userId, socket.id);
            }
        });

        // Handlers
        let userRpcListeners = rpcListeners.get(userId);
        if (!userRpcListeners) {
            userRpcListeners = new Map<string, Socket>();
            rpcListeners.set(userId, userRpcListeners);
        }
        rpcHandler(userId, socket, userRpcListeners);
        usageHandler(userId, socket);
        sessionUpdateHandler(userId, socket, connection);
        pingHandler(socket);
        machineUpdateHandler(userId, socket);
        artifactUpdateHandler(userId, socket);
        accessKeyHandler(userId, socket);

        // Ready
        log({ module: 'websocket', correlationId, userId }, `User connected`);
    });

    onShutdown('api', async () => {
        await io.close();
    });
}