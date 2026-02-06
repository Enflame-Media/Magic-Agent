package com.enflame.happy.data.crypto

import com.enflame.happy.domain.model.EncryptionError
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.SecureRandom
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.X509EncodedKeySpec
import java.util.concurrent.atomic.AtomicLong
import javax.crypto.Cipher
import javax.crypto.KeyAgreement
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * End-to-end encryption service using AES-256-GCM.
 *
 * Implements the same encryption protocol as other Happy clients (happy-cli, happy-app,
 * happy-macos) to ensure cross-platform interoperability.
 *
 * ## Encryption Protocol
 * - Algorithm: AES-256-GCM (matches all Happy clients)
 * - Nonce: 12 bytes (hybrid: 4 random + 8 counter)
 * - Key exchange: X25519 ECDH with HKDF key derivation
 * - HKDF info parameter: "happy-encryption"
 *
 * ## Bundle Format Versions
 * - 0x00 (v0): `[version:1][nonce:12][ciphertext:N][authTag:16]`
 * - 0x01 (v1): `[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]`
 *
 * ## Cross-Platform Compatibility
 * This implementation is compatible with:
 * - happy-cli: Uses AES-256-GCM as primary, TweetNaCl secretbox as legacy
 * - happy-app: Uses AES-256-GCM as primary, libsodium secretbox as legacy
 * - happy-macos: Uses AES-256-GCM via CryptoKit
 *
 * The legacy secretbox format (XSalsa20-Poly1305) is NOT supported here as the
 * Android app only needs to interoperate with modern encrypted data.
 */
@Singleton
class EncryptionService @Inject constructor() {

    // ========================================================================
    // Constants
    // ========================================================================

    companion object {
        /** Bundle format version for AES-256-GCM without key versioning. */
        const val BUNDLE_VERSION_V0: Byte = 0x00

        /** Bundle format version for AES-256-GCM with key versioning. */
        const val BUNDLE_VERSION_V1: Byte = 0x01

        /** Nonce size for AES-256-GCM (12 bytes). */
        const val NONCE_SIZE = 12

        /** Authentication tag size for AES-256-GCM (128 bits = 16 bytes). */
        const val AUTH_TAG_BITS = 128
        const val AUTH_TAG_BYTES = AUTH_TAG_BITS / 8

        /** Required key length for AES-256 (32 bytes). */
        const val KEY_SIZE = 32

        /** Minimum bundle size for v0: version(1) + nonce(12) + authTag(16) = 29 bytes. */
        const val MIN_V0_BUNDLE_SIZE = 1 + NONCE_SIZE + AUTH_TAG_BYTES

        /** Minimum bundle size for v1: version(1) + keyVersion(2) + nonce(12) + authTag(16) = 31 bytes. */
        const val MIN_V1_BUNDLE_SIZE = 1 + 2 + NONCE_SIZE + AUTH_TAG_BYTES

        /** Random bytes in the hybrid nonce (4 bytes). */
        private const val NONCE_RANDOM_BYTES = 4

        /** Counter bytes in the hybrid nonce (8 bytes). */
        private const val NONCE_COUNTER_BYTES = 8

        /** AES-GCM cipher transformation string. */
        private const val AES_GCM_TRANSFORMATION = "AES/GCM/NoPadding"

        /** HKDF info parameter for key derivation, matching all Happy clients. */
        const val HKDF_INFO = "happy-encryption"

        /** X25519 key agreement algorithm. */
        private const val KEY_AGREEMENT_ALGORITHM = "X25519"
    }

    // ========================================================================
    // Nonce Counter
    // ========================================================================

    /**
     * Module-level counter for hybrid nonce generation.
     * Combined with random bytes to eliminate theoretical nonce collision risk.
     * Thread-safe via AtomicLong.
     */
    private val nonceCounter = AtomicLong(0)

    /** Cryptographically secure random number generator. */
    private val secureRandom = SecureRandom()

    // ========================================================================
    // Key Management
    // ========================================================================

    /**
     * Generate a new X25519 key pair for ECDH key agreement.
     *
     * @return A [KeyPairData] containing the raw private and public key bytes.
     */
    fun generateKeyPair(): KeyPairData {
        val keyPairGenerator = KeyPairGenerator.getInstance(KEY_AGREEMENT_ALGORITHM)
        val keyPair = keyPairGenerator.generateKeyPair()

        return KeyPairData(
            privateKey = keyPair.private.encoded,
            publicKey = keyPair.public.encoded
        )
    }

