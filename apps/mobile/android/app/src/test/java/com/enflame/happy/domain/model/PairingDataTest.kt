package com.enflame.happy.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test

/**
 * Unit tests for the [PairingData] domain model.
 *
 * Verifies data class behavior including default values, equality,
 * copy semantics, and destructuring.
 */
class PairingDataTest {

    private val testPublicKey = "dGVzdHB1YmxpY2tleXRoYXRpc2V4YWN0bHkzMmJ5dGVz"

    // ---------------------------------------------------------------
    // Construction and Defaults
    // ---------------------------------------------------------------

    @Test
    fun `constructor with only publicKey sets optional fields to null`() {
        val data = PairingData(publicKey = testPublicKey)

        assertEquals(testPublicKey, data.publicKey)
        assertNull(data.deviceName)
        assertNull(data.platform)
        assertNull(data.appVersion)
    }

    @Test
    fun `constructor with all fields retains all values`() {
        val data = PairingData(
            publicKey = testPublicKey,
            deviceName = "MacBook Pro",
            platform = "macos",
            appVersion = "1.5.0"
        )

        assertEquals(testPublicKey, data.publicKey)
        assertEquals("MacBook Pro", data.deviceName)
        assertEquals("macos", data.platform)
        assertEquals("1.5.0", data.appVersion)
    }

    @Test
    fun `constructor with partial optional fields leaves others null`() {
        val data = PairingData(
            publicKey = testPublicKey,
            deviceName = "Dev Box"
        )

        assertEquals("Dev Box", data.deviceName)
        assertNull(data.platform)
        assertNull(data.appVersion)
    }

    // ---------------------------------------------------------------
    // Equality
    // ---------------------------------------------------------------

    @Test
    fun `equal instances with same publicKey and defaults`() {
        val a = PairingData(publicKey = testPublicKey)
        val b = PairingData(publicKey = testPublicKey)

        assertEquals(a, b)
        assertEquals(a.hashCode(), b.hashCode())
    }

    @Test
    fun `equal instances with all fields`() {
        val a = PairingData(
            publicKey = testPublicKey,
            deviceName = "Mac",
            platform = "macos",
            appVersion = "1.0"
        )
        val b = PairingData(
            publicKey = testPublicKey,
            deviceName = "Mac",
            platform = "macos",
            appVersion = "1.0"
        )

        assertEquals(a, b)
        assertEquals(a.hashCode(), b.hashCode())
    }

    @Test
    fun `unequal instances with different publicKey`() {
        val a = PairingData(publicKey = "keyA")
        val b = PairingData(publicKey = "keyB")

        assertNotEquals(a, b)
    }

    @Test
    fun `unequal instances with different deviceName`() {
        val a = PairingData(publicKey = testPublicKey, deviceName = "Mac")
        val b = PairingData(publicKey = testPublicKey, deviceName = "PC")

        assertNotEquals(a, b)
    }

    @Test
    fun `unequal instances with different platform`() {
        val a = PairingData(publicKey = testPublicKey, platform = "macos")
        val b = PairingData(publicKey = testPublicKey, platform = "linux")

        assertNotEquals(a, b)
    }

    @Test
    fun `unequal instances with different appVersion`() {
        val a = PairingData(publicKey = testPublicKey, appVersion = "1.0")
        val b = PairingData(publicKey = testPublicKey, appVersion = "2.0")

        assertNotEquals(a, b)
    }

    @Test
    fun `null optional field not equal to non-null`() {
        val a = PairingData(publicKey = testPublicKey, deviceName = null)
        val b = PairingData(publicKey = testPublicKey, deviceName = "Mac")

        assertNotEquals(a, b)
    }

    // ---------------------------------------------------------------
    // Copy
    // ---------------------------------------------------------------

    @Test
    fun `copy preserves unchanged fields`() {
        val original = PairingData(
            publicKey = testPublicKey,
            deviceName = "Mac",
            platform = "macos",
            appVersion = "1.0"
        )

        val copy = original.copy(deviceName = "Linux Box")

        assertEquals(testPublicKey, copy.publicKey)
        assertEquals("Linux Box", copy.deviceName)
        assertEquals("macos", copy.platform)
        assertEquals("1.0", copy.appVersion)
    }

    @Test
    fun `copy can override publicKey`() {
        val original = PairingData(publicKey = "old-key", deviceName = "Mac")
        val copy = original.copy(publicKey = "new-key")

        assertEquals("new-key", copy.publicKey)
        assertEquals("Mac", copy.deviceName)
    }

    @Test
    fun `copy can set optional field from null to value`() {
        val original = PairingData(publicKey = testPublicKey)
        val copy = original.copy(platform = "windows")

        assertNull(original.platform)
        assertEquals("windows", copy.platform)
    }

    // ---------------------------------------------------------------
    // Destructuring
    // ---------------------------------------------------------------

    @Test
    fun `destructuring extracts all components`() {
        val data = PairingData(
            publicKey = testPublicKey,
            deviceName = "Mac",
            platform = "macos",
            appVersion = "1.0"
        )

        val (publicKey, deviceName, platform, appVersion) = data

        assertEquals(testPublicKey, publicKey)
        assertEquals("Mac", deviceName)
        assertEquals("macos", platform)
        assertEquals("1.0", appVersion)
    }

    @Test
    fun `destructuring with null optional fields`() {
        val data = PairingData(publicKey = testPublicKey)

        val (publicKey, deviceName, platform, appVersion) = data

        assertEquals(testPublicKey, publicKey)
        assertNull(deviceName)
        assertNull(platform)
        assertNull(appVersion)
    }

    // ---------------------------------------------------------------
    // toString
    // ---------------------------------------------------------------

    @Test
    fun `toString contains all field values`() {
        val data = PairingData(
            publicKey = testPublicKey,
            deviceName = "Mac",
            platform = "macos",
            appVersion = "1.0"
        )

        val str = data.toString()
        assert(str.contains("publicKey=$testPublicKey")) { "toString missing publicKey: $str" }
        assert(str.contains("deviceName=Mac")) { "toString missing deviceName: $str" }
        assert(str.contains("platform=macos")) { "toString missing platform: $str" }
        assert(str.contains("appVersion=1.0")) { "toString missing appVersion: $str" }
    }

    // ---------------------------------------------------------------
    // Edge Cases
    // ---------------------------------------------------------------

    @Test
    fun `empty publicKey is accepted by data class`() {
        // PairingData itself is just a data class; validation occurs in ViewModel
        val data = PairingData(publicKey = "")
        assertEquals("", data.publicKey)
    }

    @Test
    fun `special characters in deviceName are preserved`() {
        val name = "Ryan's Machine - \u00e9\u00e0\u00fc \u2014"
        val data = PairingData(publicKey = testPublicKey, deviceName = name)
        assertEquals(name, data.deviceName)
    }

    @Test
    fun `very long publicKey string is preserved`() {
        val longKey = "A".repeat(1000)
        val data = PairingData(publicKey = longKey)
        assertEquals(longKey, data.publicKey)
    }
}
