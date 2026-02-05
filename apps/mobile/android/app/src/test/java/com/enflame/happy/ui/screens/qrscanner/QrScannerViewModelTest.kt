package com.enflame.happy.ui.screens.qrscanner

import android.util.Base64
import io.mockk.every
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.json.Json
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class QrScannerViewModelTest {

    private lateinit var viewModel: QrScannerViewModel
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }

    // A valid 32-byte key encoded as base64
    private val validBase64Key = java.util.Base64.getEncoder().encodeToString(ByteArray(32) { it.toByte() })

    @Before
    fun setUp() {
        // Mock android.util.Base64 since it's not available in unit tests
        mockkStatic(Base64::class)
        every { Base64.decode(any<String>(), any()) } answers {
            java.util.Base64.getDecoder().decode(firstArg<String>())
        }

        viewModel = QrScannerViewModel(json)
    }

    @After
    fun tearDown() {
        unmockkStatic(Base64::class)
    }

    @Test
    fun `initial state is Scanning`() = runTest {
        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.Scanning)
    }

    @Test
    fun `valid JSON QR code with publicKey is parsed successfully`() = runTest {
        val jsonContent = """{"publicKey":"$validBase64Key","deviceName":"Test Mac","platform":"macos","appVersion":"1.0"}"""

        viewModel.onQrCodeScanned(jsonContent)

        val state = viewModel.uiState.first()
        assertTrue("Expected ScannedSuccess but got $state", state is QrScannerUiState.ScannedSuccess)
        val pairingData = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, pairingData.publicKey)
        assertEquals("Test Mac", pairingData.deviceName)
        assertEquals("macos", pairingData.platform)
        assertEquals("1.0", pairingData.appVersion)
    }

    @Test
    fun `valid JSON QR code with only publicKey is parsed successfully`() = runTest {
        val jsonContent = """{"publicKey":"$validBase64Key"}"""

        viewModel.onQrCodeScanned(jsonContent)

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.ScannedSuccess)
        val pairingData = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, pairingData.publicKey)
        assertEquals(null, pairingData.deviceName)
        assertEquals(null, pairingData.platform)
    }

    @Test
    fun `raw base64 public key is parsed successfully`() = runTest {
        viewModel.onQrCodeScanned(validBase64Key)

        val state = viewModel.uiState.first()
        assertTrue("Expected ScannedSuccess but got $state", state is QrScannerUiState.ScannedSuccess)
        val pairingData = (state as QrScannerUiState.ScannedSuccess).pairingData
        assertEquals(validBase64Key, pairingData.publicKey)
    }

    @Test
    fun `invalid QR content produces error state`() = runTest {
        viewModel.onQrCodeScanned("not-a-valid-qr-code")

        val state = viewModel.uiState.first()
        assertTrue("Expected ScannedError but got $state", state is QrScannerUiState.ScannedError)
    }

    @Test
    fun `JSON without publicKey produces error state`() = runTest {
        viewModel.onQrCodeScanned("""{"deviceName":"Test"}""")

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.ScannedError)
    }

    @Test
    fun `JSON with invalid base64 publicKey produces error state`() = runTest {
        viewModel.onQrCodeScanned("""{"publicKey":"not-valid-base64!!!"}""")

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.ScannedError)
    }

    @Test
    fun `JSON with wrong-sized publicKey produces error state`() = runTest {
        // 16-byte key instead of 32
        val shortKey = java.util.Base64.getEncoder().encodeToString(ByteArray(16))
        viewModel.onQrCodeScanned("""{"publicKey":"$shortKey"}""")

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.ScannedError)
    }

    @Test
    fun `resetScanner returns to Scanning state`() = runTest {
        viewModel.onQrCodeScanned("invalid")
        assertTrue(viewModel.uiState.first() is QrScannerUiState.ScannedError)

        viewModel.resetScanner()

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.Scanning)
    }

    @Test
    fun `empty QR content produces error state`() = runTest {
        viewModel.onQrCodeScanned("")

        val state = viewModel.uiState.first()
        assertTrue(state is QrScannerUiState.ScannedError)
    }
}
