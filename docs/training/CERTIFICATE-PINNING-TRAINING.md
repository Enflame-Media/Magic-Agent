# Certificate Pinning On-Call Training

This document provides training materials for on-call engineers on certificate pinning monitoring and incident response in the Happy mobile app.

**Training Duration**: 60 minutes
**Target Audience**: On-call engineers, SRE team
**Prerequisites**: Basic understanding of TLS/SSL, familiarity with PostHog and PagerDuty

---

## Section 1: Certificate Pinning Overview (15 min)

### What is Certificate Pinning?

Certificate pinning is a security mechanism that ensures the Happy mobile app only accepts connections to servers presenting specific, pre-approved certificate public keys.

### What It Protects Against

| Threat | How Pinning Helps |
|--------|-------------------|
| Compromised Certificate Authority | App rejects certificates even if signed by trusted CA |
| Corporate MITM Proxy | Blocks SSL inspection that intercepts traffic |
| Rogue WiFi Access Point | Prevents traffic interception on untrusted networks |
| User-installed Malicious Certificates | App ignores device trust store modifications |

### What It Does NOT Protect Against

| Threat | Why Not Protected |
|--------|-------------------|
| Rooted/Jailbroken Device | Can patch SSL validation at runtime |
| Server Compromise | Server's private key can be extracted |
| Reverse Engineering | Pins are extractable from app binary |

### How It Works in Happy

1. App contains hardcoded public key hashes (SPKI hashes)
2. When connecting to Happy API, the server's certificate is checked
3. If the certificate's public key hash matches any pinned hash, connection proceeds
4. If no match, connection is **rejected** and error is tracked

### Current Configuration

We pin to **Google Trust Services (GTS) Root CA** certificates:

| Pin | Type | Expiration |
|-----|------|------------|
| `hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=` | GTS Root R1 (RSA 4096) | 2036-06-22 |
| `uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=` | GTS Root R4 (ECC P-384) | 2036-06-22 |
| `CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=` | GlobalSign Root R4 | 2038-01-19 |

**Key Point**: Root CA pins are very stable. GTS Root pins are valid until 2036, so routine certificate rotation by Cloudflare does NOT affect our pins.

---

## Section 2: Monitoring Dashboard (10 min)

### PostHog Events

The app tracks four key events:

#### 1. `cert_pinning_initialized` (Success)
- Fired when pinning is configured successfully
- Properties: `hostname`, `pin_count`, `expiration_date`, `using_backup_pins`

#### 2. `cert_pinning_failure` (CRITICAL)
- Fired when pin validation fails
- Properties: `server_hostname`, `error_message`, `platform`, `os_version`, `app_version`, `consecutive_failures`
- **This is your primary alert indicator**

#### 3. `cert_pinning_bypassed` (Info)
- Fired when pinning is skipped (dev mode, localhost, etc.)
- Properties: `hostname`, `reason`
- Normal reasons: `local_development`, `debug_mode`, `unsupported_platform`

#### 4. `cert_pinning_expiration_warning` (Warning)
- Fired when pins approach expiration
- Properties: `hostname`, `days_until_expiration`

### Dashboard Queries

**Failure Rate (Critical Metric)**
```sql
SELECT COUNT(*), server_hostname, platform, app_version
FROM events
WHERE event = 'cert_pinning_failure'
  AND timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY server_hostname, platform, app_version
ORDER BY COUNT(*) DESC
```

**Success Rate**
```sql
SELECT
  COUNT(CASE WHEN event = 'cert_pinning_initialized' THEN 1 END) as success,
  COUNT(CASE WHEN event = 'cert_pinning_failure' THEN 1 END) as failures
FROM events
WHERE timestamp > NOW() - INTERVAL 1 DAY
```

### Dashboard Location

- **PostHog Dashboard**: See runbook for current URL
- **Slack Channel**: #happy-security-alerts
- **PagerDuty Service**: See runbook for service ID

---

## Section 3: Alert Response Procedures (15 min)

### Alert Priority Levels

| Priority | Condition | Response Time | Escalation |
|----------|-----------|---------------|------------|
| P1 | >100 failures in 5 min | 15 min | Immediate |
| P2 | >0.1% failure rate in 1 hour | 30 min | Security team |
| P3 | 10+ consecutive failures (single user) | 1 hour | Support team |
| P4 | Expiration <30 days | 2 hours | Engineering |

### P1 Response: High Failure Rate

**Symptoms**: Massive spike in `cert_pinning_failure` events

**Step 1: Determine if planned rotation**
```bash
# Check change management calendar
# Contact infrastructure team
```

**Step 2: If NOT planned**
- Potential active MITM attack
- Alert security team IMMEDIATELY
- DO NOT disable pinning

**Step 3: If planned but failed**
- Verify new certificate deployment
- Check DNS propagation
- Check CDN edge nodes

### P2 Response: Elevated Failure Rate

**Symptoms**: Gradual increase in failure rate, localized to specific regions/ISPs

**Step 1: Analyze failure distribution**
```sql
SELECT COUNT(*),
       properties->>'platform',
       properties->>'os_version',
       properties->>'app_version'
FROM events
WHERE event = 'cert_pinning_failure'
  AND timestamp > NOW() - INTERVAL 1 HOUR
GROUP BY 2, 3, 4
```

