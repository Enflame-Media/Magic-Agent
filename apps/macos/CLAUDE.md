# Happy macOS - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

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
- See [ENCRYPTION-ARCHITECTURE.md](../docs/ENCRYPTION-ARCHITECTURE.md) for details

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
| Encryption | ✅ | EncryptionService with AES-256-GCM (CryptoKit) |
| WebSocket Sync | ✅ | SyncService with Combine publishers |
| Sessions List | ✅ | NavigationSplitView with sidebar |
| Session Detail | ✅ | Message display with tool uses |
| Settings | ✅ | Tabbed preferences via Settings scene |
| Menu Commands | ✅ | File, Session, Artifacts, Connection, Voice, Subscription menus |
| Keyboard Shortcuts | ✅ | ⌘R refresh, ⌘N scan, ⇧⌘A artifacts, ⇧⌘V voice, etc. |
| In-App Purchases | ✅ | RevenueCat SDK integration (HAP-707) |
| Artifacts Browser | ✅ | File tree, QuickLook, drag-and-drop (HAP-704) |
| Voice Features | ✅ | ElevenLabs Conversational AI integration (HAP-886) |
| Voice UI | ✅ | VoiceViewModel, VoiceControlView, Settings tab (HAP-901) |

### Voice Features (HAP-886)

The app includes full ElevenLabs Conversational AI integration for voice assistant functionality:

**Key Components:**
- `VoiceService.swift` - ElevenLabs WebSocket integration with AVFoundation audio
- `VoiceViewModel.swift` - Observable view model bridging VoiceService to UI (HAP-901)
- `VoiceControlView.swift` - Floating voice indicator component (HAP-901)

**Architecture:**
- WebSocket connection to `wss://api.elevenlabs.io/v1/convai/conversation`
- Audio capture via `AVAudioEngine` with 16kHz mono 16-bit PCM format
- Audio playback via `AVAudioPlayerNode` for streaming TTS responses
- Voice Activity Detection (VAD) with configurable polling interval

**Message Protocol:**
- Client events: `user_audio_chunk`, `user_message`, `contextual_update`, `ping`
- Server events: `conversation_initiation_metadata`, `audio`, `user_transcript`, `agent_response`, `mode_change`, `interruption`

**Features:**
- Real-time voice conversation with ElevenLabs agent
- Microphone permission handling via `AVCaptureDevice`
- Mute/unmute controls for microphone input
- Voice language selection (en, es, ru, pl, pt, ca, zh)
- WebSocket keepalive with ping/pong
- Automatic reconnection handling
- Mode change tracking (speaking/listening/idle)
- Input/output volume monitoring

**Usage Example:**
```swift
let voiceService = VoiceService.shared

// Start a voice session
await voiceService.startSession(config: VoiceSessionConfig(
    sessionId: "session-123",
    initialContext: "User is viewing a coding session"
))

// Send a contextual update
voiceService.sendContextualUpdate("User clicked on file.ts")

// Toggle mute
voiceService.toggleMute()

// End the session
await voiceService.endSession()
```

**Configuration:**
- Development agent ID: `agent_7801k2c0r5hjfraa1kdbytpvs6yt`
- Production agent ID: `agent_6701k211syvvegba4kt7m68nxjmw`
- Audio sample rate: 16kHz
- VAD polling interval: 0.1s
- VAD volume threshold: 0.1

**UI Integration (HAP-901):**
- Voice button in SessionDetailView toolbar
- VoiceControlView with speaking/listening/idle indicators
- Volume level visualization for input/output
- Mute/unmute controls
- Settings → Voice tab for preferences and language selection
- Keyboard shortcut: ⇧⌘V toggle voice, ⇧⌘M toggle mute

### In-App Purchases (HAP-707)

The app includes RevenueCat integration for subscription management:

**Key Components:**
- `PurchaseService.swift` - RevenueCat SDK integration with StoreKit 2
- `PurchaseViewModel.swift` - Observable view model for purchase UI
- `PaywallView.swift` - Native purchase sheet presentation
- Settings → Subscription tab for status and management

**Setup Requirements:**
1. Add RevenueCat SDK via Swift Package Manager:
   ```
   https://github.com/RevenueCat/purchases-ios
   ```
2. Set environment variable: `REVENUECAT_MACOS_KEY`

**Features:**
- Configure RevenueCat with API key
- Fetch offerings and products
- Purchase packages with proper error handling
- Restore purchases functionality
- Sync purchases across devices
- Entitlement checking for premium features
- Customer info delegate for real-time updates

**Conditional Compilation:**
The code uses `#if canImport(RevenueCat)` for graceful fallback when SDK is not installed, enabling development without the SDK.

### Artifacts Browser (HAP-704)

The app includes a native artifact browser for viewing files generated during Claude Code sessions:

**Key Components:**
- `Artifact.swift` - Model with file tree structures and type inference
- `ArtifactViewModel.swift` - Observable view model with decryption integration
- `ArtifactBrowser.swift` - Main view with OutlineGroup file tree
- `ArtifactDetailView.swift` - Detail view with QuickLook and syntax highlighting

**Features:**
- Native file tree navigation using OutlineGroup
- QuickLook integration for file preview
- Basic syntax highlighting for code files
- Drag and drop to Finder
- Image viewer with checkerboard background
- Copy to clipboard functionality
- Save to file via NSSavePanel
- Encrypted artifact decryption

**Keyboard Shortcuts:**
- ⇧⌘A - Show Artifacts
- ⌘R - Refresh (in artifact browser)
- Space - QuickLook preview
- ⇧⌘C - Copy to clipboard
- ⌘S - Save to file

### Next Steps (Phase 4)

- ~~Voice features integration~~ (Completed - HAP-886)
- ~~Voice UI integration~~ (Completed - HAP-901)
- Push notifications
