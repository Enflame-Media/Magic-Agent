package com.enflame.happy.ui.screens.qrscanner

import android.util.Log
import androidx.camera.core.ExperimentalGetImage
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage

/**
 * CameraX image analyzer that uses ML Kit to detect QR codes.
 *
 * Processes camera frames and invokes [onQrCodeDetected] when a
 * QR code with non-empty content is found. Processing is throttled
 * by only scanning when [isScanning] is true, which the caller
 * should set to false after receiving a result to avoid duplicate
 * callbacks while the UI transitions.
 */
class QrCodeAnalyzer(
    private val onQrCodeDetected: (String) -> Unit
) : ImageAnalysis.Analyzer {

    @Volatile
    var isScanning: Boolean = true

    private val scanner = BarcodeScanning.getClient()

    @ExperimentalGetImage
    override fun analyze(imageProxy: ImageProxy) {
        if (!isScanning) {
            imageProxy.close()
            return
        }

        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val inputImage = InputImage.fromMediaImage(
            mediaImage,
            imageProxy.imageInfo.rotationDegrees
        )

        scanner.process(inputImage)
            .addOnSuccessListener { barcodes ->
                for (barcode in barcodes) {
                    if (barcode.format == Barcode.FORMAT_QR_CODE) {
                        val rawValue = barcode.rawValue
                        if (!rawValue.isNullOrBlank()) {
                            isScanning = false
                            onQrCodeDetected(rawValue)
                            break
                        }
                    }
                }
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "Barcode scanning failed", exception)
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    companion object {
        private const val TAG = "QrCodeAnalyzer"
    }
}
