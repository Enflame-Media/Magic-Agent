# WebSocket Capacity Planning Guide

> **HAP-894**: Extreme Load Test - 500+ Concurrent WebSocket Connections

This document provides guidance for capacity planning based on WebSocket load testing results against Cloudflare Durable Objects.

## Overview

The Happy platform uses Cloudflare Durable Objects (DOs) to manage WebSocket connections. Each user has a dedicated `ConnectionManager` DO that handles all their active connections.

### Architecture

```
User A ─┬─ Connection 1 (mobile)     ─┐
        ├─ Connection 2 (CLI)        ─┼─► ConnectionManager DO (User A)
        └─ Connection 3 (web)        ─┘

User B ─┬─ Connection 1 (mobile)     ─┐
        └─ Connection 2 (CLI)        ─┼─► ConnectionManager DO (User B)
                                     ─┘
```

## Load Test Modes

### Standard Tests (HAP-263)

| Mode | VUs | Duration | Purpose |
|------|-----|----------|---------|
| smoke | 10 | 30s | Basic functionality |
| scale | 120 | ~3min | 100+ concurrent connections |
| sustained | 100 | 7min | 5-minute stability test |
| stress | 200 | 4min | Push beyond normal limits |

### Extreme Tests (HAP-894)

| Mode | Peak VUs | Duration | Purpose |
|------|----------|----------|---------|
| extreme | 750 | 10min | Find DO limits with gradual ramp |
| spikeExtreme | 600 | 5min | Sudden burst to extreme levels |

## Running Extreme Tests

### Prerequisites

1. **k6 installed**: https://k6.io/docs/getting-started/installation/
2. **Valid auth token**: Obtain from your staging environment
3. **Staging environment**: Never run extreme tests against production

### Commands

