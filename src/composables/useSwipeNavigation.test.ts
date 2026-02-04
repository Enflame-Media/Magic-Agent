/**
 * Unit Tests for useSwipeNavigation Composable (HAP-930)
 *
 * Tests cover:
 * - Initialization and default state
 * - Swipe direction detection
 * - Navigation callbacks (back/forward)
 * - Route guards (canNavigate)
 * - Route-based enable/disable logic
 * - SWIPE_DISABLED_ROUTES configuration
 * - shouldEnableSwipeForRoute helper function
 *
 * @see HAP-930 - Add unit tests for HAP-919 mobile web enhancement composables
 * @see HAP-919 - Mobile Web Enhancements
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, type Ref } from 'vue';
import type { UseSwipeDirection } from '@vueuse/core';
import type { RouteLocationNormalized, Router } from 'vue-router';

// Track useSwipe callback for triggering swipes in tests
let onSwipeEndCallback: ((e: TouchEvent, direction: UseSwipeDirection) => void) | undefined;
let mockLengthX: Ref<number>;
let mockLengthY: Ref<number>;

// Mock @vueuse/core's useSwipe
vi.mock('@vueuse/core', () => ({
  useSwipe: vi.fn((_target, options) => {
    onSwipeEndCallback = options?.onSwipeEnd;
    mockLengthX = ref(0);
    mockLengthY = ref(0);

    return {
      isSwiping: ref(false),
      direction: ref<UseSwipeDirection>('none'),
      lengthX: mockLengthX,
      lengthY: mockLengthY,
      stop: vi.fn(),
    };
  }),
}));

// Mock vue-router
const mockBack = vi.fn();
const mockForward = vi.fn();
const mockCurrentRoute = ref({
  name: 'home',
  path: '/',
  fullPath: '/',
  hash: '',
  query: {},
  params: {},
  matched: [],
  meta: {},
  redirectedFrom: undefined,
} as unknown as RouteLocationNormalized);

vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    back: mockBack,
    forward: mockForward,
    currentRoute: mockCurrentRoute,
  })),
}));

// Mock Vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    onUnmounted: vi.fn(),
  };
});

// Import after mocks are set up
import {
  useSwipeNavigation,
  shouldEnableSwipeForRoute,
  SWIPE_DISABLED_ROUTES,
  type UseSwipeNavigationOptions,
  type UseSwipeNavigationReturn,
} from './useSwipeNavigation';

/**
 * Helper to simulate a swipe gesture
 */
function simulateSwipe(
  direction: UseSwipeDirection,
  lengthX: number,
  lengthY: number = 0
): void {
  if (mockLengthX && mockLengthY) {
    mockLengthX.value = lengthX;
    mockLengthY.value = lengthY;
  }

  if (onSwipeEndCallback) {
    onSwipeEndCallback({} as TouchEvent, direction);
  }
}

