/**
 * Session Sharing Composable
 *
 * Vue composable for managing session sharing, including friend shares,
 * URL sharing configuration, and email invitations.
 *
 * Features:
 * - Load and cache sharing settings for a session
 * - Add/remove shares with friends
 * - Update share permissions
 * - Configure URL sharing with optional password protection
 * - Send and revoke email invitations
 * - Error handling with toast notifications
 *
 * @example
 * ```vue
 * <script setup>
 * import { useSessionSharing } from '@/composables/useSessionSharing';
 *
 * const sessionId = ref('session_abc123');
 *
 * const {
 *   shares,
 *   urlConfig,
 *   invitations,
 *   isLoading,
 *   loadSharing,
 *   addShare,
 *   updatePermission,
 *   removeShare,
 *   configureUrlSharing,
 *   sendInvitation,
 *   revokeInvitation,
 * } = useSessionSharing(sessionId);
 *
 * // Load sharing on mount
 * onMounted(() => loadSharing());
 * </script>
 * ```
 *
 * @see HAP-769 - Implement Share Session UI for happy-vue web app
 */

import { ref, watch, type Ref, type ComputedRef, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { z } from 'zod';
import { useAuthStore } from '@/stores/auth';
import { getApiBaseUrl } from '@/services/apiBase';
import {
  SessionShareSettingsSchema,
  SessionShareEntrySchema,
  SessionShareUrlConfigSchema,
  SessionShareInvitationSchema,
  type SessionShareEntry,
  type SessionShareUrlConfig,
  type SessionShareInvitation,
  type SessionSharePermission,
} from '@happy-vue/protocol';
import { toast } from 'vue-sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** API server URL from environment */
const API_URL = getApiBaseUrl();

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for sharing settings response
 */
const SharingResponseSchema = SessionShareSettingsSchema;

/**
 * Schema for add share response
 */
const AddShareResponseSchema = z.object({
  share: SessionShareEntrySchema.optional(),
  invitation: SessionShareInvitationSchema.optional(),
});

/**
 * Schema for update share response
 */
const UpdateShareResponseSchema = z.object({
  share: SessionShareEntrySchema,
});

/**
 * Schema for URL config response
 */
const UrlConfigResponseSchema = z.object({
  urlSharing: SessionShareUrlConfigSchema,
});

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return type for the useSessionSharing composable.
 */
export interface UseSessionSharingReturn {
  /** List of users who have access to the session */
  shares: Ref<SessionShareEntry[]>;
  /** URL sharing configuration */
  urlConfig: Ref<SessionShareUrlConfig | null>;
  /** Pending email invitations */
  invitations: Ref<SessionShareInvitation[]>;
  /** Loading state for initial load */
  isLoading: Ref<boolean>;
  /** Loading state for add operation */
  isAdding: Ref<boolean>;
  /** Loading state for URL config update */
  isUpdatingUrl: Ref<boolean>;
  /** Error message if any */
  error: Ref<string | null>;

  /** Shareable URL (computed from urlConfig) */
  shareableUrl: ComputedRef<string | null>;

  /** Load sharing settings from server */
  loadSharing: () => Promise<void>;
  /** Add a share by user ID */
  addShare: (userId: string, permission: SessionSharePermission) => Promise<boolean>;
  /** Update permission for an existing share */
  updatePermission: (shareId: string, permission: SessionSharePermission) => Promise<boolean>;
  /** Remove a share */
  removeShare: (shareId: string) => Promise<boolean>;
  /** Configure URL sharing */
  configureUrlSharing: (
    enabled: boolean,
    password?: string | null,
    permission?: SessionSharePermission
  ) => Promise<boolean>;
  /** Send an email invitation */
  sendInvitation: (email: string, permission: SessionSharePermission) => Promise<boolean>;
  /** Revoke an email invitation */
  revokeInvitation: (invitationId: string) => Promise<boolean>;
  /** Resend an email invitation */
  resendInvitation: (invitationId: string) => Promise<boolean>;
  /** Copy shareable URL to clipboard */
  copyShareableUrl: () => Promise<boolean>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the shareable URL from token
 */
function buildShareableUrl(token: string): string {
  // Use the app URL for sharing
  const baseUrl = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}`
    : 'https://happy.engineering';
  return `${baseUrl}/shared/${token}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Composable Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Composable for managing session sharing.
 *
 * @param sessionId - Reactive reference to the session ID
 * @returns Object with reactive state and methods
 */
export function useSessionSharing(sessionId: Ref<string>): UseSessionSharingReturn {
  const authStore = useAuthStore();
  const { token } = storeToRefs(authStore);

  // ─────────────────────────────────────────────────────────────────────────
  // Reactive State
  // ─────────────────────────────────────────────────────────────────────────

  const shares = ref<SessionShareEntry[]>([]);
  const urlConfig = ref<SessionShareUrlConfig | null>(null);
  const invitations = ref<SessionShareInvitation[]>([]);
  const isLoading = ref(false);
  const isAdding = ref(false);
  const isUpdatingUrl = ref(false);
  const error = ref<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Computed
  // ─────────────────────────────────────────────────────────────────────────

  /** Shareable URL computed from URL config */
  const shareableUrl = computed<string | null>(() => {
    if (!urlConfig.value?.enabled || !urlConfig.value.token) {
      return null;
    }
    return buildShareableUrl(urlConfig.value.token);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // API Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Load sharing settings from server.
   */
  async function loadSharing(): Promise<void> {
    if (!token.value) {
      error.value = 'Not authenticated';
      return;
    }

    if (!sessionId.value) {
      error.value = 'No session ID provided';
      return;
    }

    isLoading.value = true;
    error.value = null;

    try {
      const response = await fetch(`${API_URL}/v1/sessions/${sessionId.value}/sharing`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Session not found or no sharing settings yet
          shares.value = [];
          urlConfig.value = { enabled: false, permission: 'view_only' };
          invitations.value = [];
          return;
        }
        throw new Error(`Failed to load sharing: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = SharingResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useSessionSharing] Failed to parse sharing settings:', parsed.error);
        error.value = 'Failed to parse sharing data';
        return;
      }

      shares.value = parsed.data.shares;
      urlConfig.value = parsed.data.urlSharing;
      invitations.value = parsed.data.invitations;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load sharing settings';
      error.value = message;
      console.error('[useSessionSharing] Error loading sharing:', err);
      toast.error('Failed to load sharing settings');
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Add a share by user ID.
   *
   * @param userId - The user ID to share with
   * @param permission - The permission level to grant
   * @returns true on success, false on failure
   */
  async function addShare(userId: string, permission: SessionSharePermission): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    isAdding.value = true;

    try {
      const response = await fetch(`${API_URL}/v1/sessions/${sessionId.value}/sharing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token.value}`,
        },
        body: JSON.stringify({
          sessionId: sessionId.value,
          userId,
          permission,
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          toast.error('User not found');
          return false;
        }
        if (response.status === 409) {
          toast.error('User already has access');
          return false;
        }
        throw new Error(`Failed to add share: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = AddShareResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useSessionSharing] Failed to parse add share response:', parsed.error);
        return false;
      }

      // Add to local cache
      if (parsed.data.share) {
        shares.value = [...shares.value, parsed.data.share];
      }

      toast.success('Session shared successfully');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error adding share:', err);
      toast.error('Failed to share session');
      return false;
    } finally {
      isAdding.value = false;
    }
  }

  /**
   * Update permission for an existing share.
   *
   * @param shareId - The share entry ID
   * @param permission - The new permission level
   * @returns true on success, false on failure
   */
  async function updatePermission(
    shareId: string,
    permission: SessionSharePermission
  ): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    // Optimistic update
    const oldShares = [...shares.value];
    shares.value = shares.value.map((s: SessionShareEntry) =>
      s.id === shareId ? { ...s, permission } : s
    );

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/${shareId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.value}`,
          },
          body: JSON.stringify({ shareId, permission }),
        }
      );

      if (!response.ok) {
        // Revert optimistic update
        shares.value = oldShares;
        throw new Error(`Failed to update permission: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = UpdateShareResponseSchema.safeParse(data);

      if (parsed.success) {
        // Update with server response
        shares.value = shares.value.map((s: SessionShareEntry) =>
          s.id === shareId ? parsed.data.share : s
        );
      }

      toast.success('Permission updated');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error updating permission:', err);
      toast.error('Failed to update permission');
      return false;
    }
  }

  /**
   * Remove a share.
   *
   * @param shareId - The share entry ID to remove
   * @returns true on success, false on failure
   */
  async function removeShare(shareId: string): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    // Optimistic update
    const oldShares = [...shares.value];
    shares.value = shares.value.filter((s: SessionShareEntry) => s.id !== shareId);

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/${shareId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      if (!response.ok) {
        // Revert optimistic update
        shares.value = oldShares;
        throw new Error(`Failed to remove share: ${String(response.status)}`);
      }

      toast.success('Access removed');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error removing share:', err);
      toast.error('Failed to remove access');
      return false;
    }
  }

  /**
   * Configure URL sharing.
   *
   * @param enabled - Whether to enable URL sharing
   * @param password - Optional password protection
   * @param permission - Permission level for URL access
   * @returns true on success, false on failure
   */
  async function configureUrlSharing(
    enabled: boolean,
    password?: string | null,
    permission?: SessionSharePermission
  ): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    isUpdatingUrl.value = true;

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/url`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.value}`,
          },
          body: JSON.stringify({
            sessionId: sessionId.value,
            enabled,
            password: password ?? null,
            permission: permission ?? 'view_only',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to configure URL sharing: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = UrlConfigResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useSessionSharing] Failed to parse URL config response:', parsed.error);
        return false;
      }

      urlConfig.value = parsed.data.urlSharing;
      toast.success(enabled ? 'URL sharing enabled' : 'URL sharing disabled');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error configuring URL sharing:', err);
      toast.error('Failed to configure URL sharing');
      return false;
    } finally {
      isUpdatingUrl.value = false;
    }
  }

  /**
   * Send an email invitation.
   *
   * @param email - The email address to invite
   * @param permission - The permission level to grant
   * @returns true on success, false on failure
   */
  async function sendInvitation(
    email: string,
    permission: SessionSharePermission
  ): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    isAdding.value = true;

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/invite`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token.value}`,
          },
          body: JSON.stringify({
            sessionId: sessionId.value,
            email,
            permission,
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many invitations. Please try again later.');
          return false;
        }
        throw new Error(`Failed to send invitation: ${String(response.status)}`);
      }

      const data: unknown = await response.json();
      const parsed = AddShareResponseSchema.safeParse(data);

      if (!parsed.success) {
        console.error('[useSessionSharing] Failed to parse invitation response:', parsed.error);
        return false;
      }

      // Add to local cache
      if (parsed.data.invitation) {
        invitations.value = [...invitations.value, parsed.data.invitation];
      }

      toast.success(`Invitation sent to ${email}`);
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error sending invitation:', err);
      toast.error('Failed to send invitation');
      return false;
    } finally {
      isAdding.value = false;
    }
  }

  /**
   * Revoke an email invitation.
   *
   * @param invitationId - The invitation ID to revoke
   * @returns true on success, false on failure
   */
  async function revokeInvitation(invitationId: string): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    // Optimistic update
    const oldInvitations = [...invitations.value];
    invitations.value = invitations.value.filter((i: SessionShareInvitation) => i.id !== invitationId);

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/invitations/${invitationId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      if (!response.ok) {
        // Revert optimistic update
        invitations.value = oldInvitations;
        throw new Error(`Failed to revoke invitation: ${String(response.status)}`);
      }

      toast.success('Invitation revoked');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error revoking invitation:', err);
      toast.error('Failed to revoke invitation');
      return false;
    }
  }

  /**
   * Resend an email invitation.
   *
   * @param invitationId - The invitation ID to resend
   * @returns true on success, false on failure
   */
  async function resendInvitation(invitationId: string): Promise<boolean> {
    if (!token.value) {
      toast.error('Not authenticated');
      return false;
    }

    try {
      const response = await fetch(
        `${API_URL}/v1/sessions/${sessionId.value}/sharing/invitations/${invitationId}/resend`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token.value}`,
          },
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Too many resend attempts. Please try again later.');
          return false;
        }
        throw new Error(`Failed to resend invitation: ${String(response.status)}`);
      }

      toast.success('Invitation resent');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error resending invitation:', err);
      toast.error('Failed to resend invitation');
      return false;
    }
  }

  /**
   * Copy shareable URL to clipboard.
   *
   * @returns true on success, false on failure
   */
  async function copyShareableUrl(): Promise<boolean> {
    if (!shareableUrl.value) {
      toast.error('No shareable URL available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(shareableUrl.value);
      toast.success('Link copied to clipboard');
      return true;
    } catch (err) {
      console.error('[useSessionSharing] Error copying URL:', err);
      toast.error('Failed to copy link');
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Watchers
  // ─────────────────────────────────────────────────────────────────────────

  // Reload when session ID changes
  watch(sessionId, () => {
    if (sessionId.value) {
      void loadSharing();
    }
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return API
  // ─────────────────────────────────────────────────────────────────────────

  return {
    // Reactive state
    shares,
    urlConfig,
    invitations,
    isLoading,
    isAdding,
    isUpdatingUrl,
    error,

    // Computed
    shareableUrl,

    // Actions
    loadSharing,
    addShare,
    updatePermission,
    removeShare,
    configureUrlSharing,
    sendInvitation,
    revokeInvitation,
    resendInvitation,
    copyShareableUrl,
  };
}
