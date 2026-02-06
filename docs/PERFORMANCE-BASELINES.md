# WebSocket Performance Baselines

This document defines the performance baselines and regression thresholds for the Happy Server WebSocket infrastructure, based on load testing implemented in HAP-263.

## Test Environment

| Parameter | Value |
|-----------|-------|
| Load Test Framework | k6 |
| Test Script | `apps/server/workers/load-tests/scenarios/websocket-performance.js` |
| HAP Reference | HAP-263, HAP-17, HAP-19 |
| Infrastructure | Cloudflare Workers + Durable Objects |
| WebSocket API | Hibernation API for cost optimization |

## Test Modes

The WebSocket performance tests support multiple modes for different validation scenarios:

| Mode | Duration | Peak VUs | Use Case |
|------|----------|----------|----------|
| `smoke` | 30s | 10 | Quick functionality verification |
| `scale` | ~3 min | 120 | Validate 100+ concurrent connections |
| `sustained` | ~7 min | 100 | 5+ minute stability testing |
| `stress` | ~4 min | 200 | Push system limits |

## Defined Thresholds (HAP-263)

The following thresholds are defined in the k6 test script and represent the performance requirements:

### Connection Metrics

| Metric | p95 Threshold | p99 Threshold | Description |
|--------|---------------|---------------|-------------|
| `ws_connection_time` | < 2000ms | < 5000ms | Time to establish WebSocket connection |
| `ws_connection_errors` | < 10 total | - | Total connection failures allowed |

### Message Metrics

| Metric | p95 Threshold | p99 Threshold | Description |
|--------|---------------|---------------|-------------|
| `ws_message_latency` | < 100ms | < 200ms | Round-trip message latency |

### Broadcast Metrics

| Metric | p95 Threshold | p99 Threshold | Description |
|--------|---------------|---------------|-------------|
| `ws_broadcast_delivery_time` | < 500ms | < 1000ms | Time for broadcast to reach clients |
| `ws_broadcast_success` | > 95% | - | Percentage of broadcasts under 500ms |

### HTTP Endpoint Metrics

| Metric | p95 Threshold | p99 Threshold | Description |
|--------|---------------|---------------|-------------|
| `http_req_duration` | < 300ms | < 500ms | Stats/broadcast endpoint response time |
| `http_req_failed` | < 5% | - | HTTP request error rate |

## Production Baseline Template

Once tests are executed against production, fill in the actual measured values:

### Scale Test Results (100+ connections)

| Metric | p50 | p95 | p99 | Status |
|--------|-----|-----|-----|--------|
| Connection Time | Xms | Xms | Xms | - |
| Message Latency | Xms | Xms | Xms | - |
| Broadcast Delivery | Xms | Xms | Xms | - |

### Sustained Test Results (5 minutes)

| Metric | p50 | p95 | p99 | Status |
|--------|-----|-----|-----|--------|
| Connection Time | Xms | Xms | Xms | - |
| Message Latency | Xms | Xms | Xms | - |
| Broadcast Delivery | Xms | Xms | Xms | - |

## Regression Thresholds

Regression thresholds should be set at **baseline + 20% buffer** to allow for normal variance while catching significant performance degradations.

### Formula

```
Regression Threshold = Measured Baseline * 1.2
```

### Example Calculation

If production baseline shows:
- Connection time p95: 800ms
- Regression threshold: 800ms * 1.2 = 960ms

## Running the Tests

### Prerequisites

