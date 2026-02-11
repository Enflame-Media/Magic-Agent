<script setup lang="ts">
/* global setTimeout, console */
/**
 * Connecting View - Initial web authentication via mobile app
 *
 * Shows a QR code that the mobile app can scan to authenticate the web session.
 * This is the primary way to initially authenticate on web.
 */

import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-vue-next';
import { createAuthSession } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();
const authStore = useAuthStore();

type AuthState = 'loading' | 'waiting' | 'success' | 'error';

const state = ref<AuthState>('loading');
const qrData = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const dotCount = ref(0);
const isCancelled = ref(false);

let authSession: ReturnType<typeof createAuthSession> | null = null;

const statusMessage = computed(() => {
  const dots = '.'.repeat((dotCount.value % 3) + 1);
  return `Waiting for authentication${dots}`;
});

/**
 * Start the authentication session
 */
async function startAuth() {
  state.value = 'loading';
  errorMessage.value = null;
  isCancelled.value = false;

  try {
    // Create auth session (generates keypair and QR data)
    authSession = createAuthSession();
    qrData.value = authSession.qrData;
    state.value = 'waiting';

    // Wait for mobile app to authorize
    const credentials = await authSession.waitForAuth(
      (dots) => {
        dotCount.value = dots;
      },
      () => isCancelled.value
    );

    if (isCancelled.value) {
      return;
    }

    if (credentials) {
      // Update auth store
      authStore.setCredentials(credentials.token, 'temp-account-id');

      state.value = 'success';
      toast.success('Authentication successful!');

      // Redirect to home
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('[ConnectingView] Auth failed:', error);
    state.value = 'error';
    errorMessage.value =
      error instanceof Error ? error.message : 'Authentication failed';

    toast.error('Authentication Failed', {
      description: errorMessage.value,
    });
  }
}

/**
 * Copy QR data to clipboard
 */
async function copyToClipboard() {
  if (!qrData.value) return;

  try {
    await navigator.clipboard.writeText(qrData.value);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Failed to copy');
  }
}

/**
 * Cancel and go back
 */
function goBack() {
  isCancelled.value = true;
  router.push('/auth');
}

/**
 * Retry authentication
 */
function retry() {
  startAuth();
}

onMounted(() => {
  startAuth();
});

onUnmounted(() => {
  isCancelled.value = true;
});
</script>

<template>
  <ResponsiveContainer size="narrow" padding="default" class="connecting-view">
    <div class="connecting-container">
      <!-- Header -->
      <div class="header">
        <Button
          variant="ghost"
          size="icon"
          @click="goBack"
        >
          <ArrowLeft class="h-5 w-5" />
        </Button>
        <h1 class="title">Authenticate</h1>
        <div class="spacer" />
      </div>

      <!-- Auth Card -->
      <Card>
        <CardHeader>
          <CardTitle>Scan with Happy App</CardTitle>
          <CardDescription>
            Open the Happy app on your phone and scan this code
          </CardDescription>
        </CardHeader>
        <CardContent>
          <!-- Loading State -->
          <template v-if="state === 'loading'">
            <div class="state-container">
              <Loader2 class="state-icon spinning" />
              <p class="state-title">Preparing...</p>
            </div>
          </template>

          <!-- Waiting State - Show QR -->
          <template v-else-if="state === 'waiting' && qrData">
            <div class="qr-container">
              <!-- QR Code Placeholder - In production, use a QR library -->
              <div class="qr-placeholder">
                <div class="qr-code">
                  <p class="qr-text">QR Code</p>
                  <p class="qr-subtext">{{ qrData.slice(0, 30) }}...</p>
                </div>
              </div>

              <!-- Status -->
              <p class="status-message">{{ statusMessage }}</p>

              <!-- Copy Button -->
              <Button
                variant="outline"
                size="sm"
                @click="copyToClipboard"
              >
                <Copy class="mr-2 h-4 w-4" />
                Copy Code
              </Button>
            </div>
          </template>

          <!-- Success State -->
          <template v-else-if="state === 'success'">
            <div class="state-container success">
              <CheckCircle2 class="state-icon" />
              <p class="state-title">Authenticated!</p>
              <p class="state-description">Redirecting to your dashboard...</p>
            </div>
          </template>

          <!-- Error State -->
          <template v-else-if="state === 'error'">
            <div class="state-container error">
              <AlertCircle class="state-icon" />
              <p class="state-title">Authentication Failed</p>
              <p class="state-description">{{ errorMessage }}</p>
              <Button @click="retry">
                <RefreshCw class="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </div>
          </template>
        </CardContent>
      </Card>

      <!-- Instructions -->
      <div
        v-if="state === 'waiting'"
        class="instructions"
      >
        <p class="instruction-title">How to scan:</p>
        <ol class="instruction-list">
          <li>Open the Happy mobile app</li>
          <li>Tap the "Add Device" button</li>
          <li>Point your phone's camera at the QR code</li>
          <li>Confirm the connection in the app</li>
        </ol>
      </div>
    </div>
  </ResponsiveContainer>
</template>

<style scoped>
.connecting-view {
  min-height: 100vh;
  background: hsl(var(--background));
}

.connecting-container {
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
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

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qr-placeholder {
  width: 200px;
  height: 200px;
  border-radius: 0.75rem;
  overflow: hidden;
  background: white;
  padding: 1rem;
}

.qr-code {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: hsl(var(--muted));
  border-radius: 0.5rem;
  border: 2px dashed hsl(var(--border));
}

.qr-text {
  font-weight: 600;
  color: hsl(var(--muted-foreground));
}

.qr-subtext {
  font-size: 0.625rem;
  color: hsl(var(--muted-foreground));
  font-family: monospace;
  margin-top: 0.25rem;
}

.status-message {
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
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

.instructions {
  padding: 1rem;
  background: hsl(var(--muted) / 0.5);
  border-radius: 0.5rem;
}

.instruction-title {
  font-weight: 500;
  color: hsl(var(--foreground));
  margin-bottom: 0.5rem;
}

.instruction-list {
  margin: 0;
  padding-left: 1.25rem;
  color: hsl(var(--muted-foreground));
  font-size: 0.875rem;
  line-height: 1.75;
}
</style>
