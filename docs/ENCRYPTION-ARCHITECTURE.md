# Happy Encryption Architecture

This document describes the encryption architecture used across the Happy platform. Understanding this architecture is essential for security reviews, development, and troubleshooting.

## Overview

Happy uses a **zero-knowledge architecture** where the server cannot decrypt user data. All sensitive user information is encrypted client-side before transmission, and the server stores only encrypted blobs.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENCRYPTION ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐       │
│  │  happy-cli  │◄──────► │  happy-server    │◄──────► │  happy-app  │       │
│  │  (Node.js)  │  E2E    │  (Workers)       │  E2E    │ (React Nat) │       │
│  │             │  Enc    │                  │  Enc    │             │       │
│  └──────┬──────┘         └────────┬─────────┘         └──────┬──────┘       │
│         │                         │                          │               │
│         │          ┌──────────────┼──────────────┐          │               │
│         │          │              │              │          │               │
│         ▼          ▼              ▼              ▼          ▼               │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────┐ ┌─────────────┐          │
│  │ AES-256-GCM │ │ apps/macos  │ │ TweetNaCl    │ │ AES-256-GCM │          │
│  │ + Key Ver.  │ │ (CryptoKit) │ │ secretbox    │ │ + SecretBox │          │
│  │ + Legacy    │ │ AES-256-GCM │ │ (svr secrets)│ │ (legacy)    │          │
│  └─────────────┘ └─────────────┘ └──────────────┘ └─────────────┘          │
│                                                                              │
│  ═══════════════════════════════════════════════════════════════════════    │
│   Layer 1: TLS 1.3 Transport (all connections)                               │
│   Layer 2: End-to-End Encryption (user data - CLI/App/macOS clients)         │
│   Layer 3: Server-Side Encryption (server-managed secrets only)              │
│  ═══════════════════════════════════════════════════════════════════════    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Encryption Layers

### Layer 1: Transport Security (TLS)

All HTTP/WebSocket connections use TLS 1.3 for transport encryption.

| Component | Transport |
|-----------|-----------|
| CLI → Server | HTTPS/WSS |
| App → Server | HTTPS/WSS |
| Server APIs | HTTPS only |

**Note**: Transport encryption is separate from and in addition to the application-level encryption described below.

### Layer 2: End-to-End Encryption (Client-Side)

**Purpose**: Protect user data (sessions, messages, metadata) so the server cannot read it.

| What's Encrypted | Where Encrypted | Key Source |
|------------------|-----------------|------------|
| Session data | CLI/App | User's master secret |
| Messages | CLI/App | Per-session data key |
| Machine metadata | CLI/App | User's master secret |
| Artifacts | CLI/App | Per-artifact data key |

The server stores encrypted blobs and **cannot decrypt them**.

### Layer 3: Server-Side Encryption

**Purpose**: Protect server-managed secrets like AI API tokens (OpenAI, Anthropic keys).

| What's Encrypted | Where Encrypted | Key Source |
|------------------|-----------------|------------|
| AI vendor tokens | Server | HANDY_MASTER_SECRET |
| OAuth tokens | Server | HANDY_MASTER_SECRET |

**Important**: Server-side encryption uses a completely different key hierarchy from E2E encryption. These are intentionally separate systems.

## Algorithm Choices by Component

### CLI (`apps/cli/src/api/encryption.ts`)

The CLI uses **AES-256-GCM** as the primary algorithm with legacy TweetNaCl support.

```typescript
// Modern encryption (AES-256-GCM with key versioning)
encryptWithDataKey(data, dataKey)  // Version 0x00 bundles
encryptWithKeyVersion(data, dataKey, keyVersion)  // Version 0x01 bundles

// Legacy encryption (TweetNaCl secretbox)
encryptLegacy(data, secret)  // XSalsa20-Poly1305
```

**Features**:
- **AES-256-GCM**: Hardware-accelerated on modern CPUs, AEAD authentication
- **Key Versioning**: Supports key rotation via `KeyVersionManager`
- **Hybrid Nonce**: Random bytes + monotonic counter prevents nonce reuse
- **Version Byte**: First byte indicates format (0x00 = legacy, 0x01 = versioned)

**Bundle Format (Version 0x00)**:
```
[version:1][nonce:12][ciphertext:N][authTag:16]
```

**Bundle Format (Version 0x01 - with key versioning)**:
```
[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
```

### macOS (`apps/macos/Happy/Services/EncryptionService.swift`)

The macOS app uses **AES-256-GCM** via CryptoKit, matching the primary E2E format.

```swift
// Encrypt using AES-256-GCM
let encrypted = try EncryptionService.encrypt(data, with: symmetricKey)

// Decrypt using AES-256-GCM
let decrypted = try EncryptionService.decrypt(encrypted, with: symmetricKey)
```

