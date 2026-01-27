<script setup lang="ts">
/* global console */
/**
 * QR Code Scanner Component
 *
 * Uses @zxing/browser for camera-based QR code scanning.
 * Handles camera permissions gracefully and provides error feedback.
 */

import { ref, onMounted, onUnmounted, watch } from 'vue';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Camera, CameraOff, RefreshCw } from 'lucide-vue-next';

const props = defineProps<{
  active?: boolean;
}>();

const emit = defineEmits<{
  scan: [data: string];
  error: [error: Error];
  permissionDenied: [];
}>();

const videoRef = ref<HTMLVideoElement>();
const isScanning = ref(false);
const hasPermission = ref<boolean | null>(null);
const errorMessage = ref<string | null>(null);

let reader: BrowserQRCodeReader | null = null;
let controls: { stop: () => void } | null = null;

/**
 * Start QR code scanning
 */
async function startScanning(): Promise<void> {
  if (!videoRef.value) {
     
    console.error('[QRScanner] Video element not ready');
    return;
  }

  errorMessage.value = null;

  try {
    reader = new BrowserQRCodeReader();

    // Request camera permission and start scanning
    controls = await reader.decodeFromVideoDevice(
      undefined, // Use default camera
      videoRef.value,
      (result, error) => {
        if (result) {
          const text = result.getText();
          emit('scan', text);
        }

        if (error && error.name !== 'NotFoundException') {
          // NotFoundException is normal when no QR code is visible - ignore silently
        }
      }
    );

    isScanning.value = true;
    hasPermission.value = true;
  } catch (error) {
     
    console.error('[QRScanner] Failed to start:', error);

    if (error instanceof Error) {
      if (
        error.name === 'NotAllowedError' ||
        error.message.includes('Permission denied')
      ) {
        hasPermission.value = false;
        errorMessage.value = 'Camera permission denied';
        emit('permissionDenied');
      } else if (error.name === 'NotFoundError') {
        errorMessage.value = 'No camera found on this device';
        emit('error', error);
      } else {
        errorMessage.value = error.message;
        emit('error', error);
      }
    }
  }
}

/**
 * Stop QR code scanning
 */
function stopScanning() {
  if (controls) {
    controls.stop();
    controls = null;
  }

  if (reader) {
    reader = null;
  }

  isScanning.value = false;
}

/**
 * Retry after permission denial or error
 */
function retry() {
  hasPermission.value = null;
  errorMessage.value = null;
  startScanning();
}

// Start scanning when component is mounted and active
onMounted(() => {
  if (props.active !== false) {
    startScanning();
  }
});

// Clean up on unmount
onUnmounted(() => {
  stopScanning();
});

// Watch for active prop changes
watch(
  () => props.active,
  (active) => {
    if (active) {
      startScanning();
    } else {
      stopScanning();
    }
  }
);

// Expose methods for parent component
defineExpose({
  start: startScanning,
  stop: stopScanning,
});
</script>

<template>
  <div class="qr-scanner">
    <!-- Video element for camera feed -->
    <div class="video-container">
      <video
        ref="videoRef"
        class="video"
        playsinline
        muted
      />

      <!-- Scanning overlay -->
      <div
        v-if="isScanning"
        class="scan-overlay"
      >
        <div class="scan-frame" />
      </div>

      <!-- Permission denied state -->
      <div
        v-if="hasPermission === false"
        class="error-state"
      >
        <CameraOff class="error-icon" />
        <p class="error-title">Camera Access Denied</p>
        <p class="error-description">
          Please allow camera access in your browser settings to scan QR codes.
        </p>
        <Button
          variant="outline"
          @click="retry"
        >
          <RefreshCw class="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>

      <!-- Error state -->
      <div
        v-else-if="errorMessage"
        class="error-state"
      >
        <Camera class="error-icon" />
        <p class="error-title">Scanner Error</p>
        <p class="error-description">{{ errorMessage }}</p>
        <Button
          variant="outline"
          @click="retry"
        >
          <RefreshCw class="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>

      <!-- Loading state -->
      <div
        v-else-if="!isScanning && hasPermission === null"
        class="loading-state"
      >
        <Camera class="loading-icon" />
        <p>Requesting camera access...</p>
      </div>
    </div>

    <!-- Instructions -->
    <p
      v-if="isScanning"
      class="instructions"
    >
      Point your camera at the QR code displayed in your terminal
    </p>
  </div>
</template>

<style scoped>
.qr-scanner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.video-container {
  position: relative;
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
  border-radius: 0.75rem;
  overflow: hidden;
  background: hsl(var(--muted));
}

.video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.scan-frame {
  width: 70%;
  height: 70%;
  border: 3px solid hsl(var(--primary));
  border-radius: 1rem;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    border-color: hsl(var(--primary));
  }
  50% {
    opacity: 0.7;
    border-color: hsl(var(--primary) / 0.7);
  }
}

.error-state,
.loading-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  background: hsl(var(--background));
}

.error-icon,
.loading-icon {
  width: 3rem;
  height: 3rem;
  color: hsl(var(--muted-foreground));
}

.error-title {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.error-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  max-width: 280px;
}

.loading-state p {
  color: hsl(var(--muted-foreground));
}

.loading-icon {
  animation: pulse 1.5s ease-in-out infinite;
}

.instructions {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
  text-align: center;
}
</style>
