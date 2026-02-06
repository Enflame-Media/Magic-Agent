# Fastlane - Happy iOS

Automated build, test, and deployment configuration for the Happy iOS app.

## Available Lanes

### `build`

Build the app for testing without code signing. Used in CI to verify compilation.

```bash
bundle exec fastlane build
```

### `test`

Run unit tests and UI tests on an iOS Simulator. Generates JUnit and HTML reports.

```bash
bundle exec fastlane test
```

### `lint`

Run SwiftLint to check code style (requires SwiftLint to be installed).

```bash
bundle exec fastlane lint
```

### `beta`

Deploy a new build to TestFlight. Automatically increments the build number, signs the app via match, builds, and uploads.

```bash
bundle exec fastlane beta changelog:"New feature description"
```

**Required environment variables:**
- `APPLE_ID` - Apple ID email
- `TEAM_ID` - Apple Developer Team ID
- `MATCH_PASSWORD` - Password for match certificate encryption
- `APP_STORE_CONNECT_API_KEY_ID` - App Store Connect API Key ID

### `release`

Deploy a new version to the App Store. Includes code signing, build, and App Store upload.

```bash
bundle exec fastlane release version:"1.2.0"
```

**Options:**
- `version` - Version number to set (optional)
- `skip_metadata` - Skip metadata upload (default: false)
- `skip_screenshots` - Skip screenshot upload (default: true)
- `submit_for_review` - Auto-submit for review (default: false)
- `automatic_release` - Auto-release after approval (default: false)

**Required environment variables:**
- All `beta` variables plus:
- `APP_STORE_CONNECT_API_ISSUER_ID` - App Store Connect API Issuer ID
- `APP_STORE_CONNECT_API_KEY_CONTENT` - App Store Connect API Key (.p8 content)

### `certificates`

Sync code signing certificates and provisioning profiles via match.

```bash
bundle exec fastlane certificates type:development
bundle exec fastlane certificates type:appstore
```

### `screenshots`

Capture App Store screenshots on multiple device sizes.

```bash
bundle exec fastlane screenshots
```

## Setup

### Prerequisites

1. Install Ruby (3.2+ recommended)
2. Install Bundler: `gem install bundler`
3. Install dependencies: `bundle install`

### Code Signing (match)

This project uses [fastlane match](https://docs.fastlane.tools/actions/match/) for code signing. Certificates and profiles are stored in a private git repository.

**Initial setup (once per team):**

```bash
bundle exec fastlane match init
bundle exec fastlane match development
bundle exec fastlane match appstore
```

**New machine setup:**

```bash
bundle exec fastlane certificates type:development readonly:true
```

### GitHub Actions Secrets

The following secrets must be configured in GitHub repository settings for CI/CD:

| Secret | Description |
|--------|-------------|
| `APPLE_ID` | Apple ID email for App Store Connect |
| `TEAM_ID` | Apple Developer Team ID |
| `ITC_TEAM_ID` | App Store Connect Team ID |
| `MATCH_PASSWORD` | Encryption password for match certificates |
| `MATCH_GIT_URL` | Git URL for match certificates repository |
| `MATCH_DEPLOY_KEY` | SSH deploy key for match repository |
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID from App Store Connect |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID from App Store Connect |
| `APP_STORE_CONNECT_API_KEY_CONTENT` | API Key .p8 file content |
| `FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD` | App-specific password for Apple ID |

## CI/CD Workflows

### `ios-ci.yml` - Continuous Integration

Triggered on pull requests and pushes to `main`/`develop`. Runs:
1. Build (no code signing)
2. Unit tests and UI tests
3. SwiftLint checks

### `ios-cd.yml` - Continuous Deployment

Triggered on merge to `main` or manual dispatch. Runs:
1. Pre-deploy test suite
2. Code signing via match
3. Build and upload to TestFlight (or App Store for release lane)

Manual dispatch supports choosing between `beta` and `release` lanes.
