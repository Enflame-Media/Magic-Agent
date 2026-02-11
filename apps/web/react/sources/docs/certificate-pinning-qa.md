# Certificate Pinning QA Testing Guide (HAP-859)

This document provides comprehensive manual QA testing procedures for certificate pinning in the Happy mobile app, as implemented in HAP-624.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Test Environment Setup](#test-environment-setup)
3. [iOS Testing Matrix](#ios-testing-matrix)
4. [Android Testing Matrix](#android-testing-matrix)
5. [MITM Proxy Testing](#mitm-proxy-testing)
6. [Edge Case Testing](#edge-case-testing)
7. [Certificate Rotation Testing](#certificate-rotation-testing)
8. [Sign-Off Checklist](#sign-off-checklist)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Xcode | 15.0+ | iOS builds and simulator |
| Android Studio | Latest | Android builds and emulator |
| Charles Proxy or Proxyman | Latest | MITM testing |
| OpenSSL | 1.1+ | Certificate hash extraction |
| Node.js | 18+ | Build tooling |
| Yarn | 1.22+ | Package management |

### Required Hardware

- macOS computer (for iOS builds)
- Physical iOS device (iPhone 12+ recommended, iOS 14+)
- Physical Android device (Android 9+)
- Stable network connection

### Required Access

- Happy API production credentials
- Happy API development credentials
- App signing certificates (iOS/Android)
- Test user accounts

---

## Test Environment Setup

### 1. Build Development App with Certificate Pinning

```bash
# Navigate to the React Native app
cd /volume1/Projects/happy/apps/web/react

# Install dependencies
yarn install

# Generate native projects with pinning configuration
npx expo prebuild --clean

# Verify react-native-ssl-public-key-pinning is installed
yarn list react-native-ssl-public-key-pinning
```

### 2. Verify Certificate Hashes

Before testing, verify the certificate hashes are correctly configured:

```bash
# Extract production API certificate hash
echo | openssl s_client -servername happy-api.enflamemedia.com \
  -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64

# Extract development API certificate hash
echo | openssl s_client -servername happy-api-dev.enflamemedia.com \
  -connect happy-api-dev.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -pubkey -noout | \
  openssl pkey -pubin -outform DER | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

Compare the output with hashes in `sources/utils/certificatePinning.ts`.

### 3. Configure Test Logging

Enable verbose logging for certificate pinning tests:

```bash
# Set environment variable for debug mode
export EXPO_PUBLIC_DEBUG=1
```

---

## iOS Testing Matrix

### Test iOS-1: Simulator Basic Functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Build and run app on iOS Simulator | App launches successfully |
| 2 | Open console log viewer in Xcode | Console accessible |
| 3 | Verify `[CertPinning] Successfully initialized` in logs | Pinning initialized |
| 4 | Trigger an API call (e.g., login, session list) | API call succeeds |
| 5 | Verify no certificate errors in logs | No `Pin validation failed` errors |

**Pass Criteria:** All API calls complete successfully, pinning is initialized

### Test iOS-2: Physical Device Basic Functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Build and install app on physical iPhone | App installs successfully |
| 2 | Launch app and complete initial setup | Setup completes |
| 3 | Connect to production API | Connection established |
| 4 | Verify normal app functionality | All features work |
| 5 | Check device console for pinning logs | `[CertPinning] Successfully initialized` present |

**Pass Criteria:** Full app functionality on physical device with pinning active

### Test iOS-3: MITM Proxy Detection (Charles Proxy)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Install Charles Proxy root certificate on iOS device | Certificate installed in Settings |
| 2 | Configure device to use Charles Proxy | Proxy settings applied |
| 3 | Launch Happy app | App launches |
| 4 | Attempt to trigger API call | **Connection MUST FAIL** |
| 5 | Verify error message shown to user | User-friendly error displayed |
| 6 | Check logs for `[CertPinning] Pin validation failed` | Error logged |

**Pass Criteria:** App rejects Charles Proxy certificate, displays error to user

### Test iOS-4: Graceful Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger certificate pin failure (use MITM proxy) | Pin validation fails |
| 2 | Observe error UI shown to user | Error message is clear and non-technical |
| 3 | Verify app does not crash | App remains stable |
| 4 | Verify retry option is available | User can retry |
| 5 | Remove proxy and retry | Connection succeeds |

**Pass Criteria:** Graceful error handling, app stability, recovery works

### Test iOS-5: Development Bypass (Localhost)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure app to use `localhost` server | Environment updated |
| 2 | Launch app | App launches |
| 3 | Verify `[CertPinning] Bypassing for local development` in logs | Bypass confirmed |
| 4 | Make API calls to local server | Calls succeed without pinning |

**Pass Criteria:** Localhost connections bypass pinning

---

## Android Testing Matrix

### Test Android-1: Emulator Basic Functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Build and run app on Android Emulator | App launches successfully |
| 2 | Open Logcat in Android Studio | Logs accessible |
| 3 | Filter logs by `CertPinning` tag | Relevant logs visible |
| 4 | Verify `[CertPinning] Successfully initialized` in logs | Pinning initialized |
| 5 | Trigger an API call (e.g., login, session list) | API call succeeds |

**Pass Criteria:** All API calls complete successfully on emulator

### Test Android-2: Physical Device Basic Functionality

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Build and install APK on physical Android device | App installs successfully |
| 2 | Launch app and complete initial setup | Setup completes |
| 3 | Connect to production API | Connection established |
| 4 | Verify normal app functionality | All features work |
| 5 | Check Logcat for pinning logs | Initialization confirmed |

**Pass Criteria:** Full app functionality on physical device with pinning active

### Test Android-3: MITM Proxy Detection (Proxyman/Fiddler)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Install Proxyman/Fiddler root certificate on Android device | Certificate installed |
| 2 | Configure device WiFi to use proxy | Proxy settings applied |
| 3 | Launch Happy app | App launches |
| 4 | Attempt to trigger API call | **Connection MUST FAIL** |
| 5 | Verify error message shown to user | User-friendly error displayed |
| 6 | Check Logcat for `Pin validation failed` | Error logged |

**Pass Criteria:** App rejects proxy certificate, displays error to user

### Test Android-4: Graceful Error Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger certificate pin failure (use MITM proxy) | Pin validation fails |
| 2 | Observe error UI shown to user | Error message is clear |
| 3 | Verify app does not crash | App remains stable |
| 4 | Verify retry option is available | User can retry |
| 5 | Remove proxy and retry | Connection succeeds |

**Pass Criteria:** Graceful error handling, app stability, recovery works

### Test Android-5: Development Bypass (10.0.2.2)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Configure app to use `10.0.2.2` (emulator localhost) | Environment updated |
| 2 | Launch app on emulator | App launches |
| 3 | Verify bypass log message | `[CertPinning] Bypassing for local development` logged |
| 4 | Make API calls to local server | Calls succeed without pinning |

**Pass Criteria:** Android emulator localhost bypass works

---

## MITM Proxy Testing

### Charles Proxy Setup (iOS)

1. **Install Charles Proxy** on your computer
2. **Enable SSL Proxying** for Happy API domains:
   - Proxy > SSL Proxying Settings
   - Add `happy-api.enflamemedia.com`
   - Add `happy-api-dev.enflamemedia.com`
3. **Install Charles Root Certificate** on iOS device:
   - Help > SSL Proxying > Install Charles Root Certificate on Mobile Device
   - Follow on-screen instructions
   - Go to Settings > General > About > Certificate Trust Settings
   - Enable full trust for Charles Proxy CA
4. **Configure iOS Proxy**:
   - Settings > WiFi > Your Network > Configure Proxy
   - Set to Manual, enter Charles computer IP and port 8888

### Proxyman Setup (Android)

1. **Install Proxyman** on your computer
2. **Enable SSL Proxying** for Happy API domains
3. **Export Root Certificate**:
   - Certificate > Export Root Certificate as PEM
4. **Install on Android**:
   - Copy certificate to device
   - Settings > Security > Install from storage
5. **Configure Android Proxy**:
   - WiFi Settings > Advanced > Proxy > Manual
   - Enter Proxyman computer IP and port 9090

### Verification Steps

| Test | Expected Behavior |
|------|-------------------|
| API call with proxy enabled | Connection fails, error shown |
| API call with proxy disabled | Connection succeeds |
| WebSocket connection with proxy | Connection fails |
| Image/asset loading with proxy | May succeed (non-API domains) |

---

## Edge Case Testing

### Test Edge-1: Corporate Proxy Environment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Connect to a corporate network with SSL inspection | Network connected |
| 2 | Launch Happy app | App launches |
| 3 | Attempt API call | **Connection MUST FAIL** |
| 4 | Verify user can understand the error | Error explains network issue |
| 5 | Provide instructions for IT exemption | User knows next steps |

**Pass Criteria:** Corporate proxies are blocked, user guidance provided

### Test Edge-2: Network with Packet Inspection

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Connect to network with deep packet inspection | Connected |
| 2 | Attempt Happy app API calls | Connection fails if MITM active |
| 3 | Log shows pin validation failure | Error logged |

**Pass Criteria:** DPI that modifies certificates is detected and blocked

### Test Edge-3: Certificate Expiration Handling

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Temporarily modify `expirationDate` in config to past date | Config modified |
| 2 | Rebuild and run app | App runs |
| 3 | Verify pinning is disabled (graceful degradation) | Connections succeed |
| 4 | Verify warning logged | `[CertPinning] Pins expired` or similar |

**Pass Criteria:** Expired pins result in graceful degradation, not lockout

### Test Edge-4: Error Log Verification

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger pin validation failure | Failure occurs |
| 2 | Capture all logs | Logs captured |
| 3 | Verify hostname is logged | `serverHostname` included |
| 4 | Verify NO sensitive data in logs | No tokens, keys, or user data |

**Pass Criteria:** Logs are informative but secure

### Test Edge-5: Sensitive Data Leak Prevention

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Trigger pin validation error | Error occurs |
| 2 | Review error message shown to user | Message displayed |
| 3 | Verify message contains NO certificate details | Generic message only |
| 4 | Verify message contains NO server URLs | No URLs exposed |
| 5 | Verify message contains NO technical stack traces | Clean error |

**Pass Criteria:** Error messages are safe for users to screenshot/share

---

## Certificate Rotation Testing

### Test Rotation-1: Backup Pin Validation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Identify current primary and backup pins | Pins documented |
| 2 | Remove primary pin from config (simulate rotation) | Config modified |
| 3 | Rebuild and run app | App runs |
| 4 | Verify API calls succeed with backup pin | Connections work |
| 5 | Restore primary pin | Config restored |

**Pass Criteria:** Backup pins successfully validate connections

### Test Rotation-2: OTA Pin Update Simulation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Document current pin configuration | Config documented |
| 2 | Add new test pin to configuration | New pin added |
| 3 | Deploy via OTA update (expo-updates) | Update deployed |
| 4 | Verify app receives and applies update | Update applied |
| 5 | Verify new pin is active | New pin in config |

**Pass Criteria:** Pin updates can be deployed via OTA without App Store release

---

## Sign-Off Checklist

### Pre-Release QA Sign-Off

| Category | Item | Tester | Date | Pass/Fail |
|----------|------|--------|------|-----------|
| **iOS Simulator** | | | | |
| | Basic API functionality | | | |
| | Certificate pinning initialized | | | |
| | No errors in normal operation | | | |
| **iOS Physical Device** | | | | |
| | Basic API functionality | | | |
| | Certificate pinning initialized | | | |
| | All app features working | | | |
| **iOS MITM Detection** | | | | |
| | Charles Proxy blocked | | | |
| | Graceful error shown | | | |
| | App does not crash | | | |
| **iOS Development** | | | | |
| | Localhost bypass works | | | |
| **Android Emulator** | | | | |
| | Basic API functionality | | | |
| | Certificate pinning initialized | | | |
| | No errors in normal operation | | | |
| **Android Physical Device** | | | | |
| | Basic API functionality | | | |
| | Certificate pinning initialized | | | |
| | All app features working | | | |
| **Android MITM Detection** | | | | |
| | Proxyman/Fiddler blocked | | | |
| | Graceful error shown | | | |
| | App does not crash | | | |
| **Android Development** | | | | |
| | 10.0.2.2 bypass works | | | |
| **Edge Cases** | | | | |
| | Corporate proxy handled | | | |
| | No sensitive data in logs | | | |
| | No sensitive data in errors | | | |
| **Certificate Rotation** | | | | |
| | Backup pins validated | | | |
| | OTA update mechanism tested | | | |
| **Performance** | | | | |
| | No noticeable latency increase | | | |
| | App startup time acceptable | | | |
| **User Experience** | | | | |
| | Error messages user-friendly | | | |
| | Recovery flow works | | | |

### Final Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Engineer | | | |
| iOS Developer | | | |
| Android Developer | | | |
| Security Lead | | | |
| Product Owner | | | |

---

## Troubleshooting

### Common Issues

#### Issue: "Pin validation failed" on all connections

**Cause:** Certificate hashes are incorrect or expired

**Solution:**
1. Re-extract certificate hashes using OpenSSL commands above
2. Update `sources/utils/certificatePinning.ts`
3. Rebuild the app

#### Issue: Pinning not initializing

**Cause:** Native module not properly linked

**Solution:**
1. Run `npx expo prebuild --clean`
2. Rebuild the native app
3. Check for `react-native-ssl-public-key-pinning` in dependencies

#### Issue: Development server connections failing

**Cause:** Localhost bypass not working

**Solution:**
1. Verify server URL starts with `localhost`, `127.0.0.1`, `10.0.2.2`, or `192.168.`
2. Check `shouldBypassPinning()` function in `certificatePinning.ts`

#### Issue: Proxy test not blocking connections

**Cause:** Proxy certificate not properly installed or trusted

**Solution:**
1. Re-install proxy root certificate
2. Enable full trust in iOS Settings
3. Verify SSL Proxying is enabled for correct domains

### Debug Commands

```bash
# Check if pinning module is installed
yarn list react-native-ssl-public-key-pinning

# View current certificate chain
openssl s_client -showcerts -connect happy-api.enflamemedia.com:443

# Verify certificate expiration
openssl s_client -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Check certificate issuer chain
openssl s_client -connect happy-api.enflamemedia.com:443 2>/dev/null | \
  openssl x509 -noout -issuer -subject
```

### Log Analysis

Key log messages to look for:

| Log Message | Meaning |
|-------------|---------|
| `[CertPinning] Successfully initialized` | Pinning is active |
| `[CertPinning] Bypassing for local development` | Dev bypass triggered |
| `[CertPinning] Pin validation failed` | MITM detected or wrong pins |
| `[CertPinning] Native SSL pinning module not available` | Module not linked |
| `[CertPinning] No pins configured for hostname` | Unknown domain |

---

## Appendix: Test Data

### Test Accounts

| Environment | Email | Purpose |
|-------------|-------|---------|
| Production | [tester@happy.engineering] | Production testing |
| Development | [dev-tester@happy.engineering] | Dev API testing |

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

## Automated Test Results

### Unit Tests (2026-01-14)

All certificate pinning unit tests passed successfully:

```
 ✓ sources/utils/certificatePinning.test.ts (10 tests) 72ms

 Test Files  1 passed (1)
 Tests       10 passed (10)
```

**Tests Verified:**
- Pin configuration for production API domain
- Pin configuration for development API domain
- Unknown domain handling (returns null)
- Localhost bypass (returns null)
- Minimum 2 pins per domain (iOS requirement)
- Valid base64-encoded pin hashes
- Expiration date format for graceful degradation
- Certificate pinning active state tracking
- Localhost URL bypass behavior
- Local IP address bypass behavior

### Certificate Chain Verification (2026-01-14)

Certificate extraction script verified the following chain:

**Production API (happy-api.enflamemedia.com):**
- Leaf: CN=happy-api.enflamemedia.com (Valid until Apr 4, 2026)
- Intermediate: CN=WE1 (Google Trust Services) (Valid until Feb 2029)
- Root: CN=GTS Root R4 (Cross-signed by GlobalSign) (Valid until Jan 2028)

**Development API (happy-api-dev.enflamemedia.com):**
- Leaf: CN=enflamemedia.com (Valid until Mar 7, 2026)
- Intermediate: CN=WE1 (Google Trust Services) (Valid until Feb 2029)
- Root: CN=GTS Root R4 (Cross-signed by GlobalSign) (Valid until Jan 2028)

**Note:** The implementation pins to GTS Root CAs (R1 and R4) which are stable and valid until 2036. The current chain uses GTS Root R4 which is cross-signed by GlobalSign for broader compatibility.

---

*Document Version: 1.1*
*Last Updated: 2026-01-14*
*Related Issue: HAP-859*
