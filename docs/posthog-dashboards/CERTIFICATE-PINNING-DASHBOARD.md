# PostHog Certificate Pinning Dashboard Configuration Guide (HAP-880)

This document provides step-by-step instructions for configuring the PostHog monitoring dashboard for certificate pinning events.

## Overview

The dashboard monitors the health and security of certificate pinning in the Happy mobile app by visualizing events tracked in `apps/web/react/sources/track/index.ts`.

**Related Issues:**
- HAP-880: Configure PostHog Certificate Pinning Dashboard
- HAP-860: Certificate Pinning Monitoring and Operations Runbook
- HAP-624: Certificate Pinning for API Connections in Mobile App

## Prerequisites

- PostHog account with project access
- Admin or Editor permissions on the PostHog project
- Events already being tracked (verify by checking for `cert_pinning_initialized` events)

## Dashboard Creation Steps

### Step 1: Create New Dashboard

1. Navigate to PostHog Dashboard: https://app.posthog.com/
2. Click **Dashboards** in the left sidebar
3. Click **+ New Dashboard**
4. Name: `Certificate Pinning Health`
5. Description: `Monitors certificate pinning validation success rates, failures, and security events for the Happy mobile app.`
6. Click **Save**

### Step 2: Panel 1 - Pin Validation Success Rate (Line Chart)

**Purpose:** Shows the ratio of successful pin validations to failures over time.

1. Click **+ Add insight**
2. Select **Trends**
3. Configure Series A:
   - Event: `cert_pinning_initialized`
   - Display: Line graph
4. Click **+ Add graph series** for Series B:
   - Event: `cert_pinning_failure`
   - Display: Line graph
5. Configure chart:
   - Date range: **Last 7 days**
   - Interval: **Hour**
6. Add a formula (click **+ Add formula**):
   - Formula: `A / (A + B) * 100`
   - Name: `Success Rate %`
7. Title: `Pin Validation Success Rate`
8. Description: `Percentage of successful pin validations. Target: >99.9%`
9. Click **Save to dashboard**

### Step 3: Panel 2 - Failures by Domain (Bar Chart)

**Purpose:** Identifies which domains are experiencing the most pin validation failures.

1. Click **+ Add insight**
2. Select **Trends**
3. Configure:
   - Event: `cert_pinning_failure`
   - Breakdown by: `server_hostname`
   - Display: **Bar chart**
   - Date range: **Last 24 hours**
4. Title: `Failures by Domain`
5. Description: `Certificate pin validation failures grouped by server hostname in the last 24 hours.`
6. Click **Save to dashboard**

**SQL Alternative (for HogQL):**
```sql
SELECT
    properties.server_hostname AS domain,
    COUNT(*) AS failure_count
FROM events
WHERE event = 'cert_pinning_failure'
    AND timestamp > now() - INTERVAL 24 HOUR
GROUP BY domain
ORDER BY failure_count DESC
LIMIT 10
```

### Step 4: Panel 3 - Failures by Platform/OS (Pie Chart)

**Purpose:** Shows distribution of failures across platforms and OS versions.

1. Click **+ Add insight**
2. Select **Trends**
3. Configure:
   - Event: `cert_pinning_failure`
   - Breakdown by: `platform`
   - Display: **Pie chart**
   - Date range: **Last 7 days**
4. Title: `Failures by Platform`
5. Description: `Distribution of pin validation failures by platform (iOS/Android).`
6. Click **Save to dashboard**

For a more detailed breakdown by OS version, create an additional panel:

1. Click **+ Add insight**
2. Configure:
   - Event: `cert_pinning_failure`
   - Breakdown by: `os_version`
   - Display: **Table** or **Bar chart**
   - Date range: **Last 7 days**
3. Title: `Failures by OS Version`
4. Click **Save to dashboard**

### Step 5: Panel 4 - Bypass Rate (Stacked Bar Chart)

**Purpose:** Monitors when and why certificate pinning is bypassed.

1. Click **+ Add insight**
2. Select **Trends**
3. Configure:
   - Event: `cert_pinning_bypassed`
   - Breakdown by: `reason`
   - Display: **Bar chart** with **Stacked** option
   - Date range: **Last 7 days**
   - Interval: **Day**
4. Title: `Bypass Rate by Reason`
5. Description: `Certificate pinning bypasses grouped by reason. Monitor for unexpected bypass reasons.`
6. Click **Save to dashboard**

**Expected bypass reasons:**
- `local_development` - Normal for localhost/local IPs
- `debug_mode` - Normal for debug builds
- `unsupported_platform` - Expected for web platform
- `module_unavailable` - Check if SSL module is installed
- `no_pins_configured` - Unknown hostname (may indicate misconfiguration)

### Step 6: Panel 5 - Expiration Timeline (Table)

**Purpose:** Shows upcoming pin expirations requiring action.

1. Click **+ Add insight**
2. Select **Trends** or **Table**
3. Configure:
   - Event: `cert_pinning_expiration_warning`
   - Breakdown by: `hostname`
   - Add property column: `days_until_expiration`
   - Date range: **Last 30 days**
   - Display: **Table**
4. Title: `Pin Expiration Warnings`
5. Description: `Hosts with certificate pins approaching expiration. Action required when days_until_expiration <= 30.`
6. Click **Save to dashboard**