1. Install k6: `brew install k6` (macOS) or see [k6 installation](https://k6.io/docs/get-started/installation/)
2. Obtain authentication token for target environment
3. Ensure target environment is accessible

### Execute Scale Test

```bash
cd apps/server/workers

# Against staging
k6 run --env AUTH_TOKEN=xxx \
       --env BASE_URL=https://api.staging.happy.enflamemedia.com \
       --env TEST_MODE=scale \
       --out json=load-tests/results/scale-baseline.json \
       load-tests/scenarios/websocket-performance.js

# Against production
k6 run --env AUTH_TOKEN=xxx \
       --env BASE_URL=https://api.happy.enflamemedia.com \
       --env TEST_MODE=scale \
       --out json=load-tests/results/scale-baseline.json \
       load-tests/scenarios/websocket-performance.js
```

### Execute Sustained Test

```bash
cd apps/server/workers

k6 run --env AUTH_TOKEN=xxx \
       --env BASE_URL=https://api.happy.enflamemedia.com \
       --env TEST_MODE=sustained \
       --out json=load-tests/results/sustained-baseline.json \
       load-tests/scenarios/websocket-performance.js
```

### Execute Smoke Test (Quick Validation)

```bash
cd apps/server/workers

k6 run --env AUTH_TOKEN=xxx \
       --env BASE_URL=https://api.happy.enflamemedia.com \
       load-tests/scenarios/websocket-performance.js
```

## Custom Metrics Reference

The test script tracks the following custom k6 metrics:

### Connection Metrics
- `ws_connection_time` (Trend) - Time to establish WebSocket connection
- `ws_connections_active` (Gauge) - Currently active connections
- `ws_connection_errors` (Counter) - Connection failures
- `ws_connection_success` (Counter) - Successful connections

### Message Metrics
- `ws_messages_received` (Counter) - Total messages received
- `ws_messages_sent` (Counter) - Total messages sent
- `ws_message_latency` (Trend) - Round-trip message latency

### Broadcast Metrics
- `ws_broadcast_delivery_time` (Trend) - Broadcast delivery latency
- `ws_broadcast_success` (Rate) - Broadcast success rate

### Reconnection Metrics
- `ws_reconnections` (Counter) - Total reconnection events
- `ws_reconnection_time` (Trend) - Time to reconnect after disconnect

## HAP-263 Success Criteria

The following criteria must pass for WebSocket infrastructure validation:

1. **100 concurrent connections** - Successfully establish 100+ WebSocket connections
2. **Broadcast under 500ms** - p95 broadcast delivery time < 500ms
3. **Connection success > 95%** - Less than 5% connection failure rate
4. **Filtered broadcasts route correctly** - User-scoped, session-scoped, and machine-scoped filters work as expected
5. **No connection drops under sustained load** - Stability over 5+ minute period
6. **Memory usage remains stable** - No memory leaks during sustained testing

## Test Coverage

The WebSocket performance test validates:

1. **Scale Test**: 100+ concurrent WebSocket connections distributed across client types:
   - 70% user-scoped (mobile app)
   - 15% session-scoped (session viewer)
   - 15% machine-scoped (CLI daemon)

2. **Broadcast Test**: Measures broadcast delivery time via HTTP endpoint

3. **Filter Test**: Tests filtered broadcasts:
   - User-scoped-only filter
   - Session-specific filter
   - Machine-specific filter

4. **Sustained Load**: Maintains 100 connections for 5+ minutes with periodic ping/pong

5. **Reconnection Test**: 10% of connections simulate disconnects and measure reconnection time

## Interpreting Results

### Passing Results

```
=== HAP-263 Acceptance Criteria ===
✓ 100 concurrent connections
✓ Broadcast < 500ms
✓ Connection success > 95%
```

### Failing Results

If thresholds are exceeded:
1. Check server logs for errors
2. Review Durable Object metrics in Cloudflare dashboard
3. Analyze connection patterns and bottlenecks
4. Consider scaling or optimization

## Historical Results

Record test results over time to track performance trends:

| Date | Environment | Mode | Connections | p95 Conn Time | p95 Broadcast | Pass/Fail |
|------|-------------|------|-------------|---------------|---------------|-----------|
| YYYY-MM-DD | prod | scale | X | Xms | Xms | - |

## Related Documentation

- [HAP-263](https://linear.app/enflame-media/issue/HAP-263) - WebSocket Performance Test Implementation
- [HAP-17](https://linear.app/enflame-media/issue/HAP-17) - Event Broadcasting Infrastructure
- [HAP-19](https://linear.app/enflame-media/issue/HAP-19) - Integration & Load Testing
- [apps/server/workers/CLAUDE.md](../apps/server/workers/CLAUDE.md) - Workers documentation (WebSocket & Durable Objects section)
- [apps/server/workers/load-tests/](../apps/server/workers/load-tests/) - Load test scripts

## Automation Integration

For CI/CD integration, the test can be run with threshold enforcement:

```bash
# Fail the pipeline if thresholds are exceeded
k6 run --env AUTH_TOKEN=$AUTH_TOKEN \
       --env BASE_URL=$API_URL \
       --env TEST_MODE=smoke \
       load-tests/scenarios/websocket-performance.js || exit 1
```

Results are automatically written to `load-tests/results/websocket-performance.json` for further analysis.
