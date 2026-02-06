# Certificate Pinning Operations Runbook (HAP-860)

This document provides comprehensive guidance for monitoring, maintaining, and troubleshooting certificate pinning in the Happy mobile app. It is intended for DevOps, SRE, and on-call engineers.

## Table of Contents

1. [Overview](#overview)
2. [Monitoring & Alerting](#monitoring--alerting)
   - [PostHog Events](#posthog-events)
   - [Alert Rules](#alert-rules-posthogpagerduty)
   - [Alerting Configuration (HAP-882)](#alerting-configuration-hap-882)
   - [Dashboard Setup](#dashboard-setup-posthog)
3. [Certificate Rotation Procedure](#certificate-rotation-procedure)
4. [Emergency Response](#emergency-response)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Quarterly Maintenance](#quarterly-maintenance)
7. [Contact Information](#contact-information)

---

## Overview

### What is Certificate Pinning?

Certificate pinning ensures the Happy app only trusts specific certificate public keys when connecting to Happy API servers. This protects against:

- Compromised Certificate Authorities (CA)
- Corporate MITM proxy interception
- Rogue WiFi access point attacks
- User-installed malicious certificates

### Current Configuration

| Domain | Environment | Pin Count | Expiration |
|--------|-------------|-----------|------------|
| `happy-api.enflamemedia.com` | Production | 2+ | See `certificatePinning.ts` |
| `happy-api-dev.enflamemedia.com` | Development | 2+ | See `certificatePinning.ts` |

### Key Files

| File | Location | Purpose |
|------|----------|---------|
| Certificate Pinning Module | `apps/web/react/sources/utils/certificatePinning.ts` | Pin configuration and runtime logic |
| Tracking Module | `apps/web/react/sources/track/index.ts` | Analytics event definitions |
| Documentation | `apps/web/react/sources/docs/certificate-pinning.md` | Developer documentation |

---

## Monitoring & Alerting

### PostHog Events

The app tracks the following certificate pinning events in PostHog:

#### `cert_pinning_initialized`

Fired when pinning is successfully configured.

| Property | Type | Description |
|----------|------|-------------|
| `hostname` | string | Domain for which pinning was configured |
| `pin_count` | number | Number of pins configured |
| `expiration_date` | string | Pin expiration date (yyyy-MM-dd) |
| `using_backup_pins` | boolean | Whether backup pins are in use |

**Dashboard Query**:
```sql
SELECT COUNT(*), hostname
FROM events
WHERE event = 'cert_pinning_initialized'
  AND timestamp > NOW() - INTERVAL 7 DAY
GROUP BY hostname
```

#### `cert_pinning_failure`

**CRITICAL**: Fired when pin validation fails. This could indicate a MITM attack or certificate rotation issue.

| Property | Type | Description |
|----------|------|-------------|
| `server_hostname` | string | Server that failed validation |
| `error_message` | string | Error description |
| `platform` | string | iOS or Android |
| `os_version` | string | Device OS version |
| `app_version` | string | App version |
| `consecutive_failures` | number | Running count of failures |

**Dashboard Query**:
```sql
SELECT COUNT(*), server_hostname, platform, app_version
FROM events
WHERE event = 'cert_pinning_failure'
  AND timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY server_hostname, platform, app_version
ORDER BY COUNT(*) DESC
```

#### `cert_pinning_bypassed`

Fired when pinning is skipped.

| Property | Type | Description |
|----------|------|-------------|
| `hostname` | string | The bypassed hostname |
| `reason` | string | Reason for bypass |

**Reason Values**:
- `local_development`: Localhost/local IP detected
- `debug_mode`: Debug build detected
- `unsupported_platform`: Web platform
- `module_unavailable`: SSL pinning module not installed
- `no_pins_configured`: Unknown hostname

#### `cert_pinning_expiration_warning`

Fired when pins are approaching expiration.

| Property | Type | Description |
|----------|------|-------------|
| `hostname` | string | Domain with expiring pins |
| `days_until_expiration` | number | Days until expiration |

### Alert Rules (PostHog/PagerDuty)

#### P1 - Critical: High Failure Rate

**Condition**: `cert_pinning_failure` count > 100 in 5 minutes

**Trigger**: Potential active MITM attack or certificate rotation failure

**Action**:
1. Check if certificate rotation is in progress
2. If not, investigate potential security incident
3. Contact security team immediately

#### P2 - Warning: Elevated Failure Rate

**Condition**: `cert_pinning_failure` rate > 0.1% of `cert_pinning_initialized` in 1 hour

**Trigger**: Possible localized issues (corporate proxy, specific ISP)

**Action**:
1. Check geographic distribution of failures
2. Check device/OS version distribution
3. Investigate common patterns

#### P3 - Info: Consecutive Failures

**Condition**: `consecutive_failures` >= 10 for any single user session

**Trigger**: Single user experiencing persistent issues

**Action**:
1. May indicate user on corporate network
2. Consider reaching out if user reports issue

#### P4 - Warning: Expiration Approaching

**Condition**: `cert_pinning_expiration_warning` with `days_until_expiration` <= 30

**Trigger**: Pins need to be updated soon

**Action**:
1. Schedule certificate pin update
2. Extract new certificate hashes
3. Deploy OTA update

### Alerting Configuration (HAP-882)

This section details the configuration steps to set up PagerDuty alerting for certificate pinning events.

#### Prerequisites

1. **PagerDuty Account**: Organization must have PagerDuty access
2. **PostHog Project**: Certificate pinning events must be flowing to PostHog
3. **Slack Integration**: #happy-security-alerts channel exists

#### Step 1: Create PagerDuty Service

1. Navigate to PagerDuty > Services > New Service
2. Configure the service:
   - **Name**: `Happy - Certificate Pinning`
   - **Description**: `Monitors certificate pinning failures for Happy mobile app`
   - **Integration Type**: Events API v2
   - **Escalation Policy**: Create new or use existing (see Escalation Policy below)
3. Save and note the **Integration Key** (routing key)

**Service ID**: `[UPDATE AFTER CREATION]`

#### Step 2: Configure Escalation Policy

Create an escalation policy matching the contact matrix:

```
Escalation Policy: "Certificate Pinning Security"

Level 1 (0 min):
  - Target: On-call engineer schedule
  - Timeout: 15 minutes

Level 2 (15 min):
  - Target: Security team schedule
  - Timeout: 30 minutes

Level 3 (45 min):
  - Target: Infrastructure lead
  - Timeout: 1 hour

Level 4 (105 min):
  - Target: CTO
  - Repeats: Yes (until acknowledged)
```

#### Step 3: PostHog Webhook Integration

PostHog can send webhooks to PagerDuty when alert conditions are met.

**Option A: PostHog Actions (Recommended)**

1. In PostHog, go to Data Management > Actions
2. Create actions for each alert condition:

**Action: P1 - Critical Cert Pinning Failure**
```
Event: cert_pinning_failure
Condition: Count > 100 in last 5 minutes
Webhook URL: https://events.pagerduty.com/v2/enqueue
```

Webhook payload template:
```json
{
  "routing_key": "[PAGERDUTY_INTEGRATION_KEY]",
  "event_action": "trigger",
  "dedup_key": "cert_pinning_p1_{{timestamp}}",
  "payload": {
    "summary": "P1 CRITICAL: High certificate pinning failure rate ({{count}} failures in 5 min)",
    "severity": "critical",
    "source": "posthog-happy-app",
    "component": "certificate-pinning",
    "group": "security",
    "class": "cert_pinning_failure",
    "custom_details": {
      "failure_count": "{{count}}",
      "time_window": "5 minutes",
      "dashboard_url": "[POSTHOG_DASHBOARD_URL]",
      "runbook_url": "https://github.com/Enflame-Media/happy-shared/blob/main/docs/CERTIFICATE-PINNING-RUNBOOK.md"
    }
  }
}
```

**Action: P2 - Warning Elevated Failure Rate**
```
Event: cert_pinning_failure
Condition: Rate > 0.1% of cert_pinning_initialized in last 1 hour
Webhook payload severity: "warning"
```

**Action: P4 - Expiration Warning**
```
Event: cert_pinning_expiration_warning
Condition: days_until_expiration <= 30
Webhook payload severity: "warning"
```

**Option B: PostHog Subscriptions (Alternative)**

1. Go to PostHog > Insights > Create Insight
2. Create trend showing `cert_pinning_failure` count over 5-minute intervals
3. Set up subscription with webhook destination
4. Configure threshold alerts

#### Step 4: Slack Integration

1. **Create Slack Channel**: #happy-security-alerts (if not exists)
2. **PagerDuty to Slack**:
   - In PagerDuty, go to Integrations > Slack
   - Connect to the Happy workspace
   - Configure the service to post to #happy-security-alerts
3. **PostHog to Slack** (for P3 informational alerts):
   - In PostHog, configure webhook to Slack incoming webhook
   - Use Slack-formatted payload for consecutive failures

Slack alert template (P1/P2):
```
:rotating_light: *Certificate Pinning Alert*
*Priority*: P1 - Critical
*Condition*: High failure rate detected
*Count*: {{count}} failures in 5 minutes
*Action Required*: Check runbook immediately
:link: <[POSTHOG_DASHBOARD_URL]|View Dashboard>
:book: <[RUNBOOK_URL]|Operations Runbook>
```

#### Step 5: Test Alert Configuration

Before going live, test the alerting pipeline:

1. **Test PagerDuty Integration**:
   ```bash
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "[INTEGRATION_KEY]",
       "event_action": "trigger",
       "dedup_key": "test-cert-pinning-alert",
       "payload": {
         "summary": "TEST: Certificate pinning alert configuration",
         "severity": "info",
         "source": "manual-test",
         "component": "certificate-pinning"
       }
     }'
   ```

2. **Resolve Test Alert**:
   ```bash
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "[INTEGRATION_KEY]",
       "event_action": "resolve",
       "dedup_key": "test-cert-pinning-alert"
     }'
   ```

3. **Verify Slack Notification**: Confirm message appeared in #happy-security-alerts

#### Step 6: Cloudflare Alerting (Optional)

Cloudflare provides native PagerDuty integration for infrastructure-level monitoring.

1. In Cloudflare Dashboard > Notifications
2. Create notification policy for `happy-api.enflamemedia.com`
3. Select PagerDuty as destination
4. Monitor for: SSL certificate expiration, origin errors, elevated error rates

**Note**: This is complementary to PostHog alerts and catches infrastructure issues before they affect certificate pinning.

#### Alert Configuration Checklist

- [ ] PagerDuty service created with Integration Key
- [ ] Escalation policy configured (L1-L4)
- [ ] PostHog P1 action configured (high failure rate)
- [ ] PostHog P2 action configured (elevated rate)
- [ ] PostHog P4 action configured (expiration warning)
- [ ] Slack channel #happy-security-alerts exists
- [ ] PagerDuty to Slack integration active
- [ ] Test alert sent and resolved successfully
- [ ] Cloudflare notifications configured (optional)
- [ ] Service ID documented in this runbook

#### Alerting Maintenance

**Monthly**:
- Review alert volumes and adjust thresholds if needed
- Verify on-call schedules are current
- Test alert path with manual trigger

**Quarterly**:
- Review escalation policy contacts
- Audit PagerDuty service integrations
- Update Slack channel membership

### Dashboard Setup (PostHog)

Create a dashboard with:

1. **Pin Validation Success Rate** (line chart)
   - Success: `cert_pinning_initialized` events
   - Failures: `cert_pinning_failure` events
   - Calculate: `success / (success + failures) * 100`

2. **Failures by Domain** (bar chart)
   - Group by `server_hostname`
   - Filter: `cert_pinning_failure` events
   - Time range: Last 24 hours

3. **Failures by Platform/OS** (pie chart)
   - Group by `platform`, `os_version`
   - Filter: `cert_pinning_failure` events

4. **Bypass Rate** (stacked bar)
   - Group by `reason`
   - Filter: `cert_pinning_bypassed` events
   - Monitor for unexpected bypass reasons

5. **Expiration Timeline** (table)
   - Show upcoming expirations
   - Filter: `cert_pinning_expiration_warning`

---

## Certificate Rotation Procedure

### Timeline Overview

```
Day -60: Monitor current certificate expiration
Day -45: Extract new certificate hash
Day -30: Add new hash as backup pin, deploy OTA
Day -14: Verify OTA adoption rate
Day 0:   Certificate rotation occurs
Day +7:  Remove old pin, deploy OTA
Day +14: Verify no issues with old pin removed
```

### Step-by-Step Procedure

#### Phase 1: Preparation (Day -45)

1. **Extract new certificate hash**

   ```bash
   # For production
   echo | openssl s_client -servername happy-api.enflamemedia.com \
       -connect happy-api.enflamemedia.com:443 2>/dev/null | \
       openssl x509 -pubkey -noout | \
       openssl pkey -pubin -outform DER | \
       openssl dgst -sha256 -binary | \
       openssl enc -base64
   ```

2. **Verify the hash** using SSL Labs:
   - Go to https://www.ssllabs.com/ssltest/
   - Enter `happy-api.enflamemedia.com`
   - Find SPKI (Subject Public Key Info) hash

3. **Document the hashes**
   - Current leaf certificate hash
   - New leaf certificate hash
   - Intermediate CA hash
   - Root CA hash

#### Phase 2: Update Pins (Day -30)

1. **Edit `certificatePinning.ts`**

   ```typescript
   // Add new pin BEFORE existing pins
   'happy-api.enflamemedia.com': {
       includeSubdomains: false,
       publicKeyHashes: [
           // NEW: Upcoming leaf certificate (valid after rotation)
           'newHashBase64EncodedHere=',
           // CURRENT: Existing leaf certificate
           'currentHashBase64EncodedHere=',
           // BACKUP: Cloudflare Inc ECC CA-3
           'Wh1tM1z4+1jgkP1e8pL6I9V3L6hN4q7N6g1v0P5R8xY=',
           // BACKUP: DigiCert Global Root CA
           'r/mIkG3eEpVdm+u/ko/cwxzOMo1bk4TyHIlByibiA5E=',
       ],
       expirationDate: '2027-12-31', // Update to new expiration
   },
   ```

2. **Update tests**

   ```bash
   cd apps/web/react
   yarn test
   ```

3. **Deploy OTA update**

   ```bash
   cd apps/web/react
   yarn ota
   ```

4. **Monitor adoption**
   - Check PostHog for `cert_pinning_initialized` events
   - Target: 90%+ users on new app version before rotation

#### Phase 3: Certificate Rotation (Day 0)

1. **Cloudflare/CDN rotates certificate** (usually automatic)

2. **Monitor immediately**:
   - Watch `cert_pinning_failure` rate
   - Should remain at baseline (< 0.1%)

3. **If failures spike**:
   - See [Emergency Response](#emergency-response)

#### Phase 4: Cleanup (Day +7)

1. **Remove old pin**

   ```typescript
   // Remove the old certificate hash
   'happy-api.enflamemedia.com': {
       includeSubdomains: false,
       publicKeyHashes: [
           // CURRENT: New leaf certificate
           'newHashBase64EncodedHere=',
           // BACKUP: Cloudflare Inc ECC CA-3
           'Wh1tM1z4+1jgkP1e8pL6I9V3L6hN4q7N6g1v0P5R8xY=',
           // BACKUP: DigiCert Global Root CA
           'r/mIkG3eEpVdm+u/ko/cwxzOMo1bk4TyHIlByibiA5E=',
       ],
       expirationDate: '2027-12-31',
   },
   ```

2. **Deploy OTA update**

3. **Monitor for 2 weeks**

### Testing Checklist

Before deploying OTA with pin changes:

- [ ] New hash is valid base64
- [ ] New hash matches extracted certificate
- [ ] At least 2 pins per domain (iOS requirement)
- [ ] Expiration date is updated
- [ ] Unit tests pass (`yarn test`)
- [ ] Type check passes (`yarn typecheck`)
- [ ] Tested on iOS simulator
- [ ] Tested on Android emulator
- [ ] Tested with Charles Proxy to verify rejection

### Rollback Procedure

If issues occur after pin update:

1. **Revert `certificatePinning.ts`** to previous version
2. **Deploy emergency OTA**:
   ```bash
   cd apps/web/react
   yarn ota
   ```
3. **Monitor `cert_pinning_failure` rate** should return to baseline
4. **Investigate root cause** before retry

---

## Emergency Response

### Scenario 1: Certificate Compromised

**Symptoms**: Security team alerts that current certificate may be compromised.

**Response Time**: Immediate (P1)

**Steps**:

1. **Revoke compromised certificate** (via Cloudflare/hosting provider)

2. **Extract new certificate hash**:
   ```bash
   echo | openssl s_client -servername happy-api.enflamemedia.com \
       -connect happy-api.enflamemedia.com:443 2>/dev/null | \
       openssl x509 -pubkey -noout | \
       openssl pkey -pubin -outform DER | \
       openssl dgst -sha256 -binary | \
       openssl enc -base64
   ```

3. **Update pins** (keep backup CA pins for resilience)

4. **Deploy emergency OTA**:
   ```bash
   cd apps/web/react
   yarn ota
   ```

5. **Communicate to users** (if needed)
   - In-app notification about security update
   - Email to affected users

### Scenario 2: Mass Pin Failures

**Symptoms**: `cert_pinning_failure` rate > 10% in production

**Response Time**: 15 minutes (P1)

**Steps**:

1. **Check if intentional rotation is occurring**
   - Review change management calendar
   - Contact infrastructure team

2. **If NOT intentional**:
   - Potential MITM attack
   - Alert security team immediately
   - Do NOT disable pinning

3. **If intentional but failed**:
   - Check new certificate deployment
   - Verify DNS propagation
   - Check CDN edge nodes

4. **Temporary mitigation** (only if absolutely necessary):
   - Update expiration date to past date (disables pinning)
   - Deploy OTA
   - Fix root cause
   - Re-enable pinning ASAP

### Scenario 3: Corporate Proxy Issues

**Symptoms**: Multiple users from same organization reporting connection failures

**Response Time**: 1 hour (P2)

**Steps**:

1. **Identify affected organization**:
   - Check IP ranges in failure logs
   - Contact user's IT department

2. **Options for corporate users**:
   - Provide separate app configuration for corporate networks
   - Request SSL inspection bypass for Happy domains
   - Document the limitation

3. **Long-term solution**:
   - Consider enterprise deployment options
   - Work with corporate IT on certificate trust

### Communication Templates

#### Security Update Notification

```
Subject: Important Security Update for Happy App

We've deployed an important security update to protect your data.
Please ensure your app is updated to the latest version.

If you experience connection issues after this update, please:
1. Force close and restart the app
2. Check your internet connection
3. Contact support if issues persist

Reference: [INCIDENT_ID]
```

#### Corporate Network Issue

```
Subject: Happy App - Corporate Network Configuration Required

We've detected that your organization's network may be inspecting
SSL/TLS traffic, which can interfere with Happy's security features.

To resolve this, please contact your IT department and request
that the following domains be excluded from SSL inspection:
- happy-api.enflamemedia.com
- happy-api-dev.enflamemedia.com

Reference: [TICKET_ID]
```

---

## Troubleshooting Guide

### Common Issues

#### Issue: Pin Validation Failure on Single Device

**Possible Causes**:
1. Corporate network with SSL inspection
2. Malware on device with MITM proxy
3. Device date/time incorrect
4. Corrupted app cache

**Diagnosis**:
```
1. Check if user is on corporate network
2. Ask user to try on mobile data (not WiFi)
3. Verify device date/time is correct
4. Try clearing app cache/reinstalling
```

**Resolution**:
- Corporate network: Request SSL inspection bypass
- Malware: User should scan device
- Date/time: User should enable automatic time
- Cache: Reinstall app

#### Issue: Intermittent Failures

**Possible Causes**:
1. CDN edge node not updated
2. DNS propagation issues
3. Certificate chain incomplete

**Diagnosis**:
```bash
# Check certificate from multiple locations
curl -v https://happy-api.enflamemedia.com/ 2>&1 | grep "subject:"

# Check DNS resolution
dig happy-api.enflamemedia.com +short

# Verify certificate chain
openssl s_client -connect happy-api.enflamemedia.com:443 -showcerts
```

**Resolution**:
- Wait for CDN/DNS propagation (usually < 24 hours)
- Contact CDN provider if issue persists

#### Issue: All Users Affected

**Possible Causes**:
1. Unplanned certificate rotation
2. Pin configuration error
3. CDN/infrastructure issue

**Diagnosis**:
1. Check PostHog for failure spike timing
2. Correlate with any infrastructure changes
3. Verify current certificate matches pins

**Resolution**:
- See [Emergency Response](#emergency-response)

### Diagnostic Commands

#### Extract Certificate Info

```bash
# View full certificate details
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -text -noout

# Get certificate expiration
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -enddate -noout

# Get SPKI hash (pin value)
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | \
    openssl pkey -pubin -outform DER | \
    openssl dgst -sha256 -binary | \
    openssl enc -base64
```

#### Check Certificate Chain

```bash
# Show full certificate chain
openssl s_client -connect happy-api.enflamemedia.com:443 \
    -showcerts -servername happy-api.enflamemedia.com < /dev/null

# Extract intermediate CA hash
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -noout -issuer
```

#### Verify Pin Configuration

```bash
# In React Native app directory
cd apps/web/react
grep -A 20 "HAPPY_API_PINS" sources/utils/certificatePinning.ts
```

### Log Analysis

Look for these log patterns in device logs:

| Pattern | Meaning |
|---------|---------|
| `[CertPinning] Successfully initialized` | Pinning working correctly |
| `[CertPinning] Pin validation failed` | Certificate mismatch |
| `[CertPinning] Bypassing for local development` | Expected in dev |
| `[CertPinning] No pins configured` | Custom server URL |
| `[CertPinning] ALERT: ... consecutive pin failures` | Threshold exceeded |

---

## Quarterly Maintenance

### Q1, Q2, Q3, Q4 Checklist

- [ ] Review certificate expiration dates
- [ ] Extract and document current certificate hashes
- [ ] Verify backup pins (CA certificates) are still valid
- [ ] Update `expirationDate` in pin configuration
- [ ] Review PostHog dashboard for anomalies
- [ ] Test pin validation on fresh device
- [ ] Update this runbook if procedures changed
- [ ] Train new team members on procedures

### Certificate Inventory

Maintain this table with current certificates:

| Domain | Hash | Type | Expires | Last Updated |
|--------|------|------|---------|--------------|
| happy-api.enflamemedia.com | `hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=` | GTS Root R1 (RSA 4096) | 2036-06-22 | 2026-01-14 |
| happy-api.enflamemedia.com | `uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=` | GTS Root R4 (ECC P-384) | 2036-06-22 | 2026-01-14 |
| happy-api.enflamemedia.com | `CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=` | GlobalSign Root R4 (ECC P-256) | 2038-01-19 | 2026-01-14 |
| happy-api-dev.enflamemedia.com | `hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=` | GTS Root R1 (RSA 4096) | 2036-06-22 | 2026-01-14 |
| happy-api-dev.enflamemedia.com | `uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=` | GTS Root R4 (ECC P-384) | 2036-06-22 | 2026-01-14 |
| happy-api-dev.enflamemedia.com | `CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=` | GlobalSign Root R4 (ECC P-256) | 2038-01-19 | 2026-01-14 |

**Note**: Since we pin to root CAs (Google Trust Services), rotation is very infrequent. GTS Root R1/R4 are valid until 2036.

---

## Contact Information

### Escalation Path

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | On-call engineer | 15 min |
| L2 | Security team | 30 min |
| L3 | Infrastructure lead | 1 hour |
| L4 | CTO | 2 hours |

### External Contacts

| Service | Contact | Purpose |
|---------|---------|---------|
| Cloudflare | Support portal | CDN/SSL issues |
| Apple Developer | developer.apple.com | iOS-specific issues |
| Google Play | play.google.com/console | Android-specific issues |

### Support Resources

- **PostHog Dashboard**: `[PLACEHOLDER: Add dashboard URL after creation per HAP-880]`
  - Dashboard setup guide: [`docs/posthog-dashboards/CERTIFICATE-PINNING-DASHBOARD.md`](./posthog-dashboards/CERTIFICATE-PINNING-DASHBOARD.md)
- **PagerDuty Service**: `[UPDATE: Add Service ID after completing HAP-882 configuration]`
  - Alerting configuration guide: See [Alerting Configuration (HAP-882)](#alerting-configuration-hap-882) section above
- **Slack Channel**: #happy-security-alerts
- **Wiki**: [Internal wiki link]

---

## Team Training

### Training Materials (HAP-884)

Comprehensive training materials are available for on-call engineers:

| Document | Location | Purpose |
|----------|----------|---------|
| Training Slide Deck | [`docs/training/CERTIFICATE-PINNING-TRAINING.md`](./training/CERTIFICATE-PINNING-TRAINING.md) | 60-minute training session content |
| Quick Reference Cheatsheet | [`docs/training/CERTIFICATE-PINNING-CHEATSHEET.md`](./training/CERTIFICATE-PINNING-CHEATSHEET.md) | On-call reference card |

### Training Schedule

- **Initial Training**: Required for all on-call engineers before taking on-call duties
- **Refresher Training**: Quarterly, or when significant changes occur
- **New Hire Training**: Within first week of joining on-call rotation

### Training Prerequisites

Before attending training, ensure access to:
- [ ] PostHog dashboard (certificate pinning dashboard)
- [ ] PagerDuty service (certificate pinning alerts)
- [ ] This runbook (bookmarked)
- [ ] Repository access for `apps/web/react/sources/utils/certificatePinning.ts`

### Post-Training Verification

After training, engineers should be able to:
- [ ] Explain what certificate pinning protects against
- [ ] Navigate the PostHog monitoring dashboard
- [ ] Identify and respond to P1-P4 alerts
- [ ] Extract certificate hashes using OpenSSL commands
- [ ] Deploy emergency OTA updates
- [ ] Troubleshoot common pin validation failures

---

## Related Documents

- [Certificate Pinning Developer Guide](../apps/web/react/sources/docs/certificate-pinning.md)
- [Certificate Pinning QA Guide](../apps/web/react/sources/docs/certificate-pinning-qa.md)
- [Encryption Architecture](./ENCRYPTION-ARCHITECTURE.md)
- [Secret Rotation Guide](../apps/server/docker/docs/SECRET-ROTATION.md)
- [PostHog Dashboard Configuration Guide](./posthog-dashboards/CERTIFICATE-PINNING-DASHBOARD.md) (HAP-880)
- [Training Materials](./training/CERTIFICATE-PINNING-TRAINING.md) (HAP-884)
- [Quick Reference Cheatsheet](./training/CERTIFICATE-PINNING-CHEATSHEET.md) (HAP-884)

---

*Last Updated: January 2026*
*HAP-860: Certificate Pinning Monitoring and Operations Runbook*
*HAP-884: Certificate Pinning On-Call Training*
*HAP-882: PagerDuty Alerting Configuration Added*
