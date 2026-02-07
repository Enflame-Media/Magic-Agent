package com.enflame.happy.ui.screens.qrscanner

import android.util.Base64
import android.util.Log
import androidx.lifecycle.ViewModel
import com.enflame.happy.domain.model.PairingData
import com.enflame.happy.domain.model.QrPayloadClassifier
import com.enflame.happy.domain.model.QrPayloadType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import javax.inject.Inject

/**
 * Possible states for the QR scanner screen.
 */
sealed interface QrScannerUiState {
    /** Camera is active and scanning for QR codes. */
    data object Scanning : QrScannerUiState

    /** A QR code has been detected and parsed as pairing data. */
    data class ScannedSuccess(val pairingData: PairingData) : QrScannerUiState

    /** A QR code has been detected and parsed as a friend invite. */
    data class FriendInviteScanned(val inviteCode: String) : QrScannerUiState

    /** The scanned QR code could not be parsed as valid pairing data. */
    data class ScannedError(val message: String) : QrScannerUiState
}

/**
 * ViewModel for the QR scanner screen.
 *
 * Manages the scanning state and handles parsing QR code content
 * to extract pairing data (public key) for the authentication flow.
 *
 * QR code formats supported:
 * 1. JSON object with a "publicKey" field: {"publicKey": "base64...", "deviceName": "...", ...}
 * 2. Raw base64-encoded public key string (32 bytes when decoded)
 */
@HiltViewModel
class QrScannerViewModel @Inject constructor(
    private val json: Json
) : ViewModel() {

    private val _uiState = MutableStateFlow<QrScannerUiState>(QrScannerUiState.Scanning)
    val uiState: StateFlow<QrScannerUiState> = _uiState.asStateFlow()

    /**
     * Processes raw QR code content and attempts to extract pairing data
     * or a friend invite.
     *
     * Uses [QrPayloadClassifier] to identify friend invites first,
     * then falls back to pairing data parsing.
     */
    fun onQrCodeScanned(rawContent: String) {
        // Check for friend invite first via classifier
        val classified = QrPayloadClassifier.classify(rawContent)
        if (classified is QrPayloadType.FriendInvite) {
            _uiState.value = QrScannerUiState.FriendInviteScanned(classified.payload.code)
            return
        }

        // Try pairing data parsing
        val pairingData = parseQrContent(rawContent)
        if (pairingData != null) {
            _uiState.value = QrScannerUiState.ScannedSuccess(pairingData)
        } else {
            _uiState.value = QrScannerUiState.ScannedError(
                "Invalid QR code. Please scan a QR code from Claude Code CLI or a friend invite."
            )
        }
    }

    /**
     * Resets the scanner to allow scanning again.
     */
    fun resetScanner() {
        _uiState.value = QrScannerUiState.Scanning
    }

    /**
     * Parses the raw QR code content into [PairingData].
     *
     * @return Parsed pairing data, or null if the content is invalid.
     */
    private fun parseQrContent(rawContent: String): PairingData? {
        // Try JSON format first
        val jsonResult = tryParseJson(rawContent)
        if (jsonResult != null) {
            return jsonResult
        }

        // Fall back to raw base64 public key
        return tryParseRawPublicKey(rawContent.trim())
    }

    /**
     * Attempts to parse QR content as a JSON object with pairing fields.
     */
    private fun tryParseJson(content: String): PairingData? {
        return try {
            val jsonObject = json.decodeFromString<JsonObject>(content)
            val publicKey = jsonObject["publicKey"]?.jsonPrimitive?.content
                ?: return null

            // Validate the public key is valid base64
            if (!isValidBase64PublicKey(publicKey)) {
                return null
            }

            PairingData(
                publicKey = publicKey,
                deviceName = jsonObject["deviceName"]?.jsonPrimitive?.content,
                platform = jsonObject["platform"]?.jsonPrimitive?.content,
                appVersion = jsonObject["appVersion"]?.jsonPrimitive?.content
            )
        } catch (e: Exception) {
            Log.d(TAG, "QR content is not valid JSON", e)
            null
        }
    }

    /**
     * Attempts to treat the raw content as a base64-encoded public key.
     * A valid X25519 public key is exactly 32 bytes.
     */
    private fun tryParseRawPublicKey(content: String): PairingData? {
        return try {
            if (!isValidBase64PublicKey(content)) {
                return null
            }
            PairingData(publicKey = content)
        } catch (e: Exception) {
            Log.d(TAG, "QR content is not a valid base64 public key", e)
            null
        }
    }

    /**
     * Validates that a string is valid base64 and decodes to a 32-byte
     * public key (X25519 key size).
     */
    private fun isValidBase64PublicKey(base64String: String): Boolean {
        return try {
            val decoded = Base64.decode(base64String, Base64.DEFAULT)
            decoded.size == PUBLIC_KEY_SIZE_BYTES
        } catch (e: IllegalArgumentException) {
            false
        }
    }

    companion object {
        private const val TAG = "QrScannerViewModel"
        /** X25519 public key size in bytes. */
        private const val PUBLIC_KEY_SIZE_BYTES = 32
    }
}
