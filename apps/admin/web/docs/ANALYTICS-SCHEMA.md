# Analytics Engine Schema Documentation

This document describes the Cloudflare Analytics Engine data point schemas used by the Happy Admin dashboard.

## Overview

Happy Admin queries three Analytics Engine datasets:

| Dataset | Environment | Source |
|---------|-------------|--------|
| `sync_metrics_dev` | Development | happy-server-workers (dev) |
| `sync_metrics_prod` | Production | happy-server-workers (prod) |
| `bundle_metrics_dev` | Development | CI/CD pipeline |
| `bundle_metrics_prod` | Production | CI/CD pipeline |
| `client_metrics_dev` | Development | happy-app (dev) |
| `client_metrics_prod` | Production | happy-app (prod) |

## Sync Metrics Schema

Records sync operations between the CLI and mobile app.

### Data Point Structure

| Field | Type | Description |
|-------|------|-------------|
| `blob1` | string | Sync type: `messages`, `profile`, `artifacts` |
| `blob2` | string | Sync mode: `full`, `incremental`, `cached` |
| `blob3` | string | Session ID (empty string if not provided) |
| `double1` | number | Bytes received |
| `double2` | number | Items received |
| `double3` | number | Items skipped |
| `double4` | number | Duration in milliseconds |
| `index1` | string | Account ID (for per-user grouping) |

### Example SQL Queries

#### 24-Hour Summary by Type
```sql
SELECT
    blob1 AS sync_type,
    blob2 AS sync_mode,
    COUNT(*) AS count,
    AVG(double4) AS avg_duration_ms,
    SUM(double1) AS total_bytes,
    SUM(double2) AS total_items
FROM sync_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY blob1, blob2
ORDER BY count DESC
```

#### Mode Distribution
```sql
SELECT
    blob2 AS mode,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM sync_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY blob2
```

#### Time-Series Data (1-hour buckets)
```sql
SELECT
    toStartOfHour(timestamp) AS hour,
    blob1 AS sync_type,
    COUNT(*) AS count,
    AVG(double4) AS avg_duration_ms
FROM sync_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
GROUP BY hour, blob1
ORDER BY hour ASC
```

## Bundle Metrics Schema

Records app bundle sizes from CI/CD builds.

### Data Point Structure

| Field | Type | Description |
|-------|------|-------------|
| `blob1` | string | Platform: `ios`, `android`, `web` |
| `blob2` | string | Git branch name |
| `blob3` | string | Git commit hash |
| `double1` | number | JS bundle size (bytes) |
| `double2` | number | Assets size (bytes) |
| `double3` | number | Total size (bytes) |
| `double4` | number | PR number (0 if not from a PR) |
| `index1` | string | Build ID (for deduplication) |

### Example SQL Queries

#### Latest Bundle Sizes by Platform
```sql
SELECT
    blob1 AS platform,
    blob3 AS commit,
    double1 AS js_bundle_bytes,
    double2 AS assets_bytes,
    double3 AS total_bytes
FROM bundle_metrics_prod
WHERE timestamp > NOW() - INTERVAL '7' DAY
ORDER BY timestamp DESC
LIMIT 10
```

#### Size Trends Over Time
```sql
SELECT
    toStartOfDay(timestamp) AS day,
    blob1 AS platform,
    AVG(double3) AS avg_total_bytes
FROM bundle_metrics_prod
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY day, blob1
ORDER BY day ASC
```

## Client Metrics Schema (HAP-577)

Records client-side validation failures from the mobile app.

### Data Point Structure

| Field | Type | Description |
|-------|------|-------------|
| `blob1` | string | Metric category: `validation` |
| `blob2` | string | Failure type: `schema`, `unknown`, `strict`, `summary` |
| `blob3` | string | Context: unknown type name or `_total` for summaries |
| `double1` | number | Count of failures |
| `double2` | number | Session duration in milliseconds |
| `double3` | number | Schema failures (summary only) |
| `double4` | number | Strict failures (summary only) |
| `index1` | string | Account ID (for per-user grouping) |

### Example SQL Queries

#### 24-Hour Validation Summary
```sql
SELECT
    SUM(double1) AS total_failures,
    SUM(double3) AS schema_failures,
    SUM(double4) AS strict_failures,
    COUNT(DISTINCT index1) AS unique_users,
    AVG(double2) AS avg_session_duration_ms
FROM client_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob1 = 'validation'
  AND blob2 = 'summary'
```

#### Unknown Type Breakdown
```sql
SELECT
    blob3 AS type_name,
    SUM(double1) AS count
FROM client_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob1 = 'validation'
  AND blob2 = 'unknown'
GROUP BY blob3
ORDER BY count DESC
LIMIT 10
```

#### Validation Timeseries
```sql
SELECT
    toStartOfHour(timestamp) AS hour,
    SUM(double1) AS total_failures,
    SUM(double3) AS schema_failures,
    SUM(double4) AS strict_failures
FROM client_metrics_prod
WHERE timestamp > NOW() - INTERVAL '24' HOUR
  AND blob1 = 'validation'
  AND blob2 = 'summary'
GROUP BY hour
ORDER BY hour ASC
```

## API Endpoints

The Happy Admin dashboard exposes these metrics via API endpoints:

### Sync Metrics

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/summary` | GET | 24h aggregated metrics by type/mode |
| `/api/metrics/timeseries` | GET | Time-bucketed sync metrics |
| `/api/metrics/cache-hits` | GET | Profile cache hit rate |
| `/api/metrics/mode-distribution` | GET | Full/incremental/cached distribution |

### Validation Metrics (HAP-577)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/validation-summary` | GET | 24h validation failure summary |
| `/api/metrics/validation-unknown-types` | GET | Unknown type breakdown |
| `/api/metrics/validation-timeseries` | GET | Time-bucketed validation metrics |

All endpoints require authentication via Better-Auth session cookie.

## Query Parameters

Most endpoints support these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `hours` | number | 24 | Time range in hours |
| `bucket` | string | `hour` | Time bucket: `minute`, `hour`, `day` |

## Data Retention

Analytics Engine data is retained for:
- **Development**: 7 days
- **Production**: 90 days

Configure retention in the Cloudflare Dashboard under Analytics Engine settings.

## Related Resources

- [Cloudflare Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
- [apps/server/workers Analytics Route](../../../server/workers/src/routes/analytics.ts)
- [apps/server/workers CI Metrics Route](../../../server/workers/src/routes/ciMetrics.ts)
- [apps/server/workers Client Metrics Route](../../../server/workers/src/routes/clientMetrics.ts)
