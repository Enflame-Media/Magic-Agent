# Happy iOS - Development Guidelines

> **Part of the Happy monorepo** - See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy iOS native application.

## Project Overview

**Happy iOS** is a native iOS client for Happy, built with Swift and SwiftUI. It provides a first-class iOS experience for remote control and session sharing with Claude Code.

## Project Status

> **Phase 1 Complete**: Initial Xcode project structure created.

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Xcode Project | Done | Happy.xcodeproj with iOS 16+ target |
| MVVM Structure | Done | Models, ViewModels, Views, Services folders |
| App Entry Point | Done | HappyApp.swift with @main |
| Welcome View | Done | ContentView with onboarding UI |
| Info.plist | Done | Camera permission for QR scanning |
| Asset Catalog | Done | AccentColor, AppIcon placeholders |
| Unit Tests | Done | HappyTests target |
| UI Tests | Done | HappyUITests target |
| QR Code Scanner | Done | AVFoundation-based QR scanning (HAP-959) |
| QR Payload Parsing | Done | JSON parsing with validation |
| Camera Permission | Done | CameraPermissionService with async API |
| Pairing Confirmation | Done | Post-scan confirmation screen |
| Permission Denied UI | Done | Settings deep-link for camera access |

### Next Steps (Phase 2)

- [ ] Authentication service
- [ ] API service integration
- [ ] WebSocket sync service
- [ ] Encryption service (AES-256-GCM)
- [ ] Keychain helper for secure storage
- [ ] Session list view
- [ ] Session detail view

## Architecture

### Pattern: MVVM (Model-View-ViewModel)

```
Happy/
├── HappyApp.swift       # App entry point (@main)
├── ContentView.swift    # Root view with navigation
├── Models/              # Data models (Codable structs)
├── Views/               # SwiftUI views
├── ViewModels/          # Observable view models (@Observable)
├── Services/            # Network, sync, encryption services
├── Utilities/           # Extensions, helpers
├── Resources/           # Localization files
└── Assets.xcassets/     # Images, colors, app icon
```

### Key Architectural Decisions

1. **SwiftUI-first**: Use SwiftUI for all UI, avoid UIKit unless absolutely necessary
2. **Combine for reactivity**: Similar to Vue's reactivity system
3. **Async/await**: Use modern Swift concurrency over completion handlers
4. **MVVM separation**: Views never access services directly, always through ViewModels

## Development Requirements

| Requirement | Version |
|-------------|---------|
| macOS | 14+ (for development) |
| Xcode | 15.0+ |
| Swift | 5.9+ |
| Deployment Target | iOS 16.0+ |

## Code Style

### Swift Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Types (class, struct, enum, protocol) | PascalCase | `SessionViewModel`, `ApiService` |
| Functions, methods, properties | camelCase | `fetchSessions()`, `currentSession` |
| Constants | camelCase | `let maxRetries = 3` |
| Type properties/methods | PascalCase | `Session.empty` |

### SwiftUI Best Practices

```swift
// Good: Small, focused views
struct SessionRow: View {
    let session: Session

    var body: some View {
        HStack {
            Text(session.title)
            Spacer()
            StatusBadge(status: session.status)
        }
    }
}

// Good: Extract complex logic to ViewModels
@Observable
class SessionListViewModel {
    var sessions: [Session] = []
    var isLoading = false

    func loadSessions() async {
        isLoading = true
        defer { isLoading = false }
        sessions = await sessionService.fetchAll()
    }
}

// Avoid: Business logic in Views
struct SessionList: View {
    var body: some View {
        // Don't do network calls here
    }
}
```

### File Organization

- One primary type per file
- File name matches type name: `SessionViewModel.swift`
- Group related extensions in `+Extension.swift` files: `String+Crypto.swift`

## Key Services (To Be Implemented)

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
    static func generateKeyPair() -> (privateKey: Data, publicKey: Data)
    static func deriveSharedSecret(privateKey: Data, peerPublicKey: Data) throws -> SymmetricKey
}
```

**Cross-Platform Compatibility:**
- Uses AES-256-GCM (same as happy-cli primary, happy-app primary)
- Bundle format: `[version:1][nonce:12][ciphertext:N][authTag:16]`
- Supports version 0x00 (no key versioning) and 0x01 (with key versioning)
- Key derivation uses X25519 ECDH with HKDF
- See [ENCRYPTION-ARCHITECTURE.md](../../../docs/ENCRYPTION-ARCHITECTURE.md) for details

## Testing

### Unit Tests

```swift
// Tests live in HappyTests/
final class SessionViewModelTests: XCTestCase {
    func testLoadSessionsSuccess() async {
        // Arrange
        let mockService = MockSessionService()
        let viewModel = SessionViewModel(sessionService: mockService)

        // Act
        await viewModel.loadSessions()

        // Assert
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.sessions.count, 2)
    }
}
```

### Running Tests

```bash
# Command line (from project root with Xcode installed)
xcodebuild test -scheme Happy -destination 'platform=iOS Simulator,name=iPhone 15'

# Or use Xcode: Cmd+U
```

## Common Commands

```bash
# Build (requires Xcode)
xcodebuild build -scheme Happy -destination 'platform=iOS Simulator,name=iPhone 15'

# Run tests
xcodebuild test -scheme Happy -destination 'platform=iOS Simulator,name=iPhone 15'

# Clean build folder
xcodebuild clean -scheme Happy

# Open in Xcode
open Happy.xcodeproj
```

## SwiftUI Patterns

### Environment for Dependency Injection

```swift
// Define environment key
private struct APIServiceKey: EnvironmentKey {
    static let defaultValue = APIService.shared
}

extension EnvironmentValues {
    var apiService: APIService {
        get { self[APIServiceKey.self] }
        set { self[APIServiceKey.self] = newValue }
    }
}

// Use in views
struct SessionList: View {
    @Environment(\.apiService) private var apiService
}
```

### @Observable (iOS 17+)

```swift
@Observable
class SessionViewModel {
    var sessions: [Session] = []
    var selectedSession: Session?
}
```

### Backward Compatibility (iOS 16)

```swift
// For iOS 16 support, use ObservableObject instead
class SessionViewModel: ObservableObject {
    @Published var sessions: [Session] = []
    @Published var selectedSession: Session?
}
```

## Security Considerations

1. **Keychain**: Store all sensitive data (tokens, keys) in Keychain
2. **E2E Encryption**: All session data is encrypted client-side
3. **No plaintext secrets**: Never log or persist unencrypted credentials
4. **App Transport Security**: HTTPS only, no exceptions

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

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) - Monorepo overview
- [apps/macos/CLAUDE.md](../../macos/CLAUDE.md) - Reference Swift implementation
- [Encryption Architecture](../../../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/ios)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)

## Build & Deployment

### Development

1. Open `Happy.xcodeproj` in Xcode
2. Select the "Happy" scheme
3. Choose a simulator (iPhone 15 recommended)
4. Press Cmd+R to build and run

### Release

1. Archive: Product -> Archive
2. Distribute via App Store Connect or TestFlight

## iOS-Specific Considerations

### Camera Permission (QR Scanning)

The app requires camera access for QR code scanning. This is configured in Info.plist:

```xml
<key>NSCameraUsageDescription</key>
<string>Happy needs camera access to scan QR codes for connecting to Claude Code CLI.</string>
```

### Supported Orientations

- iPhone: Portrait, Landscape Left, Landscape Right
- iPad: All orientations including Upside Down

### Device Support

- iPhone and iPad (Universal app)
- iOS 16.0 minimum deployment target
