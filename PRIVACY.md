# Privacy Policy for Happy Coder

**Last Updated: December 2025**

## Overview

Happy Coder is committed to protecting your privacy. This policy explains how we handle your data with our zero-knowledge encryption architecture.

## What We Collect

### Encrypted Data
- **Messages and Code**: All your Claude Code conversations and code snippets are end-to-end encrypted on your device before transmission. We store this encrypted data but have no ability to decrypt or read it.
- **Encryption Keys**: When you pair devices, encryption keys are transmitted between your devices in encrypted form. We cannot access or decrypt these keys.

### Metadata (Not Encrypted)
- **Message IDs**: Unique identifiers for message ordering and synchronization
- **Timestamps**: When messages were created and synced
- **Device IDs**: Anonymous identifiers for device pairing
- **Session IDs**: Identifiers for your Claude Code terminal sessions
- **Push Notification Tokens**: Device tokens for sending push notifications via Expo's push notification service

### Analytics (PostHog)
- **Anonymous Events**: We collect basic app usage events through PostHog to improve the app experience
- **Privacy by Design**: All analytics events use an anonymized ID derived from a secret key - we cannot match this back to any user or account
- **No Content Tracking**: We only track basic app usage events, never any message content, code, or personal information
- **Opt-Out Available**: You can disable analytics collection at any time in the app settings

### Subscription Management (Revenue Cat)
- **Account ID**: Revenue Cat uses your account ID to manage subscriptions and enable premium features
- **Backend Integration**: This ID allows us to provide additional features from our backend while maintaining end-to-end encryption for your content
- **Data Separation**: Purchase analytics sent to PostHog use the anonymized ID instead - we cannot match Revenue Cat data with PostHog analytics

### CLI Telemetry (Happy CLI Only)

The Happy CLI includes optional telemetry for error reporting and performance monitoring. This is completely separate from mobile app analytics.

#### Opt-In Only
- **Disabled by default**: No telemetry data is collected unless you explicitly enable it
- **Master switch**: Set `HAPPY_TELEMETRY=true` to enable telemetry
- **Anonymization enabled by default**: Even when telemetry is enabled, data is anonymized (`HAPPY_TELEMETRY_ANONYMIZE=true`)

#### What CLI Telemetry Can Collect (When Enabled)

| Category | Data | Purpose |
|----------|------|---------|
| **Errors** | Crash reports, error stack traces | Fix bugs and improve stability |
| **Usage** | Session start/end events, feature usage | Understand how features are used |
| **Performance** | Command duration, API latency | Identify performance bottlenecks |

#### What Anonymization Removes

When anonymization is enabled (default), the following data is automatically scrubbed:
- User IP addresses
- Usernames and email addresses
- Session IDs and machine IDs
- File paths and working directories
- API keys, tokens, and credentials
- Any data matching sensitive key patterns

#### How to Control CLI Telemetry

| Environment Variable | Purpose | Default |
|---------------------|---------|---------|
| `HAPPY_TELEMETRY` | Master switch (true/false) | `false` (disabled) |
| `HAPPY_TELEMETRY_ANONYMIZE` | Force anonymization | `true` (enabled) |

#### Technical Implementation
- Error reporting uses Sentry (industry-standard error monitoring)
- Usage and performance metrics are batched and sent periodically
- All telemetry respects the master switch - no data is collected when disabled
- Configuration is checked via environment variables first, then local settings

## What We Don't Collect
- Your actual code or conversation content (we can't decrypt it)
- Personal information beyond what you voluntarily include in encrypted messages
- Device information beyond anonymous IDs
- Location data

## How We Use Data

### Encrypted Data
- Stored on our servers solely for synchronization between your devices
- Transmitted to your paired devices when requested
- Retained until you delete it through the app

### Metadata
- Message IDs and timestamps are used to maintain proper message ordering
- Device IDs enable secure pairing between your devices
- Session IDs track your Claude Code terminal sessions for synchronization
- Push notification tokens are stored to enable notifications through Expo's service

### Push Notifications
Push notifications are sent directly from your devices to each other, not from our backend. This means:
- We never see the content of your notifications
- Notification content is generated on your device
- Only device-to-device communication occurs for notification content
- We use Expo's push notification service solely as a delivery mechanism

## Data Security

- **End-to-End Encryption**: Using TweetNaCl (same as Signal) for all sensitive data
- **Zero-Knowledge**: We cannot decrypt your data even if compelled
- **Secure Key Exchange**: Encryption keys are transmitted between your devices only in encrypted form that we cannot access
- **Open Source**: Our encryption implementation is publicly auditable
- **No Backdoors**: The architecture makes it impossible for us to access your content

## Data Retention

- Encrypted messages are retained indefinitely until you delete them
- Metadata is retained for system functionality
- Deleted data is permanently removed from our servers within 30 days
- CLI telemetry data (when enabled) is retained for 90 days for error reports, 30 days for usage/performance metrics

## Your Rights

You have the right to:
- Delete all your data through the app
- Export your encrypted data
- Audit our open-source code
- Use the app without providing any personal information

## Data Sharing

We do not share your data with anyone. Period.

## Changes to This Policy

We will notify users of any material changes to this privacy policy through the app. Continued use of the service after changes constitutes acceptance.

## Contact

For privacy concerns or questions:
- GitHub Issues: https://github.com/slopus/happy-coder/issues

## Compliance

Happy Coder is designed with privacy by default and complies with:
- GDPR (General Data Protection Regulation)
- CCPA (California Consumer Privacy Act)
- Privacy by Design principles

---

**Remember**: Your encryption keys are only shared between your own devices in encrypted form. We cannot read your code or conversations even if we wanted to.