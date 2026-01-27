<script setup lang="ts">
/**
 * QR Scanner View - Scan CLI's QR code to connect
 *
 * This is used when the web app is already authenticated
 * and the user wants to approve a CLI connection.
 *
 * @see HAP-814 - Implements real key exchange and session establishment
 */

import { ref, computed, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

// Lazy load QRScanner - @zxing library is ~100KB
const QRScanner = defineAsyncComponent({
  loader: () => import('@/components/app/QRScanner.vue'),
  loadingComponent: Spinner,
  delay: 200,
  timeout: 10000,
});
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Keyboard, CheckCircle2, AlertCircle, Loader2 } from 'lucide-vue-next';
import { useAuth } from '@/composables/useAuth';
import { CliConnectionError } from '@/services/auth';
import { toast } from 'vue-sonner';

const router = useRouter();
const { connectToCli, canApproveConnections } = useAuth();

type ConnectionState = 'scanning' | 'connecting' | 'success' | 'error';

const state = ref<ConnectionState>('scanning');
const errorMessage = ref<string | null>(null);

const isScanning = computed(() => state.value === 'scanning');

/**
 * Handle successful QR scan
 *
 * Performs the real key exchange:
 * 1. Parse QR code to get CLI's public key
 * 2. Check server for pending auth request
 * 3. Encrypt shared secret with CLI's public key
 * 4. Send encrypted response to server
 */
async function handleScan(data: string) {
  if (state.value !== 'scanning') return;

  state.value = 'connecting';

  // Check if we're authenticated first
  if (!canApproveConnections.value) {
    state.value = 'error';
    errorMessage.value = 'Please log in first before connecting a CLI.';
    toast.error('Not Authenticated', {
      description: errorMessage.value,
    });
    return;
  }

  // Perform the real CLI connection with encryption
  const result = await connectToCli(data);

  if (result.success) {
    toast.success('CLI Connected!', {
      description: 'The terminal session is now linked to your account',
    });

    state.value = 'success';

    // Redirect to home after success
    setTimeout(() => {
      router.push('/');
    }, 2000);
  } else {
    console.error('[QRScanner] Connection failed:', result.errorCode, result.errorMessage);
    state.value = 'error';

    // Set appropriate error message based on error code
    if (result.errorCode === CliConnectionError.NOT_FOUND) {
      errorMessage.value = 'QR code expired. Please generate a new one in the CLI.';
    } else if (result.errorCode === 'parse_error') {
      errorMessage.value = 'Invalid QR code format. Please scan a valid Happy CLI QR code.';
    } else {
      errorMessage.value = result.errorMessage ?? 'Failed to connect';
    }

    toast.error('Connection Failed', {
      description: errorMessage.value,
    });
  }
}

/**
 * Handle scanner errors
 */
function handleError(error: Error) {
  console.error('[QRScanner] Scanner error:', error);
  toast.error('Scanner Error', {
    description: error.message,
  });
}

/**
 * Handle permission denied
 */
function handlePermissionDenied() {
  toast.error('Camera Access Denied', {
    description: 'Please enable camera access in your browser settings',
  });
}

/**
 * Go back to login
 */
function goBack() {
  router.push('/auth');
}

/**
 * Go to manual entry
 */
function goToManualEntry() {
  router.push('/auth/manual');
}

/**
 * Retry scanning
 */
function retry() {
  state.value = 'scanning';
  errorMessage.value = null;
}
</script>

<template>
  <div class="scanner-view">
    <div class="scanner-container">
      <!-- Header -->
      <div class="header">
        <Button
          variant="ghost"
          size="icon"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <h1 class="title">Scan QR Code</h1>
        <div class="spacer" />
      </div>

      <!-- Scanner Card -->
      <Card>
        <CardHeader>
          <CardTitle>Connect to Terminal</CardTitle>
        </CardHeader>
        <CardContent>
          <!-- Scanning State -->
          <template v-if="state === 'scanning'">
            <QRScanner
              :active="isScanning"
              @scan="handleScan"
              @error="handleError"
              @permission-denied="handlePermissionDenied"
            />
          </template>

          <!-- Connecting State -->
          <template v-else-if="state === 'connecting'">
            <div class="state-container">
              <Loader2 class="state-icon spinning" />
              <p class="state-title">Connecting...</p>
              <p class="state-description">
                Establishing connection with the CLI
              </p>
            </div>
          </template>

          <!-- Success State -->
          <template v-else-if="state === 'success'">
            <div class="state-container success">
              <CheckCircle2 class="state-icon" />
              <p class="state-title">Connected!</p>
              <p class="state-description">
                You can now see this session in your terminal
              </p>
            </div>
          </template>

          <!-- Error State -->
          <template v-else-if="state === 'error'">
            <div class="state-container error">
              <AlertCircle class="state-icon" />
              <p class="state-title">Connection Failed</p>
              <p class="state-description">{{ errorMessage }}</p>
              <Button @click="retry">
                Try Again
              </Button>
            </div>
          </template>
        </CardContent>
      </Card>

      <!-- Alternative Option -->
      <div
        v-if="state === 'scanning'"
        class="alternative"
      >
        <p>Can't scan the code?</p>
        <Button
          variant="link"
          @click="goToManualEntry"
        >
          <Keyboard class="mr-2 h-4 w-4" />
          Enter code manually
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanner-view {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 1.5rem;
  padding-top: 3rem;
  background: hsl(var(--background));
}

.scanner-container {
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title {
  flex: 1;
  font-size: 1.25rem;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.spacer {
  width: 2.5rem;
}

.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.state-icon {
  width: 3rem;
  height: 3rem;
  color: hsl(var(--muted-foreground));
}

.state-container.success .state-icon {
  color: hsl(var(--primary));
}

.state-container.error .state-icon {
  color: hsl(var(--destructive));
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.state-title {
  font-weight: 600;
  color: hsl(var(--foreground));
}

.state-description {
  font-size: 0.875rem;
  color: hsl(var(--muted-foreground));
}

.alternative {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
}
</style>
