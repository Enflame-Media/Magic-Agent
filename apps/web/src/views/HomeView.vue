<script setup lang="ts">
/**
 * Home View - Dashboard
 *
 * Provides a shadcn-vue inspired dashboard layout with Happy session metrics,
 * connection status, and a table of recent sessions.
 *
 * @see HAP-919 - Mobile Web Enhancements (Pull-to-refresh)
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useArtifactsStore } from '@/stores/artifacts';
import { useMachinesStore } from '@/stores/machines';
import { useSessionsStore, type Session } from '@/stores/sessions';
import { useSyncStore } from '@/stores/sync';
import { useSync } from '@/composables/useSync';
import { useBreakpoints } from '@/composables/useBreakpoints';
import SectionCards from '@/components/SectionCards.vue';
import ChartAreaInteractive from '@/components/ChartAreaInteractive.vue';
import DataTable from '@/components/DataTable.vue';
import { ConnectionStatus, PullToRefresh } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type SectionCard = {
  title: string;
  value: string;
  badgeLabel: string;
  badgeDirection?: 'up' | 'down';
  summary: string;
  detail: string;
};

type SessionRow = {
  id: string;
  name: string;
  status: 'Active' | 'Archived';
  path: string;
  lastActive: string;
};

const router = useRouter();
const sessionsStore = useSessionsStore();
const machinesStore = useMachinesStore();
const artifactsStore = useArtifactsStore();
const syncStore = useSyncStore();

// Pull-to-refresh support (HAP-919)
const { refresh: syncRefresh } = useSync();
const { isMobile } = useBreakpoints();

async function handleRefresh(): Promise<void> {
  await syncRefresh();
}

const cards = computed<SectionCard[]>(() => {
  const totalSessions = sessionsStore.count;
  const activeSessions = sessionsStore.activeSessions.length;
  const archivedSessions = sessionsStore.inactiveSessions.length;
  const onlineMachines = machinesStore.onlineMachines.length;
  const artifacts = artifactsStore.count;

  return [
    {
      title: 'Total Sessions',
      value: String(totalSessions),
      badgeLabel: `${activeSessions} active`,
      badgeDirection: 'up',
      summary: 'Sessions synced across devices',
      detail: `${archivedSessions} archived session(s)`,
    },
    {
      title: 'Online Machines',
      value: String(onlineMachines),
      badgeLabel: syncStore.isConnected ? 'Connected' : 'Offline',
      badgeDirection: syncStore.isConnected ? 'up' : 'down',
      summary: 'CLI daemons reporting in',
      detail: `${machinesStore.count} total machine(s) connected`,
    },
    {
      title: 'Artifacts',
      value: String(artifacts),
      badgeLabel: artifacts > 0 ? 'Synced' : 'Waiting',
      badgeDirection: artifacts > 0 ? 'up' : 'down',
      summary: 'Files captured from sessions',
      detail: 'Exported outputs stay encrypted',
    },
    {
      title: 'Connection',
      value: syncStore.statusMessage,
      badgeLabel: syncStore.isConnected ? 'Live' : 'Retrying',
      badgeDirection: syncStore.isConnected ? 'up' : 'down',
      summary: 'WebSocket relay health',
      detail: syncStore.isConnecting ? 'Reconnecting to relay' : 'Healthy relay state',
    },
  ];
});

function sessionName(session: Session): string {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.name || meta.title || `Session ${session.id.slice(0, 8)}`;
  } catch {
    return `Session ${session.id.slice(0, 8)}`;
  }
}

function sessionPath(session: Session): string | null {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
}

function lastActivity(session: Session): string {
  const date = new Date(session.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const tableData = computed<SessionRow[]>(() =>
  sessionsStore.sessionsList.map((session) => ({
    id: session.id,
    name: sessionName(session),
    status: session.active ? 'Active' : 'Archived',
    path: sessionPath(session) ?? '',
    lastActive: lastActivity(session),
  }))
);

function startNewSession() {
  router.push('/new');
}

function openSettings() {
  router.push('/settings');
}
</script>

<template>
  <!-- Pull-to-refresh wrapper for mobile (HAP-919) -->
  <PullToRefresh
    ref="pullToRefreshRef"
    :enabled="isMobile"
    :mobile-only="true"
    @refresh="handleRefresh"
  >
    <div class="flex flex-col gap-6 py-6">
      <SectionCards :cards="cards" />

    <div class="grid gap-4 px-4 lg:px-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <ChartAreaInteractive />
      </div>
      <Card class="h-full">
        <CardHeader>
          <CardTitle>Sync Status</CardTitle>
          <CardDescription>Keep an eye on your relay health</CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-4">
          <ConnectionStatus />
          <div class="flex flex-col gap-3 text-sm text-muted-foreground">
            <div class="flex items-center justify-between">
              <span>Active sessions</span>
              <span class="text-foreground font-medium tabular-nums">{{ sessionsStore.activeSessions.length }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Archived sessions</span>
              <span class="text-foreground font-medium tabular-nums">{{ sessionsStore.inactiveSessions.length }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span>Artifacts synced</span>
              <span class="text-foreground font-medium tabular-nums">{{ artifactsStore.count }}</span>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button size="sm" @click="startNewSession">New Session</Button>
            <Button variant="outline" size="sm" @click="openSettings">Settings</Button>
          </div>
        </CardContent>
      </Card>
    </div>

      <DataTable :data="tableData" @new-session="startNewSession" />
    </div>
  </PullToRefresh>
</template>
