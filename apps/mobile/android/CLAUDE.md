# Happy Android - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Project Status

**Status**: 🚧 **Planned** - Development not yet started

This folder is reserved for the native Android client. The project will follow modern Android development practices with Kotlin and Jetpack Compose.

## Planned Architecture

### Pattern: MVVM with Clean Architecture

```
app/src/main/
├── data/                # Data layer
│   ├── api/             # Retrofit API definitions
│   ├── repository/      # Repository implementations
│   └── local/           # Room database, DataStore
├── domain/              # Business logic
│   ├── model/           # Domain models
│   ├── repository/      # Repository interfaces
│   └── usecase/         # Use cases
├── ui/                  # Presentation layer
│   ├── components/      # Reusable Compose components
│   ├── screens/         # Screen composables
│   ├── viewmodel/       # ViewModels
│   └── theme/           # Material Design 3 theme
└── di/                  # Dependency injection (Hilt)
```

### Key Design Decisions

1. **Jetpack Compose**: Modern declarative UI
2. **Kotlin Coroutines/Flow**: Reactive data streams
3. **Hilt**: Dependency injection
4. **Clean Architecture**: Separation of concerns

## Development Requirements

| Requirement | Version |
|-------------|---------|
| Android Studio | Latest stable |
| Kotlin | 1.9+ |
| Gradle | 8.x |
| Min SDK | 26 (Android 8.0) |
| Target SDK | 34 (Android 14) |

## Core Dependencies (Planned)

```kotlin
// build.gradle.kts
dependencies {
    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")

    // Architecture
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose")
    implementation("androidx.hilt:hilt-navigation-compose")

    // Networking
    implementation("com.squareup.retrofit2:retrofit")
    implementation("com.squareup.okhttp3:okhttp")

    // Local storage
    implementation("androidx.room:room-runtime")
    implementation("androidx.datastore:datastore-preferences")

    // Encryption
    implementation("com.google.crypto.tink:tink-android")
}
```

## Key Services

### ApiService

Handles all HTTP communication with the Happy server.

```kotlin
interface ApiService {
    @GET("v1/sessions")
    suspend fun getSessions(): List<Session>

    @POST("v1/sessions/{id}/messages")
    suspend fun sendMessage(@Path("id") sessionId: String, @Body message: Message): Response
}
```

### SyncService

Manages real-time WebSocket synchronization using OkHttp WebSocket.

```kotlin
class SyncService @Inject constructor(
    private val okHttpClient: OkHttpClient
) {
    fun connect(): Flow<SyncEvent>
    fun disconnect()
    suspend fun subscribe(sessionId: String)
}
```

### EncryptionService

End-to-end encryption using AES-256-GCM via Google Tink.

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

## Protocol Types

The Android app should parse protocol types compatible with `@happy/protocol`. Consider using:
- Kotlinx Serialization for JSON parsing
- Data classes matching Zod schema structures

Example:
```kotlin
@Serializable
data class ApiSession(
    val id: String,
    val title: String?,
    val status: String,
    val createdAt: Long
)
```

## Code Style

Follow Android/Kotlin conventions:
- Classes: PascalCase (`SessionViewModel`, `ApiService`)
- Functions/properties: camelCase (`fetchSessions()`, `currentSession`)
- Packages: lowercase (`com.enflame.happy.ui.screens`)
- Constants: SCREAMING_SNAKE_CASE (`const val MAX_RETRIES = 3`)

## Security Considerations

1. **Android Keystore**: Store cryptographic keys securely
2. **E2E Encryption**: All session data is encrypted client-side
3. **No plaintext secrets**: Never log or persist unencrypted credentials
4. **Network security config**: HTTPS only, certificate pinning recommended
5. **ProGuard/R8**: Enable code shrinking and obfuscation

## Getting Started

When development begins:

1. Create Gradle project structure
2. Set up Hilt dependency injection
3. Implement core services (API, Sync, Encryption)
4. Build Compose UI screens
5. Add comprehensive testing (JUnit, Compose UI tests)

## Related Documentation

- [Root CLAUDE.md](../../../CLAUDE.md) - Monorepo overview
- [apps/macos/CLAUDE.md](../../macos/CLAUDE.md) - Reference native implementation
- [Encryption Architecture](../../../docs/ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [Material Design 3](https://m3.material.io/) - Design system guidelines
- [Android Developers](https://developer.android.com/docs) - Official documentation