**Features**:
- **AES-256-GCM**: Native CryptoKit implementation with hardware acceleration
- **Hybrid Nonce**: 4 random bytes + 8-byte counter prevents nonce reuse
- **Version Detection**: Supports both v0 (0x00) and v1 (0x01) bundle formats
- **Key Derivation**: X25519 ECDH with HKDF using same parameters as CLI/App

**Bundle Format**:
```
[version:1][nonce:12][ciphertext:N][authTag:16]
```

**Note**: The macOS app does NOT support the legacy secretbox format (XSalsa20-Poly1305) as it only needs to interoperate with modern encrypted data created by happy-cli and happy-app.

### App (`apps/web/react/sources/sync/encryption/`)

The App supports both legacy and modern encryption for interoperability.

```typescript
// Modern encryption
class AES256Encryption implements Encryptor, Decryptor

// Legacy encryption (for older sessions)
class SecretBoxEncryption implements Encryptor, Decryptor
```

**Features**:
- **AES256Encryption**: Uses Web Crypto API (AES-GCM)
- **SecretBoxEncryption**: TweetNaCl secretbox (XSalsa20-Poly1305)
- **EncryptionCache**: Performance optimization for frequently accessed data
- **SessionEncryption/MachineEncryption**: High-level abstractions per entity type

**Key Derivation**:
```typescript
// Derive content data key from master secret
const contentDataKey = await deriveKey(masterSecret, 'Happy EnCoder', ['content']);

// Create keypair for data encryption key operations
const contentKeyPair = sodium.crypto_box_seed_keypair(contentDataKey);
```

### Server Workers (`apps/server/workers/src/lib/encryption.ts`)

The server uses **TweetNaCl secretbox only** for server-side secrets.

```typescript
// Encrypt a string with path-based key derivation
await encryptString(['user', userId, 'vendors', vendor, 'token'], apiKey)

// Decrypt with the same path
await decryptString(['user', userId, 'vendors', vendor, 'token'], encryptedData)
```

**Features**:
- **TweetNaCl secretbox**: XSalsa20-Poly1305 authenticated encryption
- **HKDF Key Derivation**: Unique keys per path from HANDY_MASTER_SECRET
- **Key Cache**: Up to 1000 cached derived keys for performance
- **Path-Based Keys**: `['user', userId, 'vendors', 'openai', 'token']`

**Why Simpler?**: The server only encrypts server-managed secrets. It doesn't need:
- Key rotation (secrets can be re-encrypted when rotated)
- Multiple algorithm support (no legacy data)
- Version tracking (single format)

## Why Different Algorithms?

### End-to-End (CLI & App): AES-256-GCM

Chosen for:
1. **Performance**: Hardware acceleration (AES-NI) on modern devices
2. **Key Rotation**: Version byte enables seamless key rotation
3. **Interoperability**: Both CLI (Node.js) and App (React Native) can use it
4. **AEAD**: Built-in authentication prevents tampering

### Server-Side: TweetNaCl secretbox

Chosen for:
1. **Simplicity**: No configuration, audited, secure by default
2. **Sufficient**: Server secrets don't need complex key management
3. **Performance**: Fast enough for low-volume secret access
4. **Proven**: TweetNaCl is a widely audited library

## Key Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KEY HIERARCHY                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CLIENT-SIDE (E2E)                          SERVER-SIDE                      │
│  ═════════════════                          ═══════════════                  │
│                                                                              │
│  User Master Secret                         HANDY_MASTER_SECRET              │
│        │                                           │                         │
│        ├── Content Data Key                        │                         │
│        │       │                                   │                         │
│        │       ├── Session Keys                    └── HKDF                  │
│        │       │                                        │                    │
│        │       ├── Machine Keys                         ├── user/X/vendors/  │
│        │       │                                        │      openai/token  │
│        │       └── Artifact Keys                        │                    │
│        │                                                ├── user/X/vendors/  │
│        └── Analytics ID (derived)                       │      anthropic/    │
│                                                         │                    │
│                                                         └── ... (per-path)   │
│                                                                              │
│  [Stored on device]                         [Stored in env variable]         │
│  [Never sent to server]                     [Server-only access]             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Client-Side Key Derivation

1. **Master Secret**: User's 32-byte secret, stored locally (`~/.happy/access.key`)
2. **Content Data Key**: Derived via HKDF with context `['content']`
3. **Per-Entity Keys**: Each session/machine/artifact can have its own data encryption key

### Server-Side Key Derivation

1. **HANDY_MASTER_SECRET**: Environment variable (32+ characters)
2. **Path-Derived Keys**: HKDF with path as info (e.g., `user/abc123/vendors/openai/token`)

## Security Properties

### What the Server Can See

| Data | Visible to Server? |
|------|-------------------|
| Session IDs | Yes |
| Session content | No (encrypted) |
| Message content | No (encrypted) |
| Machine IDs | Yes |
| Machine metadata | No (encrypted) |
| User public keys | Yes |
| AI API tokens | No (server-encrypted) |

