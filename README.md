# Happy macOS

Native macOS client for Happy - remote control and session sharing for Claude Code.

## Overview

Happy macOS provides a first-class native macOS experience with:
- Native menu bar integration
- Keyboard shortcuts
- macOS window management
- Touch Bar support (where available)
- Handoff and Continuity features

## Requirements

### Development
| Requirement | Version |
|-------------|---------|
| macOS | 14.0+ (Sonoma) |
| Xcode | 15.0+ |
| Swift | 5.9+ |

### Deployment
| Requirement | Version |
|-------------|---------|
| macOS | 13.0+ (Ventura) |

## Getting Started

### Prerequisites

1. Install Xcode 15+ from the Mac App Store
2. Accept Xcode license: `sudo xcodebuild -license accept`
3. Install Xcode command line tools: `xcode-select --install`

### Setup

```bash
# Clone the repository (if separate from monorepo)
git clone https://github.com/Enflame-Media/happy-macos.git
cd happy-macos

# Open in Xcode
open Happy.xcodeproj
```

### Building

```bash
# Build from command line
xcodebuild build -scheme Happy -configuration Debug

# Or use Xcode: Cmd+B
```

### Running

```bash
# Run from command line
xcodebuild build -scheme Happy -configuration Debug && \
  open build/Debug/Happy.app

# Or use Xcode: Cmd+R
```

## Project Structure

```
happy-macos/
├── .github/
│   └── workflows/           # CI/CD pipelines
├── Happy/
│   ├── HappyApp.swift       # App entry point
│   ├── ContentView.swift    # Root view
│   ├── Models/              # Data models
│   ├── Views/               # SwiftUI views
│   ├── ViewModels/          # MVVM view models
│   ├── Services/
│   │   ├── APIService.swift
│   │   ├── SyncService.swift
│   │   └── EncryptionService.swift
│   ├── Utilities/           # Extensions, helpers
│   └── Resources/
│       ├── Assets.xcassets
│       └── Localizable.strings
├── HappyTests/              # Unit tests
├── Happy.xcodeproj/         # Xcode project
├── .gitignore
├── README.md
└── CLAUDE.md                # AI assistant guidelines
```

## Architecture

### MVVM Pattern

The app follows the Model-View-ViewModel pattern:

- **Models**: Plain Swift structs conforming to `Codable`
- **Views**: SwiftUI views, kept small and focused
- **ViewModels**: `@Observable` classes managing view state and business logic
- **Services**: Network, sync, and encryption services

### Key Technologies

| Technology | Purpose |
|------------|---------|
| SwiftUI | User interface |
| Combine | Reactive programming |
| Swift Concurrency | Async/await for all async operations |
| CryptoKit | End-to-end encryption |
| URLSession | HTTP networking |
| WebSocket | Real-time sync |

## Testing

```bash
# Run all tests
xcodebuild test -scheme Happy -destination 'platform=macOS'

# Or use Xcode: Cmd+U
```

## Configuration

### Bundle Identifier
`com.enflamemedia.happy`

### Capabilities Required
- Network access (outgoing connections)
- Keychain access (secure storage)
- Camera access (QR code scanning)

## Related Projects

| Project | Description |
|---------|-------------|
| [happy-app](../happy-app) | React Native mobile/web client |
| [happy-cli](../happy-cli) | Node.js CLI wrapper |
| [happy-server-workers](../happy-server-workers) | Cloudflare Workers backend |

## Contributing

See [CLAUDE.md](./CLAUDE.md) for development guidelines and code style.

## License

Proprietary - Enflame Media

---

## Initial Setup (First Time Only)

> ⚠️ **Note**: This repository was scaffolded without Xcode. Complete these steps on a Mac:

### 1. Create Xcode Project

1. Open Xcode
2. File → New → Project
3. Select "macOS" → "App"
4. Configure:
   - Product Name: `Happy`
   - Team: Your Apple Developer Team
   - Organization Identifier: `com.enflamemedia`
   - Bundle Identifier: `com.enflamemedia.happy`
   - Interface: SwiftUI
   - Language: Swift
   - ☑️ Include Tests
5. Save to this directory (replace the `Happy/` folder)

### 2. Move Source Files

After creating the Xcode project, the scaffolded Swift files in `Happy/` should be integrated into the Xcode project:

```bash
# Xcode will create its own Happy/ folder
# Move any pre-existing source files into the Xcode structure
```

### 3. Configure Info.plist

Ensure these capabilities are set:
- `NSAppTransportSecurity` → Allow HTTPS
- `NSCameraUsageDescription` → "Scan QR codes to connect"
- `keychain-access-groups` → Your keychain group

### 4. Verify Build

```bash
xcodebuild build -scheme Happy
```
