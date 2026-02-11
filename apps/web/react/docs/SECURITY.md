# Security Documentation

This document outlines the security measures implemented in Happy and their limitations.

## Credential Storage

Happy stores authentication credentials differently depending on the platform:

### Native Apps (iOS/Android) - Recommended

On native platforms, Happy uses **hardware-backed secure storage**:

- **iOS**: Keychain Services with Secure Enclave integration
- **Android**: Android Keystore System

These storage mechanisms are protected by the device's hardware security module (HSM) and are:
- Encrypted with device-specific keys
- Protected from other apps (sandboxed)
- Resistant to offline attacks
- Not accessible even with root/jailbreak in most cases

**Recommendation**: For maximum security of your credentials, use the iOS or Android native apps.

### Web Browser

On web, Happy uses **sessionStorage with AES-256-GCM encryption**:

```
┌─────────────────────────────────────────────────┐
│                  sessionStorage                  │
├─────────────────────────────────────────────────┤
│  auth_credentials: [AES-256-GCM encrypted]      │
│  auth_enc_key: [Raw encryption key]             │
└─────────────────────────────────────────────────┘
```

#### Security Properties

| Property | Status | Notes |
|----------|--------|-------|
| At-rest encryption | ✅ | AES-256-GCM via Web Crypto API |
| Session-scoped | ✅ | Cleared when browser closes |
| HTTPS required | ✅ | Web Crypto requires secure context |
| CSP headers | ✅ | Reduces XSS attack surface |
| XSS protection | ⚠️ Limited | Key accessible to JavaScript |
| Hardware isolation | ❌ | Not available on web platform |

#### Known Limitations

**The encryption key is stored alongside the encrypted data in sessionStorage.** This is an inherent limitation of the web platform - browsers do not provide hardware-backed keystores like native apps do.

This means:
1. The encryption protects against casual inspection (e.g., someone glancing at DevTools)
2. It does **not** protect against active XSS attacks - malicious JavaScript can read both the key and encrypted data
3. Tokens are cleared when you close the browser (sessionStorage), reducing the exposure window

#### Mitigations

We implement defense-in-depth to minimize XSS risk:

1. **Content Security Policy (CSP)**: Strict CSP headers limit what scripts can execute
2. **X-Frame-Options: DENY**: Prevents clickjacking attacks
3. **X-Content-Type-Options: nosniff**: Prevents MIME-type sniffing attacks
4. **sessionStorage**: Tokens cleared on browser close (unlike localStorage)
5. **Secure Context Required**: Web Crypto API only works over HTTPS

## End-to-End Encryption

All session data synchronized between devices uses **end-to-end encryption** with TweetNaCl (NaCl Box):

- Keys are generated on your devices and never sent to servers
- The server acts as a "zero-knowledge" relay
- Session content is encrypted before transmission
- Only your connected devices can decrypt the data

For details, see [ENCRYPTION-ARCHITECTURE.md](../../docs/ENCRYPTION-ARCHITECTURE.md).

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly:

1. **Do not** create a public GitHub issue
2. Email security concerns to the development team
3. Include steps to reproduce if possible

## References

- [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html)
- [Web Crypto API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