describe('useSwipeNavigation', () => {
  let composable: UseSwipeNavigationReturn;

  beforeEach(() => {
    vi.clearAllMocks();
    onSwipeEndCallback = undefined;
    mockCurrentRoute.value = {
      name: 'home',
      path: '/',
      fullPath: '/',
      hash: '',
      query: {},
      params: {},
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as unknown as RouteLocationNormalized;

    // Mock window.history.length
    Object.defineProperty(window, 'history', {
      value: { length: 2 },
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return expected properties', () => {
      composable = useSwipeNavigation();

      expect(composable).toHaveProperty('containerRef');
      expect(composable).toHaveProperty('isSwiping');
      expect(composable).toHaveProperty('direction');
      expect(composable).toHaveProperty('swipeDistanceX');
      expect(composable).toHaveProperty('swipeDistanceY');
      expect(composable).toHaveProperty('stop');
    });

    it('should start with isSwiping as false', () => {
      composable = useSwipeNavigation();
      expect(composable.isSwiping.value).toBe(false);
    });

    it('should start with direction as none', () => {
      composable = useSwipeNavigation();
      expect(composable.direction.value).toBe('none');
    });

    it('should start with swipeDistanceX as 0', () => {
      composable = useSwipeNavigation();
      expect(composable.swipeDistanceX.value).toBe(0);
    });

    it('should start with swipeDistanceY as 0', () => {
      composable = useSwipeNavigation();
      expect(composable.swipeDistanceY.value).toBe(0);
    });
  });

  describe('swipe right (back navigation)', () => {
    it('should call router.back on swipe right', () => {
      composable = useSwipeNavigation();

      simulateSwipe('right', 100, 0);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should call onNavigate with "back" on swipe right', () => {
      const onNavigate = vi.fn();
      composable = useSwipeNavigation({ onNavigate });

      simulateSwipe('right', 100, 0);

      expect(onNavigate).toHaveBeenCalledWith('back');
    });

    it('should not navigate back when enableBack is false', () => {
      composable = useSwipeNavigation({ enableBack: false });

      simulateSwipe('right', 100, 0);

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should not navigate back when history length is 1', () => {
      Object.defineProperty(window, 'history', {
        value: { length: 1 },
        writable: true,
      });

      composable = useSwipeNavigation();

      simulateSwipe('right', 100, 0);

      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('swipe left (forward navigation)', () => {
    it('should call router.forward on swipe left', () => {
      composable = useSwipeNavigation();

      simulateSwipe('left', -100, 0);

      expect(mockForward).toHaveBeenCalled();
    });

    it('should call onNavigate with "forward" on swipe left', () => {
      const onNavigate = vi.fn();
      composable = useSwipeNavigation({ onNavigate });

      simulateSwipe('left', -100, 0);

      expect(onNavigate).toHaveBeenCalledWith('forward');
    });

    it('should not navigate forward when enableForward is false', () => {
      composable = useSwipeNavigation({ enableForward: false });

      simulateSwipe('left', -100, 0);

      expect(mockForward).not.toHaveBeenCalled();
    });
  });

  describe('swipe threshold', () => {
    it('should not navigate when swipe distance is below threshold', () => {
      composable = useSwipeNavigation({ threshold: 100 });

      simulateSwipe('right', 50, 0);

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should navigate when swipe distance meets threshold', () => {
      composable = useSwipeNavigation({ threshold: 50 });

      simulateSwipe('right', 100, 0);

      expect(mockBack).toHaveBeenCalled();
    });

    it('should use default threshold of 50', () => {
      composable = useSwipeNavigation();

      // Just under default threshold
      simulateSwipe('right', 40, 0);

      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  describe('vertical swipe detection', () => {
    it('should not navigate on primarily vertical swipe', () => {
      composable = useSwipeNavigation();

      // Vertical swipe is dominant (absY > absX * 0.5)
      simulateSwipe('right', 50, 100);

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should navigate when horizontal swipe is dominant', () => {
      composable = useSwipeNavigation();

      // Horizontal swipe is dominant
      simulateSwipe('right', 100, 20);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('enabled option', () => {
    it('should not navigate when enabled is false', () => {
      composable = useSwipeNavigation({ enabled: false });

      simulateSwipe('right', 100, 0);

      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should navigate when enabled is true', () => {
      composable = useSwipeNavigation({ enabled: true });

      simulateSwipe('right', 100, 0);

      expect(mockBack).toHaveBeenCalled();
    });
  });

  describe('canNavigate guard', () => {
    it('should respect canNavigate returning false for back', () => {
      const canNavigate = vi.fn().mockReturnValue(false);
      composable = useSwipeNavigation({ canNavigate });

      simulateSwipe('right', 100, 0);

      expect(canNavigate).toHaveBeenCalledWith('back', mockCurrentRoute.value);
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('should respect canNavigate returning true for back', () => {
      const canNavigate = vi.fn().mockReturnValue(true);
      composable = useSwipeNavigation({ canNavigate });

      simulateSwipe('right', 100, 0);

      expect(canNavigate).toHaveBeenCalledWith('back', mockCurrentRoute.value);
      expect(mockBack).toHaveBeenCalled();
    });

    it('should respect canNavigate returning false for forward', () => {
      const canNavigate = vi.fn().mockReturnValue(false);
      composable = useSwipeNavigation({ canNavigate });

      simulateSwipe('left', -100, 0);

      expect(canNavigate).toHaveBeenCalledWith('forward', mockCurrentRoute.value);
      expect(mockForward).not.toHaveBeenCalled();
    });

    it('should respect canNavigate returning true for forward', () => {
      const canNavigate = vi.fn().mockReturnValue(true);
      composable = useSwipeNavigation({ canNavigate });

      simulateSwipe('left', -100, 0);

      expect(canNavigate).toHaveBeenCalledWith('forward', mockCurrentRoute.value);
      expect(mockForward).toHaveBeenCalled();
    });

    it('should pass current route to canNavigate', () => {
      const canNavigate = vi.fn().mockReturnValue(true);
      mockCurrentRoute.value = {
        name: 'settings',
        path: '/settings',
        fullPath: '/settings',
        hash: '',
        query: {},
        params: {},
        matched: [],
        meta: {},
        redirectedFrom: undefined,
      } as unknown as RouteLocationNormalized;

      composable = useSwipeNavigation({ canNavigate });

      simulateSwipe('right', 100, 0);

      expect(canNavigate).toHaveBeenCalledWith(
        'back',
        expect.objectContaining({ name: 'settings', path: '/settings' })
      );
    });
  });

  describe('swipe distance sync', () => {
    it('should sync swipeDistanceX with lengthX', async () => {
      composable = useSwipeNavigation();

      if (mockLengthX) {
        mockLengthX.value = 75;
      }

      // Wait for watch to trigger
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(composable.swipeDistanceX.value).toBe(75);
    });

    it('should sync swipeDistanceY with lengthY', async () => {
      composable = useSwipeNavigation();

      if (mockLengthY) {
        mockLengthY.value = 50;
      }

      // Wait for watch to trigger
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(composable.swipeDistanceY.value).toBe(50);
    });
  });

  describe('stop function', () => {
    it('should expose stop function from useSwipe', () => {
      composable = useSwipeNavigation();

      expect(typeof composable.stop).toBe('function');
    });
  });
});

describe('SWIPE_DISABLED_ROUTES', () => {
  it('should include session route', () => {
    expect(SWIPE_DISABLED_ROUTES).toContain('session');
  });

  it('should include artifacts route', () => {
    expect(SWIPE_DISABLED_ROUTES).toContain('artifacts');
  });

  it('should be an array', () => {
    expect(Array.isArray(SWIPE_DISABLED_ROUTES)).toBe(true);
  });
});

describe('shouldEnableSwipeForRoute', () => {
  it('should return true for null route name', () => {
    expect(shouldEnableSwipeForRoute(null)).toBe(true);
  });

  it('should return true for undefined route name', () => {
    expect(shouldEnableSwipeForRoute(undefined)).toBe(true);
  });

  it('should return true for non-disabled routes', () => {
    expect(shouldEnableSwipeForRoute('home')).toBe(true);
    expect(shouldEnableSwipeForRoute('settings')).toBe(true);
    expect(shouldEnableSwipeForRoute('profile')).toBe(true);
  });

  it('should return false for session route', () => {
    expect(shouldEnableSwipeForRoute('session')).toBe(false);
  });

  it('should return false for artifacts route', () => {
    expect(shouldEnableSwipeForRoute('artifacts')).toBe(false);
  });

  it('should handle Symbol route names', () => {
    const symbolRoute = Symbol('custom-route');
    expect(shouldEnableSwipeForRoute(symbolRoute)).toBe(true);
  });

  it('should handle Symbol that converts to disabled route name', () => {
    // When Symbol.toString() is called, it returns 'Symbol(name)'
    // So this should not match 'session'
    const symbolRoute = Symbol('session');
    expect(shouldEnableSwipeForRoute(symbolRoute)).toBe(true);
  });
});
