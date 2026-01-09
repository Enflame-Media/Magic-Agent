# Happy iOS - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Project Status

**Status**: 🚧 **Planned** - Development not yet started

This folder is reserved for the native iOS client. The macOS client (`apps/macos`) serves as a reference implementation using Swift/SwiftUI that shares architectural patterns with this project.

## Planned Architecture

### Pattern: MVVM (Model-View-ViewModel)

```
Happy/
├── Models/              # Data models (Codable structs)
├── Views/               # SwiftUI views
├── ViewModels/          # Observable view models (@Observable)
├── Services/            # Network, sync, encryption services
├── Utilities/           # Extensions, helpers
└── Resources/           # Assets, localization
```

### Key Design Decisions (Inherited from happy-macos)

1. **SwiftUI-first**: Use SwiftUI for all UI
2. **Combine for reactivity**: Publisher/subscriber pattern
3. **Async/await**: Modern Swift concurrency
4. **MVVM separation**: Views never access services directly

## Development Requirements

| Requirement | Version |
|-------------|---------|
| macOS | 14+ (for development) |
| Xcode | 15.0+ |
| Swift | 5.9+ |
| Deployment Target | iOS 16.0+ |

## Key Services (Shared Patterns with macOS)

### APIService

Handles all HTTP communication with the Happy server.

```swift
actor APIService {
    func fetch<T: Decodable>(_ endpoint: Endpoint) async throws -> T
    func post<T: Encodable, R: Decodable>(_ endpoint: Endpoint, body: T) async throws -> R
}
```

### SyncService

Manages real-time WebSocket synchronization.

```swift
actor SyncService {
    func connect() async throws
    func disconnect()
    func subscribe(to sessionId: String) async
}
```

### EncryptionService

End-to-end encryption using AES-256-GCM, matching happy-cli and happy-app.

```swift
struct EncryptionService {
    static func encrypt(_ data: Data, with key: SymmetricKey) throws -> Data
    static func decrypt(_ data: Data, with key: SymmetricKey) throws -> Data
}
```

**Cross-Platform Compatibility:**
- Uses AES-256-GCM (same as happy-cli primary, happy-app primary)
- Bundle format: `[version:1][nonce:12][ciphertext:N][authTag:16]`
- Key derivation uses X25519 ECDH with HKDF
- See [ENCRYPTION-ARCHITECTURE.md](../../../docs/ENCRYPTION-ARCHITECTURE.md) for details

## Shared Protocol Types

Use the generated Swift types from `@happy/protocol`:

```
apps/macos/Happy/Generated/
└── HappyProtocol.swift    # Generated Codable structs
```

To regenerate after protocol changes:
```bash
yarn workspace @happy/protocol generate:swift
```

## Code Style

Follow the same conventions as `apps/macos`:
- Types: PascalCase (`SessionViewModel`, `ApiService`)
- Functions/properties: camelCase (`fetchSessions()`, `currentSession`)
- One primary type per file
- File name matches type name

## Security Considerations

1. **Keychain**: Store all sensitive data (tokens, keys) in Keychain
2. **E2E Encryption**: All session data is encrypted client-side
3. **No plaintext secrets**: Never log or persist unencrypted credentials
4. **App Transport Security**: HTTPS only, no exceptions

## Getting Started

When development begins:

1. Create Xcode project: `Happy.xcodeproj`
2. Set up Swift package dependencies
3. Copy shared utilities from `apps/macos/Happy/Utilities/`
4. Implement core services following macOS patterns
5. Build iOS-specific UI using SwiftUI

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) - Monorepo overview
- [apps/macos/CLAUDE.md](../../macos/CLAUDE.md) - Reference Swift implementation
- [Encryption Architecture](../../../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
