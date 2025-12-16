/**
 * ToastManager - Singleton class for imperative toast control
 *
 * Similar to ModalManager, this allows showing toasts from anywhere in the app
 * without needing React context.
 *
 * Usage:
 *   Toast.show({ message: 'Session archived', action: { label: 'Undo', onPress: () => restore() } });
 *   Toast.hide(toastId);
 */

import { ToastConfig, ToastAction } from './types';

type ShowToastFn = (config: Omit<ToastConfig, 'id'>) => string;
type HideToastFn = (id: string) => void;

class ToastManagerClass {
    private showToastFn: ShowToastFn | null = null;
    private hideToastFn: HideToastFn | null = null;

    /**
     * Called by ToastProvider to register the show/hide functions
     */
    setFunctions(showToast: ShowToastFn, hideToast: HideToastFn) {
        this.showToastFn = showToast;
        this.hideToastFn = hideToast;
    }

    private generateId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Show a toast message
     *
     * @param message - The message to display
     * @param options - Optional configuration
     * @returns The toast ID (can be used to dismiss early)
     */
    show(options: {
        message: string;
        duration?: number;
        action?: ToastAction;
        type?: 'default' | 'success' | 'error';
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
}

export const Toast = new ToastManagerClass();
