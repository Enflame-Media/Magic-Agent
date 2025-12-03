/**
 * k6 Load Testing Configuration
 *
 * This file contains shared configuration and helper functions
 * for load testing the Happy Server Workers API.
 *
 * Usage:
 *   k6 run load-tests/scenarios/health-check.js
 *   k6 run --env BASE_URL=https://api.staging.example.com load-tests/scenarios/sessions.js
 *
 * @see https://k6.io/docs/
 */

// Default configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8787';
export const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-auth-token';

/**
 * Standard load test options for different scenarios
 */
export const scenarios = {
    // Quick smoke test
    smoke: {
        vus: 1,
        duration: '30s',
    },

    // Average load test (100 concurrent users)
    average: {
        stages: [
            { duration: '30s', target: 20 },   // Ramp up
            { duration: '1m', target: 100 },   // Stay at 100 users
            { duration: '30s', target: 0 },    // Ramp down
        ],
    },

    // Stress test (200+ concurrent users)
    stress: {
        stages: [
            { duration: '1m', target: 50 },
            { duration: '2m', target: 100 },
            { duration: '2m', target: 200 },
            { duration: '1m', target: 0 },
        ],
    },

    // Spike test (sudden traffic spike)
    spike: {
        stages: [
            { duration: '10s', target: 10 },
            { duration: '10s', target: 200 },  // Spike!
            { duration: '30s', target: 200 },
            { duration: '10s', target: 10 },
        ],
    },

    // Endurance test (sustained load for 10 minutes)
    endurance: {
        stages: [
            { duration: '1m', target: 50 },
            { duration: '10m', target: 50 },
            { duration: '1m', target: 0 },
        ],
    },
};

/**
 * Standard thresholds for performance validation
 */
export const thresholds = {
    // Response time thresholds
    http_req_duration: [
        'p(95)<500',  // 95% of requests should be below 500ms
        'p(99)<1000', // 99% of requests should be below 1000ms
    ],

    // Error rate threshold
    http_req_failed: ['rate<0.01'], // Less than 1% error rate

    // Throughput thresholds
    http_reqs: ['rate>100'], // At least 100 requests per second
};

/**
 * Helper to create authenticated request headers
 */
export function authHeaders(token = AUTH_TOKEN) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
}

/**
 * Helper to create unauthenticated request headers
 */
export function jsonHeaders() {
    return {
        'Content-Type': 'application/json',
    };
}

/**
 * Generate a unique ID for test data
 */
export function generateId(prefix = 'test') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Standard check assertions
 */
export function standardChecks(response, name) {
    return {
        [`${name} - status is 200`]: response.status === 200,
        [`${name} - response time OK`]: response.timings.duration < 500,
    };
}