```bash
# Navigate to load tests directory
cd apps/server/workers/load-tests

# Run extreme load test (against dev/staging environment)
k6 run --env AUTH_TOKEN=your-token \
       --env BASE_URL=https://happy-api-dev.enflamemedia.com \
       --env TEST_MODE=extreme \
       scenarios/websocket-performance.js

# Run spike extreme test (against dev/staging environment)
k6 run --env AUTH_TOKEN=your-token \
       --env BASE_URL=https://happy-api-dev.enflamemedia.com \
       --env TEST_MODE=spikeExtreme \
       scenarios/websocket-performance.js
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_TOKEN` | Yes | Valid authentication token |
| `BASE_URL` | No | Server URL (default: http://localhost:8787) |
| `TEST_MODE` | No | Test mode: smoke, scale, sustained, stress, extreme, spikeExtreme |

## Metrics Collected

### Connection Metrics

| Metric | Description | Target (Standard) | Target (Extreme) |
|--------|-------------|-------------------|------------------|
| `ws_connection_time` | Time to establish WebSocket | p95 < 2s | p95 < 5s |
| `ws_connection_errors` | Total connection failures | < 10 | < 100 |
| `ws_connection_success` | Successful connections | All attempted | 80%+ |

### Durable Object Metrics (HAP-894)

| Metric | Description | Purpose |
|--------|-------------|---------|
| `do_connections_total` | Total connections managed by DO | Peak capacity tracking |
| `do_connections_rejected` | Connections rejected by DO | Capacity limit detection |
| `do_connection_rejection_rate` | % of connections rejected | Degradation threshold |
| `do_response_time` | DO stats endpoint response time | Performance under load |
| `do_memory_usage_bytes` | DO memory consumption | Memory limit detection |
| `do_oldest_connection_ms` | Age of oldest active connection | Hibernation behavior |

### Message Metrics

| Metric | Description | Target (Standard) | Target (Extreme) |
|--------|-------------|-------------------|------------------|
| `ws_message_latency` | Round-trip ping latency | p95 < 100ms | p95 < 500ms |
| `ws_broadcast_delivery_time` | Broadcast message delivery | p95 < 500ms | p95 < 2s |

## Known Limits

### Cloudflare Durable Object Limits

| Resource | Limit | Source |
|----------|-------|--------|
| Memory | 128 MB | [CF Docs](https://developers.cloudflare.com/durable-objects/platform/limits/) |
| WebSocket connections | Unlimited* | No hard limit, but memory-constrained |
| CPU time per request | 30s (soft), 1min (hard) | Worker limits apply |
| Subrequests | 1000/request | Standard Workers limit |

*Practical limit is ~500-1000 connections depending on message size and frequency.

### Hibernation Behavior

Durable Objects with WebSocket hibernation can maintain connections even when evicted from memory:
- Connections remain open during hibernation
- DO wakes on message receipt
- `serializeAttachment`/`deserializeAttachment` restore connection metadata

## Capacity Planning Recommendations

### Per-User Connection Limits

Based on load testing results, recommended limits:

| Scenario | Recommended Limit | Rationale |
|----------|-------------------|-----------|
| Standard user | 50 connections | Safe margin for typical usage |
| Power user | 200 connections | Tested stable limit |
| Enterprise | 500 connections | Requires monitoring |

### Horizontal Scaling Strategies

If a user exceeds recommended limits:

1. **Multiple DOs per user**: Shard connections across multiple DOs
   - Example: `ConnectionManager-{userId}-{shard}`
   - Load balance by connection ID hash

2. **Session-based sharding**: Separate DO per active session
   - Better isolation
   - More complex routing

3. **Time-based rotation**: New DO for long-running connections
   - Prevents memory accumulation
   - Requires reconnection handling

### SLO Recommendations

| Tier | Connection Limit | Latency SLO | Availability SLO |
|------|------------------|-------------|------------------|
| Free | 20 | p95 < 500ms | 99.5% |
| Pro | 100 | p95 < 200ms | 99.9% |
| Enterprise | 500 | p95 < 100ms | 99.95% |

## Monitoring in Production

### Key Metrics to Alert On

```javascript
// Example alerting thresholds
alerts = {
    // Connection health
    'connection_rejection_rate > 5%': 'warning',
    'connection_rejection_rate > 20%': 'critical',

    // Performance degradation
    'ws_message_latency_p95 > 500ms': 'warning',
    'ws_message_latency_p95 > 2000ms': 'critical',

    // DO health
    'do_response_time_p95 > 1000ms': 'warning',
    'do_connections_total > 400': 'warning',
}
```

### Grafana Dashboard Queries

```promql
# Connection count per DO
sum(do_connections_total) by (user_id)

# Rejection rate over time
rate(do_connections_rejected[5m]) / rate(ws_connection_success[5m])

# p95 latency trend
histogram_quantile(0.95, sum(rate(ws_message_latency_bucket[5m])) by (le))
```

## Test Results Template

After running extreme tests, document findings:

```markdown
## Test Run: [DATE]

### Environment
- Target: [staging/production]
- Test Mode: [extreme/spikeExtreme]
- Duration: [X minutes]

### Results
- Peak Connections: [N]
- Rejection Rate: [X%]
- p95 Latency: [Xms]
- DO Response Time (p95): [Xms]

### Degradation Points
- At [N] connections: [observation]
- At [N] connections: [observation]

### Recommendations
- [ ] Adjust connection limit to [N]
- [ ] Implement [strategy] for users exceeding [N] connections
```

---

## HAP-900 Test Execution Log

> **Status**: Awaiting execution
> **Tracking Issue**: [HAP-900](https://linear.app/enflame-media/issue/HAP-900)

### Prerequisites Verified

- [x] k6 installed and available
- [x] Staging environment accessible (`https://happy-api-dev.enflamemedia.com`)
- [x] Health check passing
- [ ] Valid AUTH_TOKEN obtained (requires manual authentication)

### How to Obtain AUTH_TOKEN

The load tests require a valid authentication token. To obtain one:

1. **Via CLI pairing**:
   ```bash
   cd apps/cli
   yarn dev  # Start the CLI, scan QR code with mobile app
   # Token is stored in ~/.happy/
   ```

2. **Via direct API** (if you have a keypair):
   ```bash
   curl -X POST https://happy-api-dev.enflamemedia.com/v1/auth \
     -H 'Content-Type: application/json' \
     -d '{"publicKey":"<base64-ed25519-pk>", "challenge":"<base64>", "signature":"<base64>"}'
   ```

3. **From existing mobile session**:
   - Check browser dev tools for `Authorization` header in network requests
   - Token format: `Bearer <jwt-token>`

### Execution Commands

Once AUTH_TOKEN is obtained, run:

```bash
cd /volume1/Projects/happy/apps/server/workers

# 1. Extreme Load Test (~10 minutes)
k6 run --env AUTH_TOKEN=<your-token> \
       --env BASE_URL=https://happy-api-dev.enflamemedia.com \
       --env TEST_MODE=extreme \
       load-tests/scenarios/websocket-performance.js

# 2. Spike Extreme Test (~5 minutes)
k6 run --env AUTH_TOKEN=<your-token> \
       --env BASE_URL=https://happy-api-dev.enflamemedia.com \
       --env TEST_MODE=spikeExtreme \
       load-tests/scenarios/websocket-performance.js
```

### During Test Execution

Monitor the following in the Cloudflare dashboard:
- **Workers > Durable Objects > ConnectionManager**: Watch connection counts
- **Workers > Analytics**: Observe request patterns and errors
- **Workers > Logs**: Check for any DO evictions or errors

### Test Run Results

<!-- Update this section with actual results after test execution -->

*Pending execution - results will be added here.*

---

## References

- [HAP-894](https://linear.app/enflame-media/issue/HAP-894) - Extreme Load Test issue
- [HAP-263](https://linear.app/enflame-media/issue/HAP-263) - WebSocket Performance Test
- [HAP-17](https://linear.app/enflame-media/issue/HAP-17) - WebSocket Implementation
- [Cloudflare Durable Objects Limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [WebSocket Hibernation API](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
