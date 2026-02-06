package com.enflame.happy.data.local

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Secure token storage using Android Keystore for encryption.
 *
 * Stores authentication tokens and cryptographic key material
 * encrypted at rest using the Android Keystore system. Tokens
 * are encrypted with AES-256-GCM and stored in SharedPreferences.
 *
 * Keys stored:
 * - Auth token (from server after pairing)
 * - Refresh token (optional, for token renewal)
 * - Account ID
 * - Machine ID
 * - Private key (our X25519 private key bytes)
 * - Peer public key (CLI's X25519 public key bytes)
 * - Server URL
 */
@Singleton
class TokenStorage @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Saves a string value securely encrypted with Android Keystore.
     */
    fun saveString(key: String, value: String) {
        val encrypted = encrypt(value.toByteArray(Charsets.UTF_8))
        prefs.edit()
            .putString("${key}_data", Base64.encodeToString(encrypted.ciphertext, Base64.NO_WRAP))
            .putString("${key}_iv", Base64.encodeToString(encrypted.iv, Base64.NO_WRAP))
            .apply()
    }

    /**
     * Reads a securely stored string value.
     *
     * @return The decrypted string, or null if not found.
     */
    fun readString(key: String): String? {
        val dataStr = prefs.getString("${key}_data", null) ?: return null
        val ivStr = prefs.getString("${key}_iv", null) ?: return null

        return try {
            val ciphertext = Base64.decode(dataStr, Base64.NO_WRAP)
            val iv = Base64.decode(ivStr, Base64.NO_WRAP)
            val decrypted = decrypt(ciphertext, iv)
            String(decrypted, Charsets.UTF_8)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decrypt value for key: $key", e)
            null
        }
    }

    /**
     * Saves raw byte data securely encrypted.
     */
    fun saveBytes(key: String, value: ByteArray) {
        val encrypted = encrypt(value)
        prefs.edit()
            .putString("${key}_data", Base64.encodeToString(encrypted.ciphertext, Base64.NO_WRAP))
            .putString("${key}_iv", Base64.encodeToString(encrypted.iv, Base64.NO_WRAP))
            .apply()
    }

    /**
     * Reads securely stored raw byte data.
     *
     * @return The decrypted bytes, or null if not found.
     */
    fun readBytes(key: String): ByteArray? {
        val dataStr = prefs.getString("${key}_data", null) ?: return null
        val ivStr = prefs.getString("${key}_iv", null) ?: return null

        return try {
            val ciphertext = Base64.decode(dataStr, Base64.NO_WRAP)
            val iv = Base64.decode(ivStr, Base64.NO_WRAP)
            decrypt(ciphertext, iv)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decrypt bytes for key: $key", e)
            null
        }
    }

    /**
     * Checks if a key exists in storage.
     */
    fun exists(key: String): Boolean {
        return prefs.contains("${key}_data")
    }

    /**
     * Removes a specific key from storage.
     */
    fun remove(key: String) {
        prefs.edit()
            .remove("${key}_data")
            .remove("${key}_iv")
            .apply()
    }

    /**
     * Clears all stored credentials.
     */
    fun clearAll() {
        prefs.edit().clear().apply()
    }

    /**
     * Checks if stored authentication credentials exist.
     */
    fun hasStoredCredentials(): Boolean {
        return exists(KEY_AUTH_TOKEN) &&
            exists(KEY_PRIVATE_KEY) &&
            exists(KEY_PEER_PUBLIC_KEY)
    }

    // --- Convenience accessors ---

    var authToken: String?
        get() = readString(KEY_AUTH_TOKEN)
        set(value) {
            if (value != null) saveString(KEY_AUTH_TOKEN, value)
            else remove(KEY_AUTH_TOKEN)
        }

    var refreshToken: String?
        get() = readString(KEY_REFRESH_TOKEN)
        set(value) {
            if (value != null) saveString(KEY_REFRESH_TOKEN, value)
            else remove(KEY_REFRESH_TOKEN)
        }

    var accountId: String?
        get() = readString(KEY_ACCOUNT_ID)
        set(value) {
            if (value != null) saveString(KEY_ACCOUNT_ID, value)
            else remove(KEY_ACCOUNT_ID)
        }

    var machineId: String?
        get() = readString(KEY_MACHINE_ID)
        set(value) {
            if (value != null) saveString(KEY_MACHINE_ID, value)
            else remove(KEY_MACHINE_ID)
        }

    var serverUrl: String?
        get() = readString(KEY_SERVER_URL)
        set(value) {
            if (value != null) saveString(KEY_SERVER_URL, value)
            else remove(KEY_SERVER_URL)
        }

    var privateKeyBytes: ByteArray?
        get() = readBytes(KEY_PRIVATE_KEY)
        set(value) {
            if (value != null) saveBytes(KEY_PRIVATE_KEY, value)
            else remove(KEY_PRIVATE_KEY)
        }

    var peerPublicKeyBytes: ByteArray?
        get() = readBytes(KEY_PEER_PUBLIC_KEY)
        set(value) {
            if (value != null) saveBytes(KEY_PEER_PUBLIC_KEY, value)
            else remove(KEY_PEER_PUBLIC_KEY)
        }

    // --- Android Keystore encryption ---

    private fun getOrCreateSecretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER).apply { load(null) }

        keyStore.getEntry(KEYSTORE_ALIAS, null)?.let { entry ->
            return (entry as KeyStore.SecretKeyEntry).secretKey
        }

        val keyGenerator = KeyGenerator.getInstance(
            KeyProperties.KEY_ALGORITHM_AES,
            KEYSTORE_PROVIDER
        )

        val spec = KeyGenParameterSpec.Builder(
            KEYSTORE_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .build()

        keyGenerator.init(spec)
        return keyGenerator.generateKey()
    }

    private fun encrypt(plaintext: ByteArray): EncryptedData {
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())
        val ciphertext = cipher.doFinal(plaintext)
        return EncryptedData(ciphertext = ciphertext, iv = cipher.iv)
    }

    private fun decrypt(ciphertext: ByteArray, iv: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), spec)
        return cipher.doFinal(ciphertext)
    }

    private data class EncryptedData(
        val ciphertext: ByteArray,
        val iv: ByteArray
    ) {
        override fun equals(other: Any?): Boolean {
            if (this === other) return true
            if (other !is EncryptedData) return false
            return ciphertext.contentEquals(other.ciphertext) && iv.contentEquals(other.iv)
        }

        override fun hashCode(): Int {
            return 31 * ciphertext.contentHashCode() + iv.contentHashCode()
        }
    }

    companion object {
        private const val TAG = "TokenStorage"
        private const val PREFS_NAME = "happy_secure_prefs"
        private const val KEYSTORE_PROVIDER = "AndroidKeyStore"
        private const val KEYSTORE_ALIAS = "happy_master_key"
        private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val GCM_TAG_LENGTH_BITS = 128

        // Storage key constants
        const val KEY_AUTH_TOKEN = "auth_token"
        const val KEY_REFRESH_TOKEN = "refresh_token"
        const val KEY_ACCOUNT_ID = "account_id"
        const val KEY_MACHINE_ID = "machine_id"
        const val KEY_SERVER_URL = "server_url"
        const val KEY_PRIVATE_KEY = "private_key"
        const val KEY_PEER_PUBLIC_KEY = "peer_public_key"
        const val KEY_FCM_TOKEN = "fcm_token"
    }

    /**
     * Convenience accessor for the FCM registration token.
     */
    var fcmToken: String?
        get() = readString(KEY_FCM_TOKEN)
        set(value) {
            if (value != null) saveString(KEY_FCM_TOKEN, value)
            else remove(KEY_FCM_TOKEN)
        }
}
