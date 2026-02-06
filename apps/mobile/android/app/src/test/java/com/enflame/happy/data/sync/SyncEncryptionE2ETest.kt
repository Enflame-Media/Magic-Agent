package com.enflame.happy.data.sync

import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.domain.model.MessageRole
import com.enflame.happy.domain.model.SessionStatus
import com.enflame.happy.domain.model.ToolUseStatus
import kotlinx.serialization.json.Json
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import java.security.SecureRandom

/**
 * End-to-end encryption tests for the sync message pipeline.
 *
 * Tests the complete cycle of:
 * 1. Constructing a JSON sync envelope
 * 2. Encrypting it with AES-256-GCM (matching the server/CLI format)
 * 3. Decrypting the bundle
 * 4. Parsing the decrypted JSON into domain models
 *
 * This validates cross-platform compatibility: if a CLI encrypts a message
 * with a shared key, the Android client can decrypt and parse it correctly.
 *
 * ## Relationship to Other Tests
 * - [EncryptionServiceTest]: Tests encryption primitives in isolation
 * - [SyncMessageTest]: Tests JSON parsing in isolation
 * - [SyncServiceIntegrationTest]: Tests the full service with mocked WebSocket
 * - **This file**: Tests the encryption + parsing pipeline without any service layer
 */
class SyncEncryptionE2ETest {

    private lateinit var encryptionService: EncryptionService
    private lateinit var json: Json
    private lateinit var sharedKey: ByteArray
    private val secureRandom = SecureRandom()

    @Before
    fun setUp() {
        encryptionService = EncryptionService()
        json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            encodeDefaults = true
            isLenient = true
        }

