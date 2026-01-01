# CLAUDE.md - happy-macos

This file provides guidance to Claude Code when working with the Happy macOS native application.

## Project Overview

**Happy macOS** is a native macOS client for Happy, built with Swift and SwiftUI. It provides a first-class macOS experience for remote control and session sharing with Claude Code.

## Architecture

### Pattern: MVVM (Model-View-ViewModel)

```
Happy/
├── Models/              # Data models (Codable structs)
├── Views/               # SwiftUI views
├── ViewModels/          # Observable view models (@Observable or ObservableObject)
├── Services/            # Network, sync, encryption services
├── Utilities/           # Extensions, helpers
└── Resources/           # Assets, localization
```

### Key Architectural Decisions

1. **SwiftUI-first**: Use SwiftUI for all UI, avoid AppKit unless absolutely necessary
2. **Combine for reactivity**: Similar to Vue's reactivity system
3. **Async/await**: Use modern Swift concurrency over completion handlers
4. **MVVM separation**: Views never access services directly, always through ViewModels

## Development Requirements

| Requirement | Version |
|-------------|---------|
| macOS | 14+ (for development) |
| Xcode | 15.0+ |
| Swift | 5.9+ |
| Deployment Target | macOS 13.0+ (Ventura) |

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
// ✅ Good: Small, focused views
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

// ✅ Good: Extract complex logic to ViewModels
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

// ❌ Avoid: Business logic in Views
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

## Key Services

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

End-to-end encryption using the same algorithms as other Happy clients.

```swift
struct EncryptionService {
    func encrypt(_ data: Data, with key: SymmetricKey) throws -> Data
    func decrypt(_ data: Data, with key: SymmetricKey) throws -> Data
}
```

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
xcodebuild test -scheme Happy -destination 'platform=macOS'

# Or use Xcode: Cmd+U
```

## Common Commands

```bash
# Build (requires Xcode)
xcodebuild build -scheme Happy

# Run tests
xcodebuild test -scheme Happy -destination 'platform=macOS'

# Clean build folder
xcodebuild clean -scheme Happy

# Open in Xcode
open Happy.xcodeproj
```

## SwiftUI Patterns Used

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

### @Observable (iOS 17+ / macOS 14+)

```swift
@Observable
class SessionViewModel {
    var sessions: [Session] = []
    var selectedSession: Session?
}
```

### Combine for older targets

```swift
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

## Related Documentation

- [Root CLAUDE.md](../CLAUDE.md) - Monorepo overview
- [Encryption Architecture](../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/macos)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)

## Build & Deployment

### Development

1. Open `Happy.xcodeproj` in Xcode
2. Select the "Happy" scheme
3. Press Cmd+R to build and run

### Release

1. Archive: Product → Archive
2. Distribute via App Store Connect or direct notarization

## Project Status

> ✅ **Phase 3 Complete**: Core SwiftUI implementation done.

### Implemented Features

| Feature | Status | Notes |
|---------|--------|-------|
| MVVM Architecture | ✅ | Models, ViewModels, Views, Services |
| Authentication | ✅ | AuthService with QR scanning support |
| Keychain Storage | ✅ | KeychainHelper for secure credentials |
| Encryption | ✅ | EncryptionService with CryptoKit |
| WebSocket Sync | ✅ | SyncService with Combine publishers |
| Sessions List | ✅ | NavigationSplitView with sidebar |
| Session Detail | ✅ | Message display with tool uses |
| Settings | ✅ | Tabbed preferences via Settings scene |
| Menu Commands | ✅ | File, Session, Connection menus |
| Keyboard Shortcuts | ✅ | ⌘R refresh, ⌘N scan, etc. |

### Next Steps (Phase 4)

- Voice features integration
- Artifacts display
- Push notifications
