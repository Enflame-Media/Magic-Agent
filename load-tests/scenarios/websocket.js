/**
 * WebSocket Load Test
 *
 * Tests WebSocket connections and messaging under load.
 * Note: k6 has limited WebSocket support, this tests the HTTP endpoints
 * and simulates WebSocket-style behavior.
 *
 * Run: k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/websocket.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, AUTH_TOKEN, scenarios, authHeaders, generateId } from '../k6-config.js';

export const options = {
    ...scenarios.average,
    thresholds: {
        http_req_duration: ['p(95)<300', 'p(99)<500'],
        http_req_failed: ['rate<0.05'],
    },
};

export default function () {
    const headers = authHeaders(AUTH_TOKEN);

    group('WebSocket Stats', () => {
        // Get connection statistics
        const statsRes = http.get(`${BASE_URL}/v1/websocket/stats`, {
            headers,
        });

        check(statsRes, {
            'stats - status is 200 or 401': (r) =>
                r.status === 200 || r.status === 401,
            'stats - has connection count': (r) => {
                if (r.status !== 200) return true;
                const body = JSON.parse(r.body);
                return typeof body.totalConnections === 'number';
            },
            'stats - has byType breakdown': (r) => {
                if (r.status !== 200) return true;
                const body = JSON.parse(r.body);
                return (
                    body.byType &&
                    typeof body.byType['user-scoped'] === 'number' &&
                    typeof body.byType['session-scoped'] === 'number' &&
                    typeof body.byType['machine-scoped'] === 'number'
                );
            },
        });
    });

    group('WebSocket Broadcast', () => {
        // Broadcast message to user connections
        const broadcastRes = http.post(
            `${BASE_URL}/v1/websocket/broadcast`,
            JSON.stringify({
                message: {
                    type: 'load-test',
                    payload: {
                        testId: generateId('broadcast'),
                        timestamp: Date.now(),
                    },
                    timestamp: Date.now(),
                },
            }),
            { headers }
        );

        check(broadcastRes, {
            'broadcast - status is 200 or 401': (r) =>
                r.status === 200 || r.status === 401,
            'broadcast - has success field': (r) => {
                if (r.status !== 200) return true;
                const body = JSON.parse(r.body);
                return typeof body.success === 'boolean';
            },
            'broadcast - has delivered count': (r) => {
                if (r.status !== 200) return true;
                const body = JSON.parse(r.body);
                return typeof body.delivered === 'number';
            },
        });

        // Broadcast with filter (user-scoped-only)
        const filteredRes = http.post(
            `${BASE_URL}/v1/websocket/broadcast`,
            JSON.stringify({
                message: {
                    type: 'filtered-test',
                    payload: { data: 'test' },
                    timestamp: Date.now(),
                },
                filter: {
                    type: 'user-scoped-only',
                },
            }),
            { headers }
        );

        check(filteredRes, {
            'filtered broadcast - success': (r) =>
                r.status === 200 || r.status === 401,
        });

        // Broadcast to specific session
        const sessionId = generateId('session');
        const sessionRes = http.post(
            `${BASE_URL}/v1/websocket/broadcast`,
            JSON.stringify({
                message: {
                    type: 'session-specific',
                    payload: { sessionId },
                    timestamp: Date.now(),
                },
                filter: {
                    type: 'session',
                    sessionId,
                },
            }),
            { headers }
        );

        check(sessionRes, {
            'session broadcast - success': (r) =>
                r.status === 200 || r.status === 401,
        });

        // Broadcast to specific machine
        const machineId = generateId('machine');
        const machineRes = http.post(
            `${BASE_URL}/v1/websocket/broadcast`,
            JSON.stringify({
                message: {
                    type: 'machine-specific',
                    payload: { machineId },
                    timestamp: Date.now(),
                },
                filter: {
                    type: 'machine',
                    machineId,
                },
            }),
            { headers }
        );

        check(machineRes, {
            'machine broadcast - success': (r) =>
                r.status === 200 || r.status === 401,
        });
    });

    group('WebSocket Upgrade Validation', () => {
        // Test upgrade endpoint without WebSocket headers (should fail)
        const upgradeRes = http.get(
            `${BASE_URL}/v1/updates?token=${AUTH_TOKEN}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        check(upgradeRes, {
            'upgrade without headers - rejected': (r) =>
                r.status === 400 || r.status === 426 || r.status === 500,
        });

        // Test without token (should fail)
        const noTokenRes = http.get(`${BASE_URL}/v1/updates`, {
            headers: {
                Upgrade: 'websocket',
                Connection: 'Upgrade',
            },
        });

        check(noTokenRes, {
            'upgrade without token - rejected': (r) =>
                r.status === 400 || r.status === 401,
        });
    });

    sleep(0.3); // 300ms between iterations
}
