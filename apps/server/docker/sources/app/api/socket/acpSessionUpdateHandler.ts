import { Socket } from "socket.io";
import { buildAcpSessionUpdateEphemeral, buildAcpPermissionRequestEphemeral, ClientConnection, eventRouter } from "@/app/events/eventRouter";
import { activityCache } from "@/app/presence/sessionCache";
import { log } from "@/utils/log";
import { websocketEventsCounter } from "@/app/monitoring/metrics2";

/**
 * HAP-1036: Handler for ACP session update relay.
 *
 * Receives encrypted ACP session updates from CLI machines and relays them
 * to interested clients (mobile app, web) as ephemeral events. The server
 * never decrypts or parses the update content — zero-knowledge relay.
 *
 * ACP updates are high-frequency (streaming chunks arrive many times per second)
 * so they use the ephemeral event channel (no DB storage, no seq numbers).
 *
 * Event: 'acp-session-update'
 * Data: { sid: string, update: string }
 *   - sid: Session ID the update belongs to
 *   - update: Encrypted ACP session update (opaque blob)
 *
 * HAP-1043: Also handles ACP permission request/response relay.
 *
 * Event: 'acp-permission-request' (CLI -> mobile)
 * Data: { sid: string, requestId: string, payload: string, timeoutMs?: number }
 *   - Relayed as ephemeral to user-scoped connections (mobile/web)
 *
 * Event: 'acp-permission-response' (mobile -> CLI)
 * Data: { sid: string, requestId: string, payload: string }
 *   - Relayed directly to the machine-scoped connection that sent the request
 */
export function acpSessionUpdateHandler(userId: string, socket: Socket, connection: ClientConnection) {
    socket.on('acp-session-update', async (data: any) => {
        try {
            websocketEventsCounter.inc({ event_type: 'acp-session-update' });

            const { sid, update } = data;

            // Validate input
            if (!sid || typeof sid !== 'string' || !update || typeof update !== 'string') {
                return;
            }

            // Verify session belongs to user (cached lookup, no DB hit on every chunk)
            const isValid = await activityCache.isSessionValid(sid, userId);
            if (!isValid) {
                return;
            }

            // Build and relay as ephemeral event to user-scoped connections (mobile/web apps)
            // Skip the sender (CLI machine) — it already has the data
            const ephemeral = buildAcpSessionUpdateEphemeral(sid, update);
            eventRouter.emitEphemeral({
                userId,
                payload: ephemeral,
                recipientFilter: { type: 'all-interested-in-session', sessionId: sid },
                skipSenderConnection: connection
            });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in acp-session-update: ${error}`);
        }
    });

    // HAP-1043: Permission request relay (CLI machine -> mobile/web apps)
    socket.on('acp-permission-request', async (data: any) => {
        try {
            websocketEventsCounter.inc({ event_type: 'acp-permission-request' });

            const { sid, requestId, payload, timeoutMs } = data;

            if (!sid || typeof sid !== 'string' ||
                !requestId || typeof requestId !== 'string' ||
                !payload || typeof payload !== 'string') {
                return;
            }

            const isValid = await activityCache.isSessionValid(sid, userId);
            if (!isValid) {
                return;
            }

            // Relay to user-scoped connections (mobile/web apps), skip the CLI sender
            const ephemeral = buildAcpPermissionRequestEphemeral(sid, requestId, payload, timeoutMs);
            eventRouter.emitEphemeral({
                userId,
                payload: ephemeral,
                recipientFilter: { type: 'user-scoped-only' },
                skipSenderConnection: connection
            });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in acp-permission-request: ${error}`);
        }
    });

    // HAP-1043: Permission response relay (mobile/web app -> CLI machine)
    socket.on('acp-permission-response', async (data: any) => {
        try {
            websocketEventsCounter.inc({ event_type: 'acp-permission-response' });

            const { sid, requestId, payload } = data;

            if (!sid || typeof sid !== 'string' ||
                !requestId || typeof requestId !== 'string' ||
                !payload || typeof payload !== 'string') {
                return;
            }

            const isValid = await activityCache.isSessionValid(sid, userId);
            if (!isValid) {
                return;
            }

            // Relay to all machine-scoped connections for this user
            // The CLI machine that registered the permission request will receive it
            eventRouter.emitEphemeral({
                userId,
                payload: {
                    type: 'acp-permission-response',
                    sid,
                    requestId,
                    payload,
                },
                recipientFilter: { type: 'all-user-authenticated-connections' },
                skipSenderConnection: connection
            });
        } catch (error) {
            log({ module: 'websocket', level: 'error' }, `Error in acp-permission-response: ${error}`);
        }
    });
}
