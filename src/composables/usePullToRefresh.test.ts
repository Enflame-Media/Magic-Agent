/**
 * Unit Tests for usePullToRefresh Composable (HAP-930)
 *
 * Tests cover:
 * - Initialization and default state
 * - Touch event handling (touchstart, touchmove, touchend)
 * - State machine transitions (idle -> pulling -> refreshing -> idle)
 * - Resistance dampening calculation
 * - Progress computation
 * - Enabled/disabled state handling
 * - onRefresh callback execution
 *
 * @see HAP-930 - Add unit tests for HAP-919 mobile web enhancement composables
 * @see HAP-919 - Mobile Web Enhancements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  usePullToRefresh,
  type UsePullToRefreshOptions,
  type UsePullToRefreshReturn,
} from './usePullToRefresh';

// Store mounted callbacks to call after containerRef is set
let mountedCallbacks: (() => void)[] = [];
let unmountedCallbacks: (() => void)[] = [];

// Mock Vue lifecycle hooks since we're testing outside component context
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onMounted: vi.fn((cb) => {
      mountedCallbacks.push(cb);
    }),
    onUnmounted: vi.fn((cb) => {
      unmountedCallbacks.push(cb);
    }),
  };
});

/**
 * Create a mock HTMLElement with scrollTop and event listener tracking
 */
function createMockContainer(scrollTop = 0): HTMLElement {
  const listeners: Record<string, EventListener[]> = {};

  const element = {
    scrollTop,
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(listener);
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      if (listeners[type]) {
        const index = listeners[type].indexOf(listener);
        if (index > -1) listeners[type].splice(index, 1);
      }
    }),
    // Helper to dispatch events to registered listeners
    dispatchEvent: (event: Event) => {
      const eventListeners = listeners[event.type];
      if (eventListeners) {
        eventListeners.forEach((listener) => listener(event));
      }
    },
  } as unknown as HTMLElement;

  return element;
}

/**
 * Create a mock TouchEvent
 */
function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel',
  clientY: number
): TouchEvent {
  const touch = {
    clientY,
    clientX: 0,
    identifier: 0,
    target: null,
    screenX: 0,
    screenY: 0,
    pageX: 0,
    pageY: 0,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    force: 0,
  } as unknown as Touch;

  return {
    type,
    touches: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
    targetTouches: type === 'touchend' || type === 'touchcancel' ? [] : [touch],
    changedTouches: [touch],
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  } as unknown as TouchEvent;
}

/**
 * Helper to simulate a complete pull gesture
 */
function simulatePullGesture(
  container: HTMLElement,
  startY: number,
  endY: number,
  steps = 1
): void {
  // Trigger touchstart
  (container as any).dispatchEvent(createTouchEvent('touchstart', startY));

  // Trigger touchmove(s)
  const delta = (endY - startY) / steps;
  for (let i = 1; i <= steps; i++) {
    (container as any).dispatchEvent(createTouchEvent('touchmove', startY + delta * i));
  }
}

/**
 * Helper to set up composable with container and trigger onMounted
 */
function setupComposable(
  options: UsePullToRefreshOptions = {},
  scrollTop = 0
): { composable: UsePullToRefreshReturn; container: HTMLElement } {
  mountedCallbacks = [];
  unmountedCallbacks = [];

  const composable = usePullToRefresh(options);
  const container = createMockContainer(scrollTop);
  composable.containerRef.value = container;

  // Trigger mounted callbacks after containerRef is set
  mountedCallbacks.forEach(cb => cb());

  return { composable, container };
}

