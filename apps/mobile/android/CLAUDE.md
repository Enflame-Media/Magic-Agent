# Happy Android - Development Guidelines

> **Part of the Happy monorepo** - See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy Android native application.

## Project Overview

**Happy Android** is a native Android client for Happy, built with Kotlin and Jetpack Compose. It provides a first-class Android experience for remote control and session sharing with Claude Code.

## Architecture

### Pattern: MVVM with Clean Architecture

```
app/src/main/java/com/enflame/happy/
├── data/                    # Data layer
│   ├── api/                 # Retrofit API service interfaces
│   ├── crypto/              # Encryption service (AES-256-GCM, ECDH)
│   ├── repository/          # Repository implementations
│   ├── local/               # Room database, DataStore
│   └── sync/                # WebSocket sync service
├── domain/                  # Domain/business logic layer
│   ├── model/               # Domain models (data classes)
│   ├── repository/          # Repository interfaces
│   └── usecase/             # Use cases (interactors)
├── ui/                      # Presentation layer
│   ├── components/          # Reusable Compose components
│   ├── screens/             # Screen composables
│   │   └── home/            # Home screen package
│   ├── viewmodel/           # ViewModels
│   ├── theme/               # Material Design 3 theme
│   └── navigation/          # Navigation graph
├── di/                      # Dependency injection (Hilt modules)
├── HappyApplication.kt      # Application class
└── MainActivity.kt          # Single activity entry point
```

### Key Architectural Decisions

1. **Jetpack Compose**: Modern declarative UI - all UI is built with Compose
2. **Kotlin Coroutines/Flow**: Reactive data streams for async operations
3. **Hilt**: Dependency injection framework built on Dagger
4. **Clean Architecture**: Clear separation between data, domain, and presentation layers
5. **Single Activity**: Navigation handled by Compose Navigation

## Development Requirements

| Requirement | Version |
|-------------|---------|
| Android Studio | Hedgehog (2023.1.1) or later |
| Kotlin | 1.9.22+ |
| Gradle | 8.5+ |
| JDK | 17 |
| Min SDK | 26 (Android 8.0 Oreo) |
| Target SDK | 34 (Android 14) |
| Compile SDK | 34 |

## Code Style

### Kotlin Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes/Interfaces | PascalCase | `SessionViewModel`, `HappyApiService` |
| Functions/Properties | camelCase | `fetchSessions()`, `currentSession` |
| Constants | SCREAMING_SNAKE_CASE | `const val MAX_RETRIES = 3` |
| Packages | lowercase | `com.enflame.happy.ui.screens` |
| Composables | PascalCase | `HomeScreen`, `SessionCard` |

### Jetpack Compose Best Practices

```kotlin
// Good: Small, focused composables
@Composable
fun SessionCard(
    session: Session,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable(onClick = onClick)
    ) {
        Text(session.title ?: "Untitled")
    }
}

// Good: State hoisting - composables are stateless
@Composable
fun SessionList(
    sessions: List<Session>,
    onSessionClick: (Session) -> Unit,
    modifier: Modifier = Modifier
) {
    LazyColumn(modifier = modifier) {
        items(sessions) { session ->
            SessionCard(
                session = session,
                onClick = { onSessionClick(session) }
            )
        }
    }
}

// Good: ViewModel for business logic
@HiltViewModel
class SessionListViewModel @Inject constructor(
    private val sessionRepository: SessionRepository
) : ViewModel() {

    val sessions = sessionRepository.getSessions()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun refreshSessions() {
        viewModelScope.launch {
            sessionRepository.refreshSessions()
        }
    }
}
```

### File Organization

- One primary composable/class per file
- File name matches primary type: `HomeScreen.kt`, `SessionViewModel.kt`
- Screen packages contain screen + preview: `screens/home/HomeScreen.kt`
- Group related components: `components/SessionCard.kt`, `components/StatusBadge.kt`

## Key Dependencies

### Version Catalog (gradle/libs.versions.toml)

All dependencies are managed via Gradle Version Catalogs for consistency:

```kotlin
// Usage in build.gradle.kts
implementation(libs.compose.material3)
implementation(libs.bundles.networking)
ksp(libs.hilt.compiler)
```

### Core Libraries

| Category | Library | Purpose |
|----------|---------|---------|
| UI | Jetpack Compose + Material 3 | Declarative UI |
| DI | Hilt | Dependency injection |
| Networking | Retrofit + OkHttp | HTTP client |
| Serialization | kotlinx.serialization | JSON parsing |
| Local Storage | Room + DataStore | Database and preferences |
| Encryption | Google Tink | E2E encryption |
| Testing | JUnit + MockK | Unit and UI tests |

