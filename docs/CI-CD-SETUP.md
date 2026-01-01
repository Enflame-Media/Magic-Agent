# macOS CI/CD Setup Guide

This document describes how to configure CI/CD for the Happy macOS application using GitHub Actions and optionally Xcode Cloud.

## Overview

The Happy macOS app uses a two-stage CI/CD pipeline:

1. **Build and Test** - Runs on every push and PR
2. **Archive and Deploy** - Runs on pushes to `main` or manual triggers

## GitHub Actions Setup

### Required Secrets

Configure these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `MAC_BUILD_CERTIFICATE_BASE64` | Apple Distribution certificate (.p12) encoded as base64 | Export from Keychain, then `base64 -i certificate.p12` |
| `MAC_P12_PASSWORD` | Password for the .p12 certificate | Set when exporting from Keychain |
| `KEYCHAIN_PASSWORD` | Arbitrary password for the temporary CI keychain | Generate a secure random string |
| `MAC_PROVISIONING_PROFILE_BASE64` | Mac App Store provisioning profile encoded as base64 | Download from Apple Developer Portal, then `base64 -i profile.provisionprofile` |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID (10 characters) | Find in Apple Developer Portal > Membership |
| `ASC_KEY_ID` | App Store Connect API Key ID | Create in App Store Connect > Users and Access > Keys |
| `ASC_ISSUER_ID` | App Store Connect API Issuer ID | Found on the API Keys page in App Store Connect |
| `ASC_KEY` | App Store Connect API private key (.p8 contents) | Downloaded when creating the API key (one-time download) |

### Obtaining Certificates and Profiles

#### 1. Distribution Certificate

```bash
# Export from Keychain Access:
# 1. Open Keychain Access
# 2. Find "Apple Distribution: Your Name (TEAM_ID)"
# 3. Right-click > Export...
# 4. Save as .p12, set a password

# Convert to base64:
base64 -i YourCertificate.p12 | pbcopy
# Paste into MAC_BUILD_CERTIFICATE_BASE64 secret
```

#### 2. Provisioning Profile

```bash
# Download from Apple Developer Portal:
# 1. Go to Certificates, Identifiers & Profiles
# 2. Profiles > Your Mac App Store profile
# 3. Download the .provisionprofile file

# Convert to base64:
base64 -i Happy_Mac_App_Store.provisionprofile | pbcopy
# Paste into MAC_PROVISIONING_PROFILE_BASE64 secret
```

#### 3. App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to Users and Access > Keys
3. Click "+" to generate a new key
4. Select "Admin" or "App Manager" role
5. Download the .p8 file (only available once!)
6. Copy the Key ID and Issuer ID

```bash
# Copy the .p8 contents:
cat AuthKey_XXXXXXXXXX.p8 | pbcopy
# Paste into ASC_KEY secret
```

### Manual Workflow Trigger

To manually deploy a build:

1. Go to Actions > Build macOS
2. Click "Run workflow"
3. Select destination:
   - `testflight` - Upload to TestFlight for beta testing
   - `app-store` - Submit for App Store review

## Xcode Cloud Setup (Alternative)

Xcode Cloud is Apple's native CI/CD service, integrated directly into Xcode.

### Setting Up Xcode Cloud

1. Open the project in Xcode
2. Go to Product > Xcode Cloud > Create Workflow
3. Configure triggers (e.g., push to main)
4. Set up archive and distribute actions

### Custom Build Scripts

The following scripts are included for Xcode Cloud:

| Script | Purpose |
|--------|---------|
| `ci_scripts/ci_post_clone.sh` | Runs after cloning - installs dependencies |
| `ci_scripts/ci_pre_xcodebuild.sh` | Runs before each build - validation |
| `ci_scripts/ci_post_xcodebuild.sh` | Runs after each build - post-processing |

### Xcode Cloud Environment Variables

These are automatically available in Xcode Cloud:

| Variable | Description |
|----------|-------------|
| `CI_XCODE_PROJECT` | Path to .xcodeproj |
| `CI_XCODE_SCHEME` | Current scheme |
| `CI_BUILD_NUMBER` | Unique build number |
| `CI_COMMIT` | Git commit SHA |
| `CI_BRANCH` | Git branch name |
| `CI_ARCHIVE_PATH` | Path to archive (post-archive) |

## Security Best Practices

### Certificate and Key Management

- **Never commit** certificates, profiles, or API keys to the repository
- **Rotate regularly** - Update certificates before they expire
- **Use minimum permissions** - API keys should have only required access
- **Audit access** - Review who has access to secrets

### Keychain Security

The workflow creates a temporary keychain that:
- Is isolated from the system keychain
- Has a 6-hour auto-lock timeout
- Is deleted after every build (success or failure)

### Secret Masking

GitHub Actions automatically masks secrets in logs. However:
- Avoid `echo`ing secrets directly
- Use environment variables rather than inline `${{ secrets.X }}`
- The workflow follows these practices

## Troubleshooting

### Common Issues

#### "No signing certificate found"

1. Verify certificate is correctly base64-encoded
2. Check that the P12 password is correct
3. Ensure the certificate hasn't expired

```bash
# Verify certificate expiration:
security find-certificate -c "Apple Distribution" -p | openssl x509 -noout -dates
```

#### "Profile doesn't match bundle identifier"

1. Verify the provisioning profile is for `com.enflame.happy`
2. Ensure it's a Mac App Store distribution profile
3. Check that the profile includes the distribution certificate

#### "Unable to upload to App Store Connect"

1. Verify API key has correct permissions
2. Check that the Issuer ID is correct
3. Ensure the app is registered in App Store Connect

### Debug Mode

Add this step to debug certificate issues:

```yaml
- name: Debug signing
  run: |
    security find-identity -v -p codesigning
    ls -la ~/Library/MobileDevice/Provisioning\ Profiles/
```

## Build Artifacts

Each successful build produces:

| Artifact | Contents | Retention |
|----------|----------|-----------|
| `test-results` | Test result bundle (.xcresult) | 7 days |
| `Happy-Archive-N` | Signed archive (.xcarchive) | 30 days |
| `Happy-Export-N` | Exported app/pkg | 30 days |

## Related Documentation

- [Apple: Distributing Your App for Beta Testing and Releases](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Apple: Writing Custom Build Scripts for Xcode Cloud](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts)
- [GitHub: Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
