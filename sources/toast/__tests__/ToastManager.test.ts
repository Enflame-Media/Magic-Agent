/**
 * Unit tests for ToastManager singleton.
 *
 * HAP-518: Tests the imperative Toast.show/hide/clearAll API.
 *
 * The ToastManager is a singleton that allows showing toasts imperatively
 * from anywhere in the app without needing React context. The provider
 * registers its functions with the manager on mount.
 *
 * @module toast/__tests__/ToastManager.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '../ToastManager';

describe('ToastManager', () => {
    // Mock functions that would be registered by ToastProvider
    const mockShowToast = vi.fn((_config) => `toast-${Date.now()}`);
    const mockHideToast = vi.fn();
    const mockClearAllToasts = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Register mock functions as if ToastProvider mounted
        Toast.setFunctions(mockShowToast, mockHideToast, mockClearAllToasts);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Toast.show()', () => {
        it('calls showToast with message', () => {
            Toast.show({ message: 'Test message' });

            expect(mockShowToast).toHaveBeenCalledTimes(1);
            expect(mockShowToast).toHaveBeenCalledWith({
                message: 'Test message',
                duration: undefined,
                action: undefined,
                type: undefined,
                priority: undefined,
            });
        });

        it('passes duration option', () => {
            Toast.show({ message: 'Quick toast', duration: 2000 });

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Quick toast',
                    duration: 2000,
                })
            );
        });

        it('passes action option', () => {
            const onPress = vi.fn();
            Toast.show({
                message: 'Undo action',
                action: { label: 'Undo', onPress },
            });

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Undo action',
                    action: { label: 'Undo', onPress },
                })
            );
        });

        it('passes type option', () => {
            Toast.show({ message: 'Success!', type: 'success' });

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Success!',
                    type: 'success',
                })
            );
        });

        it('passes priority option', () => {
            Toast.show({ message: 'Urgent!', priority: 'high' });

            expect(mockShowToast).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Urgent!',
                    priority: 'high',
                })
            );
        });

        it('returns toast ID from showToast', () => {
            mockShowToast.mockReturnValue('generated-id-123');

            const id = Toast.show({ message: 'Get ID' });

            expect(id).toBe('generated-id-123');
        });

        it('logs error and returns empty string when not initialized', () => {
            // Create a new ToastManager-like instance without registered functions
            // by setting functions to null via a fresh import
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Reset to uninitialized state
            Toast.setFunctions(null as any, null as any, null as any);

            const id = Toast.show({ message: 'Should fail' });

            expect(id).toBe('');
            expect(consoleSpy).toHaveBeenCalledWith(
                'ToastManager not initialized. Make sure ToastProvider is mounted.'
            );

            consoleSpy.mockRestore();
            // Re-register for other tests
            Toast.setFunctions(mockShowToast, mockHideToast, mockClearAllToasts);
        });
    });

    describe('Toast.hide()', () => {
        it('calls hideToast with ID', () => {
            Toast.hide('toast-123');

            expect(mockHideToast).toHaveBeenCalledTimes(1);
            expect(mockHideToast).toHaveBeenCalledWith('toast-123');
        });

        it('logs error when not initialized', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            Toast.setFunctions(null as any, null as any, null as any);

            Toast.hide('toast-123');

            expect(consoleSpy).toHaveBeenCalledWith(
                'ToastManager not initialized. Make sure ToastProvider is mounted.'
            );

            consoleSpy.mockRestore();
            Toast.setFunctions(mockShowToast, mockHideToast, mockClearAllToasts);
        });
    });

    describe('Toast.clearAll()', () => {
        it('calls clearAllToasts without animation skip by default', () => {
            Toast.clearAll();

            expect(mockClearAllToasts).toHaveBeenCalledTimes(1);
            expect(mockClearAllToasts).toHaveBeenCalledWith(false);
        });

        it('calls clearAllToasts with skipAnimation=true', () => {
            Toast.clearAll(true);

            expect(mockClearAllToasts).toHaveBeenCalledWith(true);
        });

        it('logs error when not initialized', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            Toast.setFunctions(null as any, null as any, null as any);

            Toast.clearAll();

            expect(consoleSpy).toHaveBeenCalledWith(
                'ToastManager not initialized. Make sure ToastProvider is mounted.'
            );

            consoleSpy.mockRestore();
            Toast.setFunctions(mockShowToast, mockHideToast, mockClearAllToasts);
        });
    });

    describe('setFunctions()', () => {
        it('allows re-registration of functions', () => {
            const newShowToast = vi.fn(() => 'new-id');
            const newHideToast = vi.fn();
            const newClearAllToasts = vi.fn();

            Toast.setFunctions(newShowToast, newHideToast, newClearAllToasts);

            Toast.show({ message: 'After re-register' });
            Toast.hide('id');
            Toast.clearAll();

            expect(newShowToast).toHaveBeenCalled();
            expect(newHideToast).toHaveBeenCalled();
            expect(newClearAllToasts).toHaveBeenCalled();
            expect(mockShowToast).not.toHaveBeenCalled();
        });
    });
});
