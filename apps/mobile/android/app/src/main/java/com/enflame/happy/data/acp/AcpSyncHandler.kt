package com.enflame.happy.data.acp

import android.util.Log
import com.enflame.happy.data.crypto.EncryptionService
import com.enflame.happy.data.local.TokenStorage
import com.enflame.happy.data.sync.SyncMessage
import com.enflame.happy.data.sync.SyncService
import com.enflame.happy.domain.repository.AcpRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.filterIsInstance
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Integrates ACP session updates with the existing [SyncService].
 *
 * Listens for `acp-session-update` and `acp-permission-request` WebSocket messages
 * from the sync service, decrypts the encrypted payloads using [EncryptionService],
 * parses them via [AcpJsonParser], and applies them to the [AcpRepository].
 *
 * ## Integration
 * This handler extends the existing sync message types to support ACP.
 * The server relays ACP updates as opaque encrypted blobs (zero-knowledge).
 *
 * ## Architecture
 * ```
 * SyncService (WebSocket) -> AcpSyncHandler -> AcpJsonParser -> AcpRepository -> StateFlow -> UI
 * ```
 */
@Singleton
class AcpSyncHandler @Inject constructor(
    private val syncService: SyncService,
    private val acpRepository: AcpRepository,
    private val acpJsonParser: AcpJsonParser,
    private val encryptionService: EncryptionService,
    private val tokenStorage: TokenStorage,
    private val json: Json,
    private val coroutineScope: CoroutineScope,
) {

    /** Job for the message collection coroutine. */
    private var collectionJob: Job? = null

    /** Cached encryption key for decrypting ACP payloads. */
    private var encryptionKey: ByteArray? = null

    /**
     * Start listening for ACP messages from the SyncService.
     *
     * Collects all incoming sync messages and filters for ACP-related types.
     * Safe to call multiple times; subsequent calls are no-ops if already active.
     */
    fun start() {
        if (collectionJob?.isActive == true) return

        // Pre-load encryption key
        encryptionKey = loadEncryptionKey()

        collectionJob = coroutineScope.launch {
            syncService.incomingMessages.collect { message ->
                handleSyncMessage(message)
            }
        }

        Log.d(TAG, "AcpSyncHandler started")
    }

    /**
     * Stop listening for ACP messages.
     */
    fun stop() {
        collectionJob?.cancel()
        collectionJob = null
        encryptionKey = null

        Log.d(TAG, "AcpSyncHandler stopped")
    }

    /** Whether the handler is currently active. */
    val isActive: Boolean
        get() = collectionJob?.isActive == true

    // ========================================================================
    // Private - Message Handling
    // ========================================================================

    /**
     * Handle an incoming sync message.
     *
     * Routes ACP-related messages to the appropriate handler.
     * Non-ACP messages are ignored (they are handled by other components).
     */
    private fun handleSyncMessage(message: SyncMessage) {
        // The existing SyncService processes standard session/message updates.
        // ACP updates come through the same WebSocket but with different envelope types.
        // For now, we listen for SessionUpdate messages that may contain ACP data.
        when (message) {
            is SyncMessage.SessionUpdate -> {
                // Standard session updates are handled by existing code.
                // ACP data may be embedded in future envelope extensions.
            }

            else -> {
                // Other message types are not ACP-related
            }
        }
    }

    /**
     * Process an encrypted ACP session update payload.
     *
     * This is the primary entry point called when the SyncService receives
     * an ACP-typed message from the server.
     *
     * @param sessionId The session this update belongs to.
     * @param encryptedPayload The encrypted ACP payload bytes.
     */
    fun processEncryptedAcpUpdate(sessionId: String, encryptedPayload: ByteArray) {
        val key = encryptionKey
        if (key == null) {
            Log.w(TAG, "Cannot process ACP update: encryption key not available")
            return
        }

        try {
            // Decrypt
            val decrypted = encryptionService.decrypt(encryptedPayload, key)
            val jsonString = String(decrypted, Charsets.UTF_8)

            // Parse
            val update = acpJsonParser.parseSessionUpdate(jsonString)

            // Apply
            acpRepository.applyUpdate(sessionId, update)

            Log.d(TAG, "Applied ACP update '${update.kind}' for session $sessionId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process ACP update for session $sessionId", e)
        }
    }

    /**
     * Process a raw (already decrypted) ACP session update JSON string.
     *
     * Useful for cases where the payload has already been decrypted
     * by the SyncService (e.g., embedded in a standard sync envelope).
     *
     * @param sessionId The session this update belongs to.
     * @param jsonString The decrypted ACP JSON string.
     */
    fun processRawAcpUpdate(sessionId: String, jsonString: String) {
        try {
            val update = acpJsonParser.parseSessionUpdate(jsonString)
            acpRepository.applyUpdate(sessionId, update)
            Log.d(TAG, "Applied raw ACP update '${update.kind}' for session $sessionId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process raw ACP update for session $sessionId", e)
        }
    }

    /**
     * Process a raw ACP session update from a [JsonObject].
     *
     * @param sessionId The session this update belongs to.
     * @param jsonObject The parsed JSON object.
     */
    fun processRawAcpUpdate(sessionId: String, jsonObject: JsonObject) {
        try {
            val update = acpJsonParser.parseSessionUpdate(jsonObject)
            acpRepository.applyUpdate(sessionId, update)
            Log.d(TAG, "Applied raw ACP update '${update.kind}' for session $sessionId")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to process raw ACP update for session $sessionId", e)
        }
    }

    // ========================================================================
    // Private - Encryption Key
    // ========================================================================

    /**
     * Load the encryption key from stored key material.
     *
     * Uses the same key derivation as [SyncService] - derives the shared
     * secret from stored private key and peer public key via ECDH + HKDF.
     */
    private fun loadEncryptionKey(): ByteArray? {
        val privateKey = tokenStorage.privateKeyBytes ?: return null
        val peerPublicKey = tokenStorage.peerPublicKeyBytes ?: return null

        return try {
            encryptionService.deriveSharedSecret(privateKey, peerPublicKey)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to derive encryption key for ACP", e)
            null
        }
    }

    companion object {
        private const val TAG = "AcpSyncHandler"
    }
}
