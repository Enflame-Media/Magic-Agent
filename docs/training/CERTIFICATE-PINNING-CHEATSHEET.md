# Certificate Pinning Quick Reference Cheatsheet

**Keep this document bookmarked for on-call reference.**

---

## Alert Response Quick Guide

| Alert | Condition | Action |
|-------|-----------|--------|
| **P1 CRITICAL** | >100 failures / 5 min | Check if planned rotation. If NOT: alert security team, DO NOT disable pinning |
| **P2 WARNING** | >0.1% failure rate | Analyze geographic/platform distribution |
| **P3 INFO** | 10+ consecutive failures (1 user) | Likely corporate proxy - ask user to try mobile data |
| **P4 NOTICE** | <30 days to expiration | Schedule pin update, extract new hash, deploy OTA |

---

## Key PostHog Events

| Event | Severity | Meaning |
|-------|----------|---------|
| `cert_pinning_failure` | CRITICAL | Pin validation failed - possible MITM or rotation issue |
| `cert_pinning_initialized` | INFO | Pinning working correctly |
| `cert_pinning_expiration_warning` | WARNING | Pins approaching expiration |
| `cert_pinning_bypassed` | INFO | Pinning skipped (dev mode, localhost) |

---

## Essential Commands

### Extract Certificate Hash
```bash
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -pubkey -noout | \
    openssl pkey -pubin -outform DER | \
    openssl dgst -sha256 -binary | \
    openssl enc -base64
```

### Check Certificate Expiration
```bash
echo | openssl s_client -servername happy-api.enflamemedia.com \
    -connect happy-api.enflamemedia.com:443 2>/dev/null | \
    openssl x509 -enddate -noout
```

### View Certificate Chain
```bash
openssl s_client -connect happy-api.enflamemedia.com:443 \
    -showcerts -servername happy-api.enflamemedia.com < /dev/null
```

### Deploy Emergency OTA
```bash
cd apps/web/react
yarn ota
```

---

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/react/sources/utils/certificatePinning.ts` | Pin configuration |
| `docs/CERTIFICATE-PINNING-RUNBOOK.md` | Full operations runbook |
| `docs/training/CERTIFICATE-PINNING-TRAINING.md` | Training materials |

---

## Pinned Domains

| Domain | Environment |
|--------|-------------|
| `happy-api.enflamemedia.com` | Production |
| `happy-api-dev.enflamemedia.com` | Development |

---

## Current Pins (Root CAs - Valid until 2036)

| Hash | Type |
|------|------|
| `hxqRlPTu1bMS/0DITB1SSu0vd4u/8l8TjPgfaAp63Gc=` | GTS Root R1 |
| `uyJLOJQLNtPvt+gLa9F/6xaRCKrIHZWGxJpR18qYNGE=` | GTS Root R4 |
| `CLOmM1/OXvSPjw5UOYbAf9GKOxImEp9hhku9W90fHMk=` | GlobalSign Root R4 |

---

## Escalation Contacts

| Level | Contact | Response |
|-------|---------|----------|
| L1 | On-call engineer | 15 min |
| L2 | Security team | 30 min |
| L3 | Infrastructure lead | 1 hour |
| L4 | CTO | 2 hours |

---

## Log Patterns to Watch

| Pattern | Meaning |
|---------|---------|
| `[CertPinning] Successfully initialized` | OK - Pinning active |
| `[CertPinning] Pin validation failed` | INVESTIGATE - Certificate mismatch |
| `[CertPinning] ALERT: ... consecutive failures` | ALERT - Threshold exceeded |

---

## Emergency Response Checklist

### P1: Mass Failure Spike

- [ ] Check change management calendar for planned rotation
- [ ] If NOT planned: Alert security team immediately
- [ ] If planned: Verify certificate deployment on CDN
- [ ] Monitor failure rate for stabilization
- [ ] DO NOT disable pinning unless directed by security team

### Certificate Compromise

- [ ] Revoke compromised certificate (Cloudflare)
- [ ] Extract new certificate hash
- [ ] Update `certificatePinning.ts`
- [ ] Run `yarn ota` to deploy update
- [ ] Monitor for recovery

### Corporate Proxy Reports

- [ ] Identify affected organization
- [ ] Contact user's IT department
- [ ] Request SSL bypass for Happy domains
- [ ] Document in support ticket

---

## Communication Templates

### Security Update (Users)
```
Subject: Important Security Update for Happy App

We've deployed a security update. Please update to the latest version.
If you experience connection issues:
1. Force close and restart the app
2. Check your internet connection
3. Contact support if issues persist
```

### Corporate Network (IT Department)
```
Subject: Happy App - SSL Bypass Request

Please exclude these domains from SSL inspection:
- happy-api.enflamemedia.com
- happy-api-dev.enflamemedia.com
```

---

*Last Updated: January 2026 | HAP-884*
