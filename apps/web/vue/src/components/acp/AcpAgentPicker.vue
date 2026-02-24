<!--
  HAP-1048: ACP Agent Picker Component

  Panel showing registered ACP agents with name, status, and capabilities.
  Allows switching agents via confirmation dialog with loading/success/failure states.
  Includes rollback error notification.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { AcpRegisteredAgent, AcpAgentStatus } from '@/stores/acpTypes';

const props = defineProps<{
  agents: AcpRegisteredAgent[];
  activeAgentId: string | null;
  switching: boolean;
  switchError: string | null;
}>();

const emit = defineEmits<{
  switchAgent: [agentId: string];
}>();

const { t } = useI18n();

// ─── Confirmation Dialog ────────────────────────────────────────────────────

const confirmOpen = ref(false);
const confirmAgent = ref<AcpRegisteredAgent | null>(null);

function requestSwitch(agent: AcpRegisteredAgent) {
  confirmAgent.value = agent;
  confirmOpen.value = true;
}

function handleConfirm() {
  if (confirmAgent.value) {
    emit('switchAgent', confirmAgent.value.id);
  }
  confirmOpen.value = false;
  confirmAgent.value = null;
}

function handleCancel() {
  confirmOpen.value = false;
  confirmAgent.value = null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getStatusColor(status: AcpAgentStatus): string {
  switch (status) {
    case 'connected': return 'bg-green-500';
    case 'available': return 'bg-primary';
    case 'unavailable': return 'bg-muted-foreground';
    case 'error': return 'bg-destructive';
  }
}

function getStatusLabel(status: AcpAgentStatus): string {
  switch (status) {
    case 'connected': return t('acp.agentPicker.statusConnected');
    case 'available': return t('acp.agentPicker.statusAvailable');
    case 'unavailable': return t('acp.agentPicker.statusUnavailable');
    case 'error': return t('acp.agentPicker.statusError');
  }
}

function getAgentIcon(agentId: string): string {
  const id = agentId.toLowerCase();
  if (id.includes('claude')) return 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z';
  if (id.includes('codex')) return 'M16 18l2-2-2-2M8 18l-2-2 2-2M12 6l-2 12';
  return 'M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z';
}

function canSwitch(agent: AcpRegisteredAgent): boolean {
  return agent.id !== props.activeAgentId && agent.status === 'available' && !props.switching;
}
</script>

<template>
  <div v-if="agents.length > 0" class="rounded-xl border bg-card p-3">
    <!-- Header -->
    <div class="flex items-center mb-2">
      <svg class="h-4 w-4 text-muted-foreground mr-1.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
        <path d="M7 15l5 5 5-5"/>
        <path d="M7 9l5-5 5 5"/>
      </svg>
      <span class="text-sm font-semibold text-muted-foreground flex-1">
        {{ t('acp.agentPicker.title') }}
      </span>
      <span class="text-xs text-muted-foreground">
        {{ t('acp.agentPicker.agentCount', { count: agents.length }) }}
      </span>
    </div>

    <!-- Switch error rollback notice -->
    <div
      v-if="switchError"
      class="flex items-center gap-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive mb-2"
    >
      <svg class="h-3.5 w-3.5 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {{ t('acp.agentPicker.rollbackNotice') }}
    </div>

    <!-- Agent list -->
    <div class="space-y-1">
      <button
        v-for="agent in agents"
        :key="agent.id"
        class="flex w-full items-center rounded-lg p-2.5 text-left transition-colors"
        :class="[
          agent.id === activeAgentId
            ? 'bg-primary/5 border border-primary/20'
            : 'bg-muted/50 hover:bg-muted border border-transparent',
          canSwitch(agent) ? 'cursor-pointer' : 'cursor-default',
        ]"
        :disabled="!canSwitch(agent)"
        @click="canSwitch(agent) ? requestSwitch(agent) : undefined"
      >
        <!-- Agent icon -->
        <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background mr-2.5">
          <svg class="h-5 w-5 text-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path :d="getAgentIcon(agent.id)"/>
          </svg>
        </div>

        <!-- Agent info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="text-sm font-semibold truncate">{{ agent.name }}</span>
            <Badge
              v-if="agent.id === activeAgentId"
              variant="default"
              class="text-[10px] px-1.5 py-0 uppercase"
            >
              {{ t('acp.agentPicker.active') }}
            </Badge>
          </div>
          <div class="flex items-center gap-1 mt-0.5">
            <span class="inline-block h-1.5 w-1.5 rounded-full" :class="getStatusColor(agent.status)" />
            <span class="text-xs text-muted-foreground">
              {{ getStatusLabel(agent.status) }}
            </span>
            <span v-if="agent.version" class="text-xs text-muted-foreground">
              v{{ agent.version }}
            </span>
          </div>
          <p v-if="agent.description" class="text-xs text-muted-foreground truncate mt-0.5">
            {{ agent.description }}
          </p>
        </div>

        <!-- Switch icon -->
        <svg
          v-if="canSwitch(agent)"
          class="h-4 w-4 text-primary shrink-0 ml-2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
          <path d="M7 15l5 5 5-5"/>
          <path d="M7 9l5-5 5 5"/>
        </svg>

        <!-- Switching spinner -->
        <svg
          v-if="switching && agent.id === activeAgentId"
          class="h-4 w-4 animate-spin text-muted-foreground shrink-0 ml-2"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
        </svg>
      </button>
    </div>

    <!-- Confirmation dialog -->
    <AlertDialog :open="confirmOpen">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t('acp.agentPicker.switchTitle') }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t('acp.agentPicker.switchMessage', { name: confirmAgent?.name ?? '' }) }}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="handleCancel">
            {{ t('common.cancel') }}
          </AlertDialogCancel>
          <AlertDialogAction @click="handleConfirm">
            {{ t('acp.agentPicker.switchConfirm') }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
