<script setup lang="ts">
/**
 * Scanner View - QR Code Scanner for CLI Connection
 *
 * Uses native camera to scan QR codes displayed by the CLI
 * for authentication and session linking.
 */
import { ref, onMounted } from 'vue';
import { Frame, Dialogs } from '@nativescript/core';
import { useAuth } from '../../composables/useAuth';

const { connectWithQR, isConnecting, error, clearError } = useAuth();

const hasPermission = ref(false);
const isScanning = ref(false);
const scanError = ref<string | null>(null);

/**
 * Request camera permissions
 */
async function requestCameraPermission(): Promise<boolean> {
  try {
    // NativeScript handles permission requests automatically
    // when the barcode scanner is invoked
    hasPermission.value = true;
    return true;
  } catch (e) {
    console.error('Camera permission denied:', e);
    hasPermission.value = false;
    return false;
  }
}

/**
 * Start QR code scanning
 */
async function startScanning() {
  if (isScanning.value || isConnecting.value) return;

  isScanning.value = true;
  scanError.value = null;
  clearError();

  try {
    // Dynamic import to handle cases where plugin may not be installed
    const { BarcodeScanner } = await import('@aspect/nativescript-barcodescanner');
    const scanner = new BarcodeScanner();

    // Check if scanning is available
    const available = await scanner.available();
    if (!available) {
      throw new Error('Camera is not available on this device');
    }

    // Check permissions
    const permitted = await scanner.hasCameraPermission();
    if (!permitted) {
      const granted = await scanner.requestCameraPermission();
      if (!granted) {
        throw new Error('Camera permission is required to scan QR codes');
      }
    }

    hasPermission.value = true;

    // Start scanning
    const result = await scanner.scan({
      formats: 'QR_CODE',
      message: 'Point your camera at the QR code from your CLI',
      showFlipCameraButton: true,
      showTorchButton: true,
      beepOnScan: true,
      closeCallback: () => {
        isScanning.value = false;
      },
    });

    isScanning.value = false;

    if (result.text) {
      // Process the scanned QR code
      const success = await connectWithQR(result.text);
      if (success) {
        // Navigate back to home on successful connection
        await Dialogs.alert({
          title: 'Connected!',
          message: 'Successfully connected to your CLI session.',
          okButtonText: 'OK',
        });
        navigateBack();
      }
    }
  } catch (e) {
    isScanning.value = false;
    const message = e instanceof Error ? e.message : 'Failed to scan QR code';
    scanError.value = message;
    console.error('Scanning error:', e);
  }
}

/**
 * Navigate back to previous screen
 */
function navigateBack() {
  const frame = Frame.topmost();
  if (frame?.canGoBack()) {
    frame.goBack();
  }
}

/**
 * Handle manual code entry (fallback)
 */
async function enterManually() {
  const result = await Dialogs.prompt({
    title: 'Enter Connection Code',
    message: 'Enter the connection code from your CLI:',
    okButtonText: 'Connect',
    cancelButtonText: 'Cancel',
    inputType: 'text',
  });

  if (result.result && result.text) {
    const success = await connectWithQR(result.text);
    if (success) {
      await Dialogs.alert({
        title: 'Connected!',
        message: 'Successfully connected to your CLI session.',
        okButtonText: 'OK',
      });
      navigateBack();
    }
  }
}

onMounted(() => {
  requestCameraPermission();
});
</script>

<template>
  <Page actionBarHidden="false">
    <ActionBar title="Connect">
      <NavigationButton text="Back" android.systemIcon="ic_menu_back" @tap="navigateBack" />
    </ActionBar>

    <GridLayout rows="auto, *, auto" class="scanner-container">
      <!-- Header -->
      <StackLayout row="0" class="header">
        <Label text="Scan QR Code" class="title" />
        <Label
          text="Open Claude Code CLI and display the QR code, then scan it with your camera."
          class="subtitle"
          textWrap="true"
        />
      </StackLayout>

      <!-- Main content area -->
      <StackLayout row="1" class="content" verticalAlignment="center">
        <!-- Scan button -->
        <Button
          text="Open Camera"
          @tap="startScanning"
          class="btn-primary btn-large"
          :isEnabled="!isScanning && !isConnecting"
        />

        <!-- Loading indicator -->
        <StackLayout v-if="isConnecting" class="loading-container">
          <ActivityIndicator busy="true" class="activity-indicator" />
          <Label text="Connecting to CLI..." class="loading-text" />
        </StackLayout>

        <!-- Error display -->
        <StackLayout v-if="scanError || error" class="error-container">
          <Label :text="scanError || error" class="error-text" textWrap="true" />
          <Button text="Try Again" @tap="clearError(); scanError = null" class="btn-secondary" />
        </StackLayout>
      </StackLayout>

      <!-- Footer with manual entry option -->
      <StackLayout row="2" class="footer">
        <Label text="Having trouble scanning?" class="footer-label" />
        <Button
          text="Enter Code Manually"
          @tap="enterManually"
          class="btn-link"
          :isEnabled="!isConnecting"
        />
      </StackLayout>
    </GridLayout>
  </Page>
</template>

<style scoped>
.scanner-container {
  background-color: #ffffff;
}

.header {
  padding: 24;
  text-align: center;
}

.title {
  font-size: 28;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 8;
}

.subtitle {
  font-size: 16;
  color: #6b7280;
  line-height: 24;
}

.content {
  padding: 24;
}

.btn-primary {
  background-color: #6366f1;
  color: #ffffff;
  font-size: 18;
  font-weight: 600;
  padding: 16 32;
  border-radius: 12;
  margin: 16;
}

.btn-large {
  height: 56;
}

.btn-secondary {
  background-color: #f3f4f6;
  color: #374151;
  font-size: 16;
  padding: 12 24;
  border-radius: 8;
  margin-top: 16;
}

.btn-link {
  background-color: transparent;
  color: #6366f1;
  font-size: 16;
  padding: 12;
}

.loading-container {
  margin-top: 24;
  text-align: center;
}

.activity-indicator {
  color: #6366f1;
  width: 48;
  height: 48;
}

.loading-text {
  font-size: 16;
  color: #6b7280;
  margin-top: 12;
}

.error-container {
  margin-top: 24;
  padding: 16;
  background-color: #fef2f2;
  border-radius: 8;
  text-align: center;
}

.error-text {
  font-size: 14;
  color: #dc2626;
  margin-bottom: 12;
}

.footer {
  padding: 24;
  text-align: center;
  border-top-width: 1;
  border-top-color: #e5e7eb;
}

.footer-label {
  font-size: 14;
  color: #9ca3af;
  margin-bottom: 8;
}
</style>