## Key Services

### HappyApiService

Retrofit interface for all HTTP communication with the Happy server.

```kotlin
interface HappyApiService {
    @GET("v1/sessions")
    suspend fun getSessions(): List<Session>

    @GET("v1/sessions/{sessionId}")
    suspend fun getSession(@Path("sessionId") sessionId: String): Session
}
```

### SessionRepository

Coordinates between remote API and local cache:

```kotlin
interface SessionRepository {
    fun getSessions(): Flow<List<Session>>
    suspend fun getSession(sessionId: String): Session?
    suspend fun refreshSessions()
    suspend fun subscribeToSession(sessionId: String)
}
```

### EncryptionService

End-to-end encryption using AES-256-GCM via Java Cryptography Architecture (JCA).

Located in `data/crypto/EncryptionService.kt`.

```kotlin
@Singleton
class EncryptionService @Inject constructor() {
    fun encrypt(data: ByteArray, key: ByteArray): ByteArray
    fun decrypt(bundle: ByteArray, key: ByteArray): ByteArray
    fun generateKeyPair(): KeyPairData
    fun deriveSharedSecret(privateKey: ByteArray, peerPublicKey: ByteArray): ByteArray
    fun getBundleInfo(bundle: ByteArray): BundleInfo?
}
```

**Cross-Platform Compatibility:**
- Uses AES-256-GCM (same as happy-cli, happy-app, happy-macos)
- Bundle format v0: `[version:1][nonce:12][ciphertext:N][authTag:16]`
- Bundle format v1: `[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]`
- Hybrid nonce: 4 random bytes + 8-byte monotonic counter (thread-safe)
- Key derivation: X25519 ECDH with HKDF-SHA256 (info: "happy-encryption")
- See [ENCRYPTION-ARCHITECTURE.md](../../../docs/ENCRYPTION-ARCHITECTURE.md) for details

**Hilt DI:** Provided as singleton via `CryptoModule` to ensure nonce counter uniqueness.

## Testing

### Unit Tests

Located in `app/src/test/java/`:

```kotlin
class SessionViewModelTest {
    @Test
    fun `sessions are loaded on init`() = runTest {
        val mockRepository = mockk<SessionRepository>()
        coEvery { mockRepository.getSessions() } returns flowOf(testSessions)

        val viewModel = SessionViewModel(mockRepository)

        assertEquals(testSessions, viewModel.sessions.first())
    }
}
```

### Instrumented Tests

Located in `app/src/androidTest/java/`:

```kotlin
@HiltAndroidTest
class HomeScreenTest {
    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun homeScreen_displaysWelcomeMessage() {
        composeTestRule.onNodeWithText("Welcome to Happy").assertIsDisplayed()
    }
}
```

### Running Tests

```bash
# Unit tests
./gradlew test

# Instrumented tests (requires device/emulator)
./gradlew connectedAndroidTest

# All tests with coverage
./gradlew testDebugUnitTest jacocoTestReport
```

## Common Commands

```bash
# Build debug APK
./gradlew assembleDebug

# Build release APK
./gradlew assembleRelease

# Build app bundle (for Play Store)
./gradlew bundleRelease

# Install on connected device
./gradlew installDebug

# Run lint checks
./gradlew lint

# Clean build
./gradlew clean

# Dependency updates check
./gradlew dependencyUpdates
```

## Security Considerations

1. **Android Keystore**: Store cryptographic keys in Android Keystore
2. **E2E Encryption**: All session data is encrypted client-side using Tink
3. **No plaintext secrets**: Never log or persist unencrypted credentials
4. **Network Security Config**: HTTPS only, certificate pinning recommended
5. **ProGuard/R8**: Code shrinking and obfuscation enabled for release builds
6. **Backup Exclusions**: Sensitive data excluded from Android backup

## Project Status

