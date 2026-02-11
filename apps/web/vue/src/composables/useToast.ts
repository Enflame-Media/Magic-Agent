/**
 * Toast Notification Composable
 *
 * Provides a consistent interface for toast notifications using vue-sonner.
 * Wraps the toast function with typed variants and common defaults.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useToast } from '@/composables/useToast';
 *
 * const { toast } = useToast();
 *
 * // Simple notifications
 * toast.success('Session connected!');
 * toast.error('Connection failed');
 * toast.warning('Session ending soon');
 * toast.info('New message received');
 *
 * // With options
 * toast.success('Changes saved', {
 *   description: 'Your settings have been updated.',
 *   duration: 5000,
 * });
 *
 * // Promise-based (loading -> success/error)
 * toast.promise(saveSettings(), {
 *   loading: 'Saving...',
 *   success: 'Settings saved!',
 *   error: 'Failed to save settings',
 * });
 *
 * // Dismissible action toast
 * toast.info('Session archived', {
 *   action: {
 *     label: 'Undo',
 *     onClick: () => undoArchive(),
 *   },
 * });
 * </script>
 * ```
 */

import { toast as sonnerToast, type ExternalToast } from 'vue-sonner';

/**
 * Toast action configuration
 */
export interface ToastAction {
  /** Button label */
  label: string;
  /** Click handler */
  onClick: () => void;
}

/**
 * Common toast options
 */
export interface ToastOptions extends Partial<ExternalToast> {
  /** Secondary description text */
  description?: string;
  /** Duration in milliseconds (default: 4000) */
  duration?: number;
  /** Action button configuration */
  action?: ToastAction;
  /** Cancel button configuration */
  cancel?: ToastAction;
}

/**
 * Promise toast messages
 */
export interface PromiseToastMessages<T> {
  /** Message shown while loading */
  loading: string;
  /** Message shown on success (can be function for dynamic message) */
  success: string | ((data: T) => string);
  /** Message shown on error (can be function for dynamic message) */
  error: string | ((error: Error) => string);
}

/**
 * Toast notification interface
 */
/** Toast ID type - can be string or number */
export type ToastId = string | number;

export interface ToastInterface {
  /** Show a success toast */
  success: (message: string, options?: ToastOptions) => ToastId;
  /** Show an error toast */
  error: (message: string, options?: ToastOptions) => ToastId;
  /** Show a warning toast */
  warning: (message: string, options?: ToastOptions) => ToastId;
  /** Show an info toast */
  info: (message: string, options?: ToastOptions) => ToastId;
  /** Show a loading toast */
  loading: (message: string, options?: ToastOptions) => ToastId;
  /** Show a promise-based toast (loading -> success/error) */
  promise: <T>(promise: Promise<T>, messages: PromiseToastMessages<T>, options?: ToastOptions) => void;
  /** Show a custom toast */
  custom: (message: string, options?: ToastOptions) => ToastId;
  /** Dismiss a toast by ID */
  dismiss: (toastId?: ToastId) => void;
  /** Dismiss all toasts */
  dismissAll: () => void;
}

/**
 * Default toast duration in milliseconds
 */
const DEFAULT_DURATION = 4000;

/**
 * Create toast options with defaults
 */
function createOptions(options?: ToastOptions): ExternalToast {
  const result: ExternalToast = {
    duration: options?.duration ?? DEFAULT_DURATION,
  };

  if (options?.description) {
    result.description = options.description;
  }

  if (options?.action) {
    result.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    };
  }

  if (options?.cancel) {
    result.cancel = {
      label: options.cancel.label,
      onClick: options.cancel.onClick,
    };
  }

  // Spread any additional options
  return { ...options, ...result };
}

/**
 * Composable for toast notifications.
 *
 * Provides a consistent API for showing toast notifications with
 * success, error, warning, info, and loading variants.
 */
export function useToast(): { toast: ToastInterface } {
  const toast: ToastInterface = {
    success(message: string, options?: ToastOptions) {
      return sonnerToast.success(message, createOptions(options));
    },

    error(message: string, options?: ToastOptions) {
      return sonnerToast.error(message, createOptions(options));
    },

    warning(message: string, options?: ToastOptions) {
      return sonnerToast.warning(message, createOptions(options));
    },

    info(message: string, options?: ToastOptions) {
      return sonnerToast.info(message, createOptions(options));
    },

    loading(message: string, options?: ToastOptions) {
      return sonnerToast.loading(message, createOptions(options));
    },

    promise<T>(promise: Promise<T>, messages: PromiseToastMessages<T>, options?: ToastOptions): void {
      sonnerToast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
        ...createOptions(options),
      });
    },

    custom(message: string, options?: ToastOptions) {
      return sonnerToast(message, createOptions(options));
    },

    dismiss(toastId?: ToastId) {
      sonnerToast.dismiss(toastId);
    },

    dismissAll() {
      sonnerToast.dismiss();
    },
  };

  return { toast };
}

/**
 * Direct toast function export for simpler usage.
 * Can be imported directly without the composable pattern.
 *
 * @example
 * ```ts
 * import { toast } from '@/composables/useToast';
 *
 * toast.success('Done!');
 * ```
 */
export const toast: ToastInterface = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, createOptions(options));
  },

  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, createOptions(options));
  },

  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, createOptions(options));
  },

  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, createOptions(options));
  },

  loading(message: string, options?: ToastOptions) {
    return sonnerToast.loading(message, createOptions(options));
  },

  promise<T>(promise: Promise<T>, messages: PromiseToastMessages<T>, options?: ToastOptions): void {
    sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
      ...createOptions(options),
    });
  },

  custom(message: string, options?: ToastOptions) {
    return sonnerToast(message, createOptions(options));
  },

  dismiss(toastId?: ToastId) {
    sonnerToast.dismiss(toastId);
  },

  dismissAll() {
    sonnerToast.dismiss();
  },
};