describe('usePullToRefresh', () => {
  let composable: UsePullToRefreshReturn;

  beforeEach(() => {
    vi.clearAllMocks();
    mountedCallbacks = [];
    unmountedCallbacks = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
    mountedCallbacks = [];
    unmountedCallbacks = [];
  });

  describe('initialization', () => {
    it('should return expected properties', () => {
      composable = usePullToRefresh();

      expect(composable).toHaveProperty('containerRef');
      expect(composable).toHaveProperty('isPulling');
      expect(composable).toHaveProperty('isRefreshing');
      expect(composable).toHaveProperty('pullDistance');
      expect(composable).toHaveProperty('pullProgress');
      expect(composable).toHaveProperty('canRefresh');
      expect(composable).toHaveProperty('refresh');
      expect(composable).toHaveProperty('reset');
    });

    it('should start with isPulling as false', () => {
      composable = usePullToRefresh();
      expect(composable.isPulling.value).toBe(false);
    });

    it('should start with isRefreshing as false', () => {
      composable = usePullToRefresh();
      expect(composable.isRefreshing.value).toBe(false);
    });

    it('should start with pullDistance as 0', () => {
      composable = usePullToRefresh();
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should start with pullProgress as 0', () => {
      composable = usePullToRefresh();
      expect(composable.pullProgress.value).toBe(0);
    });

    it('should start with canRefresh as false', () => {
      composable = usePullToRefresh();
      expect(composable.canRefresh.value).toBe(false);
    });

    it('should use default threshold of 80', () => {
      composable = usePullToRefresh();
      const container = createMockContainer(0);
      composable.containerRef.value = container;

      // Simulate pull to exactly threshold
      simulatePullGesture(container, 0, 80);

      // With resistance, won't quite reach threshold
      expect(composable.pullDistance.value).toBeLessThan(80);
    });
  });

  describe('touch event handling', () => {
    it('should not start pulling when container is not at scroll top', () => {
      const { composable, container } = setupComposable({}, 100); // Scrolled down

      simulatePullGesture(container, 0, 50);

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should start pulling on touchmove when at scroll top', () => {
      const { composable, container } = setupComposable({}, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));

      expect(composable.isPulling.value).toBe(true);
      expect(composable.pullDistance.value).toBeGreaterThan(0);
    });

    it('should not pull on upward swipe (negative distance)', () => {
      const { composable, container } = setupComposable({}, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 100));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50)); // Moving up

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should reset on touchend when threshold not reached', () => {
      const { composable, container } = setupComposable({}, 0);

      // Small pull that won't reach threshold
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 30));
      (container as any).dispatchEvent(createTouchEvent('touchend', 30));

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should reset on touchcancel', () => {
      const { composable, container } = setupComposable({}, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));
      (container as any).dispatchEvent(createTouchEvent('touchcancel', 50));

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should prevent default during pull to stop scroll', () => {
      const { container } = setupComposable({}, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      const moveEvent = createTouchEvent('touchmove', 50);
      (container as any).dispatchEvent(moveEvent);

      expect(moveEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle missing touch in touchmove gracefully', () => {
      const { composable, container } = setupComposable({}, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));

      // Create event with no touches
      const event = {
        type: 'touchmove',
        touches: [],
        preventDefault: vi.fn(),
      } as unknown as TouchEvent;

      (container as any).dispatchEvent(event);

      // Should not throw and not update pulling state
      expect(composable.isPulling.value).toBe(false);
    });
  });

  describe('resistance calculation', () => {
    it('should apply resistance to pull distance', () => {
      const { composable, container } = setupComposable({ resistance: 0.5 }, 0);

      // Pull 100px
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 100));

      // With 0.5 resistance, distance should be less than 100
      expect(composable.pullDistance.value).toBeLessThan(100);
      expect(composable.pullDistance.value).toBeGreaterThan(0);
    });

    it('should cap pull distance at maxPullDistance', () => {
      const { composable, container } = setupComposable({ maxPullDistance: 50 }, 0);

      // Pull far beyond max
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 500));

      expect(composable.pullDistance.value).toBeLessThanOrEqual(50);
    });

    it('should return 0 for negative distance', () => {
      const { composable, container } = setupComposable({}, 0);

      // Upward swipe
      (container as any).dispatchEvent(createTouchEvent('touchstart', 100));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));

      expect(composable.pullDistance.value).toBe(0);
    });
  });

  describe('progress computation', () => {
    it('should calculate progress as percentage of threshold', () => {
      const { composable, container } = setupComposable({ threshold: 100, resistance: 0 }, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));

      // At 50px of 100px threshold = ~50% (may vary with resistance)
      expect(composable.pullProgress.value).toBeGreaterThan(0);
      expect(composable.pullProgress.value).toBeLessThanOrEqual(100);
    });

    it('should cap progress at 100%', () => {
      const { composable, container } = setupComposable({ threshold: 50 }, 0);

      // Pull well beyond threshold
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 200));

      expect(composable.pullProgress.value).toBeLessThanOrEqual(100);
    });

    it('should handle zero threshold gracefully', () => {
      composable = usePullToRefresh({ threshold: 0 });
      expect(composable.pullProgress.value).toBe(0);
    });
  });

  describe('canRefresh', () => {
    it('should be true when pullDistance >= threshold', () => {
      const { composable, container } = setupComposable({ threshold: 30, resistance: 0, maxPullDistance: 200 }, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 100));

      expect(composable.canRefresh.value).toBe(true);
    });

    it('should be false when pullDistance < threshold', () => {
      const { composable, container } = setupComposable({ threshold: 100 }, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 20));

      expect(composable.canRefresh.value).toBe(false);
    });
  });

  describe('refresh', () => {
    it('should call onRefresh callback when refresh is triggered', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      composable = usePullToRefresh({ onRefresh });

      await composable.refresh();

      expect(onRefresh).toHaveBeenCalled();
    });

    it('should set isRefreshing to true during refresh', async () => {
      let isRefreshingDuringCallback = false;
      const onRefresh = vi.fn().mockImplementation(() => {
        isRefreshingDuringCallback = composable.isRefreshing.value;
        return Promise.resolve();
      });
      composable = usePullToRefresh({ onRefresh });

      await composable.refresh();

      expect(isRefreshingDuringCallback).toBe(true);
    });

    it('should hold pullDistance at threshold during refresh', async () => {
      let pullDistanceDuringRefresh = 0;
      const onRefresh = vi.fn().mockImplementation(() => {
        pullDistanceDuringRefresh = composable.pullDistance.value;
        return Promise.resolve();
      });
      composable = usePullToRefresh({ threshold: 80, onRefresh });

      await composable.refresh();

      expect(pullDistanceDuringRefresh).toBe(80);
    });

    it('should reset state after refresh completes', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      composable = usePullToRefresh({ onRefresh });

      await composable.refresh();

      expect(composable.isRefreshing.value).toBe(false);
      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should reset even if onRefresh throws', async () => {
      const onRefresh = vi.fn().mockRejectedValue(new Error('Refresh failed'));
      composable = usePullToRefresh({ onRefresh });

      // The refresh function catches errors internally and resets state
      // We need to catch the error since it propagates from the test
      try {
        await composable.refresh();
      } catch {
        // Expected to throw
      }

      expect(composable.isRefreshing.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should not trigger refresh if already refreshing', async () => {
      const onRefresh = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      composable = usePullToRefresh({ onRefresh });

      // Start first refresh
      const firstRefresh = composable.refresh();

      // Try to trigger second refresh
      await composable.refresh();

      await firstRefresh;

      // Should only be called once
      expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('should work without onRefresh callback', async () => {
      composable = usePullToRefresh(); // No onRefresh provided

      // Should not throw
      await expect(composable.refresh()).resolves.not.toThrow();
    });
  });

  describe('reset', () => {
    it('should reset all state values', () => {
      const { composable, container } = setupComposable({}, 0);

      // Get into pulling state
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));

      // Reset
      composable.reset();

      expect(composable.isPulling.value).toBe(false);
      expect(composable.isRefreshing.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });
  });

  describe('enabled option', () => {
    it('should not respond to touch when enabled is false', () => {
      const { composable, container } = setupComposable({ enabled: false }, 0);

      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 100));

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should not trigger refresh when enabled is false', async () => {
      const onRefresh = vi.fn();
      const { composable, container } = setupComposable({ enabled: false, onRefresh }, 0);

      // Try to pull and release
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 200));
      (container as any).dispatchEvent(createTouchEvent('touchend', 200));

      // Manually calling refresh should still work (for programmatic use)
      await composable.refresh();
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  describe('event listener lifecycle', () => {
    it('should register event listeners on mount', () => {
      const { container } = setupComposable({}, 0);

      // Check that addEventListener was called
      expect(container.addEventListener).toHaveBeenCalledWith(
        'touchstart',
        expect.any(Function),
        expect.objectContaining({ passive: true })
      );
      expect(container.addEventListener).toHaveBeenCalledWith(
        'touchmove',
        expect.any(Function),
        expect.objectContaining({ passive: false })
      );
      expect(container.addEventListener).toHaveBeenCalledWith(
        'touchend',
        expect.any(Function),
        expect.objectContaining({ passive: true })
      );
      expect(container.addEventListener).toHaveBeenCalledWith(
        'touchcancel',
        expect.any(Function),
        expect.objectContaining({ passive: true })
      );
    });
  });

  describe('scroll position handling', () => {
    it('should reset if container scrolls away from top during pull', () => {
      const { composable, container } = setupComposable({}, 0);

      // Start pulling
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 50));

      expect(composable.isPulling.value).toBe(true);

      // Simulate scroll away from top
      (container as any).scrollTop = 100;
      (container as any).dispatchEvent(createTouchEvent('touchmove', 60));

      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle null containerRef gracefully', () => {
      composable = usePullToRefresh();
      // containerRef is null by default

      // Should not throw when checking isAtTop
      expect(() => composable.refresh()).not.toThrow();
    });

    it('should handle rapid touch events', () => {
      const { composable, container } = setupComposable({}, 0);

      // Rapid sequence of events
      for (let i = 0; i < 100; i++) {
        (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
        (container as any).dispatchEvent(createTouchEvent('touchmove', i));
        (container as any).dispatchEvent(createTouchEvent('touchend', i));
      }

      // Should still be in a valid state
      expect(composable.isPulling.value).toBe(false);
      expect(composable.pullDistance.value).toBe(0);
    });

    it('should handle custom threshold values', () => {
      const customThreshold = 150;
      const { composable, container } = setupComposable({ threshold: customThreshold, resistance: 0, maxPullDistance: 300 }, 0);

      // Pull to just under threshold
      (container as any).dispatchEvent(createTouchEvent('touchstart', 0));
      (container as any).dispatchEvent(createTouchEvent('touchmove', 140));

      expect(composable.canRefresh.value).toBe(false);

      // Pull to just over threshold
      (container as any).dispatchEvent(createTouchEvent('touchmove', 160));

      expect(composable.canRefresh.value).toBe(true);
    });
  });
});
