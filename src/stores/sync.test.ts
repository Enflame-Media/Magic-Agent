/**
 * Unit tests for Sync Store (Pinia)
 *
 * Tests cover:
 * - State initialization
 * - Status transitions
 * - Computed getters
 * - Error handling
 * - Reconnect tracking
 * - Reset functionality
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSyncStore, type SyncStatus } from './sync';

describe('Sync Store', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia());
    // Mock Date.now for consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with disconnected status', () => {
      const store = useSyncStore();
      expect(store.status).toBe('disconnected');
    });

    it('should initialize with null lastSyncAt', () => {
      const store = useSyncStore();
      expect(store.lastSyncAt).toBeNull();
    });

    it('should initialize with null error', () => {
      const store = useSyncStore();
      expect(store.error).toBeNull();
    });

    it('should initialize with zero reconnect attempts', () => {
      const store = useSyncStore();
      expect(store.reconnectAttempts).toBe(0);
    });

    it('should initialize with zero sequence', () => {
      const store = useSyncStore();
      expect(store.sequence).toBe(0);
    });
  });

  describe('setStatus', () => {
    it('should update status to connecting', () => {
      const store = useSyncStore();
      store.setStatus('connecting');
      expect(store.status).toBe('connecting');
    });

    it('should update status to authenticating', () => {
      const store = useSyncStore();
      store.setStatus('authenticating');
      expect(store.status).toBe('authenticating');
    });

    it('should update status to connected', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      expect(store.status).toBe('connected');
    });

    it('should update status to reconnecting', () => {
      const store = useSyncStore();
      store.setStatus('reconnecting');
      expect(store.status).toBe('reconnecting');
    });

    it('should update status to error', () => {
      const store = useSyncStore();
      store.setStatus('error');
      expect(store.status).toBe('error');
    });

    it('should update status to disconnected', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      store.setStatus('disconnected');
      expect(store.status).toBe('disconnected');
    });

    it('should clear error when status becomes connected', () => {
      const store = useSyncStore();
      store.setError('Previous error');
      store.setStatus('connected');
      expect(store.error).toBeNull();
    });

    it('should reset reconnect attempts when connected', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      store.setStatus('connected');
      expect(store.reconnectAttempts).toBe(0);
    });

    it('should update lastSyncAt when connected', () => {
      const store = useSyncStore();
      expect(store.lastSyncAt).toBeNull();
      store.setStatus('connected');
      expect(store.lastSyncAt).toBe(Date.now());
    });

    it('should clear error when disconnected', () => {
      const store = useSyncStore();
      store.setError('Some error');
      store.setStatus('disconnected');
      expect(store.error).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set status to error', () => {
      const store = useSyncStore();
      store.setError('Connection failed');
      expect(store.status).toBe('error');
    });

    it('should store error message', () => {
      const store = useSyncStore();
      store.setError('Network timeout');
      expect(store.error).toBe('Network timeout');
    });

    it('should overwrite previous error', () => {
      const store = useSyncStore();
      store.setError('First error');
      store.setError('Second error');
      expect(store.error).toBe('Second error');
    });

    it('should handle empty error message', () => {
      const store = useSyncStore();
      store.setError('');
      expect(store.error).toBe('');
      expect(store.status).toBe('error');
    });
  });

  describe('incrementReconnectAttempts', () => {
    it('should increment reconnect counter', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      expect(store.reconnectAttempts).toBe(1);
    });

    it('should set status to reconnecting', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      store.incrementReconnectAttempts();
      expect(store.status).toBe('reconnecting');
    });

    it('should increment multiple times', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      expect(store.reconnectAttempts).toBe(3);
    });

    it('should track attempts across status changes', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      store.setStatus('error');
      store.incrementReconnectAttempts();
      expect(store.reconnectAttempts).toBe(2);
    });
  });

  describe('setSequence', () => {
    it('should update sequence number', () => {
      const store = useSyncStore();
      store.setSequence(42);
      expect(store.sequence).toBe(42);
    });

    it('should allow setting to zero', () => {
      const store = useSyncStore();
      store.setSequence(100);
      store.setSequence(0);
      expect(store.sequence).toBe(0);
    });
  });

  describe('markSynced', () => {
    it('should update lastSyncAt timestamp', () => {
      const store = useSyncStore();
      store.markSynced();
      expect(store.lastSyncAt).toBe(Date.now());
    });

    it('should update timestamp on each call', () => {
      const store = useSyncStore();
      store.markSynced();
      const first = store.lastSyncAt;

      vi.advanceTimersByTime(1000);
      store.markSynced();

      expect(store.lastSyncAt).toBeGreaterThan(first!);
    });
  });

  describe('$reset', () => {
    it('should reset status to disconnected', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      store.$reset();
      expect(store.status).toBe('disconnected');
    });

    it('should reset lastSyncAt to null', () => {
      const store = useSyncStore();
      store.markSynced();
      store.$reset();
      expect(store.lastSyncAt).toBeNull();
    });

    it('should reset error to null', () => {
      const store = useSyncStore();
      store.setError('Some error');
      store.$reset();
      expect(store.error).toBeNull();
    });

    it('should reset reconnect attempts to zero', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      store.$reset();
      expect(store.reconnectAttempts).toBe(0);
    });

    it('should reset sequence to zero', () => {
      const store = useSyncStore();
      store.setSequence(100);
      store.$reset();
      expect(store.sequence).toBe(0);
    });
  });

  describe('computed: isConnected', () => {
    it('should return true when connected', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      expect(store.isConnected).toBe(true);
    });

    it('should return false when disconnected', () => {
      const store = useSyncStore();
      expect(store.isConnected).toBe(false);
    });

    it('should return false when connecting', () => {
      const store = useSyncStore();
      store.setStatus('connecting');
      expect(store.isConnected).toBe(false);
    });

    it('should return false when reconnecting', () => {
      const store = useSyncStore();
      store.setStatus('reconnecting');
      expect(store.isConnected).toBe(false);
    });

    it('should return false when error', () => {
      const store = useSyncStore();
      store.setError('Error');
      expect(store.isConnected).toBe(false);
    });
  });

  describe('computed: isConnecting', () => {
    it('should return true when connecting', () => {
      const store = useSyncStore();
      store.setStatus('connecting');
      expect(store.isConnecting).toBe(true);
    });

    it('should return true when reconnecting', () => {
      const store = useSyncStore();
      store.setStatus('reconnecting');
      expect(store.isConnecting).toBe(true);
    });

    it('should return false when connected', () => {
      const store = useSyncStore();
      store.setStatus('connected');
      expect(store.isConnecting).toBe(false);
    });

    it('should return false when disconnected', () => {
      const store = useSyncStore();
      expect(store.isConnecting).toBe(false);
    });

    it('should return false when authenticating', () => {
      const store = useSyncStore();
      store.setStatus('authenticating');
      // Note: authenticating is NOT considered "connecting" per the current implementation
      expect(store.isConnecting).toBe(false);
    });
  });

  describe('computed: hasError', () => {
    it('should return true when status is error and message exists', () => {
      const store = useSyncStore();
      store.setError('Connection failed');
      expect(store.hasError).toBe(true);
    });

    it('should return false when status is error but no message', () => {
      const store = useSyncStore();
      store.setStatus('error');
      // No error message set
      expect(store.hasError).toBe(false);
    });

    it('should return false when not in error state', () => {
      const store = useSyncStore();
      expect(store.hasError).toBe(false);
    });

    it('should return false after clearing error', () => {
      const store = useSyncStore();
      store.setError('Error');
      store.setStatus('connected');
      expect(store.hasError).toBe(false);
    });
  });

  describe('computed: statusMessage', () => {
    const statusMessages: Array<[SyncStatus, string]> = [
      ['disconnected', 'Disconnected'],
      ['connecting', 'Connecting...'],
      ['authenticating', 'Authenticating...'],
      ['connected', 'Connected'],
    ];

    it.each(statusMessages)('should return "%s" message for %s status', (status, expected) => {
      const store = useSyncStore();
      store.setStatus(status);
      expect(store.statusMessage).toBe(expected);
    });

    it('should include reconnect attempts in reconnecting message', () => {
      const store = useSyncStore();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      expect(store.statusMessage).toBe('Reconnecting (attempt 3)...');
    });

    it('should show error message when in error state', () => {
      const store = useSyncStore();
      store.setError('Custom error message');
      expect(store.statusMessage).toBe('Custom error message');
    });

    it('should show fallback for error with no message', () => {
      const store = useSyncStore();
      store.setStatus('error');
      expect(store.statusMessage).toBe('Connection error');
    });
  });

  describe('state transitions', () => {
    it('should handle typical connection flow', () => {
      const store = useSyncStore();

      // Initial state
      expect(store.status).toBe('disconnected');
      expect(store.isConnected).toBe(false);

      // Start connecting
      store.setStatus('connecting');
      expect(store.status).toBe('connecting');
      expect(store.isConnecting).toBe(true);

      // Authenticating
      store.setStatus('authenticating');
      expect(store.status).toBe('authenticating');

      // Connected
      store.setStatus('connected');
      expect(store.status).toBe('connected');
      expect(store.isConnected).toBe(true);
      expect(store.lastSyncAt).not.toBeNull();
    });

    it('should handle reconnection flow', () => {
      const store = useSyncStore();

      // Connected state
      store.setStatus('connected');
      expect(store.isConnected).toBe(true);

      // Connection lost
      store.incrementReconnectAttempts();
      expect(store.status).toBe('reconnecting');
      expect(store.reconnectAttempts).toBe(1);

      // More attempts
      store.incrementReconnectAttempts();
      store.incrementReconnectAttempts();
      expect(store.reconnectAttempts).toBe(3);

      // Reconnected
      store.setStatus('connected');
      expect(store.reconnectAttempts).toBe(0);
      expect(store.isConnected).toBe(true);
    });

    it('should handle error flow', () => {
      const store = useSyncStore();

      store.setStatus('connecting');
      store.setError('WebSocket connection failed');

      expect(store.status).toBe('error');
      expect(store.hasError).toBe(true);
      expect(store.statusMessage).toBe('WebSocket connection failed');
    });
  });
});
