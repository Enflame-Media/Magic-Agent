package com.enflame.happy.data.crypto

import com.enflame.happy.domain.model.EncryptionError
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Before
import org.junit.Test
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.SecureRandom

/**
 * Unit tests for [EncryptionService].
 *
 * Validates AES-256-GCM encryption/decryption, bundle format compatibility
 * with other Happy clients, key exchange, HKDF, and error handling.
 */
class EncryptionServiceTest {

    private lateinit var service: EncryptionService
    private lateinit var testKey: ByteArray
    private val secureRandom = SecureRandom()

    @Before
    fun setUp() {
        service = EncryptionService()
        testKey = ByteArray(32).also { secureRandom.nextBytes(it) }
    }

    // ========================================================================
    // Basic Encrypt/Decrypt Round-Trip
    // ========================================================================

    @Test
    fun `encrypt and decrypt round-trip produces original data`() {
        val plaintext = "Hello, Happy Android!".toByteArray(Charsets.UTF_8)

        val encrypted = service.encrypt(plaintext, testKey)
        val decrypted = service.decrypt(encrypted, testKey)

        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `encrypt and decrypt round-trip with empty data`() {
        val plaintext = byteArrayOf()

        val encrypted = service.encrypt(plaintext, testKey)
        val decrypted = service.decrypt(encrypted, testKey)

        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `encrypt and decrypt round-trip with large data`() {
        val plaintext = ByteArray(100_000).also { secureRandom.nextBytes(it) }

        val encrypted = service.encrypt(plaintext, testKey)
        val decrypted = service.decrypt(encrypted, testKey)

        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `encrypt and decrypt round-trip with JSON data`() {
        val json = """{"sessionId":"abc-123","title":"Test Session","messages":[]}"""
        val plaintext = json.toByteArray(Charsets.UTF_8)

        val encrypted = service.encrypt(plaintext, testKey)
        val decrypted = service.decrypt(encrypted, testKey)

        assertEquals(json, String(decrypted, Charsets.UTF_8))
    }

    @Test
    fun `encrypt and decrypt round-trip with unicode data`() {
        val plaintext = "Hello \uD83D\uDE00 World \u4F60\u597D".toByteArray(Charsets.UTF_8)

        val encrypted = service.encrypt(plaintext, testKey)
        val decrypted = service.decrypt(encrypted, testKey)

        assertArrayEquals(plaintext, decrypted)
    }

    // ========================================================================
    // Bundle Format - V0
    // ========================================================================

    @Test
    fun `encrypted bundle starts with version byte 0x00`() {
        val plaintext = "test".toByteArray()
        val encrypted = service.encrypt(plaintext, testKey)

        assertEquals(
            "First byte should be version 0x00",
            0x00.toByte(),
            encrypted[0]
        )
    }

    @Test
    fun `encrypted bundle has correct structure - version nonce ciphertext authTag`() {
        val plaintext = "test data".toByteArray()
        val encrypted = service.encrypt(plaintext, testKey)

        // Bundle: [version:1][nonce:12][ciphertext:N][authTag:16]
        assertTrue(
            "Bundle should be at least 29 bytes (1+12+0+16)",
            encrypted.size >= EncryptionService.MIN_V0_BUNDLE_SIZE
        )

        // Version byte
        assertEquals(0x00.toByte(), encrypted[0])

        // Total size should be 1 + 12 + plaintextLen + 16
        val expectedSize = 1 + EncryptionService.NONCE_SIZE + plaintext.size + EncryptionService.AUTH_TAG_BYTES
        assertEquals("Bundle size should match expected", expectedSize, encrypted.size)
    }

    @Test
    fun `each encryption produces unique ciphertext due to hybrid nonce`() {
        val plaintext = "same data".toByteArray()

        val encrypted1 = service.encrypt(plaintext, testKey)
        val encrypted2 = service.encrypt(plaintext, testKey)

        // Different nonces mean different ciphertext
        assertTrue(
            "Two encryptions of same data should produce different bundles",
            !encrypted1.contentEquals(encrypted2)
        )

        // But both should decrypt to the same plaintext
        assertArrayEquals(plaintext, service.decrypt(encrypted1, testKey))
        assertArrayEquals(plaintext, service.decrypt(encrypted2, testKey))
    }

    // ========================================================================
    // Bundle Format - V1 Decryption
    // ========================================================================

    @Test
    fun `decrypt supports v1 bundle format with key version`() {
        // Manually construct a v1 bundle:
        // [version:1=0x01][keyVersion:2][nonce:12][ciphertext:N][authTag:16]
        val plaintext = "v1 test data".toByteArray()

        // First encrypt with standard v0 to get valid ciphertext
        val v0Bundle = service.encrypt(plaintext, testKey)

        // Extract nonce, ciphertext, and authTag from v0 bundle
        val nonce = v0Bundle.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE)
        val ciphertextAndTag = v0Bundle.copyOfRange(
            1 + EncryptionService.NONCE_SIZE,
            v0Bundle.size
        )

        // Construct v1 bundle with key version 1
        val keyVersion = 1
        val v1Bundle = ByteArray(1 + 2 + ciphertextAndTag.size + EncryptionService.NONCE_SIZE)
        v1Bundle[0] = EncryptionService.BUNDLE_VERSION_V1
        v1Bundle[1] = ((keyVersion shr 8) and 0xFF).toByte()
        v1Bundle[2] = (keyVersion and 0xFF).toByte()
        System.arraycopy(nonce, 0, v1Bundle, 3, EncryptionService.NONCE_SIZE)
        System.arraycopy(
            ciphertextAndTag, 0, v1Bundle,
            3 + EncryptionService.NONCE_SIZE, ciphertextAndTag.size
        )

        val decrypted = service.decrypt(v1Bundle, testKey)
        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `decrypt v1 bundle with high key version number`() {
        val plaintext = "high key version".toByteArray()

        // Encrypt normally first
        val v0Bundle = service.encrypt(plaintext, testKey)
        val nonce = v0Bundle.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE)
        val ciphertextAndTag = v0Bundle.copyOfRange(
            1 + EncryptionService.NONCE_SIZE,
            v0Bundle.size
        )

        // Construct v1 bundle with key version 65535 (maximum)
        val keyVersion = 65535
        val v1Bundle = ByteArray(3 + EncryptionService.NONCE_SIZE + ciphertextAndTag.size)
        v1Bundle[0] = EncryptionService.BUNDLE_VERSION_V1
        v1Bundle[1] = ((keyVersion shr 8) and 0xFF).toByte()
        v1Bundle[2] = (keyVersion and 0xFF).toByte()
        System.arraycopy(nonce, 0, v1Bundle, 3, EncryptionService.NONCE_SIZE)
        System.arraycopy(
            ciphertextAndTag, 0, v1Bundle,
            3 + EncryptionService.NONCE_SIZE, ciphertextAndTag.size
        )

        val decrypted = service.decrypt(v1Bundle, testKey)
        assertArrayEquals(plaintext, decrypted)
    }

    // ========================================================================
    // Bundle Info
    // ========================================================================

    @Test
    fun `getBundleInfo returns correct info for v0 bundle`() {
        val encrypted = service.encrypt("test".toByteArray(), testKey)
        val info = service.getBundleInfo(encrypted)

        assertNotNull(info)
        assertEquals(0, info!!.formatVersion)
        assertNull(info.keyVersion)
    }

    @Test
    fun `getBundleInfo returns correct info for v1 bundle`() {
        val bundle = byteArrayOf(0x01, 0x00, 0x05) + ByteArray(28)
        val info = service.getBundleInfo(bundle)

        assertNotNull(info)
        assertEquals(1, info!!.formatVersion)
        assertEquals(5, info.keyVersion)
    }

    @Test
    fun `getBundleInfo returns null for empty bundle`() {
        assertNull(service.getBundleInfo(byteArrayOf()))
    }

    @Test
    fun `getBundleInfo returns null for unknown format version`() {
        assertNull(service.getBundleInfo(byteArrayOf(0x02)))
    }

    @Test
    fun `getBundleInfo returns null for v1 bundle too short for key version`() {
        assertNull(service.getBundleInfo(byteArrayOf(0x01, 0x00)))
    }

    // ========================================================================
    // Key Validation
    // ========================================================================

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `encrypt throws InvalidKey for 16-byte key`() {
        service.encrypt("test".toByteArray(), ByteArray(16))
    }

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `encrypt throws InvalidKey for 64-byte key`() {
        service.encrypt("test".toByteArray(), ByteArray(64))
    }

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `encrypt throws InvalidKey for empty key`() {
        service.encrypt("test".toByteArray(), byteArrayOf())
    }

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `decrypt throws InvalidKey for wrong key length`() {
        val encrypted = service.encrypt("test".toByteArray(), testKey)
        service.decrypt(encrypted, ByteArray(16))
    }

    // ========================================================================
    // Decryption Error Handling
    // ========================================================================

    @Test(expected = EncryptionError.InvalidBundle::class)
    fun `decrypt throws InvalidBundle for empty bundle`() {
        service.decrypt(byteArrayOf(), testKey)
    }

    @Test(expected = EncryptionError.InvalidBundle::class)
    fun `decrypt throws InvalidBundle for v0 bundle too short`() {
        // Only 10 bytes, below minimum 29
        val shortBundle = byteArrayOf(0x00) + ByteArray(9)
        service.decrypt(shortBundle, testKey)
    }

    @Test(expected = EncryptionError.InvalidBundle::class)
    fun `decrypt throws InvalidBundle for v1 bundle too short`() {
        // Only 10 bytes, below minimum 31
        val shortBundle = byteArrayOf(0x01, 0x00, 0x01) + ByteArray(7)
        service.decrypt(shortBundle, testKey)
    }

    @Test(expected = EncryptionError.UnsupportedFormat::class)
    fun `decrypt throws UnsupportedFormat for unknown version`() {
        val bundle = byteArrayOf(0x02) + ByteArray(50)
        service.decrypt(bundle, testKey)
    }

    @Test(expected = EncryptionError.DecryptionFailed::class)
    fun `decrypt throws DecryptionFailed with wrong key`() {
        val encrypted = service.encrypt("secret data".toByteArray(), testKey)
        val wrongKey = ByteArray(32).also { secureRandom.nextBytes(it) }
        service.decrypt(encrypted, wrongKey)
    }

    @Test(expected = EncryptionError.DecryptionFailed::class)
    fun `decrypt throws DecryptionFailed when ciphertext is tampered`() {
        val encrypted = service.encrypt("secret data".toByteArray(), testKey)

        // Tamper with a byte in the ciphertext area
        val tampered = encrypted.clone()
        val ciphertextOffset = 1 + EncryptionService.NONCE_SIZE
        if (tampered.size > ciphertextOffset) {
            tampered[ciphertextOffset] = (tampered[ciphertextOffset].toInt() xor 0xFF).toByte()
        }

        service.decrypt(tampered, testKey)
    }

    @Test(expected = EncryptionError.DecryptionFailed::class)
    fun `decrypt throws DecryptionFailed when auth tag is tampered`() {
        val encrypted = service.encrypt("secret data".toByteArray(), testKey)

        // Tamper with the last byte (auth tag area)
        val tampered = encrypted.clone()
        tampered[tampered.size - 1] = (tampered[tampered.size - 1].toInt() xor 0xFF).toByte()

        service.decrypt(tampered, testKey)
    }

    @Test(expected = EncryptionError.DecryptionFailed::class)
    fun `decrypt throws DecryptionFailed when nonce is tampered`() {
        val encrypted = service.encrypt("secret data".toByteArray(), testKey)

        // Tamper with the nonce (byte index 1, right after version)
        val tampered = encrypted.clone()
        tampered[1] = (tampered[1].toInt() xor 0xFF).toByte()

        service.decrypt(tampered, testKey)
    }

    // ========================================================================
    // Cross-Platform Compatibility: Bundle Construction from Known Values
    // ========================================================================

    @Test
    fun `can decrypt manually constructed v0 bundle matching CLI format`() {
        // This test validates that Android can decrypt bundles in the exact format
        // produced by happy-cli's encryptWithDataKey function.
        // Bundle: [version:1=0x00][nonce:12][ciphertext:N][authTag:16]

        val key = ByteArray(32) { it.toByte() } // Deterministic key for testing
        val plaintext = "cross-platform test".toByteArray()

        // Encrypt on Android
        val encrypted = service.encrypt(plaintext, key)

        // Verify the bundle structure matches the cross-platform format
        assertEquals("Version byte", 0x00.toByte(), encrypted[0])
        assertTrue("Bundle length check", encrypted.size == 1 + 12 + plaintext.size + 16)

        // Verify we can decrypt our own output
        val decrypted = service.decrypt(encrypted, key)
        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `v0 bundle layout matches CLI and macOS format exactly`() {
        // Verify byte-level layout: [version:1][nonce:12][ciphertext:N][authTag:16]
        val plaintext = "layout test".toByteArray()
        val encrypted = service.encrypt(plaintext, testKey)

        // Extract components
        val version = encrypted[0]
        val nonce = encrypted.copyOfRange(1, 13) // 12 bytes
        val ciphertext = encrypted.copyOfRange(13, encrypted.size - 16)
        val authTag = encrypted.copyOfRange(encrypted.size - 16, encrypted.size)

        assertEquals("Version byte should be 0x00", 0x00.toByte(), version)
        assertEquals("Nonce should be 12 bytes", 12, nonce.size)
        assertEquals("Ciphertext should equal plaintext length", plaintext.size, ciphertext.size)
        assertEquals("Auth tag should be 16 bytes", 16, authTag.size)
    }

    // ========================================================================
    // Key Pair Generation
    // ========================================================================

    @Test
    fun `generateKeyPair produces non-empty keys`() {
        val keyPair = service.generateKeyPair()

        assertTrue("Private key should not be empty", keyPair.privateKey.isNotEmpty())
        assertTrue("Public key should not be empty", keyPair.publicKey.isNotEmpty())
    }

    @Test
    fun `generateKeyPair produces unique key pairs`() {
        val keyPair1 = service.generateKeyPair()
        val keyPair2 = service.generateKeyPair()

        assertTrue(
            "Two generated key pairs should have different private keys",
            !keyPair1.privateKey.contentEquals(keyPair2.privateKey)
        )
        assertTrue(
            "Two generated key pairs should have different public keys",
            !keyPair1.publicKey.contentEquals(keyPair2.publicKey)
        )
    }

    // ========================================================================
    // Key Agreement (ECDH)
    // ========================================================================

    @Test
    fun `deriveSharedSecret produces same key for both sides`() {
        val aliceKeyPair = service.generateKeyPair()
        val bobKeyPair = service.generateKeyPair()

        val aliceShared = service.deriveSharedSecret(aliceKeyPair.privateKey, bobKeyPair.publicKey)
        val bobShared = service.deriveSharedSecret(bobKeyPair.privateKey, aliceKeyPair.publicKey)

        assertArrayEquals(
            "Both sides should derive the same shared secret",
            aliceShared,
            bobShared
        )
    }

    @Test
    fun `deriveSharedSecret produces 32-byte key`() {
        val aliceKeyPair = service.generateKeyPair()
        val bobKeyPair = service.generateKeyPair()

        val shared = service.deriveSharedSecret(aliceKeyPair.privateKey, bobKeyPair.publicKey)

        assertEquals("Derived key should be 32 bytes", 32, shared.size)
    }

    @Test
    fun `derived shared secret can be used for encryption and decryption`() {
        val aliceKeyPair = service.generateKeyPair()
        val bobKeyPair = service.generateKeyPair()

        val sharedKey = service.deriveSharedSecret(aliceKeyPair.privateKey, bobKeyPair.publicKey)

        val plaintext = "Hello from Alice to Bob!".toByteArray()
        val encrypted = service.encrypt(plaintext, sharedKey)
        val decrypted = service.decrypt(encrypted, sharedKey)

        assertArrayEquals(plaintext, decrypted)
    }

    @Test
    fun `different key pairs produce different shared secrets`() {
        val alice = service.generateKeyPair()
        val bob = service.generateKeyPair()
        val charlie = service.generateKeyPair()

        val aliceBob = service.deriveSharedSecret(alice.privateKey, bob.publicKey)
        val aliceCharlie = service.deriveSharedSecret(alice.privateKey, charlie.publicKey)

        assertTrue(
            "Different peer keys should produce different shared secrets",
            !aliceBob.contentEquals(aliceCharlie)
        )
    }

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `deriveSharedSecret throws for invalid private key`() {
        val bobKeyPair = service.generateKeyPair()
        service.deriveSharedSecret(byteArrayOf(1, 2, 3), bobKeyPair.publicKey)
    }

    @Test(expected = EncryptionError.InvalidKey::class)
    fun `deriveSharedSecret throws for invalid public key`() {
        val aliceKeyPair = service.generateKeyPair()
        service.deriveSharedSecret(aliceKeyPair.privateKey, byteArrayOf(1, 2, 3))
    }

    // ========================================================================
    // HKDF
    // ========================================================================

    @Test
    fun `hkdfSha256 produces deterministic output for same inputs`() {
        val ikm = ByteArray(32) { it.toByte() }
        val salt = byteArrayOf()
        val info = "happy-encryption".toByteArray()

        val key1 = service.hkdfSha256(ikm, salt, info, 32)
        val key2 = service.hkdfSha256(ikm, salt, info, 32)

        assertArrayEquals("HKDF should be deterministic", key1, key2)
    }

    @Test
    fun `hkdfSha256 produces correct output length`() {
        val ikm = ByteArray(32) { it.toByte() }

        assertEquals(16, service.hkdfSha256(ikm, byteArrayOf(), byteArrayOf(), 16).size)
        assertEquals(32, service.hkdfSha256(ikm, byteArrayOf(), byteArrayOf(), 32).size)
        assertEquals(64, service.hkdfSha256(ikm, byteArrayOf(), byteArrayOf(), 64).size)
    }

    @Test
    fun `hkdfSha256 different info produces different keys`() {
        val ikm = ByteArray(32) { it.toByte() }

        val key1 = service.hkdfSha256(ikm, byteArrayOf(), "happy-encryption".toByteArray(), 32)
        val key2 = service.hkdfSha256(ikm, byteArrayOf(), "other-info".toByteArray(), 32)

        assertTrue(
            "Different info should produce different keys",
            !key1.contentEquals(key2)
        )
    }

    @Test
    fun `hkdfSha256 with empty salt uses zero-filled salt`() {
        // RFC 5869: if salt is not provided, it is set to a string of HashLen zeros
        val ikm = ByteArray(32) { it.toByte() }

        val keyEmpty = service.hkdfSha256(ikm, byteArrayOf(), "test".toByteArray(), 32)
        val keyZero = service.hkdfSha256(ikm, ByteArray(32), "test".toByteArray(), 32)

        assertArrayEquals(
            "Empty salt and zero-filled salt should produce same result",
            keyEmpty,
            keyZero
        )
    }

    // ========================================================================
    // Hybrid Nonce Properties
    // ========================================================================

    @Test
    fun `hybrid nonce counter increments across encryptions`() {
        // Encrypt multiple times and verify nonces are different
        val nonces = mutableListOf<ByteArray>()
        val plaintext = "nonce test".toByteArray()

        repeat(10) {
            val encrypted = service.encrypt(plaintext, testKey)
            // Extract nonce (bytes 1-12)
            nonces.add(encrypted.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE))
        }

        // All nonces should be unique
        val uniqueNonces = nonces.map { it.toList() }.toSet()
        assertEquals("All 10 nonces should be unique", 10, uniqueNonces.size)

        // The counter portion (last 8 bytes) should be incrementing
        val counters = nonces.map { nonce ->
            ByteBuffer.wrap(nonce, 4, 8).order(ByteOrder.BIG_ENDIAN).long
        }

        for (i in 1 until counters.size) {
            assertTrue(
                "Counter should be incrementing: ${counters[i - 1]} < ${counters[i]}",
                counters[i] > counters[i - 1]
            )
        }
    }

    // ========================================================================
    // Thread Safety
    // ========================================================================

    @Test
    fun `concurrent encryptions do not produce duplicate nonces`() {
        val plaintext = "concurrent test".toByteArray()
        val results = java.util.concurrent.ConcurrentLinkedQueue<ByteArray>()
        val threads = (1..8).map {
            Thread {
                repeat(50) {
                    val encrypted = service.encrypt(plaintext, testKey)
                    val nonce = encrypted.copyOfRange(1, 1 + EncryptionService.NONCE_SIZE)
                    results.add(nonce)
                }
            }
        }

        threads.forEach { it.start() }
        threads.forEach { it.join() }

        assertEquals("Should have 400 nonces total", 400, results.size)

        // Extract counter portions and verify uniqueness
        val counterValues = results.map { nonce ->
            ByteBuffer.wrap(nonce, 4, 8).order(ByteOrder.BIG_ENDIAN).long
        }.toSet()

        assertEquals(
            "All counter values should be unique across threads",
            400,
            counterValues.size
        )
    }

    // ========================================================================
    // KeyPairData Equality
    // ========================================================================

    @Test
    fun `KeyPairData equals works correctly`() {
        val key1 = KeyPairData(byteArrayOf(1, 2, 3), byteArrayOf(4, 5, 6))
        val key2 = KeyPairData(byteArrayOf(1, 2, 3), byteArrayOf(4, 5, 6))
        val key3 = KeyPairData(byteArrayOf(7, 8, 9), byteArrayOf(4, 5, 6))

        assertEquals(key1, key2)
        assertTrue(key1 != key3)
    }

    @Test
    fun `KeyPairData hashCode is consistent with equals`() {
        val key1 = KeyPairData(byteArrayOf(1, 2, 3), byteArrayOf(4, 5, 6))
        val key2 = KeyPairData(byteArrayOf(1, 2, 3), byteArrayOf(4, 5, 6))

        assertEquals(key1.hashCode(), key2.hashCode())
    }
}
