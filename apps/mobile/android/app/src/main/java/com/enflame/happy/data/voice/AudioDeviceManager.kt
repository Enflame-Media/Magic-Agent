package com.enflame.happy.data.voice

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.media.AudioDeviceCallback
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Represents an audio output device available for playback.
 *
 * @property id Unique device identifier from [AudioDeviceInfo.getId].
 * @property name Human-readable device name.
 * @property type Device type constant from [AudioDeviceInfo].
 * @property isBluetoothDevice Whether this is a Bluetooth device.
 * @property isBuildInSpeaker Whether this is the built-in device speaker.
 */
data class AudioDevice(
    val id: Int,
    val name: String,
    val type: Int,
    val isBluetoothDevice: Boolean,
    val isBuildInSpeaker: Boolean
) {
    companion object {
        /**
         * Create an [AudioDevice] from an Android [AudioDeviceInfo].
         */
        fun fromDeviceInfo(deviceInfo: AudioDeviceInfo): AudioDevice {
            return AudioDevice(
                id = deviceInfo.id,
                name = buildDeviceName(deviceInfo),
                type = deviceInfo.type,
                isBluetoothDevice = deviceInfo.type == AudioDeviceInfo.TYPE_BLUETOOTH_A2DP ||
                    deviceInfo.type == AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
                isBuildInSpeaker = deviceInfo.type == AudioDeviceInfo.TYPE_BUILTIN_SPEAKER
            )
        }

        private fun buildDeviceName(deviceInfo: AudioDeviceInfo): String {
            // Use the product name if available, otherwise derive from type
            val productName = deviceInfo.productName?.toString()
            if (!productName.isNullOrBlank() && productName != Build.MODEL) {
                return productName
            }

            return when (deviceInfo.type) {
                AudioDeviceInfo.TYPE_BUILTIN_SPEAKER -> "Device Speaker"
                AudioDeviceInfo.TYPE_BUILTIN_EARPIECE -> "Earpiece"
                AudioDeviceInfo.TYPE_WIRED_HEADSET -> "Wired Headset"
                AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> "Wired Headphones"
                AudioDeviceInfo.TYPE_BLUETOOTH_A2DP -> "Bluetooth (A2DP)"
                AudioDeviceInfo.TYPE_BLUETOOTH_SCO -> "Bluetooth (SCO)"
                AudioDeviceInfo.TYPE_USB_DEVICE -> "USB Audio"
                AudioDeviceInfo.TYPE_USB_HEADSET -> "USB Headset"
                AudioDeviceInfo.TYPE_HDMI -> "HDMI"
                AudioDeviceInfo.TYPE_DOCK -> "Dock"
                else -> "Audio Device"
            }
        }
    }
}

