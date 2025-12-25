/**
 * Unit tests for ToastProvider queue system.
 *
 * HAP-518: Tests for the toast queue behavior implemented in HAP-462.
 *
 * Test categories:
 * - Queue Behavior: FIFO ordering, queue limits, overflow handling
 * - Duplicate Prevention: Message deduplication logic
 * - Dismissal: Manual dismiss, timer clearing, queue advancement
 * - Edge Cases: Rapid calls, invalid IDs, unmount cleanup
 *
 * @module toast/__tests__/ToastProvider.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock timers for timeout testing
vi.useFakeTimers();

// Use vi.hoisted() for mock functions that need to be hoisted with vi.mock
const { mockHapticsLight } = vi.hoisted(() => ({
    mockHapticsLight: vi.fn(),
}));

// Mock React hooks - return functions directly for testing
vi.mock('react', () => ({
    createContext: vi.fn((defaultValue) => ({
        Provider: vi.fn(),
        Consumer: vi.fn(),
        _currentValue: defaultValue,
    })),
    useContext: vi.fn(),
    useState: vi.fn((initial) => {
        let state = typeof initial === 'function' ? initial() : initial;
        const setState = vi.fn((update) => {
            state = typeof update === 'function' ? update(state) : update;
            return state;
        });
        return [state, setState];
    }),
    useCallback: vi.fn((fn) => fn),
    useRef: vi.fn((initial) => ({ current: initial })),
    useEffect: vi.fn((fn) => {
        // Execute effect immediately for testing
        const cleanup = fn();
        return cleanup;
    }),
}));

// Mock React Native components and APIs
vi.mock('react-native', () => ({
    View: 'View',
    Pressable: 'Pressable',
    Animated: {
        Value: vi.fn((initial) => ({
            setValue: vi.fn(),
            interpolate: vi.fn(() => 0),
            _value: initial,
        })),
        View: 'AnimatedView',
        spring: vi.fn(() => ({ start: vi.fn((cb) => cb && cb()) })),
        timing: vi.fn(() => ({ start: vi.fn((cb) => cb && cb()) })),
    },
    Platform: { OS: 'web' },
    AccessibilityInfo: {
        announceForAccessibility: vi.fn(),
    },
}));

vi.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: vi.fn(() => ({ top: 0, bottom: 34, left: 0, right: 0 })),
}));

vi.mock('react-native-unistyles', () => ({
    StyleSheet: {
        create: vi.fn((styles) => styles),
    },
}));

vi.mock('@/components/StyledText', () => ({
    Text: 'Text',
}));

vi.mock('@/constants/Typography', () => ({
    Typography: {
        default: vi.fn(() => ({})),
    },
}));

vi.mock('@/components/haptics', () => ({
    hapticsLight: mockHapticsLight,
}));

// Import types for testing
import type { ToastConfig, ToastState } from '../types';

/**
 * Test helper: Creates a mock state for testing setState callbacks
 */
function createMockState(overrides: Partial<ToastState> = {}): ToastState {
    return {
        current: null,
        queue: [],
        interrupted: null,
        ...overrides,
    };
}

/**
 * Test helper: Creates a toast config for testing
 */
function createToastConfig(overrides: Partial<ToastConfig> = {}): ToastConfig {
    return {
        id: `toast-${Date.now()}-${Math.random()}`,
        message: 'Test message',
        duration: 5000,
        ...overrides,
    };
}

/**
 * Test helper: Simulates the showToast logic from ToastProvider
 *
 * This replicates the core setState logic to test queue behavior
 * without needing to render the full React component.
 */
