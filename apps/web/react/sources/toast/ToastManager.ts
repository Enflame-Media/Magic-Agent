/**
 * ToastManager - Singleton class for imperative toast control
 *
 * Similar to ModalManager, this allows showing toasts from anywhere in the app
 * without needing React context.
 *
 * Usage:
 *   Toast.show({ message: 'Session archived', action: { label: 'Undo', onPress: () => restore() } });
 *   Toast.hide(toastId);
 *   Toast.clearAll();           // Clear all with animation
 *   Toast.clearAll(true);       // Clear all instantly (e.g., on navigation)
 */

import { ToastConfig, ToastAction } from './types';

type ShowToastFn = (config: Omit<ToastConfig, 'id'>) => string;
type HideToastFn = (id: string) => void;
type ClearAllToastsFn = (skipAnimation?: boolean) => void;

class ToastManagerClass {
    private showToastFn: ShowToastFn | null = null;
    private hideToastFn: HideToastFn | null = null;
    private clearAllToastsFn: ClearAllToastsFn | null = null;

    /**
     * Called by ToastProvider to register the show/hide/clearAll functions
     */
    setFunctions(showToast: ShowToastFn, hideToast: HideToastFn, clearAllToasts: ClearAllToastsFn) {
        this.showToastFn = showToast;
        this.hideToastFn = hideToast;
        this.clearAllToastsFn = clearAllToasts;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Show a toast message
     *
     * @param options - Toast configuration
     * @param options.message - The message to display
     * @param options.duration - Duration in ms before auto-dismiss (default: 5000)
     * @param options.action - Optional action button (e.g., Undo)
     * @param options.type - Toast type for styling ('default' | 'success' | 'error')
     * @param options.priority - Priority level ('normal' | 'high'). High priority interrupts current toast.
     * @returns The toast ID (can be used to dismiss early)
     */
    show(options: {
        message: string;
        duration?: number;
        action?: ToastAction;
        type?: 'default' | 'success' | 'error';
        priority?: 'normal' | 'high';
    }): string {
        if (!this.showToastFn) {
            console.error('ToastManager not initialized. Make sure ToastProvider is mounted.');
            return '';
        }

        return this.showToastFn({
            message: options.message,
            duration: options.duration,
            action: options.action,
            type: options.type,
            priority: options.priority,
        });
    }

    /**
     * Hide a specific toast by ID
     */
    hide(id: string): void {
        if (!this.hideToastFn) {
            console.error('ToastManager not initialized. Make sure ToastProvider is mounted.');
            return;
        }

        this.hideToastFn(id);
    }

    /**
     * Clear all toasts (current and queued)
     *
     * @param skipAnimation - If true, clears instantly without animation (default: false)
     */
    clearAll(skipAnimation = false): void {
        if (!this.clearAllToastsFn) {
            console.error('ToastManager not initialized. Make sure ToastProvider is mounted.');
            return;
        }

        this.clearAllToastsFn(skipAnimation);
    }
}

export const Toast = new ToastManagerClass();
