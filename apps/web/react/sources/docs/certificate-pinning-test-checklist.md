# Certificate Pinning Test Checklist (HAP-883)

A quick-reference checklist for physical device testing of certificate pinning. Print this document and check off items as you complete each test.

---

## Pre-Test Setup

**Tester Name**: ___________________ **Date**: ___________________

### Environment Verification

- [ ] Development build created with certificate pinning enabled
- [ ] Charles Proxy / Proxyman installed and configured
- [ ] Test devices charged and ready
- [ ] Test accounts available

### Build Information

| Item | Value |
|------|-------|
| App Version | |
| Build Number | |
| Certificate Hash Source | HAP-858 |

---

## iOS Testing Checklist

### Device: _____________________ iOS Version: _____________________

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| iOS-1 | Simulator: API calls work | [ ] Pass [ ] Fail | |
| iOS-2 | Physical Device: API calls work | [ ] Pass [ ] Fail | |
| iOS-3 | MITM Proxy: Connection blocked | [ ] Pass [ ] Fail | |
| iOS-4 | Error handling: User-friendly message | [ ] Pass [ ] Fail | |
| iOS-5 | Localhost: Bypass works | [ ] Pass [ ] Fail | |

**iOS Summary**: _____ / 5 Passed

---

## Android Testing Checklist

### Device: _____________________ Android Version: _____________________

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| Android-1 | Emulator: API calls work | [ ] Pass [ ] Fail | |
| Android-2 | Physical Device: API calls work | [ ] Pass [ ] Fail | |
| Android-3 | MITM Proxy: Connection blocked | [ ] Pass [ ] Fail | |
| Android-4 | Error handling: User-friendly message | [ ] Pass [ ] Fail | |
| Android-5 | Local IP: Bypass works (10.0.2.2) | [ ] Pass [ ] Fail | |

**Android Summary**: _____ / 5 Passed

---

## MITM Proxy Testing Checklist

### Charles Proxy (iOS)

- [ ] Charles Proxy root certificate installed on device
- [ ] Device proxy configured (IP: __________ Port: __________)
- [ ] SSL Proxying enabled for `happy-api.enflamemedia.com`
- [ ] SSL Proxying enabled for `happy-api-dev.enflamemedia.com`

**Test Results**:
- [ ] API requests are BLOCKED when proxy active
- [ ] Error message shown is user-friendly
- [ ] Connection succeeds when proxy removed

### Proxyman/Fiddler (Android)

- [ ] Proxy root certificate installed on device
- [ ] Device WiFi proxy configured (IP: __________ Port: __________)
- [ ] SSL Proxying enabled for Happy domains

**Test Results**:
- [ ] API requests are BLOCKED when proxy active
- [ ] Error message shown is user-friendly
- [ ] Connection succeeds when proxy removed

---

## Edge Case Testing Checklist

| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| Edge-1 | Corporate proxy blocked | [ ] Pass [ ] Fail [ ] Skip | |
| Edge-2 | DPI network blocked | [ ] Pass [ ] Fail [ ] Skip | |
| Edge-3 | Expired pins = graceful degradation | [ ] Pass [ ] Fail | |
| Edge-4 | No sensitive data in logs | [ ] Pass [ ] Fail | |
| Edge-5 | No sensitive data in error UI | [ ] Pass [ ] Fail | |

---

## Security Verification

### Log Analysis

Verify NO sensitive data in logs:
- [ ] No auth tokens
- [ ] No API keys
- [ ] No user credentials
- [ ] No certificate hashes

### Error Message Analysis

Verify error messages are safe:
- [ ] No technical jargon
- [ ] No server URLs
- [ ] No stack traces
- [ ] Safe to screenshot

---

## Bugs Found

| Bug | Severity | Platform | Linear Issue |
|-----|----------|----------|--------------|
| | | | |
| | | | |
| | | | |

---

## Final Sign-Off

### Summary

| Category | Passed | Failed | Total |
|----------|--------|--------|-------|
| iOS | | | 5 |
| Android | | | 5 |
| MITM | | | 4 |
| Edge Cases | | | 5 |
| **Total** | | | **19** |

### Decision

- [ ] **GO** - Ready for production
- [ ] **NO-GO** - Issues must be resolved

### Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| QA Engineer | | | |
| Developer | | | |
| Security Lead | | | |

---

## Quick Reference

### Log Patterns

| Pattern | Meaning |
|---------|---------|
| `[CertPinning] Successfully initialized` | Pinning active |
| `[CertPinning] Pin validation failed` | MITM detected |
| `[CertPinning] Bypassing for local development` | Dev mode |

### Commands

```bash
# iOS logs (Xcode Console)
# Android logs
adb logcat | grep -i "CertPinning"

# Verify certificate
echo | openssl s_client -servername happy-api.enflamemedia.com \
  -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -enddate -noout
```

---

*HAP-883 | Certificate Pinning Physical Device Testing*