**HogQL Query:**
```sql
SELECT
    properties.hostname AS hostname,
    MIN(properties.days_until_expiration) AS days_until_expiration,
    MAX(timestamp) AS last_warning
FROM events
WHERE event = 'cert_pinning_expiration_warning'
    AND timestamp > now() - INTERVAL 30 DAY
GROUP BY hostname
ORDER BY days_until_expiration ASC
```

## Additional Recommended Panels

### Panel 6: Real-time Failure Monitor (Number)

**Purpose:** Quick view of recent failures for on-call monitoring.

1. Click **+ Add insight**
2. Select **Trends**
3. Configure:
   - Event: `cert_pinning_failure`
   - Display: **Number**
   - Date range: **Last 1 hour**
4. Title: `Failures (Last Hour)`
5. Add comparison: **vs. previous hour**
6. Click **Save to dashboard**

### Panel 7: Consecutive Failures Alert (Table)

**Purpose:** Identifies users experiencing persistent issues.

1. Click **+ Add insight**
2. Use **HogQL**:
```sql
SELECT
    distinct_id,
    properties.server_hostname AS hostname,
    MAX(properties.consecutive_failures) AS max_consecutive_failures,
    properties.platform AS platform,
    properties.app_version AS app_version
FROM events
WHERE event = 'cert_pinning_failure'
    AND properties.consecutive_failures >= 5
    AND timestamp > now() - INTERVAL 24 HOUR
GROUP BY distinct_id, hostname, platform, app_version
ORDER BY max_consecutive_failures DESC
LIMIT 20
```
3. Title: `Users with Consecutive Failures (>=5)`
4. Description: `May indicate corporate proxy or persistent MITM issues.`
5. Click **Save to dashboard**

### Panel 8: App Version Distribution (Bar Chart)

**Purpose:** Correlates failures with specific app versions.

1. Click **+ Add insight**
2. Configure:
   - Event: `cert_pinning_failure`
   - Breakdown by: `app_version`
   - Display: **Bar chart**
   - Date range: **Last 7 days**
3. Title: `Failures by App Version`
4. Description: `Identify if specific app versions have elevated failure rates.`
5. Click **Save to dashboard**

## Dashboard Layout

Recommended layout (2-column grid):

```
Row 1:
+-----------------------------------+-----------------------------------+
| Pin Validation Success Rate       | Failures (Last Hour)              |
| (Line Chart - Full Width/Half)    | (Number - Compact)                |
+-----------------------------------+-----------------------------------+

Row 2:
+-----------------------------------+-----------------------------------+
| Failures by Domain                | Failures by Platform              |
| (Bar Chart)                       | (Pie Chart)                       |
+-----------------------------------+-----------------------------------+

Row 3:
+-----------------------------------+-----------------------------------+
| Bypass Rate by Reason             | Failures by App Version           |
| (Stacked Bar)                     | (Bar Chart)                       |
+-----------------------------------+-----------------------------------+

Row 4:
+-----------------------------------+-----------------------------------+
| Pin Expiration Warnings           | Users with Consecutive Failures   |
| (Table)                           | (Table)                           |
+-----------------------------------+-----------------------------------+
```

## Sharing and Permissions

### Share with Teams

1. Click **Share** on the dashboard
2. Add team members or teams:
   - Security team
   - On-call engineers
   - Infrastructure team
3. Set appropriate permissions:
   - Viewers: On-call engineers
   - Editors: Security team

### Dashboard Link

After creation, copy the dashboard URL and update:

1. **Runbook**: `docs/CERTIFICATE-PINNING-RUNBOOK.md`
   - Support Resources section
   - Replace `[URL to be configured]` with actual URL

2. **Linear issue HAP-880**: Add comment with dashboard URL

## Alert Configuration

### Create Alerts in PostHog

1. Go to **Data Management** > **Actions**
2. Create action for high failure rate:
   - Name: `Certificate Pinning Failure Spike`
   - Event: `cert_pinning_failure`
   - Conditions: Count > 100 in 5 minutes
3. Go to **Alerts** and create webhook or email alert

### PagerDuty Integration (Optional)

1. In PostHog, go to **Data Management** > **Webhooks**
2. Add PagerDuty webhook URL
3. Configure alert rules per the runbook specifications

## Verification Checklist

After creating the dashboard, verify:

- [ ] All 5 required panels are present and displaying data
- [ ] Dashboard is shared with security and on-call teams
- [ ] Dashboard URL added to runbook
- [ ] Alerts configured for P1/P2 conditions
- [ ] Test that events are being captured (check for recent `cert_pinning_initialized` events)

## Troubleshooting

### No Data Showing

1. Verify events are being tracked:
   - Check `apps/web/react/sources/track/index.ts` is deployed
   - Verify PostHog SDK is initialized in the app
   - Check PostHog project settings for correct API key

2. Check date range:
   - Events may not exist for the selected time period
   - Try "Last 30 days" or "All time"

3. Verify event names:
   - Exact event names: `cert_pinning_initialized`, `cert_pinning_failure`, `cert_pinning_bypassed`, `cert_pinning_expiration_warning`

### Performance Issues

1. Use date filters to reduce data volume
2. Consider sampling for high-volume events
3. Use HogQL for complex queries instead of multiple breakdowns

---

*Document created: January 2026*
*Related to: HAP-880*
