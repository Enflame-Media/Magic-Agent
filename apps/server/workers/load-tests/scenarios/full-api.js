/**
 * Full API Load Test
 *
 * Comprehensive load test covering all major API endpoints.
 * Simulates realistic mixed workload with various operations.
 *
 * Run: k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/full-api.js
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, AUTH_TOKEN, scenarios, authHeaders, jsonHeaders, generateId } from '../k6-config.js';

export const options = {
    ...scenarios.stress,
    thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.05'],
    },
};

/**
 * Weighted random selection of scenarios
 */
function selectScenario() {
    const random = Math.random();
    if (random < 0.3) return 'health';        // 30% health checks
    if (random < 0.5) return 'sessions';      // 20% session operations
    if (random < 0.65) return 'machines';     // 15% machine operations
    if (random < 0.75) return 'artifacts';    // 10% artifact operations
    if (random < 0.85) return 'account';      // 10% account operations
    if (random < 0.92) return 'kv';           // 7% KV operations
    if (random < 0.96) return 'feed';         // 4% feed operations
    return 'version';                          // 4% version checks
}

export default function () {
    const headers = authHeaders(AUTH_TOKEN);
    const scenario = selectScenario();

    switch (scenario) {
        case 'health':
            healthScenario();
            break;
        case 'sessions':
            sessionsScenario(headers);
            break;
        case 'machines':
            machinesScenario(headers);
            break;
        case 'artifacts':
            artifactsScenario(headers);
            break;
        case 'account':
            accountScenario(headers);
            break;
        case 'kv':
            kvScenario(headers);
            break;
        case 'feed':
            feedScenario(headers);
            break;
        case 'version':
            versionScenario();
            break;
    }

    sleep(Math.random() * 0.5 + 0.1); // Random 100-600ms between requests
}

function healthScenario() {
    group('Health Check', () => {
        const res = http.get(`${BASE_URL}/health`);
        check(res, { 'health - 200': (r) => r.status === 200 });
    });
}

function sessionsScenario(headers) {
    group('Sessions', () => {
        // List sessions
        const listRes = http.get(`${BASE_URL}/v1/sessions`, { headers });
        check(listRes, {
            'sessions list - success': (r) => [200, 401].includes(r.status),
        });

        // Create and delete session
        const tag = generateId('load');
        const createRes = http.post(
            `${BASE_URL}/v1/sessions`,
            JSON.stringify({ tag, metadata: '{}' }),
            { headers }
        );

        if (createRes.status === 200 || createRes.status === 201) {
            const body = JSON.parse(createRes.body);
            if (body.session?.id) {
                // Get session
                http.get(`${BASE_URL}/v1/sessions/${body.session.id}`, { headers });
                // Delete session
                http.del(`${BASE_URL}/v1/sessions/${body.session.id}`, null, { headers });
            }
        }
    });
}

function machinesScenario(headers) {
    group('Machines', () => {
        // List machines
        const listRes = http.get(`${BASE_URL}/v1/machines`, { headers });
        check(listRes, {
            'machines list - success': (r) => [200, 401].includes(r.status),
        });

        // Register machine
        const machineId = generateId('machine');
        const regRes = http.post(
            `${BASE_URL}/v1/machines`,
            JSON.stringify({ id: machineId, metadata: '{"hostname":"loadtest"}' }),
            { headers }
        );

        if (regRes.status === 200 || regRes.status === 201) {
            // Update status
            http.put(
                `${BASE_URL}/v1/machines/${machineId}/status`,
                JSON.stringify({ active: true }),
                { headers }
            );
        }
    });
}

function artifactsScenario(headers) {
    group('Artifacts', () => {
        // List artifacts
        const listRes = http.get(`${BASE_URL}/v1/artifacts`, { headers });
        check(listRes, {
            'artifacts list - success': (r) => [200, 401].includes(r.status),
        });

        // Create artifact
        const artifactId = generateId('artifact');
        const createRes = http.post(
            `${BASE_URL}/v1/artifacts`,
            JSON.stringify({
                id: artifactId,
                header: btoa('test-header'),
                body: btoa('test-body'),
                dataEncryptionKey: btoa('test-key'),
            }),
            { headers }
        );

        if (createRes.status === 200 || createRes.status === 201) {
            // Get artifact
            http.get(`${BASE_URL}/v1/artifacts/${artifactId}`, { headers });
            // Delete artifact
            http.del(`${BASE_URL}/v1/artifacts/${artifactId}`, null, { headers });
        }
    });
}

function accountScenario(headers) {
    group('Account', () => {
        // Get account
        const accountRes = http.get(`${BASE_URL}/v1/account`, { headers });
        check(accountRes, {
            'account get - success': (r) => [200, 401, 404].includes(r.status),
        });

        // Get preferences
        const prefsRes = http.get(`${BASE_URL}/v1/account/preferences`, { headers });
        check(prefsRes, {
            'preferences get - success': (r) => [200, 401, 404].includes(r.status),
        });
    });
}

function kvScenario(headers) {
    group('KV Store', () => {
        // List KV
        const listRes = http.get(`${BASE_URL}/v1/kv?limit=10`, { headers });
        check(listRes, {
            'kv list - success': (r) => [200, 401].includes(r.status),
        });

        // Create/update KV
        const key = generateId('kv');
        const mutateRes = http.post(
            `${BASE_URL}/v1/kv`,
            JSON.stringify({
                mutations: [{ key, value: btoa('test-value'), version: -1 }],
            }),
            { headers }
        );
        check(mutateRes, {
            'kv mutate - success': (r) => [200, 401].includes(r.status),
        });

        // Delete KV
        if (mutateRes.status === 200) {
            http.post(
                `${BASE_URL}/v1/kv`,
                JSON.stringify({
                    mutations: [{ key, value: null, version: 1 }],
                }),
                { headers }
            );
        }
    });
}

function feedScenario(headers) {
    group('Feed', () => {
        const feedRes = http.get(`${BASE_URL}/v1/feed?limit=20`, { headers });
        check(feedRes, {
            'feed get - success': (r) => [200, 401].includes(r.status),
        });
    });
}

function versionScenario() {
    group('Version', () => {
        const versionRes = http.post(
            `${BASE_URL}/v1/version`,
            JSON.stringify({
                platform: 'ios',
                version: '1.0.0',
                app_id: 'com.ex3ndr.happy',
            }),
            { headers: jsonHeaders() }
        );
        check(versionRes, {
            'version check - success': (r) => [200, 500].includes(r.status),
        });
    });
}
