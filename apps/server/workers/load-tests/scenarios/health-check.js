/**
 * Health Check Load Test
 *
 * Tests the /health and /ready endpoints under load.
 * These endpoints should be extremely fast (<50ms).
 *
 * Run: k6 run load-tests/scenarios/health-check.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, scenarios, jsonHeaders } from '../k6-config.js';

export const options = {
    ...scenarios.average,
    thresholds: {
        http_req_duration: ['p(95)<100', 'p(99)<200'], // Very fast
        http_req_failed: ['rate<0.001'], // Nearly zero errors
    },
};

export default function () {
    // Test /health endpoint
    const healthRes = http.get(`${BASE_URL}/health`, {
        headers: jsonHeaders(),
    });

    check(healthRes, {
        'health - status is 200': (r) => r.status === 200,
        'health - has status field': (r) => {
            const body = JSON.parse(r.body);
            return body.status === 'healthy';
        },
        'health - response time < 100ms': (r) => r.timings.duration < 100,
    });

    // Test /ready endpoint
    const readyRes = http.get(`${BASE_URL}/ready`, {
        headers: jsonHeaders(),
    });

    check(readyRes, {
        'ready - status is 200': (r) => r.status === 200,
        'ready - is ready': (r) => {
            const body = JSON.parse(r.body);
            return body.ready === true;
        },
        'ready - response time < 100ms': (r) => r.timings.duration < 100,
    });

    // Test root endpoint
    const rootRes = http.get(`${BASE_URL}/`, {
        headers: jsonHeaders(),
    });

    check(rootRes, {
        'root - status is 200': (r) => r.status === 200,
        'root - has welcome message': (r) => {
            const body = JSON.parse(r.body);
            return body.message && body.message.includes('Happy Server');
        },
    });

    sleep(0.1); // 100ms between iterations
}
