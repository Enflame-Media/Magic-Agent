# Happy iOS - Development Guidelines

> **Part of the Happy monorepo** - See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy iOS native application.

## Project Overview

**Happy iOS** is a native iOS client for Happy, built with Swift and SwiftUI. It provides a first-class iOS experience for remote control and session sharing with Claude Code.

## Project Status

> **Phase 2 Complete**: All core features implemented.

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Xcode Project | Done | Happy.xcodeproj with iOS 16+ target (HAP-958) |
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
| Keychain Helper | Done | Security framework wrapper (HAP-982) |
| API Service | Done | URLSession with generic request methods (HAP-969) |
| E2E Encryption | Done | AES-256-GCM via CryptoKit (HAP-978) |
| Auth Service | Done | Challenge-response auth with CryptoKit (HAP-965) |
| Push Notifications | Done | APNs integration with categories/actions (HAP-992) |
| WebSocket Sync | Done | URLSessionWebSocketTask with reconnection (HAP-974) |
| Auth Integration | Done | QR scan to pairing handshake flow (HAP-966) |
| Session Views | Done | Session list and detail views (HAP-985) |
| QR Integration Tests | Done | 30 integration tests for scanning flow (HAP-971) |
| i18n | Done | 7 languages with .strings/.stringsdict (HAP-995) |
| Voice Features | Done | ElevenLabs TTS + system fallback (HAP-993) |
| Purchases | Done | StoreKit 2 with RevenueCat SDK integration (HAP-994, HAP-1007) |
| Artifacts Viewer | Done | Syntax-highlighted code viewer, 8 languages (HAP-996) |
| Friends & Social | Done | Friend list, requests, QR add, profiles (HAP-997) |
| Usage Limits Widget | Done | Plan usage limits with progress bars, detail view (HAP-722) |

### Completed Phases

- [x] Authentication service (HAP-965)
- [x] Auth integration with QR scanner (HAP-966)
- [x] API service integration (HAP-969)
- [x] WebSocket sync service (HAP-974)
- [x] Encryption service (AES-256-GCM) (HAP-978)
- [x] Keychain helper for secure storage (HAP-982)
- [x] Push notifications with APNs (HAP-992)
- [x] Session list view (HAP-985)
- [x] Session detail view (HAP-985)
- [x] QR scanning integration tests (HAP-971)
- [x] i18n for 7 languages (HAP-995)
- [x] Voice features with ElevenLabs (HAP-993)
- [x] In-app purchases with StoreKit 2 (HAP-994)
- [x] RevenueCat SDK, entitlement gating, purchase analytics (HAP-1007)
- [x] Artifacts viewer with syntax highlighting (HAP-996)
- [x] Friends and social features (HAP-997)

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

### Push Notifications (APNs)

The app supports push notifications for session updates, messages, and pairing requests.

**Configuration:**
- Entitlements: `Happy/Happy.entitlements` with `aps-environment` key
- Background mode: `remote-notification` in Info.plist
- App delegate: `AppDelegate` handles APNs token registration via `UIApplicationDelegateAdaptor`

**Notification Categories:**
- `SESSION_UPDATE` - Session state changes (completed, error, waiting for input)
- `MESSAGE` - New messages in a session (supports inline reply)
- `PAIRING` - Pairing request status changes (approve/reject actions)

**Architecture:**
- `PushNotificationService` - Singleton managing APNs registration, token storage, and notification processing
- `NotificationSettingsViewModel` - ViewModel for notification preferences UI
- `NotificationSettingsView` - SwiftUI settings view for notification management
- Device token stored in Keychain via `KeychainHelper.Key.deviceToken`

```swift
// Request permission and register
let service = PushNotificationService.shared
await service.requestPermission()

// Token is automatically stored when APNs registration succeeds
let token = service.deviceToken
```

### Device Support

- iPhone and iPad (Universal app)
- iOS 16.0 minimum deployment target
