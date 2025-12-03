# Load Testing for Happy Server Workers

This directory contains k6 load testing scripts for validating the Happy Server Workers API under load.

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Docker
docker pull grafana/k6
```

## Test Scenarios

### 1. Health Check (`health-check.js`)
Quick smoke test for health endpoints. Very fast response time expectations.

```bash
k6 run load-tests/scenarios/health-check.js
```

### 2. Sessions API (`sessions-api.js`)
Tests session CRUD operations including listing, creation, messages, and deletion.

```bash
k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/sessions-api.js
```

### 3. WebSocket (`websocket.js`)
Tests WebSocket-related HTTP endpoints (stats, broadcast). Note: k6 has limited native WebSocket support.

```bash
k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/websocket.js
```

### 4. Full API (`full-api.js`)
Comprehensive mixed workload test covering all major API endpoints with weighted distribution.

```bash
k6 run --env AUTH_TOKEN=your-token load-tests/scenarios/full-api.js
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | API server URL | `http://localhost:8787` |
| `AUTH_TOKEN` | Authentication token | `test-auth-token` |

### Test Profiles

The `k6-config.js` file defines standard test profiles:

| Profile | Description | Duration |
|---------|-------------|----------|
| `smoke` | Quick validation | 30s with 1 VU |
| `average` | Normal load (100 users) | ~2 min ramp |
| `stress` | High load (200+ users) | ~6 min |
| `spike` | Sudden traffic spike | ~1 min |
| `endurance` | Sustained load | ~12 min |

## Running Tests

### Local Development

```bash
# Start the dev server
cd happy-server-workers
yarn dev

# Run smoke test
k6 run load-tests/scenarios/health-check.js

# Run with custom URL
k6 run --env BASE_URL=http://localhost:8787 load-tests/scenarios/full-api.js
```

### Against Staging

```bash
# Get auth token from staging
AUTH_TOKEN=$(curl -s -X POST https://staging.example.com/v1/auth \
  -H 'Content-Type: application/json' \
  -d '{"publicKey":"...", "challenge":"...", "signature":"..."}' \
  | jq -r '.token')

# Run full API test
k6 run \
  --env BASE_URL=https://staging.example.com \
  --env AUTH_TOKEN=$AUTH_TOKEN \
  load-tests/scenarios/full-api.js
```

### With Custom VUs and Duration

```bash
# Quick test with 10 VUs for 1 minute
k6 run --vus 10 --duration 1m load-tests/scenarios/sessions-api.js

# Stress test with 200 VUs
k6 run --vus 200 --duration 5m --env AUTH_TOKEN=your-token load-tests/scenarios/full-api.js
```

### Output to JSON

```bash
k6 run --out json=results.json load-tests/scenarios/health-check.js
```

## Performance Baselines

### Acceptance Criteria (HAP-19)

| Metric | Target |
|--------|--------|
| Concurrent Users | 100+ sustained |
| Request Rate | 1,000+ req/min |
| P95 Response Time | < 500ms |
| P99 Response Time | < 1000ms |
| Error Rate | < 1% |

### Expected Results by Endpoint

| Endpoint | P95 Latency | P99 Latency |
|----------|-------------|-------------|
| `/health` | < 50ms | < 100ms |
| `/v1/sessions` (list) | < 200ms | < 400ms |
| `/v1/sessions` (create) | < 300ms | < 500ms |
| `/v1/machines` (list) | < 200ms | < 400ms |
| `/v1/artifacts` (list) | < 200ms | < 400ms |
| `/v1/websocket/stats` | < 100ms | < 200ms |
| `/v1/websocket/broadcast` | < 200ms | < 400ms |

## Interpreting Results

k6 outputs summary statistics after each run:

```
     checks.........................: 98.5% ✓ 12340 ✗ 186
     data_received..................: 5.2 MB 87 kB/s
     data_sent......................: 1.8 MB 30 kB/s
     http_req_blocked...............: avg=1.23ms   min=1µs    p(90)=3.21ms p(95)=5.67ms
     http_req_connecting............: avg=812µs    min=0s     p(90)=2.01ms p(95)=3.45ms
     http_req_duration..............: avg=156.23ms min=12ms   p(90)=312ms  p(95)=423ms
     http_req_failed................: 0.15%  ✓ 23    ✗ 15317
     http_req_receiving.............: avg=234µs    min=10µs   p(90)=567µs  p(95)=890µs
     http_req_sending...............: avg=45µs     min=5µs    p(90)=89µs   p(95)=123µs
     http_reqs......................: 15340  255.67/s
     iteration_duration.............: avg=391.45ms min=112ms  p(90)=612ms  p(95)=789ms
     iterations.....................: 5113   85.22/s
     vus............................: 100    min=1   max=100
     vus_max........................: 100    min=100 max=100
```

Key metrics:
- **http_req_duration**: Response time (p95 and p99 are most important)
- **http_req_failed**: Error rate (should be < 1%)
- **http_reqs**: Total requests and rate
- **checks**: Assertion pass rate

## Troubleshooting

### High Error Rates
- Check if auth token is valid
- Verify BASE_URL is correct
- Check server logs for errors

### Slow Response Times
- Check if database is under load
- Verify Durable Object limits
- Check for rate limiting

### Connection Errors
- Verify server is running
- Check firewall rules
- Verify DNS resolution
