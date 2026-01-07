<script setup lang="ts">
/**
 * Session Info View
 *
 * Displays session metadata, status, and quick actions.
 */

import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth';
import { useMessagesStore } from '@/stores/messages';
import { useMachinesStore, isMachineOnline } from '@/stores/machines';
import { useSessionsStore } from '@/stores/sessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemHeader,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from '@/components/ui/item';
import { archiveSession, deleteSession } from '@/services/sessions';
import { encryptionCache } from '@/services/encryption/EncryptionCache';
import { decryptSessionMetadata } from '@/services/encryption/sessionDecryption';
import {
  isTemporaryPidSessionId,
  machineSpawnNewSession,
  pollForRealSession,
} from '@/services/sync/ops';

interface SessionMetadata {
  name?: string;
  title?: string;
  path?: string;
  projectPath?: string;
  host?: string;
  homeDir?: string;
  os?: string;
  version?: string;
  flavor?: string;
  agent?: string;
  machineId?: string;
  hostPid?: number;
  happyHomeDir?: string;
}

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const sessionsStore = useSessionsStore();
const messagesStore = useMessagesStore();
const machinesStore = useMachinesStore();

const isDeleting = ref(false);
const isRestoring = ref(false);
const isArchiving = ref(false);
const decryptedMetadata = ref<SessionMetadata | null>(null);

const sessionId = computed(() => route.params.id as string);
const session = computed(() =>
  sessionId.value ? sessionsStore.getSession(sessionId.value) : undefined
);

async function refreshMetadata(): Promise<void> {
  if (!session.value) {
    decryptedMetadata.value = null;
    return;
  }

  const currentSession = session.value;
  const decrypted = await decryptSessionMetadata<SessionMetadata>(currentSession);
  if (session.value?.id !== currentSession.id) {
    return;
  }

  if (decrypted) {
    decryptedMetadata.value = decrypted;
    return;
  }

  try {
    decryptedMetadata.value = JSON.parse(currentSession.metadata) as SessionMetadata;
  } catch {
    decryptedMetadata.value = null;
  }
}

const metadata = computed<SessionMetadata | null>(() => decryptedMetadata.value);

const sessionName = computed(() => {
  if (!session.value) return 'Session';
  const meta = metadata.value;
  return meta?.name || meta?.title || `Session ${sessionId.value.slice(0, 8)}`;
});

const projectPath = computed(() => {
  const meta = metadata.value;
  return meta?.path || meta?.projectPath || null;
});

const statusText = computed(() =>
  session.value?.active ? 'Connected' : 'Archived'
);

const statusColor = computed(() =>
  session.value?.active ? 'text-emerald-500' : 'text-muted-foreground'
);

const messageCount = computed(() =>
  session.value ? messagesStore.getMessageCount(session.value.id) : 0
);

const createdAt = computed(() =>
  session.value ? formatDate(session.value.createdAt) : '—'
);

const updatedAt = computed(() =>
  session.value ? formatDate(session.value.updatedAt) : '—'
);

const machineOnline = computed(() => {
  const machineId = metadata.value?.machineId;
  if (!machineId) return false;
  const machine = machinesStore.getMachine(machineId);
  return machine ? isMachineOnline(machine) : false;
});

const restorePath = computed(() => projectPath.value ?? metadata.value?.path ?? null);

const canRestore = computed(() => {
  return Boolean(
    session.value &&
    !session.value.active &&
    metadata.value?.machineId &&
    restorePath.value
  );
});

const isActiveSession = computed(() => Boolean(session.value?.active));

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function displayProvider(flavor?: string): string {
  if (!flavor || flavor === 'claude') return 'Claude';
  if (flavor === 'gpt' || flavor === 'openai') return 'Codex';
  if (flavor === 'gemini') return 'Gemini';
  return flavor;
}

function goBack(): void {
  router.push(`/session/${sessionId.value}`);
}

watch(
  () => session.value,
  async () => {
    await refreshMetadata();
  },
  { immediate: true }
);

async function handleRestore(): Promise<void> {
  if (!session.value || !metadata.value) return;

  if (isRestoring.value) return;
  if (!metadata.value.machineId || !restorePath.value) {
    toast.error('Missing machine metadata for restore');
    return;
  }

  if (!machineOnline.value) {
    toast.error('Machine must be online to restore this session');
    return;
  }

  isRestoring.value = true;
  try {
    const spawnStartTime = Date.now();
    const flavor = metadata.value.flavor;
    const agent = flavor === 'gpt' || flavor === 'openai'
      ? 'codex'
      : (flavor as 'claude' | 'codex' | 'gemini') ?? 'claude';
    const result = await machineSpawnNewSession({
      machineId: metadata.value.machineId,
      directory: restorePath.value,
      agent,
      sessionId: session.value.id,
    });

    if (result.type === 'requestToApproveDirectoryCreation') {
      toast.error('Directory creation must be approved in the CLI');
      return;
    }

    if (result.type === 'error') {
      toast.error(result.errorMessage || 'Failed to restore session');
      return;
    }

    let restoredSessionId = result.sessionId;
    if (isTemporaryPidSessionId(restoredSessionId)) {
      const realSessionId = await pollForRealSession(
        metadata.value.machineId,
        spawnStartTime,
        { interval: 5000, maxAttempts: 24 }
      );
      if (!realSessionId) {
        toast.error('Failed to confirm restored session');
        return;
      }
      restoredSessionId = realSessionId;
    }

    toast.success(result.message || 'Session restored');
    router.replace(`/session/${restoredSessionId}`);
  } catch (error) {
    console.error('[session] Failed to restore session', error);
    toast.error('Failed to restore session');
  } finally {
    isRestoring.value = false;
  }
}