**Status**: Initial Setup Complete

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Project Structure | Complete | Clean Architecture layers |
| Gradle Configuration | Complete | Version catalogs, KSP |
| Hilt DI | Complete | AppModule configured |
| Material Design 3 Theme | Complete | Light/dark, dynamic colors |
| Navigation | Complete | Compose Navigation setup |
| Home Screen | Complete | Basic UI with scaffold |
| Domain Models | Complete | Session, Message types |
| API Service | Complete | Retrofit interface defined |
| Repository Pattern | Complete | Interface + implementation |
| .gitignore | Complete | Android-specific exclusions |
| QR Code Scanner | Complete | CameraX + ML Kit (HAP-961) |
| Encryption Service | Complete | AES-256-GCM, X25519 ECDH, HKDF (HAP-973) |
| Sessions List Screen | Complete | LazyColumn, search, filter, pull-to-refresh (HAP-981) |
| WebSocket Sync Service | Complete | OkHttp WebSocket, reconnection, Kotlin Flow (HAP-970) |
| WebSocket Sync E2E Tests | Complete | Integration tests, encryption E2E, reconnection tests (HAP-979) |
| Session Detail Screen | Complete | Message list, header, pull-to-refresh, real-time updates (HAP-984) |
| Settings Screen | Complete | Server, notifications, theme, about, account sections (HAP-986) |
| Push Notifications (FCM) | Complete | FCM service, channels, rich notifications, actions (HAP-986) |
| Voice Features | Complete | ElevenLabs TTS + Android system TTS fallback (HAP-999) |
| In-App Purchases | Complete | Google Play Billing, paywall, subscription status (HAP-1000) |
| Artifacts Viewer | Complete | Syntax-highlighted code viewer, 8+ languages (HAP-1002) |
| i18n (7 Languages) | Complete | en, es, fr, de, ja, zh-CN, ko with plurals, in-app picker (HAP-1001) |
| CI/CD Pipeline | Complete | GitHub Actions CI + Release, Fastlane, Detekt, Dependabot (HAP-1004) |
| Friends & Social | Complete | Friend list, requests, QR add, profiles, search, filter (HAP-1003) |
| WebSocket Lifecycle Management | Complete | SyncLifecycleManager with ProcessLifecycleOwner (HAP-1017) |

### Next Steps

- [x] QR Code Scanner (CameraX + ML Kit) - HAP-961
- [x] Sessions List Screen - HAP-981
- [x] Session Detail Screen - HAP-984
- [x] WebSocket Sync Service (OkHttp, reconnection, Flow) - HAP-970
- [x] Encryption Service (AES-256-GCM, ECDH, HKDF) - HAP-973
- [ ] Local Storage (Room + DataStore)
- [x] Settings Screen - HAP-986
- [x] Push Notifications (FCM) - HAP-986
- [x] Voice Features (ElevenLabs + System TTS) - HAP-999
- [x] In-App Purchases (Google Play Billing) - HAP-1000
- [x] Artifacts Viewer (Syntax Highlighting) - HAP-1002
- [x] i18n for 7 Languages - HAP-1001
- [x] CI/CD Pipeline (GitHub Actions, Fastlane, Detekt, Dependabot) - HAP-1004
- [x] Friends & Social Features (list, requests, profiles, QR) - HAP-1003

## CI/CD

### GitHub Actions Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| Android CI | `.github/workflows/android-ci.yml` | Push to main/develop, PRs | Build, test, lint, Detekt, ktlint |
| Android Release | `.github/workflows/android-release.yml` | Manual dispatch | Signed build, Google Play deploy, GitHub Release |

### Fastlane Lanes

```bash
# Run unit tests
bundle exec fastlane test

# Build debug APK
bundle exec fastlane build_debug

# Build signed release APK + AAB
bundle exec fastlane build_release

# Deploy to Google Play internal testing
bundle exec fastlane deploy_internal

# Promote to beta track
bundle exec fastlane deploy_beta

# Promote to production
bundle exec fastlane deploy_production rollout:0.1

# Run lint checks
bundle exec fastlane lint

# Clean build artifacts
bundle exec fastlane clean
```

### Required GitHub Secrets (for release workflow)

| Secret | Description |
|--------|-------------|
| `KEYSTORE_FILE` | Base64-encoded release keystore |
| `KEYSTORE_PASSWORD` | Keystore password |
| `KEY_ALIAS` | Key alias within the keystore |
| `KEY_PASSWORD` | Key password |
| `PLAY_SERVICE_ACCOUNT_JSON` | Google Play service account JSON key |

### Code Quality Tools

- **Android Lint**: Built-in Android static analysis (warnings as errors)
- **Detekt**: Kotlin static analysis (`detekt.yml` configuration)
- **ktlint**: Kotlin code style enforcement
- **JaCoCo**: Test coverage reporting
- **Dependabot**: Automated dependency update PRs (`.github/dependabot.yml`)

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) - Monorepo overview
- [apps/macos/CLAUDE.md](../../macos/CLAUDE.md) - Reference native implementation (Swift)
- [Encryption Architecture](../../../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Material Design 3](https://m3.material.io/) - Design system guidelines
- [Android Developers](https://developer.android.com/docs) - Official documentation
- [Jetpack Compose](https://developer.android.com/jetpack/compose) - Compose documentation
