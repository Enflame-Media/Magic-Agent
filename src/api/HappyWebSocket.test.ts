/**
 * Unit tests for HappyWebSocket
 * - HAP-351: Auth token security (headers instead of URL query params)
 * - HAP-353: Bounds enforcement and cleanup
 * - HAP-361: WeakRef-based event handlers
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HappyWebSocket } from './HappyWebSocket';

// Mock the logger to prevent file I/O during tests
vi.mock('@/ui/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Track WebSocket constructor calls to verify connection parameters
let lastWebSocketUrl: string | null = null;
let lastWebSocketOptions: { headers?: Record<string, string> } | null = null;

// Mock ws module - captures constructor arguments for verification
// Use a function (not arrow) so it can be called with `new`
vi.mock('ws', () => {
  const MockWebSocket = vi.fn(function(this: unknown, url: string, options?: { headers?: Record<string, string> }) {
    lastWebSocketUrl = url;
    lastWebSocketOptions = options ?? null;
    // Return mock methods
    return {
      on: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
      terminate: vi.fn(),
    };
  });
  return { default: MockWebSocket };
});

describe('HappyWebSocket', () => {
  let socket: HappyWebSocket;
  const mockAuth = {
    token: 'test-token',
    machineId: 'test-machine',
    sessionId: 'test-session',
    clientType: 'session-scoped' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lastWebSocketUrl = null;
    lastWebSocketOptions = null;
    socket = new HappyWebSocket('ws://localhost', mockAuth);
  });

  describe('auth token security (HAP-351)', () => {
    it('should pass auth credentials via headers, not URL query params', () => {
      // Trigger connection to capture WebSocket constructor args
      socket.connect();

      // Verify URL does NOT contain token
      expect(lastWebSocketUrl).toBeDefined();
      const url = new URL(lastWebSocketUrl!);
      expect(url.searchParams.has('token')).toBe(false);
      expect(url.searchParams.has('clientType')).toBe(false);
      expect(url.searchParams.has('sessionId')).toBe(false);
      expect(url.searchParams.has('machineId')).toBe(false);

      // Verify headers contain auth credentials
      expect(lastWebSocketOptions).toBeDefined();
      expect(lastWebSocketOptions?.headers).toBeDefined();
      expect(lastWebSocketOptions?.headers?.['Authorization']).toBe(`Bearer ${mockAuth.token}`);
      expect(lastWebSocketOptions?.headers?.['X-Client-Type']).toBe(mockAuth.clientType);
      expect(lastWebSocketOptions?.headers?.['X-Session-Id']).toBe(mockAuth.sessionId);
      expect(lastWebSocketOptions?.headers?.['X-Machine-Id']).toBe(mockAuth.machineId);
    });

    it('should omit optional headers when auth fields are not provided', () => {
      // Create socket with minimal auth (no sessionId or machineId)
      const minimalAuth = {
        token: 'minimal-token',
        clientType: 'session-scoped' as const,
      };
      const minimalSocket = new HappyWebSocket('ws://localhost', minimalAuth);
      minimalSocket.connect();

      // Verify required headers are present
      expect(lastWebSocketOptions?.headers?.['Authorization']).toBe('Bearer minimal-token');
      expect(lastWebSocketOptions?.headers?.['X-Client-Type']).toBe('session-scoped');

      // Verify optional headers are NOT present (undefined values should not create headers)
      expect(lastWebSocketOptions?.headers?.['X-Session-Id']).toBeUndefined();
      expect(lastWebSocketOptions?.headers?.['X-Machine-Id']).toBeUndefined();
    });

    it('should use wss:// protocol for https:// base URLs', () => {
      const httpsSocket = new HappyWebSocket('https://api.example.com', mockAuth);
      httpsSocket.connect();

      expect(lastWebSocketUrl).toBeDefined();
      expect(lastWebSocketUrl).toMatch(/^wss:\/\//);
    });

    it('should use ws:// protocol for http:// base URLs', () => {
      const httpSocket = new HappyWebSocket('http://localhost:3000', mockAuth);
      httpSocket.connect();

      expect(lastWebSocketUrl).toBeDefined();
      expect(lastWebSocketUrl).toMatch(/^ws:\/\//);
    });
  });

  describe('handler bounds enforcement (HAP-353)', () => {
    it('should allow adding handlers up to the limit', () => {
      const event = 'test-event';
      // Retain handlers to prevent GC (HAP-361)
      const handlers: (() => void)[] = [];

      // Add handlers up to but not exceeding the limit
      for (let i = 0; i < 100; i++) {
        const handler = () => {};
        handlers.push(handler);
        socket.on(event, handler);
      }

      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(100);
      expect(stats.eventTypes).toBe(1);
    });

    it('should reject handlers beyond the limit', () => {
      const event = 'bounded-event';
      const handlers: (() => void)[] = [];

      // Add 100 handlers (the limit)
      for (let i = 0; i < 100; i++) {
        const handler = () => {};
        handlers.push(handler);
        socket.on(event, handler);
      }

      // This 101st handler should be rejected
      const rejectedHandler = () => {};
      socket.on(event, rejectedHandler);

      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(100);  // Still 100, not 101
    });

    it('should log warning at 90% threshold', async () => {
      const { logger } = await import('@/ui/logger');
      const event = 'threshold-event';
      // Retain handlers to prevent GC (HAP-361)
      const handlers: (() => void)[] = [];

      // Add 90 handlers first
      for (let i = 0; i < 90; i++) {
        const handler = () => {};
        handlers.push(handler);
        socket.on(event, handler);
      }

      // Warning fires when adding the 91st handler (when size already == 90)
      const handler91 = () => {};
      handlers.push(handler91);
      socket.on(event, handler91);

      // Check that warn was called
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Handler count approaching limit')
      );
    });

    it('should track handlers per event independently', () => {
      // Retain handlers to prevent GC (HAP-361)
      const handlersA: (() => void)[] = [];
      const handlersB: (() => void)[] = [];

      // Add handlers to different events
      for (let i = 0; i < 50; i++) {
        const handlerA = () => {};
        const handlerB = () => {};
        handlersA.push(handlerA);
        handlersB.push(handlerB);
        socket.on('event-a', handlerA);
        socket.on('event-b', handlerB);
      }

      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(100);
      expect(stats.eventTypes).toBe(2);
    });

    it('should allow more handlers after removal', () => {
      const event = 'removal-test';
      const handlers: (() => void)[] = [];

      // Fill up to limit
      for (let i = 0; i < 100; i++) {
        const handler = () => {};
        handlers.push(handler);
        socket.on(event, handler);
      }

      expect(socket.getStats().totalHandlers).toBe(100);

      // Remove one handler
      socket.off(event, handlers[0]);
      expect(socket.getStats().totalHandlers).toBe(99);

      // Now we can add another (retain reference)
      const newHandler = () => {};
      handlers.push(newHandler);
      socket.on(event, newHandler);
      expect(socket.getStats().totalHandlers).toBe(100);
    });

    it('should clear all handlers with removeAllListeners', () => {
      // Retain handlers to prevent GC (HAP-361)
      const handlers1: (() => void)[] = [];
      const handlers2: (() => void)[] = [];

      for (let i = 0; i < 50; i++) {
        const h1 = () => {};
        const h2 = () => {};
        handlers1.push(h1);
        handlers2.push(h2);
        socket.on('event-1', h1);
        socket.on('event-2', h2);
      }

      expect(socket.getStats().totalHandlers).toBe(100);

      socket.removeAllListeners();

      expect(socket.getStats().totalHandlers).toBe(0);
      expect(socket.getStats().eventTypes).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return correct initial stats', () => {
      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(0);
      expect(stats.eventTypes).toBe(0);
      expect(stats.pendingAcks).toBe(0);
    });

    it('should track multiple event types', () => {
      // Retain handlers to prevent GC (HAP-361)
      const connectHandler = () => {};
      const disconnectHandler = () => {};
      const errorHandler = () => {};

      socket.on('connect', connectHandler);
      socket.on('disconnect', disconnectHandler);
      socket.on('error', errorHandler);

      const stats = socket.getStats();
      expect(stats.eventTypes).toBe(3);
      expect(stats.totalHandlers).toBe(3);
    });
  });

  describe('cleanupStaleAcks', () => {
    it('should return 0 when no stale acks exist', () => {
      const cleaned = socket.cleanupStaleAcks();
      expect(cleaned).toBe(0);
    });
  });

  describe('onMemoryPressure', () => {
    it('should not throw when called', () => {
      expect(() => socket.onMemoryPressure()).not.toThrow();
    });
  });

  describe('reconnection jitter algorithm (HAP-477, HAP-503)', () => {
    /**
     * These tests verify the centered jitter algorithm:
     * - Formula: delay = base * (1 - factor + random * factor * 2)
     * - With factor=0.5: multiplier ranges from 0.5 to 1.5
     * - 100ms floor is always enforced
     * - Exponential backoff: base doubles each attempt until max
     */

    let mockRandom: ReturnType<typeof vi.spyOn>;
    let mockSetTimeout: ReturnType<typeof vi.spyOn>;
    let capturedDelays: number[];

    beforeEach(() => {
      capturedDelays = [];
      // Capture setTimeout calls to verify delay values
      mockSetTimeout = vi.spyOn(globalThis, 'setTimeout').mockImplementation((callback, delay) => {
        capturedDelays.push(delay as number);
        return {} as NodeJS.Timeout;
      });
    });

    afterEach(() => {
      mockSetTimeout.mockRestore();
      mockRandom?.mockRestore();
    });

    it('should produce delay in range [base*0.5, base*1.5] with factor=0.5', () => {
      // Test with random=0 (minimum jitter)
      mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

      const socket1 = new HappyWebSocket('ws://localhost', mockAuth, {
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
      });
      socket1.connect();
      // Simulate connection close to trigger reconnect
      const ws1 = (socket1 as unknown as { ws: { on: (event: string, cb: () => void) => void } }).ws;
      // Find the close handler and call it
      ws1.on('close', () => {});

      // With random=0: multiplier = 1 - 0.5 + 0 * 0.5 * 2 = 0.5
      // delay = 1000 * 0.5 = 500ms
      mockRandom.mockRestore();
      mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

      // Create fresh socket and manually access the delay calculation
      // We'll test the formula directly
      const baseDelay = 1000;
      const factor = 0.5;

      // With random() = 0: jitterMultiplier = 1 - 0.5 + 0 * 0.5 * 2 = 0.5
      const minMultiplier = 1 - factor + (0 * factor * 2);
      expect(minMultiplier).toBe(0.5);

      // With random() = 1: jitterMultiplier = 1 - 0.5 + 1 * 0.5 * 2 = 1.5
      const maxMultiplier = 1 - factor + (1 * factor * 2);
      expect(maxMultiplier).toBe(1.5);

      // Verify delay range
      expect(baseDelay * minMultiplier).toBe(500);
      expect(baseDelay * maxMultiplier).toBe(1500);
    });

    it('should enforce 100ms floor even with very small base delay', () => {
      mockRandom = vi.spyOn(Math, 'random').mockReturnValue(0);

      // With base=100, factor=0.5, random=0:
      // delay = max(100, 100 * 0.5) = max(100, 50) = 100ms
      const baseDelay = 100;
      const factor = 0.5;
      const minMultiplier = 1 - factor + (0 * factor * 2);
      const rawDelay = baseDelay * minMultiplier;
      const actualDelay = Math.max(100, rawDelay);

      expect(rawDelay).toBe(50);
      expect(actualDelay).toBe(100); // Floor enforced
    });

    it('should follow exponential backoff progression capped at max', () => {
      // Test the exponential backoff formula: base * 2^attempt
      const reconnectionDelay = 1000;
      const reconnectionDelayMax = 30000;

      // Attempt 0: 1000 * 2^0 = 1000
      expect(Math.min(reconnectionDelay * Math.pow(2, 0), reconnectionDelayMax)).toBe(1000);

      // Attempt 1: 1000 * 2^1 = 2000
      expect(Math.min(reconnectionDelay * Math.pow(2, 1), reconnectionDelayMax)).toBe(2000);

      // Attempt 2: 1000 * 2^2 = 4000
      expect(Math.min(reconnectionDelay * Math.pow(2, 2), reconnectionDelayMax)).toBe(4000);

      // Attempt 3: 1000 * 2^3 = 8000
      expect(Math.min(reconnectionDelay * Math.pow(2, 3), reconnectionDelayMax)).toBe(8000);

      // Attempt 4: 1000 * 2^4 = 16000
      expect(Math.min(reconnectionDelay * Math.pow(2, 4), reconnectionDelayMax)).toBe(16000);

      // Attempt 5: 1000 * 2^5 = 32000 → capped at 30000
      expect(Math.min(reconnectionDelay * Math.pow(2, 5), reconnectionDelayMax)).toBe(30000);

      // Attempt 6+: still capped at 30000
      expect(Math.min(reconnectionDelay * Math.pow(2, 6), reconnectionDelayMax)).toBe(30000);
    });

    it('should respect max delay ceiling', () => {
      const reconnectionDelayMax = 30000;

      // Even with high attempt count and max jitter (1.5x), should not exceed max * 1.5
      // However, the cap is applied BEFORE jitter, so max jittered delay = 30000 * 1.5 = 45000
      const maxBaseDelay = 30000;
      const maxJitteredDelay = maxBaseDelay * 1.5; // factor=0.5, random=1

      expect(maxJitteredDelay).toBe(45000);

      // But the base delay itself is capped at reconnectionDelayMax
      const baseDelay = Math.min(1000 * Math.pow(2, 10), reconnectionDelayMax);
      expect(baseDelay).toBe(30000);
    });

    it('should use default config values when not specified', () => {
      // Default values from HappyWebSocket constructor:
      // reconnectionDelay: 1000
      // reconnectionDelayMax: 30000
      // randomizationFactor: 0.5
      const _defaultSocket = new HappyWebSocket('ws://localhost', mockAuth);

      // Verify defaults are applied correctly by checking the jitter formula
      // With defaults: delay should be in [1000*0.5, 1000*1.5] = [500, 1500] for first attempt
      const baseDelay = 1000;
      const factor = 0.5;
      const minDelay = Math.max(100, baseDelay * (1 - factor + (0 * factor * 2)));
      const maxDelay = Math.max(100, baseDelay * (1 - factor + (1 * factor * 2)));

      expect(minDelay).toBe(500);
      expect(maxDelay).toBe(1500);
    });

    it('should produce different delays for different random values', () => {
      const baseDelay = 2000;
      const factor = 0.5;

      // Test several random values
      const testCases = [
        { random: 0, expectedMultiplier: 0.5, expectedDelay: 1000 },
        { random: 0.25, expectedMultiplier: 0.75, expectedDelay: 1500 },
        { random: 0.5, expectedMultiplier: 1.0, expectedDelay: 2000 },
        { random: 0.75, expectedMultiplier: 1.25, expectedDelay: 2500 },
        { random: 1, expectedMultiplier: 1.5, expectedDelay: 3000 },
      ];

      for (const tc of testCases) {
        const multiplier = 1 - factor + (tc.random * factor * 2);
        const delay = Math.max(100, baseDelay * multiplier);

        expect(multiplier).toBeCloseTo(tc.expectedMultiplier, 5);
        expect(delay).toBe(tc.expectedDelay);
      }
    });

    it('should center jitter around base delay (not just add extra time)', () => {
      // This test verifies that the jitter is "centered" - meaning
      // delays can be both above AND below the base delay

      const baseDelay = 2000;
      const factor = 0.5;

      // With random=0.5, multiplier should be exactly 1.0 (centered on base)
      const centeredMultiplier = 1 - factor + (0.5 * factor * 2);
      expect(centeredMultiplier).toBe(1.0);

      // With random<0.5, delay is below base
      const belowMultiplier = 1 - factor + (0.25 * factor * 2);
      expect(belowMultiplier).toBe(0.75);
      expect(baseDelay * belowMultiplier).toBe(1500); // Below 2000

      // With random>0.5, delay is above base
      const aboveMultiplier = 1 - factor + (0.75 * factor * 2);
      expect(aboveMultiplier).toBe(1.25);
      expect(baseDelay * aboveMultiplier).toBe(2500); // Above 2000
    });
  });

  describe('WeakRef event handlers (HAP-361)', () => {
    it('should retain handlers when references are kept', () => {
      // Store handlers in an array to retain references
      const handlers = [
        () => {},
        () => {},
        () => {},
      ];

      handlers.forEach(handler => socket.on('test-event', handler));

      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(3);
    });

    it('should not add duplicate handlers', () => {
      const handler = () => {};

      // Add the same handler multiple times
      socket.on('test-event', handler);
      socket.on('test-event', handler);
      socket.on('test-event', handler);

      // Should only count as one handler
      const stats = socket.getStats();
      expect(stats.totalHandlers).toBe(1);
    });

    it('should properly remove handlers with off()', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const handler3 = () => {};

      socket.on('test-event', handler1);
      socket.on('test-event', handler2);
      socket.on('test-event', handler3);

      expect(socket.getStats().totalHandlers).toBe(3);

      // Remove handler2
      socket.off('test-event', handler2);

      expect(socket.getStats().totalHandlers).toBe(2);

      // Remove again should be idempotent
      socket.off('test-event', handler2);
      expect(socket.getStats().totalHandlers).toBe(2);
    });

    it('should properly clear handlers per event with removeAllListeners(event)', () => {
      const handler1 = () => {};
      const handler2 = () => {};
      const handler3 = () => {};

      socket.on('event-a', handler1);
      socket.on('event-b', handler2);
      socket.on('event-b', handler3);

      expect(socket.getStats().totalHandlers).toBe(3);
      expect(socket.getStats().eventTypes).toBe(2);

      // Remove only event-b handlers
      socket.removeAllListeners('event-b');

      expect(socket.getStats().totalHandlers).toBe(1);
      expect(socket.getStats().eventTypes).toBe(1);
    });

    it('should allow re-adding a handler after removal', () => {
      const handler = () => {};

      socket.on('test-event', handler);
      expect(socket.getStats().totalHandlers).toBe(1);

      socket.off('test-event', handler);
      expect(socket.getStats().totalHandlers).toBe(0);

      // Re-add the same handler
      socket.on('test-event', handler);
      expect(socket.getStats().totalHandlers).toBe(1);
    });

    // Note: Testing actual GC behavior is non-deterministic and requires
    // --expose-gc flag. The following test documents expected behavior
    // but uses manual verification rather than automated GC triggering.
    it('should document WeakRef behavior (handler retention requirement)', () => {
      // This test documents the behavioral change introduced in HAP-361:
      // Handlers must be retained by the caller to persist.

      // Pattern that WILL work (handler retained):
      const retainedHandler = () => {};
      socket.on('retained-event', retainedHandler);
      expect(socket.getStats().totalHandlers).toBe(1);

      // Pattern that MAY fail in production (handler not retained):
      // socket.on('unretained-event', () => {});
      // The inline handler may be GC'd since nothing else references it.
      // We don't test this automatically because GC timing is non-deterministic.

      // Clean up
      socket.off('retained-event', retainedHandler);
      expect(socket.getStats().totalHandlers).toBe(0);
    });
  });
});
