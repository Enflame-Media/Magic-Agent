/**
 * UI Store
 *
 * Manages UI state including modals, toasts, and navigation.
 * Provides reactive state for global UI components.
 *
 * @example
 * ```typescript
 * const ui = useUiStore();
 * ui.openModal('settings');
 * ui.showToast({ type: 'success', message: 'Saved!' });
 * ```
 */

import { defineStore } from 'pinia';
import { ref, shallowRef, computed, triggerRef } from 'vue';

/**
 * Modal types available in the app
 */
export type ModalType =
    | 'settings'
    | 'profile'
    | 'session-details'
    | 'machine-details'
    | 'qr-code'
    | 'confirm'
    | 'error';

/**
 * Modal state with optional data
 */
export interface ModalState {
    type: ModalType;
    data?: Record<string, unknown>;
}

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
    id: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

/**
 * Sidebar state
 */
export type SidebarState = 'expanded' | 'collapsed' | 'hidden';

export const useUiStore = defineStore('ui', () => {
    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────

    /** Currently open modal (null if none) */
    const activeModal = ref<ModalState | null>(null);

    /** Stack of toasts */
    const toasts = shallowRef<Map<string, Toast>>(new Map());

    /** Sidebar visibility state */
    const sidebarState = ref<SidebarState>('expanded');

    /** Whether the app is loading */
    const isLoading = ref(false);

    /** Loading message */
    const loadingMessage = ref<string | null>(null);

    /** Current navigation path (for breadcrumbs, etc.) */
    const currentPath = ref<string[]>([]);

    /** Whether mobile menu is open */
    const isMobileMenuOpen = ref(false);

    /** Command palette open state */
    const isCommandPaletteOpen = ref(false);

    // ─────────────────────────────────────────────────────────────────────────
    // Getters (Computed)
    // ─────────────────────────────────────────────────────────────────────────

    /** Whether any modal is open */
    const hasActiveModal = computed(() => activeModal.value !== null);

    /** Current toast list */
    const toastList = computed(() => Array.from(toasts.value.values()));

    /** Whether sidebar is visible */
    const isSidebarVisible = computed(() => sidebarState.value !== 'hidden');

    /** Whether sidebar is expanded */
    const isSidebarExpanded = computed(() => sidebarState.value === 'expanded');

    // ─────────────────────────────────────────────────────────────────────────
    // Actions
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Open a modal
     */
    function openModal(type: ModalType, data?: Record<string, unknown>) {
        activeModal.value = { type, data };
    }

    /**
     * Close the current modal
     */
    function closeModal() {
        activeModal.value = null;
    }

    /**
     * Show a toast notification
     */
    function showToast(toast: Omit<Toast, 'id'>): string {
        const id = `toast-${String(Date.now())}-${Math.random().toString(36).slice(2, 9)}`;
        const duration = toast.duration ?? 5000;

        toasts.value.set(id, { ...toast, id });
        triggerRef(toasts);

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => {
                dismissToast(id);
            }, duration);
        }

        return id;
    }

    /**
     * Dismiss a toast by ID
     */
    function dismissToast(id: string) {
        const deleted = toasts.value.delete(id);
        if (deleted) {
            triggerRef(toasts);
        }
    }

    /**
     * Clear all toasts
     */
    function clearToasts() {
        toasts.value = new Map();
        triggerRef(toasts);
    }

    /**
     * Convenience method for success toast
     */
    function success(message: string, title?: string) {
        return showToast({ type: 'success', message, title });
    }

    /**
     * Convenience method for error toast
     */
    function error(message: string, title?: string) {
        return showToast({ type: 'error', message, title, duration: 8000 });
    }

    /**
     * Convenience method for warning toast
     */
    function warning(message: string, title?: string) {
        return showToast({ type: 'warning', message, title });
    }

    /**
     * Convenience method for info toast
     */
    function info(message: string, title?: string) {
        return showToast({ type: 'info', message, title });
    }

    /**
     * Set sidebar state
     */
    function setSidebarState(state: SidebarState) {
        sidebarState.value = state;
    }

    /**
     * Toggle sidebar expanded/collapsed
     */
    function toggleSidebar() {
        sidebarState.value = sidebarState.value === 'expanded' ? 'collapsed' : 'expanded';
    }

    /**
     * Set loading state
     */
    function setLoading(loading: boolean, message?: string) {
        isLoading.value = loading;
        loadingMessage.value = message ?? null;
    }

    /**
     * Update current path
     */
    function setCurrentPath(path: string[]) {
        currentPath.value = path;
    }

    /**
     * Toggle mobile menu
     */
    function toggleMobileMenu() {
        isMobileMenuOpen.value = !isMobileMenuOpen.value;
    }

    /**
     * Toggle command palette
     */
    function toggleCommandPalette() {
        isCommandPaletteOpen.value = !isCommandPaletteOpen.value;
    }

    /**
     * Reset store to initial state
     */
    function $reset() {
        activeModal.value = null;
        toasts.value = new Map();
        sidebarState.value = 'expanded';
        isLoading.value = false;
        loadingMessage.value = null;
        currentPath.value = [];
        isMobileMenuOpen.value = false;
        isCommandPaletteOpen.value = false;
        triggerRef(toasts);
    }

    return {
        // State
        activeModal,
        toasts,
        sidebarState,
        isLoading,
        loadingMessage,
        currentPath,
        isMobileMenuOpen,
        isCommandPaletteOpen,
        // Getters
        hasActiveModal,
        toastList,
        isSidebarVisible,
        isSidebarExpanded,
        // Actions
        openModal,
        closeModal,
        showToast,
        dismissToast,
        clearToasts,
        success,
        error,
        warning,
        info,
        setSidebarState,
        toggleSidebar,
        setLoading,
        setCurrentPath,
        toggleMobileMenu,
        toggleCommandPalette,
        $reset,
    };
});
