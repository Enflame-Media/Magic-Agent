# Analytics Engine Setup Guide

This document describes the setup requirements for the Happy Admin Dashboard to display real metrics from Cloudflare Analytics Engine.

## Overview

The admin dashboard queries metrics from three Analytics Engine datasets:
- `sync_metrics_dev` / `sync_metrics_prod` - Sync performance metrics
- `bundle_metrics_dev` / `bundle_metrics_prod` - Bundle size metrics
- `client_metrics_dev` / `client_metrics_prod` - Client validation metrics

Data is written by `happy-server-workers` and queried by `happy-admin-api`.

## Prerequisites

### 1. Cloudflare Secrets Store

The API requires two secrets in Cloudflare Secrets Store:

| Secret Name | Description |
|-------------|-------------|
| `ANALYTICS_ACCOUNT_ID` | Your Cloudflare account ID |
| `ANALYTICS_API_TOKEN` | API token with Analytics Engine read access |

**Store ID:** `acdad5c326b0456aa453d78b7133983a`

#### Creating the API Token

1. Go to Cloudflare Dashboard > My Profile > API Tokens
2. Create a new token with permissions:
   - **Account > Analytics > Read**
3. Copy the token value
4. Add it to Secrets Store:
   ```bash
   wrangler secret put ANALYTICS_API_TOKEN --store acdad5c326b0456aa453d78b7133983a
   ```

#### Setting the Account ID

```bash
wrangler secret put ANALYTICS_ACCOUNT_ID --store acdad5c326b0456aa453d78b7133983a
# Enter your Cloudflare account ID when prompted
```

### 2. Analytics Engine Datasets

The following datasets must exist in your Cloudflare account:

| Dataset | Used By | Purpose |
|---------|---------|---------|
| `sync_metrics_dev` | happy-server-workers (dev) | Sync performance |
| `sync_metrics_prod` | happy-server-workers (prod) | Sync performance |
| `bundle_metrics_dev` | happy-server-workers (dev) | Bundle sizes |
| `bundle_metrics_prod` | happy-server-workers (prod) | Bundle sizes |
| `client_metrics_dev` | happy-server-workers (dev) | Validation failures |
| `client_metrics_prod` | happy-server-workers (prod) | Validation failures |

Datasets are created automatically when `happy-server-workers` first writes to them.

## Data Flow

```
happy-app (client)
    │
    │ POST /v1/analytics/sync
    ▼
happy-server-workers
    │
    │ writeDataPoint()
    ▼
Analytics Engine (sync_metrics_*)
    │
    │ SQL Query
    ▼
happy-admin-api (/api/metrics/*)
    │
    │ JSON Response
    ▼
happy-admin (dashboard UI)
```

## Field Mappings

### sync_metrics Dataset

Written by `happy-server-workers/src/routes/analytics.ts`:

| Field | Type | Content |
|-------|------|---------|
| blob1 | string | Sync type: `messages`, `profile`, `artifacts` |
| blob2 | string | Sync mode: `full`, `incremental`, `cached` |
| blob3 | string | Session ID (optional) |
| double1 | number | Bytes received |
| double2 | number | Items received |
| double3 | number | Items skipped |
| double4 | number | Duration in milliseconds |
| index1 | string | User/account ID |

### bundle_metrics Dataset

| Field | Type | Content |
|-------|------|---------|
| blob1 | string | Platform: `web`, `ios`, `android` |
| blob2 | string | Branch name |
| blob3 | string | Commit hash |
| double1 | number | JS bundle size (bytes) |
| double2 | number | Assets size (bytes) |
| double3 | number | Total size (bytes) |

### client_metrics Dataset

| Field | Type | Content |
|-------|------|---------|
| blob1 | string | Metric type: `validation` |
| blob2 | string | Subtype: `summary`, `unknown` |
| blob3 | string | Type name (for unknown types) |
| double1 | number | Total failures |
| double2 | number | Session duration (ms) |
| double3 | number | Schema failures |
| double4 | number | Strict failures |
| index1 | string | User ID |

## Troubleshooting

### Dashboard Shows Mock Data

If the dashboard shows mock data (`isMockData: true` in API responses):

1. **Check Secrets Store values:**
   - Verify `ANALYTICS_ACCOUNT_ID` and `ANALYTICS_API_TOKEN` are set
   - Check Cloudflare Workers logs for "Secrets Store returned empty values"

2. **Check Analytics Engine datasets exist:**
   - Go to Cloudflare Dashboard > Analytics > Analytics Engine
   - Verify datasets are listed

3. **Check data is being written:**
   - Use the app to trigger a sync
   - Check `happy-server-workers` logs for Analytics Engine writes
   - Query the dataset directly in Cloudflare Dashboard

4. **Check query logs:**
   - Deploy with verbose logging
   - Look for "[Metrics] Analytics Engine query failed" in logs

### API Token Permissions

Ensure your API token has:
- **Account** level permissions (not Zone)
- **Analytics > Read** permission

### Empty Results

If datasets exist but return no data:
- Check the time range (queries use `INTERVAL '24' HOUR`)
- Verify the environment matches (dev vs prod)
- Check that sync operations are occurring

## API Response Format

All metrics endpoints now include an `isMockData` flag:

```json
{
  "data": [...],
  "isMockData": false,
  "timestamp": "2025-12-29T00:00:00Z"
}
```

When `isMockData: true`, the dashboard is showing fallback mock data because:
- Analytics Engine is not configured
- Secrets Store is empty
- No data exists in the dataset
- Query failed

## Related Issues

- HAP-545: Analytics Engine + Admin Dashboard implementation
- HAP-546: Analytics Engine Binding + Ingestion Endpoint
- HAP-548: Admin Project Scaffold + Dashboard API
- HAP-564: Bundle size metrics integration
- HAP-577: Validation failure metrics
- HAP-638: Fix mock data fallbacks (this fix)