    /**
     * Derive a shared symmetric key from our private key and the peer's public key
     * using X25519 ECDH key agreement followed by HKDF.
     *
     * Uses the same HKDF parameters as happy-cli, happy-app, and happy-macos:
     * - Hash: SHA-256
     * - Salt: empty
     * - Info: "happy-encryption"
     * - Output: 32 bytes (AES-256 key)
     *
     * @param privateKey Our X25519 private key (PKCS#8 encoded).
     * @param peerPublicKey The peer's X25519 public key (X.509 encoded).
     * @return A 32-byte symmetric key suitable for AES-256-GCM.
     * @throws EncryptionError.InvalidKey if the keys are invalid.
     */
    fun deriveSharedSecret(privateKey: ByteArray, peerPublicKey: ByteArray): ByteArray {
        try {
            val keyFactory = KeyFactory.getInstance(KEY_AGREEMENT_ALGORITHM)
            val privKeySpec = PKCS8EncodedKeySpec(privateKey)
            val pubKeySpec = X509EncodedKeySpec(peerPublicKey)

            val privKey = keyFactory.generatePrivate(privKeySpec)
            val pubKey = keyFactory.generatePublic(pubKeySpec)

            val keyAgreement = KeyAgreement.getInstance(KEY_AGREEMENT_ALGORITHM)
            keyAgreement.init(privKey)
            keyAgreement.doPhase(pubKey, true)

            val sharedSecret = keyAgreement.generateSecret()

            // Derive AES-256 key using HKDF with the same parameters as other clients
            return hkdfSha256(
                inputKeyMaterial = sharedSecret,
                salt = byteArrayOf(),
                info = HKDF_INFO.toByteArray(Charsets.UTF_8),
                outputLength = KEY_SIZE
            )
        } catch (e: Exception) {
            throw EncryptionError.InvalidKey("Failed to derive shared secret: ${e.message}")
        }
    }

    // ========================================================================
    // Nonce Generation
    // ========================================================================

    /**
     * Generate a hybrid nonce combining random bytes with a monotonic counter.
     * This eliminates theoretical collision risk in high-throughput scenarios
     * while maintaining cryptographic randomness.
     *
     * Structure: `[random bytes (4)][8-byte counter (big-endian)]`
     * Total: 12 bytes for AES-GCM
     *
     * This matches the hybrid nonce generation used by happy-cli and happy-macos.
     *
     * @return 12-byte hybrid nonce.
     */
    private fun generateHybridNonce(): ByteArray {
        val currentCounter = nonceCounter.getAndIncrement()

        val nonce = ByteArray(NONCE_SIZE)

        // Random prefix (4 bytes)
        val randomPart = ByteArray(NONCE_RANDOM_BYTES)
        secureRandom.nextBytes(randomPart)
        System.arraycopy(randomPart, 0, nonce, 0, NONCE_RANDOM_BYTES)

        // Counter suffix (8 bytes, big-endian)
        val counterBuffer = ByteBuffer.allocate(NONCE_COUNTER_BYTES)
            .order(ByteOrder.BIG_ENDIAN)
            .putLong(currentCounter)
            .array()
        System.arraycopy(counterBuffer, 0, nonce, NONCE_RANDOM_BYTES, NONCE_COUNTER_BYTES)

        return nonce
    }

    // ========================================================================
    // Encryption
    // ========================================================================

