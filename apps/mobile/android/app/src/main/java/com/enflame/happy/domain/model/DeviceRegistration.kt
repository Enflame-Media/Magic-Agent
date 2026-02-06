package com.enflame.happy.domain.model

import kotlinx.serialization.Serializable

/**
 * Request body for registering a device for push notifications.
 *
 * Sent to the server's device registration endpoint so the server
 * can deliver push notifications via FCM to this device.
 *
 * @property token The FCM registration token for this device.
 * @property platform The device platform, always "android" for this client.
 * @property deviceName A human-readable name for the device (e.g., "Pixel 8 Pro").
 */
@Serializable
data class DeviceRegistrationRequest(
    val token: String,
    val platform: String = "android",
    val deviceName: String? = null
)

/**
 * Response from the server after successful device registration.
 *
 * @property deviceId The server-assigned device identifier.
 * @property registered Whether the device was successfully registered.
 */
@Serializable
data class DeviceRegistrationResponse(
    val deviceId: String? = null,
    val registered: Boolean = true
)
