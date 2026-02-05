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
│   ├── repository/          # Repository implementations
│   └── local/               # Room database, DataStore
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

### EncryptionService (To Be Implemented)

End-to-end encryption using Google Tink for AES-256-GCM:

```kotlin
class EncryptionService @Inject constructor() {
    fun encrypt(data: ByteArray, key: SecretKey): ByteArray
    fun decrypt(data: ByteArray, key: SecretKey): ByteArray
    fun generateKeyPair(): KeyPair
}
```

**Cross-Platform Compatibility:**
- Uses AES-256-GCM (same as happy-cli, happy-app, happy-macos)
- Bundle format: `[version:1][nonce:12][ciphertext:N][authTag:16]`
- Key derivation uses X25519 ECDH with HKDF
- See [ENCRYPTION-ARCHITECTURE.md](../../../docs/ENCRYPTION-ARCHITECTURE.md) for details

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

### Next Steps

- [ ] QR Code Scanner (CameraX + ML Kit)
- [ ] Sessions List Screen
- [ ] Session Detail Screen
- [ ] WebSocket Sync Service
- [ ] Encryption Service (Tink)
- [ ] Local Storage (Room + DataStore)
- [ ] Settings Screen
- [ ] Push Notifications (FCM)

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) - Monorepo overview
- [apps/macos/CLAUDE.md](../../macos/CLAUDE.md) - Reference native implementation (Swift)
- [Encryption Architecture](../../../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Material Design 3](https://m3.material.io/) - Design system guidelines
- [Android Developers](https://developer.android.com/docs) - Official documentation
- [Jetpack Compose](https://developer.android.com/jetpack/compose) - Compose documentation
