package com.enflame.happy.domain.model

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Represents the different types of QR code payloads the app can handle.
 */
sealed interface QrPayloadType {
    /** A pairing QR code from Claude Code CLI. */
    data class Pairing(val pairingData: PairingData) : QrPayloadType

    /** A friend invite QR code from another Happy user. */
    data class FriendInvite(val payload: FriendInvitePayload) : QrPayloadType

    /** An unrecognized QR code payload. */
    data class Unknown(val rawContent: String) : QrPayloadType
}

/**
 * Utility to classify and parse QR code payloads.
 *
 * The app supports two QR code types:
 * 1. Pairing codes from Claude Code CLI (contain publicKey for ECDH)
 * 2. Friend invite codes from other Happy users (contain type: "friend-invite")
 *
 * This classifier examines the JSON "type" field to distinguish between them.
 * If no "type" field is present but "publicKey" is found, it's treated as a pairing code
 * for backward compatibility.
 */
object QrPayloadClassifier {

    private val json = Json { ignoreUnknownKeys = true; isLenient = true }

    /**
     * Classify a raw QR code content string into a specific payload type.
     *
     * @param rawContent The raw content from the QR scanner.
     * @return The classified payload type.
     */
    fun classify(rawContent: String): QrPayloadType {
        // Try to parse as JSON
        val jsonObject = try {
            json.decodeFromString<JsonObject>(rawContent)
        } catch (e: Exception) {
            // Not JSON - could be a raw base64 public key for pairing
            return QrPayloadType.Unknown(rawContent)
        }

        // Check the "type" field
        val type = jsonObject["type"]?.jsonPrimitive?.content

        return when (type) {
            FriendInvitePayload.PAYLOAD_TYPE -> {
                try {
                    val payload = json.decodeFromString<FriendInvitePayload>(rawContent)
                    QrPayloadType.FriendInvite(payload)
                } catch (e: Exception) {
                    QrPayloadType.Unknown(rawContent)
                }
            }
            else -> {
                // No type field or unrecognized type - check for publicKey (pairing)
                if (jsonObject.containsKey("publicKey")) {
                    QrPayloadType.Unknown(rawContent) // Let QrScannerViewModel handle pairing
                } else {
                    QrPayloadType.Unknown(rawContent)
                }
            }
        }
    }

    /**
     * Check if a raw QR content string is a friend invite.
     *
     * @param rawContent The raw content from the QR scanner.
     * @return True if the content is a friend invite payload.
     */
    fun isFriendInvite(rawContent: String): Boolean {
        return classify(rawContent) is QrPayloadType.FriendInvite
    }

    /**
     * Extract the invite code from a friend invite QR payload.
     *
     * @param rawContent The raw content from the QR scanner.
     * @return The invite code if the content is a friend invite, null otherwise.
     */
    fun extractInviteCode(rawContent: String): String? {
        val payload = classify(rawContent)
        return (payload as? QrPayloadType.FriendInvite)?.payload?.code
    }
}