    /**
     * Encrypt data with a symmetric key using AES-256-GCM.
     *
     * Output format (v0): `[version:1][nonce:12][ciphertext:N][authTag:16]`
     *
     * This format is compatible with happy-cli's `encryptWithDataKey` and
     * happy-app's `AES256Encryption.encrypt`, and happy-macos's `EncryptionService.encrypt`.
     *
     * Note: In Java's AES/GCM/NoPadding, the auth tag is appended to the ciphertext
     * output automatically. We restructure the output to match the exact bundle format
     * used by other Happy clients.
     *
     * @param data The plaintext data to encrypt.
     * @param key The 32-byte symmetric key.
     * @return Encrypted bundle with version prefix, nonce, ciphertext, and auth tag.
     * @throws EncryptionError.InvalidKey if the key is not 32 bytes.
     * @throws EncryptionError.EncryptionFailed if encryption fails.
     */
    fun encrypt(data: ByteArray, key: ByteArray): ByteArray {
        validateKey(key)

        try {
            val nonce = generateHybridNonce()
            val gcmSpec = GCMParameterSpec(AUTH_TAG_BITS, nonce)
            val secretKey = SecretKeySpec(key, "AES")

            val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, gcmSpec)

            // Java GCM output = ciphertext + authTag (appended)
            val ciphertextWithTag = cipher.doFinal(data)

            // Split: ciphertext is everything except last 16 bytes, authTag is last 16
            val ciphertextLength = ciphertextWithTag.size - AUTH_TAG_BYTES
            val ciphertext = ciphertextWithTag.copyOfRange(0, ciphertextLength)
            val authTag = ciphertextWithTag.copyOfRange(ciphertextLength, ciphertextWithTag.size)

            // Build the bundle: [version:1][nonce:12][ciphertext:N][authTag:16]
            val bundle = ByteArray(1 + NONCE_SIZE + ciphertext.size + AUTH_TAG_BYTES)
            bundle[0] = BUNDLE_VERSION_V0
            System.arraycopy(nonce, 0, bundle, 1, NONCE_SIZE)
            System.arraycopy(ciphertext, 0, bundle, 1 + NONCE_SIZE, ciphertext.size)
            System.arraycopy(authTag, 0, bundle, 1 + NONCE_SIZE + ciphertext.size, AUTH_TAG_BYTES)

            return bundle
        } catch (e: EncryptionError) {
            throw e
        } catch (e: Exception) {
            throw EncryptionError.EncryptionFailed("AES-256-GCM encryption failed", e)
        }
    }

    // ========================================================================
    // Decryption
    // ========================================================================

    /**
     * Decrypt data with a symmetric key using AES-256-GCM.
     *
     * Supports the following bundle formats:
     * - Version 0x00 (v0): `[version:1][nonce:12][ciphertext:N][authTag:16]`
     * - Version 0x01 (v1): `[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]`
     *
     * For v1 bundles, the key version bytes are skipped; the caller is responsible
     * for providing the correct key for the embedded version. Use higher-level
     * key management to resolve the key version.
     *
     * @param bundle The encrypted bundle.
     * @param key The 32-byte symmetric key.
     * @return Decrypted plaintext data.
     * @throws EncryptionError.InvalidKey if the key is not 32 bytes.
     * @throws EncryptionError.InvalidBundle if the bundle is too short or malformed.
     * @throws EncryptionError.UnsupportedFormat if the version byte is unrecognized.
     * @throws EncryptionError.DecryptionFailed if decryption or authentication fails.
     */
    fun decrypt(bundle: ByteArray, key: ByteArray): ByteArray {
        validateKey(key)

        if (bundle.isEmpty()) {
            throw EncryptionError.InvalidBundle("Empty bundle")
        }

        return when (bundle[0]) {
            BUNDLE_VERSION_V0 -> decryptV0(bundle, key)
            BUNDLE_VERSION_V1 -> decryptV1(bundle, key)
            else -> throw EncryptionError.UnsupportedFormat(
                "Unknown bundle format version: 0x${String.format("%02x", bundle[0])}"
            )
        }
    }

    /**
     * Extract bundle metadata without decrypting.
     *
     * @param bundle The encrypted bundle.
     * @return [BundleInfo] containing format version and optional key version, or null if invalid.
     */
    fun getBundleInfo(bundle: ByteArray): BundleInfo? {
        if (bundle.isEmpty()) return null

        return when (bundle[0]) {
            BUNDLE_VERSION_V0 -> BundleInfo(formatVersion = 0)
            BUNDLE_VERSION_V1 -> {
                if (bundle.size < 3) return null
                val keyVersion = ((bundle[1].toInt() and 0xFF) shl 8) or (bundle[2].toInt() and 0xFF)
                BundleInfo(formatVersion = 1, keyVersion = keyVersion)
            }
            else -> null
        }
    }

    // ========================================================================
    // Private Helpers
    // ========================================================================

    /**
     * Decrypt a v0 bundle: `[version:1][nonce:12][ciphertext:N][authTag:16]`
     */
    private fun decryptV0(bundle: ByteArray, key: ByteArray): ByteArray {
        if (bundle.size < MIN_V0_BUNDLE_SIZE) {
            throw EncryptionError.InvalidBundle(
                "V0 bundle too short: ${bundle.size} bytes (minimum $MIN_V0_BUNDLE_SIZE)"
            )
        }

        val nonce = bundle.copyOfRange(1, 1 + NONCE_SIZE)
        val ciphertext = bundle.copyOfRange(1 + NONCE_SIZE, bundle.size - AUTH_TAG_BYTES)
        val authTag = bundle.copyOfRange(bundle.size - AUTH_TAG_BYTES, bundle.size)

        return decryptAesGcm(nonce, ciphertext, authTag, key)
    }

    /**
     * Decrypt a v1 bundle: `[version:1][keyVersion:2][nonce:12][ciphertext:N][authTag:16]`
     */
    private fun decryptV1(bundle: ByteArray, key: ByteArray): ByteArray {
        if (bundle.size < MIN_V1_BUNDLE_SIZE) {
            throw EncryptionError.InvalidBundle(
                "V1 bundle too short: ${bundle.size} bytes (minimum $MIN_V1_BUNDLE_SIZE)"
            )
        }

        // Skip version(1) + keyVersion(2)
        val nonce = bundle.copyOfRange(3, 3 + NONCE_SIZE)
        val ciphertext = bundle.copyOfRange(3 + NONCE_SIZE, bundle.size - AUTH_TAG_BYTES)
        val authTag = bundle.copyOfRange(bundle.size - AUTH_TAG_BYTES, bundle.size)

        return decryptAesGcm(nonce, ciphertext, authTag, key)
    }

    /**
     * Perform AES-256-GCM decryption with the given nonce, ciphertext, and auth tag.
     *
     * Java's GCM implementation expects [ciphertext + authTag] as input to doFinal.
     */
    private fun decryptAesGcm(
        nonce: ByteArray,
        ciphertext: ByteArray,
        authTag: ByteArray,
        key: ByteArray
    ): ByteArray {
        try {
            val gcmSpec = GCMParameterSpec(AUTH_TAG_BITS, nonce)
            val secretKey = SecretKeySpec(key, "AES")

            val cipher = Cipher.getInstance(AES_GCM_TRANSFORMATION)
            cipher.init(Cipher.DECRYPT_MODE, secretKey, gcmSpec)

            // Java GCM expects ciphertext + authTag concatenated
            val ciphertextWithTag = ByteArray(ciphertext.size + authTag.size)
            System.arraycopy(ciphertext, 0, ciphertextWithTag, 0, ciphertext.size)
            System.arraycopy(authTag, 0, ciphertextWithTag, ciphertext.size, authTag.size)

            return cipher.doFinal(ciphertextWithTag)
        } catch (e: Exception) {
            throw EncryptionError.DecryptionFailed("AES-256-GCM decryption failed", e)
        }
    }

    /**
     * Validate that the key is exactly 32 bytes for AES-256.
     */
    private fun validateKey(key: ByteArray) {
        if (key.size != KEY_SIZE) {
            throw EncryptionError.InvalidKey(
                "Invalid key length: expected $KEY_SIZE bytes, got ${key.size} bytes"
            )
        }
    }

    /**
     * HKDF-SHA256 key derivation function.
     *
     * Implements RFC 5869 HKDF using HMAC-SHA256. This matches the HKDF used by
     * CryptoKit (macOS), Web Crypto API (app), and Node.js crypto (CLI).
     *
     * @param inputKeyMaterial The input keying material (IKM), e.g., ECDH shared secret.
     * @param salt Optional salt value (can be empty).
     * @param info Context and application specific information.
     * @param outputLength Desired output key length in bytes.
     * @return Derived key material of the requested length.
     */
    internal fun hkdfSha256(
        inputKeyMaterial: ByteArray,
        salt: ByteArray,
        info: ByteArray,
        outputLength: Int
    ): ByteArray {
        val hmacAlgorithm = "HmacSHA256"
        val hashLength = 32 // SHA-256 output length

        // Step 1: Extract - HMAC-Hash(salt, IKM) -> PRK
        val effectiveSalt = if (salt.isEmpty()) ByteArray(hashLength) else salt
        val prk = hmacSha256(effectiveSalt, inputKeyMaterial)

        // Step 2: Expand - generate output keying material
        val n = (outputLength + hashLength - 1) / hashLength
        var previousT = byteArrayOf()
        val okm = ByteArray(outputLength)
        var offset = 0

        for (i in 1..n) {
            val hmacInput = previousT + info + byteArrayOf(i.toByte())
            previousT = hmacSha256(prk, hmacInput)
            val copyLength = minOf(hashLength, outputLength - offset)
            System.arraycopy(previousT, 0, okm, offset, copyLength)
            offset += copyLength
        }

        return okm
    }

    /**
     * Compute HMAC-SHA256.
     */
    private fun hmacSha256(key: ByteArray, data: ByteArray): ByteArray {
        val mac = javax.crypto.Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(key, "HmacSHA256"))
        return mac.doFinal(data)
    }
}

/**
 * Holds a generated X25519 key pair.
 *
 * @property privateKey The private key bytes (PKCS#8 encoded).
 * @property publicKey The public key bytes (X.509 encoded).
 */
data class KeyPairData(
    val privateKey: ByteArray,
    val publicKey: ByteArray
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as KeyPairData
        return privateKey.contentEquals(other.privateKey) && publicKey.contentEquals(other.publicKey)
    }

    override fun hashCode(): Int {
        var result = privateKey.contentHashCode()
        result = 31 * result + publicKey.contentHashCode()
        return result
    }
}

/**
 * Metadata about an encrypted bundle.
 *
 * @property formatVersion The bundle format version (0 or 1).
 * @property keyVersion The key version number (only present for v1 bundles).
 */
data class BundleInfo(
    val formatVersion: Int,
    val keyVersion: Int? = null
)
