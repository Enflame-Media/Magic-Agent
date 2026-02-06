package com.enflame.happy.domain.model

/**
 * Errors that can occur during encryption operations.
 *
 * These errors cover key generation, encryption, decryption,
 * and bundle format validation failures.
 */
sealed class EncryptionError(message: String, cause: Throwable? = null) : Exception(message, cause) {

    /** The provided key is invalid (wrong length or format). */
    class InvalidKey(message: String = "Invalid encryption key") : EncryptionError(message)

    /** Encryption operation failed. */
    class EncryptionFailed(message: String = "Failed to encrypt data", cause: Throwable? = null) :
        EncryptionError(message, cause)

    /** Decryption operation failed (wrong key, corrupted data, or tampered ciphertext). */
    class DecryptionFailed(message: String = "Failed to decrypt data", cause: Throwable? = null) :
        EncryptionError(message, cause)

    /** The encrypted bundle has an unsupported or unrecognized format version. */
    class UnsupportedFormat(message: String = "Unsupported encryption format") : EncryptionError(message)

    /** The encrypted bundle is too short to contain valid data. */
    class InvalidBundle(message: String = "Invalid encrypted bundle") : EncryptionError(message)
}