/**
 * Manages audio output device discovery, selection, and routing.
 *
 * Provides:
 * - Discovery of available audio output devices (speakers, Bluetooth, wired, USB)
 * - Bluetooth device connection monitoring
 * - Audio output routing to a selected device
 * - Automatic fallback to device speaker when selected device disconnects
 * - Runtime Bluetooth permission checking for API 31+
 *
 * ## Bluetooth Permission Model
 * - API < 31: Bluetooth access is always available
 * - API 31+: Requires `BLUETOOTH_CONNECT` runtime permission
 *
 * ## Audio Routing
 * Uses [AudioManager.setCommunicationDevice] on API 31+ for explicit device
 * routing. On earlier API levels, routing is handled by the system based on
 * device priority (Bluetooth > wired > speaker).
 *
 * ## Usage
 * ```kotlin
 * val manager = audioDeviceManager // injected via Hilt
 * manager.startMonitoring()
 * manager.availableDevices.collect { devices -> /* update UI */ }
 * manager.selectDevice(device)
 * manager.stopMonitoring()
 * ```
 */
@Singleton
class AudioDeviceManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val handler = Handler(Looper.getMainLooper())

    private val _availableDevices = MutableStateFlow<List<AudioDevice>>(emptyList())

    /** Available audio output devices as a reactive flow. */
    val availableDevices: StateFlow<List<AudioDevice>> = _availableDevices.asStateFlow()

    private val _selectedDevice = MutableStateFlow<AudioDevice?>(null)

    /** Currently selected audio output device, or null for system default. */
    val selectedDevice: StateFlow<AudioDevice?> = _selectedDevice.asStateFlow()

    private val _isBluetoothAvailable = MutableStateFlow(false)

    /** Whether Bluetooth audio devices are currently available. */
    val isBluetoothAvailable: StateFlow<Boolean> = _isBluetoothAvailable.asStateFlow()

    private val _bluetoothPermissionDenied = MutableStateFlow(false)

    /**
     * Whether the Bluetooth permission was denied by the user.
     *
     * When `true`, Bluetooth devices are filtered from the available devices
     * list and a message should be shown to the user explaining why Bluetooth
     * devices are unavailable.
     */
    val bluetoothPermissionDenied: StateFlow<Boolean> = _bluetoothPermissionDenied.asStateFlow()

    private var isMonitoring = false

    /**
     * Callback for audio device connection/disconnection events.
     *
     * Updates the available device list and handles fallback when the
     * selected device disconnects.
     */
    private val audioDeviceCallback = object : AudioDeviceCallback() {
        override fun onAudioDevicesAdded(addedDevices: Array<out AudioDeviceInfo>?) {
            refreshDevices()
        }

        override fun onAudioDevicesRemoved(removedDevices: Array<out AudioDeviceInfo>?) {
            refreshDevices()

            // Handle selected device disconnection
            val selected = _selectedDevice.value
            if (selected != null) {
                val stillAvailable = _availableDevices.value.any { it.id == selected.id }
                if (!stillAvailable) {
                    Log.i(TAG, "Selected device '${selected.name}' disconnected, falling back to default")
                    _selectedDevice.value = null
                    clearCommunicationDevice()
                }
            }
        }
    }

    /**
     * BroadcastReceiver for Bluetooth connection state changes.
     *
     * Monitors Bluetooth A2DP and SCO connection events to update
     * the device list in real-time.
     */
    private val bluetoothReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            when (intent?.action) {
                android.bluetooth.BluetoothDevice.ACTION_ACL_CONNECTED,
                android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED -> {
                    // Delay slightly to let the system update audio routing
                    handler.postDelayed({ refreshDevices() }, 500)
                }
            }
        }
    }

    // --- Public Methods ---

    /**
     * Start monitoring for audio device changes.
     *
     * Registers callbacks for device add/remove events and Bluetooth
     * connection changes. Call [stopMonitoring] when monitoring is
     * no longer needed.
     */
    fun startMonitoring() {
        if (isMonitoring) return
        isMonitoring = true

        audioManager.registerAudioDeviceCallback(audioDeviceCallback, handler)

        // Register Bluetooth broadcast receiver
        if (hasBluetoothPermission()) {
            try {
                val filter = IntentFilter().apply {
                    addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_CONNECTED)
                    addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED)
                }
                context.registerReceiver(bluetoothReceiver, filter)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to register Bluetooth receiver", e)
            }
        }

        refreshDevices()
        Log.d(TAG, "Audio device monitoring started")
    }

    /**
     * Stop monitoring for audio device changes.
     *
     * Unregisters all callbacks and broadcast receivers.
     */
    fun stopMonitoring() {
        if (!isMonitoring) return
        isMonitoring = false

        audioManager.unregisterAudioDeviceCallback(audioDeviceCallback)

        try {
            context.unregisterReceiver(bluetoothReceiver)
        } catch (e: Exception) {
            // Receiver may not have been registered
            Log.d(TAG, "Bluetooth receiver not registered", e)
        }

        Log.d(TAG, "Audio device monitoring stopped")
    }

    /**
     * Select a specific audio output device for playback.
     *
     * On API 31+, this uses [AudioManager.setCommunicationDevice] for
     * explicit routing. On earlier versions, the system handles routing
     * based on device priority.
     *
     * @param device The device to route audio to, or null for system default.
     */
    fun selectDevice(device: AudioDevice?) {
        _selectedDevice.value = device

        if (device == null) {
            clearCommunicationDevice()
            Log.i(TAG, "Audio output: system default")
            return
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // API 31+: Use setCommunicationDevice for explicit routing
            val audioDeviceInfo = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
                .firstOrNull { it.id == device.id }

            if (audioDeviceInfo != null) {
                val success = audioManager.setCommunicationDevice(audioDeviceInfo)
                if (success) {
                    Log.i(TAG, "Audio routed to: ${device.name}")
                } else {
                    Log.w(TAG, "Failed to route audio to: ${device.name}")
                    _selectedDevice.value = null
                }
            } else {
                Log.w(TAG, "Device no longer available: ${device.name}")
                _selectedDevice.value = null
            }
        } else {
            // Pre-API 31: System manages routing based on priority
            Log.i(TAG, "Audio output preference: ${device.name} (system-managed routing)")
        }
    }

    /**
     * Check whether the app has Bluetooth permission.
     *
     * @return `true` if Bluetooth is available (always true below API 31,
     *         requires BLUETOOTH_CONNECT on API 31+).
     */
    fun hasBluetoothPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    /**
     * Handle the result of the BLUETOOTH_CONNECT runtime permission request.
     *
     * Updates the permission denied state and refreshes the device list.
     * When permission is granted, Bluetooth devices will appear in the list.
     * When denied, Bluetooth devices are filtered out.
     *
     * @param granted Whether the permission was granted.
     */
    fun onBluetoothPermissionResult(granted: Boolean) {
        _bluetoothPermissionDenied.value = !granted
        if (granted && isMonitoring) {
            // Re-register Bluetooth receiver now that we have permission
            try {
                val filter = IntentFilter().apply {
                    addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_CONNECTED)
                    addAction(android.bluetooth.BluetoothDevice.ACTION_ACL_DISCONNECTED)
                }
                context.registerReceiver(bluetoothReceiver, filter)
            } catch (e: Exception) {
                Log.w(TAG, "Failed to register Bluetooth receiver after permission grant", e)
            }
        }
        refreshDevices()
        Log.i(TAG, "Bluetooth permission result: granted=$granted")
    }

    /**
     * Refresh the list of available audio output devices.
     *
     * Bluetooth devices are filtered from the list when the BLUETOOTH_CONNECT
     * permission is not granted on Android 12+ (API 31+).
     */
    fun refreshDevices() {
        val hasBtPermission = hasBluetoothPermission()

        val outputDevices = audioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS)
            .filter { isRelevantOutputDevice(it) }
            .map { AudioDevice.fromDeviceInfo(it) }
            .filter { device ->
                // Filter out Bluetooth devices if permission is not granted
                if (device.isBluetoothDevice && !hasBtPermission) {
                    false
                } else {
                    true
                }
            }
            .sortedWith(deviceSortComparator)

        _availableDevices.value = outputDevices
        _isBluetoothAvailable.value = outputDevices.any { it.isBluetoothDevice }

        Log.d(TAG, "Available devices: ${outputDevices.map { "${it.name} (${it.type})" }}")
    }

    // --- Private Helpers ---

    /**
     * Clear explicit communication device routing (API 31+).
     */
    private fun clearCommunicationDevice() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            audioManager.clearCommunicationDevice()
        }
    }

    /**
     * Filter for audio output device types we want to show in the UI.
     *
     * Excludes telephony-only and internal devices that users should not
     * select for media playback.
     */
    private fun isRelevantOutputDevice(device: AudioDeviceInfo): Boolean {
        return when (device.type) {
            AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            AudioDeviceInfo.TYPE_WIRED_HEADSET,
            AudioDeviceInfo.TYPE_WIRED_HEADPHONES,
            AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
            AudioDeviceInfo.TYPE_USB_DEVICE,
            AudioDeviceInfo.TYPE_USB_HEADSET,
            AudioDeviceInfo.TYPE_HDMI -> true
            else -> false
        }
    }

    /**
     * Sort comparator for device list ordering.
     *
     * Priority: Bluetooth > Wired > USB > Built-in Speaker
     */
    private val deviceSortComparator = compareBy<AudioDevice> { device ->
        when {
            device.isBluetoothDevice -> 0
            device.type == AudioDeviceInfo.TYPE_WIRED_HEADSET ||
                device.type == AudioDeviceInfo.TYPE_WIRED_HEADPHONES -> 1
            device.type == AudioDeviceInfo.TYPE_USB_DEVICE ||
                device.type == AudioDeviceInfo.TYPE_USB_HEADSET -> 2
            device.isBuildInSpeaker -> 3
            else -> 4
        }
    }

    companion object {
        private const val TAG = "AudioDeviceManager"
    }
}
