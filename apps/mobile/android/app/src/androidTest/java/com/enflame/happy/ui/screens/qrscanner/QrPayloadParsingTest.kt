package com.enflame.happy.ui.screens.qrscanner

import android.util.Base64
import kotlinx.serialization.json.Json
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Instrumented tests for QR payload parsing logic.
 *
 * These run on-device so that android.util.Base64 is available natively
 * without mocking, providing higher-fidelity validation of the parsing
 * logic than the unit test counterparts.
 *
 * The ViewModel is instantiated directly (no Hilt needed) since the only
 * dependency is a kotlinx.serialization Json instance.
 */
class QrPayloadParsingTest {

    private lateinit var viewModel: QrScannerViewModel
    private lateinit var json: Json

    /** A valid 32-byte X25519 key encoded as base64 (no wrap). */
    private val validBase64Key: String by lazy {
        Base64.encodeToString(ByteArray(32) { it.toByte() }, Base64.NO_WRAP)
    }

    @Before
    fun setUp() {
        json = Json {
            ignoreUnknownKeys = true
            coerceInputValues = true
            isLenient = true
        }
        viewModel = QrScannerViewModel(json)
    }

    // ---------------------------------------------------------------
    // Valid JSON Payloads
    // ---------------------------------------------------------------

    @Test
    fun validJson_allFields_parsedSuccessfully() {
        val payload = """
            {
                "publicKey": "$validBase64Key",
                "deviceName": "MacBook Pro",
                "platform": "macos",
                "appVersion": "2.1.0"
            }
        """.trimIndent()

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue("Expected ScannedSuccess but got $state", state is QrScannerUiState.ScannedSuccess)
        val data = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, data.publicKey)
        assertEquals("MacBook Pro", data.deviceName)
        assertEquals("macos", data.platform)
        assertEquals("2.1.0", data.appVersion)
    }

    @Test
    fun validJson_onlyPublicKey_parsedSuccessfully() {
        val payload = """{"publicKey":"$validBase64Key"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        val data = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, data.publicKey)
        assertNull(data.deviceName)
        assertNull(data.platform)
        assertNull(data.appVersion)
    }

    @Test
    fun validJson_publicKeyAndDeviceName_parsedSuccessfully() {
        val payload = """{"publicKey":"$validBase64Key","deviceName":"My Linux Box"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        val data = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals("My Linux Box", data.deviceName)
        assertNull(data.platform)
    }

    @Test
    fun validJson_unknownExtraFields_ignoredSuccessfully() {
        val payload = """
            {
                "publicKey": "$validBase64Key",
                "deviceName": "Test",
                "unknownField": "ignored",
                "anotherField": 42
            }
        """.trimIndent()

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue("Unknown fields should be ignored", state is QrScannerUiState.ScannedSuccess)
        assertEquals(
            validBase64Key,
            (state as QrScannerUiState.ScannedSuccess).pairingData.publicKey
        )
    }

    // ---------------------------------------------------------------
    // Raw Base64 Public Key
    // ---------------------------------------------------------------

    @Test
    fun rawBase64_validKey_parsedSuccessfully() {
        viewModel.onQrCodeScanned(validBase64Key)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        val data = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, data.publicKey)
        assertNull(data.deviceName)
        assertNull(data.platform)
        assertNull(data.appVersion)
    }

    @Test
    fun rawBase64_validKeyWithLeadingTrailingSpaces_parsedSuccessfully() {
        viewModel.onQrCodeScanned("  $validBase64Key  ")

        val state = viewModel.uiState.value
        assertTrue(
            "Leading/trailing spaces should be trimmed: $state",
            state is QrScannerUiState.ScannedSuccess
        )
    }

    @Test
    fun rawBase64_defaultEncodingWithPadding_parsedSuccessfully() {
        // Base64 with standard padding characters
        val keyWithPadding = Base64.encodeToString(ByteArray(32) { 0xFF.toByte() }, Base64.DEFAULT)

        viewModel.onQrCodeScanned(keyWithPadding.trim())

        val state = viewModel.uiState.value
        assertTrue(
            "Base64 with padding should be accepted: $state",
            state is QrScannerUiState.ScannedSuccess
        )
    }

    // ---------------------------------------------------------------
    // Invalid / Malformed QR Data
    // ---------------------------------------------------------------

    @Test
    fun emptyString_producesError() {
        viewModel.onQrCodeScanned("")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun blankString_producesError() {
        viewModel.onQrCodeScanned("   ")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun plainText_producesError() {
        viewModel.onQrCodeScanned("just some random text that is not base64 or json")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithoutPublicKey_producesError() {
        viewModel.onQrCodeScanned("""{"deviceName":"Test","platform":"macos"}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithNullPublicKey_producesError() {
        viewModel.onQrCodeScanned("""{"publicKey":null}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithEmptyPublicKey_producesError() {
        // Empty string decodes to 0 bytes, not 32
        viewModel.onQrCodeScanned("""{"publicKey":""}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithInvalidBase64PublicKey_producesError() {
        viewModel.onQrCodeScanned("""{"publicKey":"not-valid-base64!!!"}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithWrongSizedPublicKey_16bytes_producesError() {
        val shortKey = Base64.encodeToString(ByteArray(16), Base64.NO_WRAP)
        viewModel.onQrCodeScanned("""{"publicKey":"$shortKey"}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonWithWrongSizedPublicKey_64bytes_producesError() {
        val longKey = Base64.encodeToString(ByteArray(64), Base64.NO_WRAP)
        viewModel.onQrCodeScanned("""{"publicKey":"$longKey"}""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun rawBase64_wrongSize_16bytes_producesError() {
        val shortKey = Base64.encodeToString(ByteArray(16), Base64.NO_WRAP)
        viewModel.onQrCodeScanned(shortKey)

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun rawBase64_wrongSize_1byte_producesError() {
        val tinyKey = Base64.encodeToString(ByteArray(1), Base64.NO_WRAP)
        viewModel.onQrCodeScanned(tinyKey)

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun malformedJson_producesError() {
        viewModel.onQrCodeScanned("""{"publicKey": """)

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun jsonArray_producesError() {
        viewModel.onQrCodeScanned("""["$validBase64Key"]""")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun htmlContent_producesError() {
        viewModel.onQrCodeScanned("<html><body>Not a QR payload</body></html>")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    @Test
    fun urlContent_producesError() {
        viewModel.onQrCodeScanned("https://example.com/pairing?key=abc")

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    // ---------------------------------------------------------------
    // Edge Cases: Special Characters
    // ---------------------------------------------------------------

    @Test
    fun specialCharactersInDeviceName_parsedSuccessfully() {
        val payload = """{"publicKey":"$validBase64Key","deviceName":"Ryan's Mac \u2014 Work"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        assertEquals(
            "Ryan's Mac \u2014 Work",
            (state as QrScannerUiState.ScannedSuccess).pairingData.deviceName
        )
    }

    @Test
    fun unicodeInDeviceName_parsedSuccessfully() {
        val payload = """{"publicKey":"$validBase64Key","deviceName":"\u30c6\u30b9\u30c8\u30de\u30b7\u30f3"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        assertNotNull((state as QrScannerUiState.ScannedSuccess).pairingData.deviceName)
    }

    @Test
    fun emojisInDeviceName_parsedSuccessfully() {
        val payload = """{"publicKey":"$validBase64Key","deviceName":"My Mac \uD83D\uDCBB"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
    }

    // ---------------------------------------------------------------
    // Edge Cases: Very Long Payloads
    // ---------------------------------------------------------------

    @Test
    fun veryLongDeviceName_parsedSuccessfully() {
        val longName = "A".repeat(500)
        val payload = """{"publicKey":"$validBase64Key","deviceName":"$longName"}"""

        viewModel.onQrCodeScanned(payload)

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        assertEquals(longName, (state as QrScannerUiState.ScannedSuccess).pairingData.deviceName)
    }

    @Test
    fun veryLongNonJsonString_producesError() {
        val longPayload = "x".repeat(10_000)

        viewModel.onQrCodeScanned(longPayload)

        assertTrue(viewModel.uiState.value is QrScannerUiState.ScannedError)
    }

    // ---------------------------------------------------------------
    // Error Message Content
    // ---------------------------------------------------------------

    @Test
    fun errorState_containsInstructiveMessage() {
        viewModel.onQrCodeScanned("invalid")

        val state = viewModel.uiState.value
        assertTrue(state is QrScannerUiState.ScannedError)
        val message = (state as QrScannerUiState.ScannedError).message
        assertTrue(
            "Error message should mention Claude Code CLI: $message",
            message.contains("Claude Code CLI")
        )
    }
}
