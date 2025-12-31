/**
 * Pinia Store Configuration
 *
 * Root store module that exports all application stores.
 * Pinia is Vue 3's recommended state management solution.
 *
 * Store Architecture:
 * - auth: Authentication state (token, account)
 * - sync: WebSocket connection status
 * - sessions: Session collection (Claude Code instances)
 * - machines: Machine collection (CLI daemons)
 * - messages: Messages grouped by session
 * - settings: User preferences
 * - ui: UI state (modals, toasts, navigation)
 *
 * @example
 * ```typescript
 * // Import individual stores
 * import { useAuthStore, useSessionsStore } from '@/stores';
 *
 * // Use in component
 * const auth = useAuthStore();
 * const sessions = useSessionsStore();
 * ```
 */

// ─────────────────────────────────────────────────────────────────────────────
// Store Exports
// ─────────────────────────────────────────────────────────────────────────────

export { useAuthStore, type AccountInfo } from './auth';

export { useSyncStore, type SyncStatus } from './sync';

export {
    useSessionsStore,
    type Session,
} from './sessions';

export {
    useMachinesStore,
    type Machine,
} from './machines';

export {
    useMessagesStore,
    type Message,
} from './messages';

export {
    useSettingsStore,
    type ThemeMode,
    type NotificationSettings,
    type DisplaySettings,
    type UserSettings,
} from './settings';

export {
    useUiStore,
    type ModalType,
    type ModalState,
    type ToastType,
    type Toast,
    type SidebarState,
} from './ui';
