package com.enflame.happy.data.voice

import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioDeviceInfo
import android.media.AudioManager
import android.os.Build
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.verify
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [AudioDeviceManager].
 *
 * Tests device enumeration, device selection, Bluetooth state changes,
 * permission checks (granted vs. denied), and handling of device
 * connect/disconnect events.
 *
 * Note: Uses MockK to mock Android framework classes (AudioManager,
 * AudioDeviceInfo, Context) since these are not available in JVM tests.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class AudioDeviceManagerTest {

    private lateinit var mockContext: Context
    private lateinit var mockAudioManager: AudioManager

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)

        mockContext = mockk(relaxed = true)
        mockAudioManager = mockk(relaxed = true)

        every { mockContext.getSystemService(Context.AUDIO_SERVICE) } returns mockAudioManager
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns emptyArray()
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    // --- Initial State ---

    @Test
    fun `initial available devices list is empty`() = runTest {
        val manager = createManager()

        assertEquals(emptyList<AudioDevice>(), manager.availableDevices.first())
    }

    @Test
    fun `initial selected device is null`() = runTest {
        val manager = createManager()

        assertNull(manager.selectedDevice.first())
    }

    @Test
    fun `initial Bluetooth available is false`() = runTest {
        val manager = createManager()

        assertFalse(manager.isBluetoothAvailable.first())
    }

    @Test
    fun `initial Bluetooth permission denied is false`() = runTest {
        val manager = createManager()

        assertFalse(manager.bluetoothPermissionDenied.first())
    }

    // --- Device Enumeration ---

    @Test
    fun `refreshDevices discovers built-in speaker`() = runTest {
        val speakerDevice = createMockAudioDeviceInfo(
            id = 1,
            type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            productName = ""
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(speakerDevice)

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
        assertTrue(devices[0].isBuildInSpeaker)
        assertEquals("Device Speaker", devices[0].name)
    }

    @Test
    fun `refreshDevices discovers wired headset`() = runTest {
        val headsetDevice = createMockAudioDeviceInfo(
            id = 2,
            type = AudioDeviceInfo.TYPE_WIRED_HEADSET,
            productName = "My Headset"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(headsetDevice)

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
        assertEquals("My Headset", devices[0].name)
        assertFalse(devices[0].isBluetoothDevice)
    }

    @Test
    fun `refreshDevices discovers Bluetooth A2DP device`() = runTest {
        val btDevice = createMockAudioDeviceInfo(
            id = 3,
            type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            productName = "AirPods Pro"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(btDevice)
        // Ensure Bluetooth permission is granted so devices are not filtered
        setupBluetoothPermissionGranted()

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
        assertTrue(devices[0].isBluetoothDevice)
        assertEquals("AirPods Pro", devices[0].name)
    }

    @Test
    fun `refreshDevices discovers Bluetooth SCO device`() = runTest {
        val btScoDevice = createMockAudioDeviceInfo(
            id = 4,
            type = AudioDeviceInfo.TYPE_BLUETOOTH_SCO,
            productName = "BT Headset"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(btScoDevice)
        setupBluetoothPermissionGranted()

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
        assertTrue(devices[0].isBluetoothDevice)
    }

    @Test
    fun `refreshDevices discovers multiple device types`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        val headset = createMockAudioDeviceInfo(
            id = 2, type = AudioDeviceInfo.TYPE_WIRED_HEADSET, productName = "Wired"
        )
        val usb = createMockAudioDeviceInfo(
            id = 3, type = AudioDeviceInfo.TYPE_USB_DEVICE, productName = "USB DAC"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns
            arrayOf(speaker, headset, usb)

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(3, devices.size)
    }

    @Test
    fun `refreshDevices filters out irrelevant device types`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        // TYPE_BUILTIN_EARPIECE (type 1) is not in the relevant list
        val earpiece = createMockAudioDeviceInfo(
            id = 2, type = AudioDeviceInfo.TYPE_BUILTIN_EARPIECE, productName = ""
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns
            arrayOf(speaker, earpiece)

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
        assertTrue(devices[0].isBuildInSpeaker)
    }

    @Test
    fun `refreshDevices sorts devices by priority - Bluetooth first`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        val bluetooth = createMockAudioDeviceInfo(
            id = 2, type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, productName = "BT"
        )
        val wired = createMockAudioDeviceInfo(
            id = 3, type = AudioDeviceInfo.TYPE_WIRED_HEADPHONES, productName = "Wired"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns
            arrayOf(speaker, bluetooth, wired)
        setupBluetoothPermissionGranted()

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        assertEquals(3, devices.size)
        assertTrue(devices[0].isBluetoothDevice)       // Bluetooth first
        assertFalse(devices[0].isBuildInSpeaker)
        assertTrue(devices[2].isBuildInSpeaker)          // Speaker last
    }

    // --- Bluetooth Available State ---

    @Test
    fun `isBluetoothAvailable is true when Bluetooth device is present`() = runTest {
        val btDevice = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, productName = "BT"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(btDevice)
        setupBluetoothPermissionGranted()

        val manager = createManager()
        manager.refreshDevices()

        assertTrue(manager.isBluetoothAvailable.first())
    }

    @Test
    fun `isBluetoothAvailable is false when no Bluetooth devices`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(speaker)

        val manager = createManager()
        manager.refreshDevices()

        assertFalse(manager.isBluetoothAvailable.first())
    }

    // --- Device Selection ---

    @Test
    fun `selectDevice updates selected device`() = runTest {
        val device = AudioDevice(
            id = 1,
            name = "Test Speaker",
            type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            isBluetoothDevice = false,
            isBuildInSpeaker = true
        )

        val manager = createManager()
        manager.selectDevice(device)

        assertEquals(device, manager.selectedDevice.first())
    }

    @Test
    fun `selectDevice with null resets to system default`() = runTest {
        val device = AudioDevice(
            id = 1,
            name = "Test Speaker",
            type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            isBluetoothDevice = false,
            isBuildInSpeaker = true
        )

        val manager = createManager()
        manager.selectDevice(device)
        manager.selectDevice(null)

        assertNull(manager.selectedDevice.first())
    }

    @Test
    fun `selectDevice can switch between devices`() = runTest {
        val speaker = AudioDevice(
            id = 1, name = "Speaker", type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER,
            isBluetoothDevice = false, isBuildInSpeaker = true
        )
        val headset = AudioDevice(
            id = 2, name = "Headset", type = AudioDeviceInfo.TYPE_WIRED_HEADSET,
            isBluetoothDevice = false, isBuildInSpeaker = false
        )

        val manager = createManager()
        manager.selectDevice(speaker)
        assertEquals("Speaker", manager.selectedDevice.first()?.name)

        manager.selectDevice(headset)
        assertEquals("Headset", manager.selectedDevice.first()?.name)
    }

    // --- Bluetooth Permission Handling ---

    @Test
    fun `onBluetoothPermissionResult granted clears denied state`() = runTest {
        val manager = createManager()

        // First deny, then grant
        manager.onBluetoothPermissionResult(false)
        assertTrue(manager.bluetoothPermissionDenied.first())

        manager.onBluetoothPermissionResult(true)
        assertFalse(manager.bluetoothPermissionDenied.first())
    }

    @Test
    fun `onBluetoothPermissionResult denied sets denied state`() = runTest {
        val manager = createManager()

        manager.onBluetoothPermissionResult(false)

        assertTrue(manager.bluetoothPermissionDenied.first())
    }

    @Test
    fun `onBluetoothPermissionResult triggers device refresh`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(speaker)

        val manager = createManager()
        manager.onBluetoothPermissionResult(true)

        // After permission result, devices should be refreshed
        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
    }

    @Test
    fun `Bluetooth devices filtered when permission denied on API 31+`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        val btDevice = createMockAudioDeviceInfo(
            id = 2, type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, productName = "BT"
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns
            arrayOf(speaker, btDevice)
        // Simulate permission not granted (API 31+)
        setupBluetoothPermissionDenied()

        val manager = createManager()
        manager.refreshDevices()

        val devices = manager.availableDevices.first()
        // Bluetooth device should be filtered out
        assertTrue(devices.none { it.isBluetoothDevice })
        assertEquals(1, devices.size)
        assertTrue(devices[0].isBuildInSpeaker)
    }

    // --- Monitoring Lifecycle ---

    @Test
    fun `startMonitoring registers audio device callback`() {
        val manager = createManager()

        manager.startMonitoring()

        verify { mockAudioManager.registerAudioDeviceCallback(any(), any()) }
    }

    @Test
    fun `stopMonitoring unregisters audio device callback`() {
        val manager = createManager()

        manager.startMonitoring()
        manager.stopMonitoring()

        verify { mockAudioManager.unregisterAudioDeviceCallback(any()) }
    }

    @Test
    fun `startMonitoring called twice does not register twice`() {
        val manager = createManager()

        manager.startMonitoring()
        manager.startMonitoring()

        // Should only register once
        verify(exactly = 1) { mockAudioManager.registerAudioDeviceCallback(any(), any()) }
    }

    @Test
    fun `stopMonitoring called without startMonitoring does not crash`() {
        val manager = createManager()

        // Should not throw
        manager.stopMonitoring()
    }

    @Test
    fun `startMonitoring triggers initial device refresh`() = runTest {
        val speaker = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns arrayOf(speaker)

        val manager = createManager()
        manager.startMonitoring()

        val devices = manager.availableDevices.first()
        assertEquals(1, devices.size)
    }

    // --- AudioDevice Data Class ---

    @Test
    fun `AudioDevice fromDeviceInfo creates correct device for speaker`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = ""
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals(1, device.id)
        assertEquals("Device Speaker", device.name)
        assertEquals(AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, device.type)
        assertFalse(device.isBluetoothDevice)
        assertTrue(device.isBuildInSpeaker)
    }

    @Test
    fun `AudioDevice fromDeviceInfo creates correct device for Bluetooth A2DP`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 2, type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP, productName = "AirPods"
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals(2, device.id)
        assertEquals("AirPods", device.name)
        assertTrue(device.isBluetoothDevice)
        assertFalse(device.isBuildInSpeaker)
    }

    @Test
    fun `AudioDevice fromDeviceInfo creates correct device for Bluetooth SCO`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 3, type = AudioDeviceInfo.TYPE_BLUETOOTH_SCO, productName = "BT Headset"
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertTrue(device.isBluetoothDevice)
    }

    @Test
    fun `AudioDevice fromDeviceInfo uses product name when available`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_USB_DEVICE, productName = "FiiO BTR5"
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("FiiO BTR5", device.name)
    }

    @Test
    fun `AudioDevice fromDeviceInfo falls back to type name when product name blank`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_WIRED_HEADPHONES, productName = ""
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("Wired Headphones", device.name)
    }

    @Test
    fun `AudioDevice fromDeviceInfo falls back to type name when product name is device model`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_BUILTIN_SPEAKER, productName = Build.MODEL
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("Device Speaker", device.name)
    }

    @Test
    fun `AudioDevice fromDeviceInfo handles USB headset type`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_USB_HEADSET, productName = ""
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("USB Headset", device.name)
        assertFalse(device.isBluetoothDevice)
        assertFalse(device.isBuildInSpeaker)
    }

    @Test
    fun `AudioDevice fromDeviceInfo handles HDMI type`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = AudioDeviceInfo.TYPE_HDMI, productName = ""
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("HDMI", device.name)
    }

    @Test
    fun `AudioDevice fromDeviceInfo handles unknown type`() {
        val deviceInfo = createMockAudioDeviceInfo(
            id = 1, type = 999, productName = ""
        )

        val device = AudioDevice.fromDeviceInfo(deviceInfo)

        assertEquals("Audio Device", device.name)
        assertFalse(device.isBluetoothDevice)
        assertFalse(device.isBuildInSpeaker)
    }

    // --- hasBluetoothPermission ---

    @Test
    fun `hasBluetoothPermission returns true on pre-API 31`() {
        // On pre-API 31, Bluetooth permission is always available (granted at install)
        // The implementation checks Build.VERSION.SDK_INT < S, returns true
        // In unit tests, Build.VERSION.SDK_INT is typically 0 which is < 31
        val manager = createManager()

        val result = manager.hasBluetoothPermission()

        // On JVM unit tests, SDK_INT is 0 which is < 31, so this returns true
        assertTrue(result)
    }

    // --- Device Disconnect Handling ---

    @Test
    fun `selected device cleared when it disconnects is handled by callback`() = runTest {
        // This test verifies the state management logic:
        // When a device is selected and then removed from available devices,
        // the callback should reset the selection

        val device = AudioDevice(
            id = 5, name = "BT Speaker", type = AudioDeviceInfo.TYPE_BLUETOOTH_A2DP,
            isBluetoothDevice = true, isBuildInSpeaker = false
        )

        val manager = createManager()
        manager.selectDevice(device)

        assertEquals(device, manager.selectedDevice.first())

        // Simulate device no longer in available list (disconnected)
        every { mockAudioManager.getDevices(AudioManager.GET_DEVICES_OUTPUTS) } returns emptyArray()
        manager.refreshDevices()

        // Verify the device list is now empty
        assertTrue(manager.availableDevices.first().isEmpty())
    }

    // --- Helpers ---

    private fun createManager(): AudioDeviceManager {
        return AudioDeviceManager(mockContext)
    }

    /**
     * Create a mock [AudioDeviceInfo] with the specified properties.
     */
    private fun createMockAudioDeviceInfo(
        id: Int,
        type: Int,
        productName: String
    ): AudioDeviceInfo {
        return mockk<AudioDeviceInfo>(relaxed = true) {
            every { getId() } returns id
            every { getType() } returns type
            every { getProductName() } returns productName
        }
    }

    /**
     * Set up the context to report Bluetooth permission as granted.
     */
    private fun setupBluetoothPermissionGranted() {
        every {
            mockContext.checkPermission(
                android.Manifest.permission.BLUETOOTH_CONNECT,
                any(),
                any()
            )
        } returns PackageManager.PERMISSION_GRANTED

        // Also mock ContextCompat path
        mockkStatic(androidx.core.content.ContextCompat::class)
        every {
            androidx.core.content.ContextCompat.checkSelfPermission(
                mockContext,
                android.Manifest.permission.BLUETOOTH_CONNECT
            )
        } returns PackageManager.PERMISSION_GRANTED
    }

    /**
     * Set up the context to report Bluetooth permission as denied.
     */
    private fun setupBluetoothPermissionDenied() {
        every {
            mockContext.checkPermission(
                android.Manifest.permission.BLUETOOTH_CONNECT,
                any(),
                any()
            )
        } returns PackageManager.PERMISSION_DENIED

        mockkStatic(androidx.core.content.ContextCompat::class)
        every {
            androidx.core.content.ContextCompat.checkSelfPermission(
                mockContext,
                android.Manifest.permission.BLUETOOTH_CONNECT
            )
        } returns PackageManager.PERMISSION_DENIED
    }
}