async function handleArchive(): Promise<void> {
  if (!session.value || !session.value.active || isArchiving.value) return;

  const confirmed = globalThis.confirm('Archive this session?');
  if (!confirmed) return;

  if (!authStore.token) {
    toast.error('Not authenticated');
    return;
  }

  isArchiving.value = true;
  try {
    const result = await archiveSession(session.value.id, authStore.token);

    if ('deleted' in result && result.deleted) {
      sessionsStore.removeSession(session.value.id);
      messagesStore.clearSessionMessages(session.value.id);
      encryptionCache.clearSessionCache(session.value.id);
      toast.success('Session deleted');
      router.push('/');
      return;
    }

    sessionsStore.updateSession(session.value.id, {
      active: false,
      updatedAt: Date.now(),
    });
    toast.success('Session archived');
  } catch (error) {
    console.error('[session] Failed to archive session', error);
    toast.error('Failed to archive session');
  } finally {
    isArchiving.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!session.value || isDeleting.value) return;

  const confirmed = globalThis.confirm(
    'Delete this archived session and all of its messages? This cannot be undone.'
  );
  if (!confirmed) return;

  if (!authStore.token) {
    toast.error('Not authenticated');
    return;
  }

  isDeleting.value = true;
  try {
    await deleteSession(session.value.id, authStore.token);
    sessionsStore.removeSession(session.value.id);
    messagesStore.clearSessionMessages(session.value.id);
    encryptionCache.clearSessionCache(session.value.id);
    toast.success('Session deleted');
    router.push('/');
  } catch (error) {
    console.error('[session] Failed to delete session', error);
    toast.error('Failed to delete session');
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 px-4 py-6 lg:px-8">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="goBack">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </Button>
      <div>
        <p class="text-sm text-muted-foreground">Session Details</p>
        <h1 class="text-lg font-semibold">Session Info</h1>
      </div>
    </div>

    <Card>
      <CardContent class="flex flex-col items-center gap-3 py-8 text-center">
        <div class="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <span class="text-lg font-semibold">
            {{ sessionName.slice(0, 2).toUpperCase() }}
          </span>
        </div>
        <div class="space-y-1">
          <h1 class="text-xl font-semibold">
            {{ sessionName }}
          </h1>
          <div class="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span v-if="projectPath" class="max-w-[20rem] truncate">
              {{ projectPath }}
            </span>
            <span class="flex items-center gap-1" :class="statusColor">
              <span class="h-2 w-2 rounded-full bg-current" />
              {{ statusText }}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>

    <section>
      <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Session Details
      </h2>
      <ItemGroup class="mt-3 rounded-xl border bg-card">
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Session ID</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ sessionId }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Messages</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ messageCount }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Created</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ createdAt }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Last Updated</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ updatedAt }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Sequence</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ session?.seq ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </section>

    <section v-if="session">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Quick Actions
      </h2>
      <ItemGroup class="mt-3 rounded-xl border bg-card">
        <Item size="sm">
          <ItemMedia variant="icon">
            <svg
              v-if="isActiveSession"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6v14" />
              <path d="M16 6v14" />
              <path d="M5 6l1-3h12l1 3" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-9-9" />
              <path d="M21 3v6h-6" />
            </svg>
          </ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>
                {{ isActiveSession ? 'Archive Session' : 'Restore Session' }}
              </ItemTitle>
            </ItemHeader>
            <ItemDescription>
              <template v-if="isActiveSession">
                Archive this session and stop it.
              </template>
              <template v-else>
                {{ machineOnline ? 'Resume this session on its original machine.' : 'Machine must be online to restore.' }}
              </template>
            </ItemDescription>
          </ItemContent>
          <Button
            variant="outline"
            size="sm"
            :disabled="isActiveSession ? isArchiving : !canRestore || !machineOnline || isRestoring"
            @click="isActiveSession ? handleArchive() : handleRestore()"
          >
            <template v-if="isActiveSession">
              {{ isArchiving ? 'Archiving...' : 'Archive' }}
            </template>
            <template v-else>
              {{ isRestoring ? 'Restoring...' : 'Restore' }}
            </template>
          </Button>
        </Item>
        <ItemSeparator v-if="!isActiveSession" />
        <Item v-if="!isActiveSession" size="sm">
          <ItemMedia variant="icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M8 6v14" />
              <path d="M16 6v14" />
              <path d="M5 6l1-3h12l1 3" />
            </svg>
          </ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Delete Session</ItemTitle>
            </ItemHeader>
            <ItemDescription>
              Permanently remove this session and its message history.
            </ItemDescription>
          </ItemContent>
          <Button
            variant="destructive"
            size="sm"
            :disabled="isDeleting"
            @click="handleDelete"
          >
            {{ isDeleting ? 'Deleting...' : 'Delete' }}
          </Button>
        </Item>
      </ItemGroup>
    </section>

    <section v-if="metadata">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Metadata
      </h2>
      <ItemGroup class="mt-3 rounded-xl border bg-card">
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Host</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ metadata.host ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Path</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ projectPath ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>CLI Version</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ metadata.version ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Operating System</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ metadata.os ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>AI Provider</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ displayProvider(metadata.flavor) }}</ItemDescription>
          </ItemContent>
        </Item>
        <ItemSeparator />
        <Item size="sm">
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Process ID</ItemTitle>
            </ItemHeader>
            <ItemDescription>{{ metadata.hostPid ?? '—' }}</ItemDescription>
          </ItemContent>
        </Item>
      </ItemGroup>
    </section>
  </div>
</template>