        // Simulate a shared key derived from ECDH key agreement
        // (In production, this comes from deriveSharedSecret)
        val alice = encryptionService.generateKeyPair()
        val bob = encryptionService.generateKeyPair()
        sharedKey = encryptionService.deriveSharedSecret(alice.privateKey, bob.publicKey)
    }

    // ========================================================================
    // Simulating CLI -> Android Message Flow
    // ========================================================================

    /**
     * Simulate what happens when the CLI encrypts a session update and
     * the Android client receives and decrypts it.
     */
    @Test
    fun `CLI encrypts session update - Android decrypts and parses`() {
        // Step 1: CLI creates the JSON envelope (simulated)
        val cliPayload = """
            {
                "type": "session",
                "session": {
                    "id": "sess-cli-001",
                    "title": "Claude Code Session",
                    "status": "ACTIVE",
                    "createdAt": 1706745600,
                    "updatedAt": 1706745700,
                    "machineId": "machine-macbook",
                    "machineName": "Ryan's MacBook Pro"
                }
            }
        """.trimIndent()

        // Step 2: CLI encrypts with the shared key (v0 format)
        val encrypted = encryptionService.encrypt(
            cliPayload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        // Step 3: Verify the encrypted bundle format
        assertEquals("Bundle should start with v0 version byte", 0x00.toByte(), encrypted[0])
        assertTrue("Bundle should be larger than plaintext", encrypted.size > cliPayload.length)

        // Step 4: Android decrypts
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val jsonString = String(decrypted, Charsets.UTF_8)

        // Step 5: Android parses the envelope
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(jsonString)
        assertEquals(SyncMessageType.SESSION, envelope.type)
        assertNotNull(envelope.session)
        assertEquals("sess-cli-001", envelope.session!!.id)
        assertEquals("Claude Code Session", envelope.session!!.title)
        assertEquals(SessionStatus.ACTIVE, envelope.session!!.status)
        assertEquals(1706745600L, envelope.session!!.createdAt)
        assertEquals(1706745700L, envelope.session!!.updatedAt)
        assertEquals("machine-macbook", envelope.session!!.machineId)
        assertEquals("Ryan's MacBook Pro", envelope.session!!.machineName)
    }

    @Test
    fun `CLI encrypts message update with tool uses - Android decrypts and parses`() {
        val cliPayload = """
            {
                "type": "message",
                "message": {
                    "id": "msg-cli-001",
                    "sessionId": "sess-cli-001",
                    "role": "ASSISTANT",
                    "content": "I'll create that file for you.",
                    "createdAt": 1706745700,
                    "toolUses": [
                        {
                            "id": "tool-001",
                            "name": "write",
                            "input": "/path/to/file.ts",
                            "output": "File created successfully",
                            "status": "COMPLETED"
                        }
                    ]
                }
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            cliPayload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(SyncMessageType.MESSAGE, envelope.type)
        assertNotNull(envelope.message)
        assertEquals("msg-cli-001", envelope.message!!.id)
        assertEquals(MessageRole.ASSISTANT, envelope.message!!.role)
        assertNotNull(envelope.message!!.toolUses)
        assertEquals(1, envelope.message!!.toolUses!!.size)
        assertEquals("write", envelope.message!!.toolUses!![0].name)
        assertEquals(ToolUseStatus.COMPLETED, envelope.message!!.toolUses!![0].status)
    }

    @Test
    fun `CLI encrypts session revival paused - Android decrypts and parses`() {
        val cliPayload = """
            {
                "type": "session-revival-paused",
                "reason": "Circuit breaker cooldown active after 3 failures",
                "remainingMs": 30000,
                "resumesAt": 1706746000000,
                "machineId": "machine-server-01"
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            cliPayload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(SyncMessageType.SESSION_REVIVAL_PAUSED, envelope.type)
        assertEquals("Circuit breaker cooldown active after 3 failures", envelope.reason)
        assertEquals(30000, envelope.remainingMs)
        assertEquals(1706746000000L, envelope.resumesAt)
        assertEquals("machine-server-01", envelope.machineId)
    }

    @Test
    fun `CLI encrypts session revived - Android decrypts and parses`() {
        val cliPayload = """
            {
                "type": "session-revived",
                "originalSessionId": "sess-original-123",
                "newSessionId": "sess-new-456",
                "machineId": "machine-revived"
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            cliPayload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(SyncMessageType.SESSION_REVIVED, envelope.type)
        assertEquals("sess-original-123", envelope.originalSessionId)
        assertEquals("sess-new-456", envelope.newSessionId)
        assertEquals("machine-revived", envelope.machineId)
    }

    // ========================================================================
    // Bidirectional Encryption (Android -> CLI and CLI -> Android)
    // ========================================================================

    @Test
    fun `bidirectional - both parties derive same key and can cross-decrypt`() {
        val alice = encryptionService.generateKeyPair() // CLI
        val bob = encryptionService.generateKeyPair()   // Android

        val aliceKey = encryptionService.deriveSharedSecret(alice.privateKey, bob.publicKey)
        val bobKey = encryptionService.deriveSharedSecret(bob.privateKey, alice.publicKey)

        // Keys should be identical
        assertArrayEquals("Derived keys must match", aliceKey, bobKey)

        // CLI encrypts, Android decrypts
        val cliMessage = """{"type":"ping"}"""
        val cliEncrypted = encryptionService.encrypt(
            cliMessage.toByteArray(Charsets.UTF_8),
            aliceKey
        )
        val androidDecrypted = encryptionService.decrypt(cliEncrypted, bobKey)
        assertEquals(cliMessage, String(androidDecrypted, Charsets.UTF_8))

        // Android encrypts, CLI decrypts
        val androidMessage = """{"type":"pong"}"""
        val androidEncrypted = encryptionService.encrypt(
            androidMessage.toByteArray(Charsets.UTF_8),
            bobKey
        )
        val cliDecrypted = encryptionService.decrypt(androidEncrypted, aliceKey)
        assertEquals(androidMessage, String(cliDecrypted, Charsets.UTF_8))
    }

    // ========================================================================
    // V0 vs V1 Bundle Format Compatibility
    // ========================================================================

    @Test
    fun `v0 bundle from CLI is decryptable on Android`() {
        val payload = """{"type":"session","session":{"id":"v0-sess","createdAt":1}}"""

        // Encrypt as v0 (standard encrypt produces v0)
        val v0Bundle = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        assertEquals("Should be v0 format", 0x00.toByte(), v0Bundle[0])

        val decrypted = encryptionService.decrypt(v0Bundle, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )
        assertEquals("v0-sess", envelope.session!!.id)
    }

    @Test
    fun `v1 bundle from server is decryptable on Android`() {
        val payload = """{"type":"session","session":{"id":"v1-sess","createdAt":1}}"""

        // First encrypt as v0 to get valid ciphertext
        val v0Bundle = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        // Re-package as v1 with key version
        val nonce = v0Bundle.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE)
        val ciphertextAndTag = v0Bundle.copyOfRange(
            1 + EncryptionService.NONCE_SIZE,
            v0Bundle.size
        )

        val keyVersion = 42
        val v1Bundle = ByteArray(3 + EncryptionService.NONCE_SIZE + ciphertextAndTag.size)
        v1Bundle[0] = EncryptionService.BUNDLE_VERSION_V1
        v1Bundle[1] = ((keyVersion shr 8) and 0xFF).toByte()
        v1Bundle[2] = (keyVersion and 0xFF).toByte()
        System.arraycopy(nonce, 0, v1Bundle, 3, EncryptionService.NONCE_SIZE)
        System.arraycopy(ciphertextAndTag, 0, v1Bundle, 3 + EncryptionService.NONCE_SIZE, ciphertextAndTag.size)

        // Verify bundle info
        val info = encryptionService.getBundleInfo(v1Bundle)
        assertNotNull(info)
        assertEquals(1, info!!.formatVersion)
        assertEquals(42, info.keyVersion)

        // Decrypt and parse
        val decrypted = encryptionService.decrypt(v1Bundle, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )
        assertEquals("v1-sess", envelope.session!!.id)
    }

    // ========================================================================
    // Large Payload Encryption
    // ========================================================================

    @Test
    fun `large session with many messages encrypts and decrypts correctly`() {
        // Simulate a session with a very long content field (e.g., large code output)
        val largeContent = "x".repeat(100_000)
        val payload = """
            {
                "type": "message",
                "message": {
                    "id": "msg-large",
                    "sessionId": "sess-large",
                    "role": "ASSISTANT",
                    "content": "$largeContent",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(SyncMessageType.MESSAGE, envelope.type)
        assertEquals(largeContent, envelope.message!!.content)
    }

    // ========================================================================
    // Unicode in Encrypted Payloads
    // ========================================================================

    @Test
    fun `encrypted message with CJK characters round-trips correctly`() {
        val cjkContent = "\u4F60\u597D\u4E16\u754C\uFF01\u3053\u3093\u306B\u3061\u306F\uC548\uB155\uD558\uC138\uC694"
        val payload = """
            {
                "type": "message",
                "message": {
                    "id": "msg-cjk",
                    "sessionId": "sess-i18n",
                    "role": "ASSISTANT",
                    "content": "$cjkContent",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(cjkContent, envelope.message!!.content)
    }

    @Test
    fun `encrypted message with emoji round-trips correctly`() {
        val emojiContent = "\uD83D\uDE80\uD83C\uDF1F\uD83D\uDD25\u2728\uD83E\uDD16\uD83C\uDF89"
        val payload = """
            {
                "type": "message",
                "message": {
                    "id": "msg-emoji",
                    "sessionId": "sess-emoji",
                    "role": "ASSISTANT",
                    "content": "$emojiContent",
                    "createdAt": 1700000000
                }
            }
        """.trimIndent()

        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )
        val decrypted = encryptionService.decrypt(encrypted, sharedKey)
        val envelope = json.decodeFromString<SyncUpdateEnvelope>(
            String(decrypted, Charsets.UTF_8)
        )

        assertEquals(emojiContent, envelope.message!!.content)
    }

    // ========================================================================
    // Multiple Sequential Operations with Same Key
    // ========================================================================

    @Test
    fun `many sequential encrypt-decrypt cycles with same key all succeed`() {
        val count = 100
        for (i in 0 until count) {
            val payload = """{"type":"session","session":{"id":"seq-$i","createdAt":$i}}"""
            val encrypted = encryptionService.encrypt(
                payload.toByteArray(Charsets.UTF_8),
                sharedKey
            )
            val decrypted = encryptionService.decrypt(encrypted, sharedKey)
            val envelope = json.decodeFromString<SyncUpdateEnvelope>(
                String(decrypted, Charsets.UTF_8)
            )
            assertEquals("seq-$i", envelope.session!!.id)
        }
    }

    @Test
    fun `nonces are unique across sequential encryptions`() {
        val nonces = mutableSetOf<List<Byte>>()
        for (i in 0 until 200) {
            val encrypted = encryptionService.encrypt(
                """{"type":"ping"}""".toByteArray(),
                sharedKey
            )
            val nonce = encrypted.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE).toList()
            assertTrue("Nonce at iteration $i should be unique", nonces.add(nonce))
        }
        assertEquals("All 200 nonces should be unique", 200, nonces.size)
    }

    // ========================================================================
    // Error Cases
    // ========================================================================

    @Test(expected = com.enflame.happy.domain.model.EncryptionError.DecryptionFailed::class)
    fun `decryption with wrong shared key fails`() {
        val payload = """{"type":"ping"}"""
        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        // Different key pair -> different shared key
        val eve = encryptionService.generateKeyPair()
        val evePartner = encryptionService.generateKeyPair()
        val eveKey = encryptionService.deriveSharedSecret(eve.privateKey, evePartner.publicKey)

        // This should throw DecryptionFailed
        encryptionService.decrypt(encrypted, eveKey)
    }

    @Test(expected = com.enflame.happy.domain.model.EncryptionError.DecryptionFailed::class)
    fun `tampered ciphertext causes authentication failure`() {
        val payload = """{"type":"session","session":{"id":"tamper-test","createdAt":1}}"""
        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        // Flip a bit in the ciphertext
        val tampered = encrypted.clone()
        val ciphertextOffset = 1 + EncryptionService.NONCE_SIZE
        tampered[ciphertextOffset] = (tampered[ciphertextOffset].toInt() xor 0x01).toByte()

        encryptionService.decrypt(tampered, sharedKey)
    }

    @Test(expected = com.enflame.happy.domain.model.EncryptionError.DecryptionFailed::class)
    fun `tampered auth tag causes authentication failure`() {
        val payload = """{"type":"ping"}"""
        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        val tampered = encrypted.clone()
        tampered[tampered.size - 1] = (tampered[tampered.size - 1].toInt() xor 0x01).toByte()

        encryptionService.decrypt(tampered, sharedKey)
    }

    @Test(expected = com.enflame.happy.domain.model.EncryptionError.InvalidBundle::class)
    fun `truncated bundle fails decryption`() {
        val payload = """{"type":"ping"}"""
        val encrypted = encryptionService.encrypt(
            payload.toByteArray(Charsets.UTF_8),
            sharedKey
        )

        // Truncate to less than minimum v0 size
        val truncated = encrypted.copyOfRange(0, 10)
        encryptionService.decrypt(truncated, sharedKey)
    }

    // ========================================================================
    // HKDF Determinism for Cross-Platform Key Derivation
    // ========================================================================

    @Test
    fun `HKDF produces deterministic output for cross-platform verification`() {
        // These known inputs can be used to verify against other platform implementations
        val ikm = ByteArray(32) { it.toByte() }
        val salt = byteArrayOf()
        val info = "happy-encryption".toByteArray(Charsets.UTF_8)

        val derived1 = encryptionService.hkdfSha256(ikm, salt, info, 32)
        val derived2 = encryptionService.hkdfSha256(ikm, salt, info, 32)

        assertArrayEquals("HKDF must be deterministic", derived1, derived2)
        assertEquals("Output must be 32 bytes", 32, derived1.size)

        // Verify it's not all zeros (sanity check)
        assertTrue(
            "Derived key should not be all zeros",
            derived1.any { it != 0.toByte() }
        )
    }

    @Test
    fun `different ECDH key pairs produce different derived keys`() {
        val alice1 = encryptionService.generateKeyPair()
        val bob1 = encryptionService.generateKeyPair()
        val key1 = encryptionService.deriveSharedSecret(alice1.privateKey, bob1.publicKey)

        val alice2 = encryptionService.generateKeyPair()
        val bob2 = encryptionService.generateKeyPair()
        val key2 = encryptionService.deriveSharedSecret(alice2.privateKey, bob2.publicKey)

        assertTrue(
            "Different key pairs should produce different shared secrets",
            !key1.contentEquals(key2)
        )
    }
}