**Step 2: Check geographic distribution**
- Is it concentrated in specific regions?
- Could be specific ISP or corporate network

**Step 3: Investigate common patterns**
- Same app version?
- Same OS version?
- Same network conditions?

### P3 Response: Single User Issues

**Symptoms**: One user with 10+ consecutive failures

**Likely Causes**:
- User on corporate network with SSL inspection
- Device has date/time incorrect
- Device has malware with MITM proxy

**Resolution**:
1. Check if user is on corporate network
2. Ask user to try mobile data (not WiFi)
3. Verify device date/time is correct
4. Consider reaching out if user reports issue

### P4 Response: Expiration Warning

**Symptoms**: `cert_pinning_expiration_warning` with <30 days remaining

**Action Timeline**:
```
Day -30: Add new hash as backup pin
Day -14: Verify OTA adoption (90%+ target)
Day 0:   Rotation occurs
Day +7:  Remove old pin
```

---

## Section 4: Certificate Rotation Procedure (10 min)

### Timeline Overview

```
Day -60: Monitor certificate expiration
Day -45: Extract new certificate hash
Day -30: Add new hash as backup, deploy OTA
Day -14: Verify 90%+ OTA adoption
Day 0:   Certificate rotates
Day +7:  Remove old pin, deploy OTA
Day +14: Verify no issues
```

### Hash Extraction

```bash
# Extract SPKI hash from current certificate
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | \
    openssl pkey -pubin -outform DER | \
    openssl dgst -sha256 -binary | \
    openssl enc -base64
```

### Configuration File

Location: `apps/web/react/sources/utils/certificatePinning.ts`

```typescript
'happy-api.enflamemedia.com': {
    includeSubdomains: false,
    publicKeyHashes: [
        // Add new pins BEFORE existing ones
        'newHashBase64EncodedHere=',
        'currentHashBase64EncodedHere=',
        // Backup CA pins
        'backupCAHash=',
    ],
    expirationDate: '2027-12-31',
},
```

### OTA Deployment

```bash
cd apps/web/react
yarn ota
```

---

## Section 5: Emergency Response Drills (5 min)

### Scenario 1: Certificate Compromise

**Situation**: Security team alerts that current certificate may be compromised.

**Response**:
1. Revoke compromised certificate (via Cloudflare)
2. Extract new certificate hash
3. Update pins in `certificatePinning.ts`
4. Deploy emergency OTA: `yarn ota`
5. Communicate to users if needed

### Scenario 2: Mass Pin Failures

**Situation**: >10% failure rate in production

**Response**:
1. Check if intentional rotation
2. If NOT intentional: Alert security team, DO NOT disable pinning
3. If intentional but failed: Check certificate deployment, DNS, CDN

**Temporary Mitigation (LAST RESORT)**:
- Set expiration date to past date (disables pinning)
- Deploy OTA
- Fix root cause
- Re-enable pinning ASAP

### Scenario 3: Corporate Proxy Escalation

**Situation**: Multiple users from same organization reporting failures

**Response**:
1. Identify affected organization via IP ranges
2. Contact user's IT department
3. Request SSL inspection bypass for:
   - `happy-api.enflamemedia.com`
   - `happy-api-dev.enflamemedia.com`

---

## Section 6: Troubleshooting Practice (5 min)

### Diagnostic Commands

```bash
# View full certificate details
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -text -noout

# Get certificate expiration
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -enddate -noout

# Show certificate chain
openssl s_client -connect happy-api.enflamemedia.com:443 \
    -showcerts -servername happy-api.enflamemedia.com < /dev/null
```

### Log Patterns

| Pattern | Meaning |
|---------|---------|
| `[CertPinning] Successfully initialized` | Pinning working correctly |
| `[CertPinning] Pin validation failed` | Certificate mismatch - investigate |
| `[CertPinning] Bypassing for local development` | Expected in dev |
| `[CertPinning] No pins configured` | Custom server URL |
| `[CertPinning] ALERT: ... consecutive pin failures` | Threshold exceeded |

### Common Issues

| Issue | Likely Cause | Resolution |
|-------|--------------|------------|
| All connections failing | Wrong/expired pins | Re-extract hashes, update config |
| Single user failing | Corporate proxy | Request SSL bypass |
| Intermittent failures | CDN edge node not updated | Wait for propagation |

---

## Escalation Path

| Level | Contact | Response Time |
|-------|---------|---------------|
| L1 | On-call engineer | 15 min |
| L2 | Security team | 30 min |
| L3 | Infrastructure lead | 1 hour |
| L4 | CTO | 2 hours |

---

## Training Verification Checklist

After this training, you should be able to:

- [ ] Explain what certificate pinning protects against
- [ ] Navigate the PostHog certificate pinning dashboard
- [ ] Identify P1-P4 alert conditions
- [ ] Respond appropriately to each alert priority
- [ ] Extract certificate hashes using OpenSSL
- [ ] Deploy an emergency OTA update
- [ ] Troubleshoot common pin validation failures

---

## Related Documentation

- **Full Runbook**: `docs/CERTIFICATE-PINNING-RUNBOOK.md`
- **Developer Guide**: `apps/web/react/sources/docs/certificate-pinning.md`
- **QA Testing Guide**: `apps/web/react/sources/docs/certificate-pinning-qa.md`

---

*Training Materials Version: 1.0*
*Created: January 2026*
*Related Issue: HAP-884*