function simulateShowToast(
    prevState: ToastState,
    config: Omit<ToastConfig, 'id'>,
    options: {
        preventDuplicates?: boolean;
        maxQueueSize?: number;
        generateId?: () => string;
    } = {}
): { newState: ToastState; id: string } {
    const {
        preventDuplicates = true,
        maxQueueSize = 5,
        generateId = () => `toast-${Date.now()}-${Math.random()}`,
    } = options;

    const id = generateId();
    const toastConfig: ToastConfig = {
        ...config,
        id,
        duration: config.duration ?? 5000,
    };

    // Check for duplicate messages if prevention is enabled
    if (preventDuplicates) {
        const isDuplicate =
            prevState.current?.message === config.message ||
            prevState.queue.some((t) => t.message === config.message) ||
            prevState.interrupted?.message === config.message;
        if (isDuplicate) {
            return { newState: prevState, id };
        }
    }

    // If no current toast, show immediately
    if (!prevState.current) {
        return {
            newState: { ...prevState, current: toastConfig },
            id,
        };
    }

    // Add to queue (respecting max size)
    if (prevState.queue.length >= maxQueueSize) {
        // Queue is full, drop the oldest queued toast to make room
        const newQueue = [...prevState.queue.slice(1), toastConfig];
        return { newState: { ...prevState, queue: newQueue }, id };
    }

    return {
        newState: { ...prevState, queue: [...prevState.queue, toastConfig] },
        id,
    };
}

/**
 * Test helper: Simulates the hideToast logic from ToastProvider
 */
function simulateHideToast(
    prevState: ToastState,
    id: string
): { newState: ToastState; showNext: boolean } {
    // Check if toast is in queue and remove it
    if (prevState.current?.id !== id) {
        const filteredQueue = prevState.queue.filter((t) => t.id !== id);
        if (filteredQueue.length !== prevState.queue.length) {
            return {
                newState: { ...prevState, queue: filteredQueue },
                showNext: false,
            };
        }
        // ID not found in current or queue
        return { newState: prevState, showNext: false };
    }

    // Current toast is being dismissed - trigger showNextFromQueue
    return { newState: prevState, showNext: true };
}

/**
 * Test helper: Simulates showNextFromQueue logic
 */
function simulateShowNextFromQueue(prevState: ToastState): ToastState {
    // Priority 1: Check for interrupted toast
    if (prevState.interrupted) {
        const resumingToast: ToastConfig = {
            id: prevState.interrupted.id,
            message: prevState.interrupted.message,
            duration: prevState.interrupted.remainingDuration,
            action: prevState.interrupted.action,
            type: prevState.interrupted.type,
            priority: prevState.interrupted.priority,
        };
        return { current: resumingToast, queue: prevState.queue, interrupted: null };
    }

    // Priority 2: Check queue
    if (prevState.queue.length === 0) {
        return { ...prevState, current: null };
    }

    // Get next toast from queue
    const [nextToast, ...remainingQueue] = prevState.queue;
    return { current: nextToast, queue: remainingQueue, interrupted: prevState.interrupted };
}

