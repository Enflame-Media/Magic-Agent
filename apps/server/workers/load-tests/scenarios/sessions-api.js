/**
 * Sessions API Load Test
 *
 * Tests session CRUD operations under load.
 * Simulates realistic user behavior with session management.
 *
 * Run: k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/sessions-api.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, AUTH_TOKEN, scenarios, authHeaders, generateId } from '../k6-config.js';

export const options = {
    ...scenarios.average,
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.05'], // Allow 5% errors during load
        'http_req_duration{endpoint:sessions_list}': ['p(95)<300'],
        'http_req_duration{endpoint:sessions_create}': ['p(95)<500'],
    },
};

export default function () {
    const headers = authHeaders(AUTH_TOKEN);

    group('Session List', () => {
        // List sessions (legacy endpoint)
        const listRes = http.get(`${BASE_URL}/v1/sessions`, {
            headers,
            tags: { endpoint: 'sessions_list' },
        });

        check(listRes, {
            'list sessions - status is 200 or 401': (r) =>
                r.status === 200 || r.status === 401,
            'list sessions - has sessions array': (r) => {
                if (r.status !== 200) return true;
                const body = JSON.parse(r.body);
                return Array.isArray(body.sessions);
            },
        });

        // List sessions (paginated endpoint)
        const paginatedRes = http.get(`${BASE_URL}/v2/sessions?limit=50`, {
            headers,
            tags: { endpoint: 'sessions_paginated' },
        });

        check(paginatedRes, {
            'paginated sessions - status is 200 or 401': (r) =>
                r.status === 200 || r.status === 401,
        });
    });

    group('Session CRUD', () => {
        const sessionTag = generateId('loadtest-session');

        // Create session
        const createRes = http.post(
            `${BASE_URL}/v1/sessions`,
            JSON.stringify({
                tag: sessionTag,
                metadata: JSON.stringify({
                    name: 'Load Test Session',
                    timestamp: Date.now(),
                }),
            }),
            {
                headers,
                tags: { endpoint: 'sessions_create' },
            }
        );

        /** @type {string | null} */
        let sessionId = null;

        check(createRes, {
            'create session - status is 200/201 or 401/500': (r) =>
                [200, 201, 401, 500].includes(r.status),
            'create session - has session id': (r) => {
                if (r.status !== 200 && r.status !== 201) return true;
                const body = JSON.parse(r.body);
                sessionId = body.session?.id;
                return !!sessionId;
            },
        });

        if (sessionId) {
            // Get session
            const getRes = http.get(`${BASE_URL}/v1/sessions/${sessionId}`, {
                headers,
                tags: { endpoint: 'sessions_get' },
            });

            check(getRes, {
                'get session - status is 200': (r) => r.status === 200,
            });

            // Create message
            const messageRes = http.post(
                `${BASE_URL}/v1/sessions/${sessionId}/messages`,
                JSON.stringify({
                    localId: generateId('msg'),
                    content: { type: 'user', text: 'Load test message' },
                }),
                {
                    headers,
                    tags: { endpoint: 'sessions_message' },
                }
            );

            check(messageRes, {
                'create message - status is 200/201 or 404/500': (r) =>
                    [200, 201, 404, 500].includes(r.status),
            });

            // Delete session (cleanup)
            const deleteRes = http.del(`${BASE_URL}/v1/sessions/${sessionId}`, null, {
                headers,
                tags: { endpoint: 'sessions_delete' },
            });

            check(deleteRes, {
                'delete session - status is 200 or 404/500': (r) =>
                    [200, 404, 500].includes(r.status),
            });
        }
    });

    group('Active Sessions', () => {
        const activeRes = http.get(`${BASE_URL}/v2/sessions/active?limit=50`, {
            headers,
            tags: { endpoint: 'sessions_active' },
        });

        check(activeRes, {
            'active sessions - status is 200 or 401': (r) =>
                r.status === 200 || r.status === 401,
        });
    });

    sleep(0.5); // 500ms between iterations
}
