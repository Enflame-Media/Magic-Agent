/**
 * ACP Session Composable
 *
 * Reactive composable for consuming ACP session state in Vue components.
 * Provides computed properties that automatically update when the
 * underlying ACP store changes.
 *
 * @see HAP-1046 - Build Vue ACP foundation
 *
 * @example
 * ```vue
 * <script setup>
 * import { useAcpSession } from '@/composables/useAcpSession';
 *
 * const props = defineProps<{ sessionId: string }>();
 * const { session, hasSession, agentMessage, toolCalls } = useAcpSession(
 *   () => props.sessionId
 * );
 * </script>
 *
 * <template>
 *   <div v-if="hasSession">
 *     <p>{{ agentMessage }}</p>
 *   </div>
 * </template>
 * ```
 */

import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useAcpStore, type AcpSessionState } from '@/stores/acp';

/**
 * Reactive composable for ACP session state.
 *
 * Accepts a session ID as a ref, getter, or plain string.
 * Returns computed properties that track the ACP state for that session.
 *
 * @param sessionId - Session ID (ref, getter, or plain value)
 */
export function useAcpSession(sessionId: MaybeRefOrGetter<string>) {
  const acpStore = useAcpStore();

  /** Full ACP session state, or null if no updates received */
  const session = computed<AcpSessionState | null>(() => {
    return acpStore.getAcpSession(toValue(sessionId)) ?? null;
  });

  /** Whether any ACP updates have been received for this session */
  const hasSession = computed(() => session.value !== null);

  /** Accumulated agent message text */
  const agentMessage = computed(() => session.value?.agentMessage ?? '');

  /** Accumulated user message text */
  const userMessage = computed(() => session.value?.userMessage ?? '');

  /** Accumulated agent thought text */
  const agentThought = computed(() => session.value?.agentThought ?? '');

  /** Active tool calls keyed by toolCallId */
  const toolCalls = computed(() => session.value?.toolCalls ?? {});

  /** Current execution plan entries */
  const plan = computed(() => session.value?.plan ?? []);

  /** Available slash commands */
  const availableCommands = computed(() => session.value?.availableCommands ?? []);

  /** Current session mode ID */
  const currentModeId = computed(() => session.value?.currentModeId ?? null);

  /** Session config options */
  const configOptions = computed(() => session.value?.configOptions ?? []);

  /** Session title */
  const sessionTitle = computed(() => session.value?.sessionTitle ?? null);

  /** Context window usage */
  const usage = computed(() => session.value?.usage ?? null);

  /** Timestamp of last ACP update */
  const lastUpdateAt = computed(() => session.value?.lastUpdateAt ?? 0);

  return {
    session,
    hasSession,
    agentMessage,
    userMessage,
    agentThought,
    toolCalls,
    plan,
    availableCommands,
    currentModeId,
    configOptions,
    sessionTitle,
    usage,
    lastUpdateAt,
  };
}
