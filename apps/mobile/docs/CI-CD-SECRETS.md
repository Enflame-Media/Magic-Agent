# Mobile CI/CD Secrets Configuration

This document describes all the secrets required to run the mobile CI/CD pipeline for iOS and Android builds.

## Required GitHub Secrets

All secrets should be configured in GitHub Repository Settings → Secrets and variables → Actions.

### iOS Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `APPLE_TEAM_ID` | Apple Developer Team ID | Apple Developer Portal → Membership → Team ID |
| `MATCH_PASSWORD` | Encryption password for Match certificates repo | Generate: `openssl rand -base64 24` |
| `MATCH_GIT_URL` | Private Git repo URL for Match certificates | Create private repo, e.g., `https://github.com/org/certificates.git` |
| `MATCH_GIT_BASIC_AUTHORIZATION` | Base64 encoded `username:token` for Git auth | `echo -n "username:personal_access_token" \| base64` |
| `ASC_KEY_ID` | App Store Connect API Key ID | App Store Connect → Users and Access → Keys |
| `ASC_ISSUER_ID` | App Store Connect API Issuer ID | App Store Connect → Users and Access → Keys |
| `ASC_KEY` | Base64 encoded App Store Connect API private key (.p8) | `base64 -i AuthKey_XXXXXXXXXX.p8` |
| `KEYCHAIN_PASSWORD` | Temporary keychain password for CI | Generate: `openssl rand -base64 24` |

### Android Secrets

| Secret Name | Description | How to Obtain |
|-------------|-------------|---------------|
| `ANDROID_KEYSTORE_BASE64` | Base64 encoded Android signing keystore | `base64 -i your-keystore.jks` |
| `KEYSTORE_PASSWORD` | Password for the keystore | Set when creating keystore |
| `KEYSTORE_ALIAS` | Key alias within the keystore | Set when creating keystore |
| `KEY_PASSWORD` | Password for the specific key | Set when creating keystore |
| `PLAY_STORE_JSON_KEY` | Google Play API service account JSON key | See [Play Store Setup](#play-store-api-setup) |

---

## Setup Instructions

### 1. iOS: Create App Store Connect API Key

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Navigate to **Users and Access** → **Keys** (under Integrations)
3. Click **Generate API Key**
4. Name: `Happy CI/CD`
5. Access: `App Manager` or `Admin`
6. Download the `.p8` file (only available once!)
7. Note the **Key ID** and **Issuer ID**

```bash
# Encode the key for GitHub Secrets
base64 -i AuthKey_XXXXXXXXXX.p8 | pbcopy
```

### 2. iOS: Set Up Fastlane Match

Match stores iOS certificates and provisioning profiles in a private Git repository.

```bash
# 1. Create a private repository for certificates
# e.g., https://github.com/Enflame-Media/ios-certificates (PRIVATE!)

# 2. Initialize Match in the mobile app directory
cd apps/mobile
bundle exec fastlane match init

# 3. Generate certificates (first time only)
bundle exec fastlane match appstore
bundle exec fastlane match development
```

**Important**: The MATCH_GIT_URL should use HTTPS with token authentication for CI:
```
https://github.com/Enflame-Media/ios-certificates.git
```

### 3. Android: Create Signing Keystore

```bash
# Generate a new keystore (first time only)
keytool -genkey -v \
  -keystore happy-release.jks \
  -alias happy \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_KEYSTORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD

# Encode for GitHub Secrets
base64 -i happy-release.jks | pbcopy
```

**Store the keystore securely!** If lost, you cannot update your app on Play Store.

### 4. Android: Play Store API Setup {#play-store-api-setup}

1. Go to [Google Play Console](https://play.google.com/console/)
2. Navigate to **Setup** → **API access**
3. Link or create a Google Cloud project
4. Click **Create new service account**
5. In Google Cloud Console:
   - Create service account with name `happy-ci-cd`
   - Grant role: **Service Account User**
   - Create JSON key and download
6. Back in Play Console:
   - Click **Refresh service accounts**
   - Grant access to the service account
   - Permissions needed: **Release to production**, **Manage store presence**

```bash
# The JSON key content goes directly into PLAY_STORE_JSON_KEY secret
# Do NOT base64 encode it - paste the raw JSON
```

---

## Local Development

For local Fastlane usage, create a `.env` file (gitignored):

```bash
# apps/mobile/.env

# iOS
MATCH_PASSWORD=your-match-password
MATCH_GIT_URL=https://github.com/Enflame-Media/ios-certificates.git
FASTLANE_TEAM_ID=YOUR_TEAM_ID

# Android
KEYSTORE_PATH=./keystore.jks
KEYSTORE_PASSWORD=your-keystore-password
KEYSTORE_ALIAS=happy
KEY_PASSWORD=your-key-password
```

---

## Security Best Practices

1. **Never commit secrets** - All sensitive values go in GitHub Secrets
2. **Use environment-specific keys** - Separate keys for development vs production
3. **Rotate secrets periodically** - Especially after team member departures
4. **Limit API key permissions** - Use minimum required access levels
5. **Private certificate repository** - Match repo must be private
6. **Audit access** - Regularly review who has access to secrets

---

## Troubleshooting

### Match: "Could not decrypt certificates"
- Ensure `MATCH_PASSWORD` matches what was used to encrypt
- Verify the certificates repo is accessible

### iOS: "No signing certificate found"
- Run `fastlane match appstore --readonly false` locally to regenerate
- Check Apple Developer Portal for expired certificates

### Android: "Keystore was tampered with"
- Verify `KEYSTORE_PASSWORD` is correct
- Re-encode the keystore: `base64 -i keystore.jks`

### Play Store: "Authentication failed"
- Verify service account has correct permissions
- Check JSON key is valid and not base64 encoded
- Ensure API access is enabled in Play Console

---

## Required First-Time Setup Checklist

- [ ] Create private Git repository for iOS certificates
- [ ] Run `fastlane match init` and `fastlane match appstore`
- [ ] Create App Store Connect API key
- [ ] Generate Android signing keystore
- [ ] Set up Play Store API service account
- [ ] Add all secrets to GitHub repository
- [ ] Test workflow with `workflow_dispatch` trigger