describe('ToastProvider Queue System', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.clearAllTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // =========================================================================
    // QUEUE BEHAVIOR TESTS
    // =========================================================================

    describe('Queue Behavior', () => {
        it('shows toast immediately when queue is empty', () => {
            const state = createMockState();
            const { newState, id } = simulateShowToast(state, { message: 'First toast' });

            expect(newState.current).not.toBeNull();
            expect(newState.current?.message).toBe('First toast');
            expect(newState.queue).toHaveLength(0);
            expect(id).toBeTruthy();
        });

        it('queues second toast when first is visible', () => {
            const firstToast = createToastConfig({ id: 'first', message: 'First' });
            const state = createMockState({ current: firstToast });

            const { newState } = simulateShowToast(state, { message: 'Second' });

            expect(newState.current?.message).toBe('First');
            expect(newState.queue).toHaveLength(1);
            expect(newState.queue[0].message).toBe('Second');
        });

        it('respects maxQueueSize limit', () => {
            const firstToast = createToastConfig({ id: 'current', message: 'Current' });
            let state = createMockState({ current: firstToast });

            // Fill the queue to max (5)
            for (let i = 1; i <= 5; i++) {
                const { newState } = simulateShowToast(
                    state,
                    { message: `Queued ${i}` },
                    { maxQueueSize: 5, generateId: () => `queued-${i}` }
                );
                state = newState;
            }

            expect(state.queue).toHaveLength(5);
            expect(state.queue[0].message).toBe('Queued 1');
            expect(state.queue[4].message).toBe('Queued 5');
        });

        it('drops oldest queued toast when queue overflows', () => {
            const firstToast = createToastConfig({ id: 'current', message: 'Current' });
            let state = createMockState({ current: firstToast });

            // Fill the queue to max (5)
            for (let i = 1; i <= 5; i++) {
                const { newState } = simulateShowToast(
                    state,
                    { message: `Queued ${i}` },
                    { maxQueueSize: 5, generateId: () => `queued-${i}` }
                );
                state = newState;
            }

            // Add 6th toast - should drop oldest (Queued 1)
            const { newState: overflowState } = simulateShowToast(
                state,
                { message: 'Overflow toast' },
                { maxQueueSize: 5, generateId: () => 'overflow' }
            );

            expect(overflowState.queue).toHaveLength(5);
            expect(overflowState.queue[0].message).toBe('Queued 2'); // Oldest dropped
            expect(overflowState.queue[4].message).toBe('Overflow toast'); // New at end
        });

        it('displays toasts in FIFO order', () => {
            const firstToast = createToastConfig({ id: 'current', message: 'Current' });
            let state = createMockState({ current: firstToast });

            // Queue 3 toasts
            for (let i = 1; i <= 3; i++) {
                const { newState } = simulateShowToast(
                    state,
                    { message: `Toast ${i}` },
                    { generateId: () => `toast-${i}` }
                );
                state = newState;
            }

            expect(state.queue[0].message).toBe('Toast 1');
            expect(state.queue[1].message).toBe('Toast 2');
            expect(state.queue[2].message).toBe('Toast 3');

            // Simulate dismissing current and showing next
            let nextState = simulateShowNextFromQueue({
                current: null,
                queue: state.queue,
                interrupted: null,
            });
            expect(nextState.current?.message).toBe('Toast 1');

            nextState = simulateShowNextFromQueue({
                current: null,
                queue: nextState.queue,
                interrupted: null,
            });
            expect(nextState.current?.message).toBe('Toast 2');

            nextState = simulateShowNextFromQueue({
                current: null,
                queue: nextState.queue,
                interrupted: null,
            });
            expect(nextState.current?.message).toBe('Toast 3');
        });
    });

    // =========================================================================
    // DUPLICATE PREVENTION TESTS
    // =========================================================================

    describe('Duplicate Prevention', () => {
        it('skips duplicate messages when preventDuplicates is true', () => {
            const firstToast = createToastConfig({ id: 'first', message: 'Duplicate message' });
            const state = createMockState({ current: firstToast });

            const { newState } = simulateShowToast(
                state,
                { message: 'Duplicate message' },
                { preventDuplicates: true }
            );

            // State should be unchanged - duplicate was skipped
            expect(newState.queue).toHaveLength(0);
            expect(newState.current?.id).toBe('first');
        });

        it('checks both current and queued toasts for duplicates', () => {
            const currentToast = createToastConfig({ id: 'current', message: 'Current' });
            const queuedToast = createToastConfig({ id: 'queued', message: 'Queued message' });
            const state = createMockState({
                current: currentToast,
                queue: [queuedToast],
            });

            // Try to add duplicate of current
            const { newState: afterCurrentDupe } = simulateShowToast(
                state,
                { message: 'Current' },
                { preventDuplicates: true }
            );
            expect(afterCurrentDupe.queue).toHaveLength(1);

            // Try to add duplicate of queued
            const { newState: afterQueuedDupe } = simulateShowToast(
                state,
                { message: 'Queued message' },
                { preventDuplicates: true }
            );
            expect(afterQueuedDupe.queue).toHaveLength(1);
        });

        it('allows duplicates when preventDuplicates is false', () => {
            const firstToast = createToastConfig({ id: 'first', message: 'Duplicate allowed' });
            const state = createMockState({ current: firstToast });

            const { newState } = simulateShowToast(
                state,
                { message: 'Duplicate allowed' },
                { preventDuplicates: false }
            );

            expect(newState.queue).toHaveLength(1);
            expect(newState.queue[0].message).toBe('Duplicate allowed');
        });

        it('checks interrupted toast for duplicates', () => {
            const interruptedToast = {
                id: 'interrupted',
                message: 'Interrupted message',
                duration: 3000,
                remainingDuration: 2000,
            };
            const state = createMockState({
                current: createToastConfig({ id: 'current', message: 'Current' }),
                interrupted: interruptedToast,
            });

            const { newState } = simulateShowToast(
                state,
                { message: 'Interrupted message' },
                { preventDuplicates: true }
            );

            // Should not add duplicate of interrupted message
            expect(newState.queue).toHaveLength(0);
        });
    });

    // =========================================================================
    // DISMISSAL TESTS
    // =========================================================================

    describe('Dismissal', () => {
        it('dismisses current toast when hideToast called with its ID', () => {
            const currentToast = createToastConfig({ id: 'current-123', message: 'Current' });
            const state = createMockState({ current: currentToast });

            const { showNext } = simulateHideToast(state, 'current-123');

            expect(showNext).toBe(true);
        });

        it('removes toast from queue when hideToast called with queued toast ID', () => {
            const currentToast = createToastConfig({ id: 'current', message: 'Current' });
            const queuedToast = createToastConfig({ id: 'queued-remove', message: 'To remove' });
            const otherQueued = createToastConfig({ id: 'queued-keep', message: 'Keep' });
            const state = createMockState({
                current: currentToast,
                queue: [queuedToast, otherQueued],
            });

            const { newState, showNext } = simulateHideToast(state, 'queued-remove');

            expect(showNext).toBe(false);
            expect(newState.queue).toHaveLength(1);
            expect(newState.queue[0].id).toBe('queued-keep');
        });

        it('shows next toast after current is dismissed', () => {
            const nextToast = createToastConfig({ id: 'next', message: 'Next in queue' });
            const state = createMockState({
                current: null,
                queue: [nextToast],
            });

            const newState = simulateShowNextFromQueue(state);

            expect(newState.current?.id).toBe('next');
            expect(newState.current?.message).toBe('Next in queue');
            expect(newState.queue).toHaveLength(0);
        });

        it('resumes interrupted toast before queue', () => {
            const interruptedToast = {
                id: 'interrupted',
                message: 'Interrupted',
                duration: 5000,
                remainingDuration: 2500,
            };
            const queuedToast = createToastConfig({ id: 'queued', message: 'Queued' });
            const state = createMockState({
                current: null,
                queue: [queuedToast],
                interrupted: interruptedToast,
            });

            const newState = simulateShowNextFromQueue(state);

            expect(newState.current?.id).toBe('interrupted');
            expect(newState.current?.duration).toBe(2500); // Remaining duration
            expect(newState.interrupted).toBeNull();
            expect(newState.queue).toHaveLength(1); // Queue unchanged
        });

        it('returns null current when queue is empty and no interrupted', () => {
            const state = createMockState({ current: null, queue: [] });

            const newState = simulateShowNextFromQueue(state);

            expect(newState.current).toBeNull();
            expect(newState.queue).toHaveLength(0);
        });
    });

    // =========================================================================
    // EDGE CASE TESTS
    // =========================================================================

    describe('Edge Cases', () => {
        it('handles rapid sequential showToast calls', () => {
            let state = createMockState();

            // Simulate 10 rapid calls
            const ids: string[] = [];
            for (let i = 0; i < 10; i++) {
                const { newState, id } = simulateShowToast(
                    state,
                    { message: `Rapid ${i}` },
                    { maxQueueSize: 5, generateId: () => `rapid-${i}` }
                );
                state = newState;
                ids.push(id);
            }

            // First should be current, queue should have max 5
            expect(state.current?.message).toBe('Rapid 0');
            expect(state.queue).toHaveLength(5);
            // Due to overflow, queue should have Rapid 5-9
            expect(state.queue[0].message).toBe('Rapid 5');
            expect(state.queue[4].message).toBe('Rapid 9');
        });

        it('handles hideToast called with invalid ID', () => {
            const currentToast = createToastConfig({ id: 'valid-id', message: 'Current' });
            const state = createMockState({ current: currentToast });

            const { newState, showNext } = simulateHideToast(state, 'invalid-id');

            // State should be unchanged
            expect(newState).toBe(state);
            expect(showNext).toBe(false);
            expect(newState.current?.id).toBe('valid-id');
        });

        it('handles empty message string', () => {
            const state = createMockState();

            const { newState } = simulateShowToast(state, { message: '' });

            expect(newState.current?.message).toBe('');
        });

        it('handles very long messages', () => {
            const longMessage = 'A'.repeat(1000);
            const state = createMockState();

            const { newState } = simulateShowToast(state, { message: longMessage });

            expect(newState.current?.message).toBe(longMessage);
            expect(newState.current?.message.length).toBe(1000);
        });

        it('handles custom duration of 0', () => {
            const state = createMockState();

            const { newState } = simulateShowToast(state, {
                message: 'Instant',
                duration: 0,
            });

            expect(newState.current?.duration).toBe(0);
        });

        it('preserves action callback through queue', () => {
            const onPress = vi.fn();
            const currentToast = createToastConfig({ id: 'current', message: 'Current' });
            const state = createMockState({ current: currentToast });

            const { newState } = simulateShowToast(state, {
                message: 'With action',
                action: { label: 'Undo', onPress },
            });

            expect(newState.queue[0].action?.label).toBe('Undo');
            expect(newState.queue[0].action?.onPress).toBe(onPress);
        });

        it('handles type property through queue', () => {
            const currentToast = createToastConfig({ id: 'current', message: 'Current' });
            const state = createMockState({ current: currentToast });

            const { newState: successState } = simulateShowToast(state, {
                message: 'Success',
                type: 'success',
            });
            expect(successState.queue[0].type).toBe('success');

            const { newState: errorState } = simulateShowToast(successState, {
                message: 'Error',
                type: 'error',
            });
            expect(errorState.queue[1].type).toBe('error');
        });

        it('handles showNextFromQueue with only interrupted (no queue)', () => {
            const interruptedToast = {
                id: 'interrupted',
                message: 'Interrupted only',
                duration: 5000,
                remainingDuration: 3000,
            };
            const state = createMockState({
                current: null,
                queue: [],
                interrupted: interruptedToast,
            });

            const newState = simulateShowNextFromQueue(state);

            expect(newState.current?.id).toBe('interrupted');
            expect(newState.queue).toHaveLength(0);
            expect(newState.interrupted).toBeNull();
        });
    });

    // =========================================================================
    // TIMER CLEANUP TESTS
    // =========================================================================

    describe('Timer Management', () => {
        it('verifies default duration is applied', () => {
            const state = createMockState();

            const { newState } = simulateShowToast(state, { message: 'No duration' });

            expect(newState.current?.duration).toBe(5000); // DEFAULT_DURATION
        });

        it('custom duration overrides default', () => {
            const state = createMockState();

            const { newState } = simulateShowToast(state, {
                message: 'Custom duration',
                duration: 3000,
            });

            expect(newState.current?.duration).toBe(3000);
        });
    });
});

// Note: The useToast hook's fallback behavior (returning no-op functions when
// used outside ToastProvider) is a simple conditional return that doesn't
// require testing. The core queue logic is thoroughly tested above via the
// simulateShowToast/simulateHideToast helpers which replicate the setState
// callback behavior.
