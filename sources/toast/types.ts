/**
 * Toast system types
 *
 * Supports simple toasts and action toasts (with undo/action button).
 */

export interface ToastAction {
    /** Label for the action button */
    label: string;
    /** Callback when action is pressed */
    onPress: () => void;
}

export interface ToastConfig {
    /** Unique identifier for the toast */
    id: string;
    /** Message to display */
    message: string;
    /** Duration in milliseconds before auto-dismiss (default: 3000) */
    duration?: number;
    /** Optional action button (e.g., Undo) */
    action?: ToastAction;
    /** Type affects styling - 'default' | 'success' | 'error' */
    type?: 'default' | 'success' | 'error';
}

export interface ToastState {
    /** Currently displayed toast (only one at a time) */
    current: ToastConfig | null;
}

export interface ToastContextValue {
    state: ToastState;
    showToast: (config: Omit<ToastConfig, 'id'>) => string;
    hideToast: (id: string) => void;
}
