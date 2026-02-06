# Certificate Pinning Test Execution Report (HAP-883)

This document tracks the execution of manual QA tests for certificate pinning, as defined in HAP-859's QA documentation (`certificate-pinning-qa.md`).

## Table of Contents

1. [Test Execution Summary](#test-execution-summary)
2. [Prerequisites Verification](#prerequisites-verification)
3. [iOS Test Execution Results](#ios-test-execution-results)
4. [Android Test Execution Results](#android-test-execution-results)
5. [MITM Proxy Test Execution Results](#mitm-proxy-test-execution-results)
6. [Edge Case Test Execution Results](#edge-case-test-execution-results)
7. [Bug Reports](#bug-reports)
8. [Final Sign-Off](#final-sign-off)

---

## Test Execution Summary

| Category | Total Tests | Passed | Failed | Blocked | Not Executed |
|----------|-------------|--------|--------|---------|--------------|
| iOS Tests | 5 | - | - | - | 5 |
| Android Tests | 5 | - | - | - | 5 |
| MITM Proxy Tests | 4 | - | - | - | 4 |
| Edge Case Tests | 5 | - | - | - | 5 |
| **Total** | **19** | **-** | **-** | **-** | **19** |

**Test Execution Status**: Not Started

**Last Updated**: -

---

## Prerequisites Verification

Complete this checklist before beginning test execution.

### Software Requirements

| Requirement | Version Required | Verified | Notes |
|-------------|------------------|----------|-------|
| Xcode | 15.0+ | [ ] | |
| Android Studio | Latest | [ ] | |
| Charles Proxy | Latest | [ ] | |
| OpenSSL | 1.1+ | [ ] | |
| Node.js | 18+ | [ ] | |
| Yarn | 1.22+ | [ ] | |

### Hardware Requirements

| Requirement | Available | Device Details |
|-------------|-----------|----------------|
| macOS computer | [ ] | Model: |
| Physical iOS device | [ ] | Model: , iOS Version: |
| Physical Android device | [ ] | Model: , Android Version: |

### Access Requirements

| Requirement | Verified | Notes |
|-------------|----------|-------|
| Happy API production credentials | [ ] | |
| Happy API development credentials | [ ] | |
| App signing certificates (iOS) | [ ] | |
| App signing certificates (Android) | [ ] | |
| Test user accounts | [ ] | Account(s): |

### Dependency Verification (HAP-858)

| Item | Status | Notes |
|------|--------|-------|
| Certificate hashes extracted | [ ] | Reference: HAP-858 |
| Hashes verified against production | [ ] | |
| `react-native-ssl-public-key-pinning` installed | [ ] | |
| `npx expo prebuild` completed | [ ] | |
| Development build available | [ ] | Build version: |

**Prerequisites Sign-Off**:
- Verified by: _________________
- Date: _________________

---

## iOS Test Execution Results

### Test iOS-1: Simulator Basic Functionality

**Reference**: `certificate-pinning-qa.md` Section: iOS Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | iOS-1 |
| **Tester** | |
| **Date** | |
| **Device** | iOS Simulator |
| **iOS Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Build and run app on iOS Simulator | App launches successfully | | |
| 2 | Open console log viewer in Xcode | Console accessible | | |
| 3 | Verify `[CertPinning] Successfully initialized` in logs | Pinning initialized | | |
| 4 | Trigger an API call (e.g., login, session list) | API call succeeds | | |
| 5 | Verify no certificate errors in logs | No `Pin validation failed` errors | | |

**Evidence**:
- Screenshot(s): [ ] Attached
- Log snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test iOS-2: Physical Device Basic Functionality

**Reference**: `certificate-pinning-qa.md` Section: iOS Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | iOS-2 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **iOS Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Build and install app on physical iPhone | App installs successfully | | |
| 2 | Launch app and complete initial setup | Setup completes | | |
| 3 | Connect to production API | Connection established | | |
| 4 | Verify normal app functionality | All features work | | |
| 5 | Check device console for pinning logs | `[CertPinning] Successfully initialized` present | | |

**Evidence**:
- Screenshot(s): [ ] Attached
- Log snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test iOS-3: MITM Proxy Detection (Charles Proxy)

**Reference**: `certificate-pinning-qa.md` Section: iOS Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | iOS-3 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **iOS Version** | |
| **Build Version** | |
| **Proxy Tool** | Charles Proxy |
| **Proxy Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Install Charles Proxy root certificate on iOS device | Certificate installed in Settings | | |
| 2 | Configure device to use Charles Proxy | Proxy settings applied | | |
| 3 | Launch Happy app | App launches | | |
| 4 | Attempt to trigger API call | **Connection MUST FAIL** | | |
| 5 | Verify error message shown to user | User-friendly error displayed | | |
| 6 | Check logs for `[CertPinning] Pin validation failed` | Error logged | | |

**Proxy Configuration**:
- Charles Proxy Computer IP: _________________
- Charles Proxy Port: _________________
- SSL Proxying enabled for domains: [ ] happy-api.enflamemedia.com, [ ] happy-api-dev.enflamemedia.com

**Evidence**:
- Screenshot of error message: [ ] Attached
- Charles Proxy log: [ ] Attached
- Device console log snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test iOS-4: Graceful Error Handling

**Reference**: `certificate-pinning-qa.md` Section: iOS Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | iOS-4 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **iOS Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Trigger certificate pin failure (use MITM proxy) | Pin validation fails | | |
| 2 | Observe error UI shown to user | Error message is clear and non-technical | | |
| 3 | Verify app does not crash | App remains stable | | |
| 4 | Verify retry option is available | User can retry | | |
| 5 | Remove proxy and retry | Connection succeeds | | |

**Error Message Displayed**:
```
[Record exact error message text here]
```

**Evidence**:
- Screenshot(s): [ ] Attached

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test iOS-5: Development Bypass (Localhost)

**Reference**: `certificate-pinning-qa.md` Section: iOS Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | iOS-5 |
| **Tester** | |
| **Date** | |
| **Device** | iOS Simulator |
| **iOS Version** | |
| **Build Version** | |
| **Local Server URL** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure app to use `localhost` server | Environment updated | | |
| 2 | Launch app | App launches | | |
| 3 | Verify `[CertPinning] Bypassing for local development` in logs | Bypass confirmed | | |
| 4 | Make API calls to local server | Calls succeed without pinning | | |

**Evidence**:
- Log snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

## Android Test Execution Results

### Test Android-1: Emulator Basic Functionality

**Reference**: `certificate-pinning-qa.md` Section: Android Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | Android-1 |
| **Tester** | |
| **Date** | |
| **Device** | Android Emulator |
| **Android Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Build and run app on Android Emulator | App launches successfully | | |
| 2 | Open Logcat in Android Studio | Logs accessible | | |
| 3 | Filter logs by `CertPinning` tag | Relevant logs visible | | |
| 4 | Verify `[CertPinning] Successfully initialized` in logs | Pinning initialized | | |
| 5 | Trigger an API call (e.g., login, session list) | API call succeeds | | |

**Evidence**:
- Screenshot(s): [ ] Attached
- Logcat snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test Android-2: Physical Device Basic Functionality

**Reference**: `certificate-pinning-qa.md` Section: Android Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | Android-2 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **Android Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Build and install APK on physical Android device | App installs successfully | | |
| 2 | Launch app and complete initial setup | Setup completes | | |
| 3 | Connect to production API | Connection established | | |
| 4 | Verify normal app functionality | All features work | | |
| 5 | Check Logcat for pinning logs | Initialization confirmed | | |

**Evidence**:
- Screenshot(s): [ ] Attached
- Logcat snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test Android-3: MITM Proxy Detection (Proxyman/Fiddler)

**Reference**: `certificate-pinning-qa.md` Section: Android Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | Android-3 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **Android Version** | |
| **Build Version** | |
| **Proxy Tool** | |
| **Proxy Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Install Proxyman/Fiddler root certificate on Android device | Certificate installed | | |
| 2 | Configure device WiFi to use proxy | Proxy settings applied | | |
| 3 | Launch Happy app | App launches | | |
| 4 | Attempt to trigger API call | **Connection MUST FAIL** | | |
| 5 | Verify error message shown to user | User-friendly error displayed | | |
| 6 | Check Logcat for `Pin validation failed` | Error logged | | |

**Proxy Configuration**:
- Proxy Computer IP: _________________
- Proxy Port: _________________
- SSL Proxying enabled for domains: [ ] happy-api.enflamemedia.com, [ ] happy-api-dev.enflamemedia.com

**Evidence**:
- Screenshot of error message: [ ] Attached
- Proxy log: [ ] Attached
- Logcat snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test Android-4: Graceful Error Handling

**Reference**: `certificate-pinning-qa.md` Section: Android Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | Android-4 |
| **Tester** | |
| **Date** | |
| **Device** | |
| **Android Version** | |
| **Build Version** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Trigger certificate pin failure (use MITM proxy) | Pin validation fails | | |
| 2 | Observe error UI shown to user | Error message is clear | | |
| 3 | Verify app does not crash | App remains stable | | |
| 4 | Verify retry option is available | User can retry | | |
| 5 | Remove proxy and retry | Connection succeeds | | |

**Error Message Displayed**:
```
[Record exact error message text here]
```

**Evidence**:
- Screenshot(s): [ ] Attached

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Test Android-5: Development Bypass (10.0.2.2)

**Reference**: `certificate-pinning-qa.md` Section: Android Testing Matrix

| Field | Value |
|-------|-------|
| **Test ID** | Android-5 |
| **Tester** | |
| **Date** | |
| **Device** | Android Emulator |
| **Android Version** | |
| **Build Version** | |
| **Local Server URL** | |

**Execution Steps**:

| Step | Action | Expected Result | Actual Result | Pass/Fail |
|------|--------|-----------------|---------------|-----------|
| 1 | Configure app to use `10.0.2.2` (emulator localhost) | Environment updated | | |
| 2 | Launch app on emulator | App launches | | |
| 3 | Verify bypass log message | `[CertPinning] Bypassing for local development` logged | | |
| 4 | Make API calls to local server | Calls succeed without pinning | | |

**Evidence**:
- Logcat snippet:
```
[Paste relevant logs here]
```

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

## MITM Proxy Test Execution Results

### MITM-1: Charles Proxy iOS Interception Test

**Reference**: `certificate-pinning-qa.md` Section: MITM Proxy Testing

| Field | Value |
|-------|-------|
| **Test ID** | MITM-1 |
| **Tester** | |
| **Date** | |
| **Platform** | iOS |
| **Proxy Tool** | Charles Proxy |
| **Proxy Version** | |

**Setup Verification**:

| Step | Completed | Notes |
|------|-----------|-------|
| Charles Proxy installed on computer | [ ] | |
| SSL Proxying enabled for Happy domains | [ ] | |
| Charles Root Certificate installed on iOS device | [ ] | |
| Full trust enabled in iOS Settings | [ ] | |
| Device configured to use Charles Proxy | [ ] | |

**Test Results**:

| Test | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| API call with proxy enabled | Connection fails, error shown | | |
| WebSocket connection with proxy | Connection fails | | |
| API call after proxy disabled | Connection succeeds | | |

**Evidence**:
- Charles Proxy SSL log: [ ] Attached
- iOS error screenshot: [ ] Attached

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### MITM-2: Proxyman Android Interception Test

**Reference**: `certificate-pinning-qa.md` Section: MITM Proxy Testing

| Field | Value |
|-------|-------|
| **Test ID** | MITM-2 |
| **Tester** | |
| **Date** | |
| **Platform** | Android |
| **Proxy Tool** | Proxyman |
| **Proxy Version** | |

**Setup Verification**:

| Step | Completed | Notes |
|------|-----------|-------|
| Proxyman installed on computer | [ ] | |
| SSL Proxying enabled for Happy domains | [ ] | |
| Root certificate exported as PEM | [ ] | |
| Certificate installed on Android device | [ ] | |
| Device WiFi configured to use proxy | [ ] | |

**Test Results**:

| Test | Expected | Actual | Pass/Fail |
|------|----------|--------|-----------|
| API call with proxy enabled | Connection fails, error shown | | |
| WebSocket connection with proxy | Connection fails | | |
| API call after proxy disabled | Connection succeeds | | |

**Evidence**:
- Proxyman SSL log: [ ] Attached
- Android error screenshot: [ ] Attached

**Notes**:
```
[Additional observations]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### MITM-3: Connection Attempt Logging

**Reference**: `certificate-pinning-qa.md` Section: MITM Proxy Testing

| Field | Value |
|-------|-------|
| **Test ID** | MITM-3 |
| **Tester** | |
| **Date** | |

**Verification**:

| Item | Verified | Notes |
|------|----------|-------|
| Pin failures logged with hostname | [ ] | |
| No sensitive data in logs | [ ] | |
| Error count incremented | [ ] | |
| Analytics event fired | [ ] | |

**Log Samples**:
```
[Paste relevant log samples demonstrating proper logging]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### MITM-4: Error Message Verification

**Reference**: `certificate-pinning-qa.md` Section: MITM Proxy Testing

| Field | Value |
|-------|-------|
| **Test ID** | MITM-4 |
| **Tester** | |
| **Date** | |

**Error Message Analysis**:

| Criteria | iOS | Android |
|----------|-----|---------|
| Message is user-friendly | [ ] | [ ] |
| No technical jargon | [ ] | [ ] |
| No certificate details | [ ] | [ ] |
| No server URLs | [ ] | [ ] |
| No stack traces | [ ] | [ ] |
| Safe to screenshot/share | [ ] | [ ] |

**iOS Error Message**:
```
[Record exact text]
```

**Android Error Message**:
```
[Record exact text]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

## Edge Case Test Execution Results

### Edge-1: Corporate Proxy Environment

**Reference**: `certificate-pinning-qa.md` Section: Edge Case Testing

| Field | Value |
|-------|-------|
| **Test ID** | Edge-1 |
| **Tester** | |
| **Date** | |
| **Network Type** | |
| **Platform** | |

**Test Execution**:

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Connect to corporate network with SSL inspection | Network connected | | |
| 2 | Launch Happy app | App launches | | |
| 3 | Attempt API call | Connection MUST FAIL | | |
| 4 | Verify error message | Error explains network issue | | |

**Notes**:
```
[If corporate proxy not available, note "SKIPPED - No corporate proxy access"]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED / [ ] SKIPPED

---

### Edge-2: Network with Packet Inspection

**Reference**: `certificate-pinning-qa.md` Section: Edge Case Testing

| Field | Value |
|-------|-------|
| **Test ID** | Edge-2 |
| **Tester** | |
| **Date** | |
| **Network Type** | |
| **Platform** | |

**Test Execution**:

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Connect to network with DPI | Connected | | |
| 2 | Attempt Happy app API calls | Connection fails if MITM active | | |
| 3 | Check logs | Pin validation failure logged | | |

**Notes**:
```
[If DPI network not available, note "SKIPPED - No DPI network access"]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED / [ ] SKIPPED

---

### Edge-3: Certificate Expiration Handling

**Reference**: `certificate-pinning-qa.md` Section: Edge Case Testing

| Field | Value |
|-------|-------|
| **Test ID** | Edge-3 |
| **Tester** | |
| **Date** | |
| **Platform** | |

**Test Execution**:

| Step | Action | Expected | Actual | Pass/Fail |
|------|--------|----------|--------|-----------|
| 1 | Modify `expirationDate` in config to past date | Config modified | | |
| 2 | Rebuild and run app | App runs | | |
| 3 | Verify pinning is disabled (graceful degradation) | Connections succeed | | |
| 4 | Verify warning logged | `[CertPinning] Pins expired` or similar | | |

**Modified Configuration**:
```typescript
expirationDate: 'YYYY-MM-DD' // Past date used
```

**Log Output**:
```
[Paste relevant logs]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Edge-4: Error Log Verification

**Reference**: `certificate-pinning-qa.md` Section: Edge Case Testing

| Field | Value |
|-------|-------|
| **Test ID** | Edge-4 |
| **Tester** | |
| **Date** | |
| **Platform** | |

**Security Verification**:

| Item | Checked | Contains Sensitive Data? |
|------|---------|--------------------------|
| Hostname logged | [ ] | [ ] Yes / [ ] No |
| Tokens in logs | [ ] | [ ] Yes / [ ] No |
| API keys in logs | [ ] | [ ] Yes / [ ] No |
| User data in logs | [ ] | [ ] Yes / [ ] No |
| Certificate details in logs | [ ] | [ ] Yes / [ ] No |

**Log Sample**:
```
[Paste sanitized log sample]
```

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

### Edge-5: Sensitive Data Leak Prevention

**Reference**: `certificate-pinning-qa.md` Section: Edge Case Testing

| Field | Value |
|-------|-------|
| **Test ID** | Edge-5 |
| **Tester** | |
| **Date** | |
| **Platform** | |

**User-Facing Error Message Analysis**:

| Item | Checked | Contains? |
|------|---------|-----------|
| Certificate details | [ ] | [ ] Yes / [ ] No |
| Server URLs | [ ] | [ ] Yes / [ ] No |
| Technical stack traces | [ ] | [ ] Yes / [ ] No |
| Internal error codes | [ ] | [ ] Yes / [ ] No |
| Pin hash values | [ ] | [ ] Yes / [ ] No |

**Error Message Screenshot**:
- [ ] Attached
- Safe to share publicly: [ ] Yes / [ ] No

**Result**: [ ] PASS / [ ] FAIL / [ ] BLOCKED

---

## Bug Reports

Track any bugs discovered during test execution.

### Bug Template

Use this template to document bugs found during testing:

```markdown
### BUG-XXX: [Brief Description]

**Discovered During**: Test [ID]
**Severity**: [ ] Critical / [ ] High / [ ] Medium / [ ] Low
**Platform**: [ ] iOS / [ ] Android / [ ] Both
**Linear Issue**: HAP-XXX (if created)

**Description**:
[Detailed description of the bug]

**Steps to Reproduce**:
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result**:
[What should happen]

**Actual Result**:
[What actually happened]

**Evidence**:
- [ ] Screenshot attached
- [ ] Log snippet attached
- [ ] Video recording attached

**Workaround**:
[If any workaround exists]
```

### Discovered Bugs

(None discovered yet - add bugs here as they are found)

---

## Final Sign-Off

### Test Execution Summary

| Category | Tests | Passed | Failed | Blocked | Skipped |
|----------|-------|--------|--------|---------|---------|
| iOS Tests | 5 | | | | |
| Android Tests | 5 | | | | |
| MITM Proxy Tests | 4 | | | | |
| Edge Case Tests | 5 | | | | |
| **Total** | **19** | | | | |

**Overall Pass Rate**: ____%

### Blocking Issues

| Issue ID | Description | Impact | Resolution |
|----------|-------------|--------|------------|
| | | | |

### Go/No-Go Decision

| Criteria | Status | Notes |
|----------|--------|-------|
| All critical tests passed | [ ] | |
| No P1/P2 bugs outstanding | [ ] | |
| MITM blocking verified | [ ] | |
| Error handling acceptable | [ ] | |
| No regressions detected | [ ] | |

**Decision**: [ ] GO for Production / [ ] NO-GO - Issues to Resolve

### Sign-Off Signatures

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Engineer | | | |
| iOS Developer | | | |
| Android Developer | | | |
| Security Lead | | | |
| Product Owner | | | |

---

## Appendix A: Quick Reference Commands

### Building the App

```bash
# Navigate to React Native app
cd /volume1/Projects/happy/apps/web/react

# Install dependencies
yarn install

# Generate native projects
npx expo prebuild --clean

# Build iOS
yarn ios

# Build Android
yarn android
```

### Viewing Logs

```bash
# iOS Simulator logs (Xcode)
# Open Xcode > Window > Devices and Simulators > Select device > Open Console

# Android Logcat
adb logcat | grep -i "CertPinning"

# Filter Android logs by tag
adb logcat -s ReactNativeJS:* CertPinning:*
```

### Certificate Verification

```bash
# Extract production certificate hash
echo | openssl s_client -servername happy-api.enflamemedia.com \
  -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# Check certificate expiration
echo | openssl s_client -servername happy-api.enflamemedia.com \
  -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -enddate -noout
```

---

## Appendix B: Test Data

### Test Accounts

| Environment | Email | Purpose |
|-------------|-------|---------|
| Production | tester@happy.engineering | Production testing |
| Development | dev-tester@happy.engineering | Dev API testing |

### Test Devices

| Platform | Device | OS Version | Notes |
|----------|--------|------------|-------|
| iOS | iPhone 15 Pro | iOS 17.x | Primary test device |
| iOS | iPhone 12 | iOS 14.x | Minimum supported |
| iOS | iPhone Simulator | iOS 17.x | Xcode simulator |
| Android | Pixel 7 | Android 14 | Primary test device |
| Android | Samsung Galaxy S21 | Android 12 | Alternative device |
| Android | Android Emulator | Android 14 | Android Studio |

### API Endpoints

| Endpoint | Purpose | Environment |
|----------|---------|-------------|
| `https://happy-api.enflamemedia.com/health` | Health check | Production |
| `https://happy-api-dev.enflamemedia.com/health` | Health check | Development |

---

*Document Version: 1.0*
*Created: 2026-01-14*
*Related Issues: HAP-883, HAP-859, HAP-858, HAP-624*