### What the Server Cannot Do

- Decrypt user session data
- Read message content
- Access user encryption keys
- Impersonate users (requires private key)

### Attack Resistance

| Attack | Mitigation |
|--------|------------|
| Server compromise | E2E encryption - user data remains encrypted |
| Man-in-the-middle | TLS + E2E double protection |
| Nonce reuse | Hybrid nonce (random + counter) |
| Key compromise | Key versioning enables rotation |
| Replay attacks | Challenge-response authentication |

## Implementation Details

### Nonce Generation (CLI)

The CLI uses a hybrid nonce to prevent collisions:

```typescript
function generateHybridNonce(totalLength: number): Uint8Array {
  // Structure: [random bytes][8-byte counter (big-endian)]
  // 24-byte nonce (NaCl): 16 random + 8 counter
  // 12-byte nonce (AES-GCM): 4 random + 8 counter

  const nonce = new Uint8Array(totalLength);
  nonce.set(getRandomBytes(randomLength), 0);  // Random prefix
  counterView.setBigUint64(0, nonceCounter, false);  // Counter suffix
  nonceCounter++;
  return nonce;
}
```

### Data Encryption Key Exchange

Sessions and machines can have dedicated data encryption keys:

```typescript
// CLI encrypts DEK for recipient using their public key
const encryptedDEK = libsodiumEncryptForPublicKey(dataKey, recipientPublicKey);

// App decrypts DEK using content keypair
const dataKey = await encryption.decryptEncryptionKey(encryptedDEKBase64);
```

### Version Detection

Both CLI and App detect encryption format from the first byte:

```typescript
function detectFormat(bundle: Uint8Array): 'legacy' | 'v0' | 'v1' {
  if (bundle.length < 1) return 'invalid';
  switch (bundle[0]) {
    case 0x00: return 'v0';  // AES-GCM without key version
    case 0x01: return 'v1';  // AES-GCM with key version
    default: return 'legacy';  // TweetNaCl secretbox
  }
}
```

## Migration Considerations

### Legacy Data Support

Both CLI and App maintain backward compatibility:

1. **Detection**: First byte indicates format
2. **Legacy Path**: Route to SecretBoxEncryption
3. **Modern Path**: Route to AES256Encryption

### Key Rotation

The `KeyVersionManager` class (CLI) enables gradual key rotation:

```typescript
const manager = new KeyVersionManager(initialKey, {
  autoRotateInterval: 86400000,  // 24 hours
  maxKeyAge: 604800000,          // 7 days
  retainOldKeys: 10              // Keep 10 versions for decryption
});

// Encrypt with current key
const encrypted = manager.encrypt(data);

// Decrypt with appropriate key (auto-detected from bundle)
const decrypted = manager.decrypt(encrypted);
```

## Related Files

### CLI
- `apps/cli/src/api/encryption.ts` - Main encryption module
- `apps/cli/src/api/auth.ts` - Authentication signatures

### App
- `apps/web/react/sources/sync/encryption/encryption.ts` - Main encryption class
- `apps/web/react/sources/sync/encryption/encryptor.ts` - Encryptor implementations
- `apps/web/react/sources/sync/encryption/encryptionCache.ts` - Caching layer
- `apps/web/react/sources/sync/encryption/sessionEncryption.ts` - Session-specific
- `apps/web/react/sources/sync/encryption/machineEncryption.ts` - Machine-specific

### Server Workers
- `apps/server/workers/src/lib/encryption.ts` - Server-side encryption
- `apps/server/workers/docs/SECRETS.md` - Secret management

## FAQ

### Why not use the same algorithm everywhere?

Each component has different requirements:
- **CLI/App**: Need key rotation, version tracking, cross-platform compatibility
- **Server**: Needs simple, fast encryption for limited secret storage

### Can the CLI decrypt App-encrypted data?

Yes, both use compatible AES-256-GCM implementations. The version byte ensures format detection works correctly.

### What happens if HANDY_MASTER_SECRET is compromised?

Only server-side secrets (AI tokens) would be exposed. User data remains protected because it uses E2E encryption with user-controlled keys.

### How do I rotate the server master secret?

1. Generate new secret: `openssl rand -hex 32`
2. Re-encrypt all server secrets with new key
3. Update `HANDY_MASTER_SECRET` in production
4. Clear key cache

See `apps/server/docker/docs/SECRET-ROTATION.md` for detailed procedures.

### Why is the server encryption separate from E2E?

By design. Server encryption protects server-managed secrets (like AI tokens the user provides). E2E encryption protects user data. These are fundamentally different trust models:
- **E2E**: User doesn't trust the server with their data
- **Server**: Server needs to use certain secrets (AI tokens) but must protect them at rest

---

*Last updated: December 2025*
*Related issues: HAP-355*
