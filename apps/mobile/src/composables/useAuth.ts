/**
 * useAuth Composable - Authentication logic for QR code connection
 *
 * Handles the QR code scanning and connection flow for linking
 * the mobile app to CLI sessions.
 */
import { ref, computed } from 'vue';

/**
 * QR code payload structure from CLI
 */
interface QRPayload {
  /** Machine ID */
  m: string;
  /** Public key for encryption */
  pk: string;
  /** Challenge nonce */
  n: string;
  /** Server URL */
  u?: string;
}

/**
 * Connection state
 */
type ConnectionState = 'idle' | 'scanning' | 'connecting' | 'connected' | 'error';

/**
 * Connected machine info
 */
interface ConnectedMachine {
  id: string;
  name: string;
  connectedAt: Date;
}

// Singleton state (shared across components)
const connectionState = ref<ConnectionState>('idle');
const connectedMachines = ref<Map<string, ConnectedMachine>>(new Map());
const currentError = ref<string | null>(null);

/**
 * Parse QR code data from CLI
 */
function parseQRCode(data: string): QRPayload | null {
  try {
    // QR code format: happy://connect?data=<base64-json>
    const url = new URL(data);
    if (url.protocol !== 'happy:') {
      throw new Error('Invalid QR code protocol');
    }

    const encodedData = url.searchParams.get('data');
    if (!encodedData) {
      throw new Error('Missing data parameter');
    }

    const decoded = atob(encodedData);
    return JSON.parse(decoded) as QRPayload;
  } catch (e) {
    // Try parsing as raw JSON (for development)
    try {
      return JSON.parse(data) as QRPayload;
    } catch {
      console.error('Failed to parse QR code:', e);
      return null;
    }
  }
}

export function useAuth() {
  const isConnecting = computed(() => connectionState.value === 'connecting');
  const isConnected = computed(() => connectionState.value === 'connected');
  const error = computed(() => currentError.value);
  const machines = computed(() => Array.from(connectedMachines.value.values()));

  /**
   * Connect using QR code data
   */
  async function connectWithQR(qrData: string): Promise<boolean> {
    connectionState.value = 'connecting';
    currentError.value = null;

    try {
      const payload = parseQRCode(qrData);
      if (!payload) {
        throw new Error('Invalid QR code format');
      }

      // Validate required fields
      if (!payload.m || !payload.pk || !payload.n) {
        throw new Error('QR code missing required fields');
      }

      // TODO: Implement actual connection logic
      // 1. Generate keypair for this device
      // 2. Send challenge response to server
      // 3. Establish encrypted session

      // For now, simulate successful connection
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Add connected machine
      connectedMachines.value.set(payload.m, {
        id: payload.m,
        name: `Machine ${payload.m.slice(0, 8)}`,
        connectedAt: new Date(),
      });

      connectionState.value = 'connected';
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Connection failed';
      currentError.value = message;
      connectionState.value = 'error';
      return false;
    }
  }

  /**
   * Disconnect from a machine
   */
  function disconnect(machineId: string) {
    connectedMachines.value.delete(machineId);
    if (connectedMachines.value.size === 0) {
      connectionState.value = 'idle';
    }
  }

  /**
   * Disconnect from all machines
   */
  function disconnectAll() {
    connectedMachines.value.clear();
    connectionState.value = 'idle';
  }

  /**
   * Clear error state
   */
  function clearError() {
    currentError.value = null;
    if (connectionState.value === 'error') {
      connectionState.value = 'idle';
    }
  }

  /**
   * Reset to idle state for new scan
   */
  function resetState() {
    connectionState.value = 'idle';
    currentError.value = null;
  }

  return {
    // State
    connectionState,
    isConnecting,
    isConnected,
    error,
    machines,
    // Actions
    connectWithQR,
    disconnect,
    disconnectAll,
    clearError,
    resetState,
  };
}
