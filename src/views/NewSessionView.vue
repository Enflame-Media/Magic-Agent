<script setup lang="ts">
/**
 * New Session View
 *
 * Mirrors the Happy mobile flow for starting a new session:
 * - Select machine
 * - Choose path
 * - Pick session type + agent
 */

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMachinesStore, type Machine } from '@/stores/machines';
import { machineSpawnNewSession, isTemporaryPidSessionId, pollForRealSession } from '@/services/sync/ops';

const router = useRouter();
const machinesStore = useMachinesStore();

const selectedMachineId = ref<string | null>(null);
const selectedPath = ref('');
const sessionType = ref<'simple' | 'worktree'>('simple');
const agentType = ref<'claude' | 'codex' | 'gemini'>('claude');
const initialPrompt = ref('');
const isSubmitting = ref(false);
const pendingStatus = ref<string | null>(null);

const machines = computed(() => machinesStore.machinesList);
const onlineMachines = computed(() => machinesStore.onlineMachines);
const offlineMachines = computed(() => machinesStore.offlineMachines);

const canSubmit = computed(() => Boolean(selectedMachineId.value && selectedPath.value.trim()));

watch(
  machines,
  (list) => {
    if (!selectedMachineId.value && list.length > 0) {
      const preferred = onlineMachines.value[0] ?? list[0];
      if (preferred) {
        selectedMachineId.value = preferred.id;
      }
    }
  },
  { immediate: true }
);

function machineLabel(machine: Machine): string {
  try {
    const meta = JSON.parse(machine.metadata);
    return meta.host || meta.name || `Machine ${machine.id.slice(0, 8)}`;
  } catch {
    return `Machine ${machine.id.slice(0, 8)}`;
  }
}

function machineSubtitle(machine: Machine): string {
  try {
    const meta = JSON.parse(machine.metadata);
    return meta.path || meta.homeDir || machine.id;
  } catch {
    return machine.id;
  }
}

async function startSession(): Promise<void> {
  if (!selectedMachineId.value) {
    toast.error('Select a machine to start the session');
    return;
  }

  if (!selectedPath.value.trim()) {
    toast.error('Enter a directory to start the session in');
    return;
  }

  isSubmitting.value = true;
  pendingStatus.value = null;

  const spawnStartTime = Date.now();

  const result = await machineSpawnNewSession({
    machineId: selectedMachineId.value,
    directory: selectedPath.value.trim(),
    approvedNewDirectoryCreation: true,
    agent: agentType.value,
  });

  let sessionId: string | null = null;

  if (result.type === 'success' && result.sessionId) {
    sessionId = result.sessionId;

    if (isTemporaryPidSessionId(result.sessionId)) {
      pendingStatus.value = 'Session starting, waiting for ID...';
      const realSessionId = await pollForRealSession(selectedMachineId.value, spawnStartTime, {
        interval: 5000,
        maxAttempts: 24,
        onPoll: (attempt, maxAttempts) => {
          pendingStatus.value = `Waiting for session... (${attempt}/${maxAttempts})`;
        },
      });

      if (!realSessionId) {
        pendingStatus.value = null;
        toast.error('Session start timed out. Check the CLI and try again.');
        isSubmitting.value = false;
        return;
      }

      sessionId = realSessionId;
      pendingStatus.value = null;
    }
  } else if (result.type === 'requestToApproveDirectoryCreation') {
    toast.error('Directory creation requires approval. Start from the CLI for now.');
    isSubmitting.value = false;
    return;
  } else if (result.type === 'error') {
    toast.error(result.errorMessage || 'Failed to start session');
    isSubmitting.value = false;
    return;
  }

  if (!sessionId) {
    toast.error('Session spawning failed - no session ID returned.');
    isSubmitting.value = false;
    return;
  }

  if (initialPrompt.value.trim()) {
    toast.info('Prompt saved locally. Use the CLI to send messages for now.');
  }

  toast.success('Session started');
  router.push(`/session/${sessionId}`);
  isSubmitting.value = false;
}
</script>

<template>
  <div class="h-full overflow-auto bg-background">
    <div class="max-w-3xl mx-auto px-6 py-8">
      <header class="flex items-center gap-3 mb-10">
        <Button variant="ghost" size="icon" @click="router.push('/')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <h1 class="text-xl font-semibold">Start New Session</h1>
      </header>

      <div class="space-y-8">
        <section>
          <p class="text-sm font-medium mb-3">Session Type</p>
          <div class="space-y-3">
            <button
              class="flex items-center gap-3 text-sm"
              @click="sessionType = 'simple'"
            >
              <span
                class="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center"
              >
                <span
                  class="h-2 w-2 rounded-full bg-primary"
                  :class="sessionType === 'simple' ? 'opacity-100' : 'opacity-0'"
                />
              </span>
              Simple
            </button>
            <button
              class="flex items-center gap-3 text-sm text-muted-foreground"
              @click="sessionType = 'worktree'"
            >
              <span
                class="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center"
              >
                <span
                  class="h-2 w-2 rounded-full bg-primary"
                  :class="sessionType === 'worktree' ? 'opacity-100' : 'opacity-0'"
                />
              </span>
              Worktree
            </button>
          </div>
        </section>

        <section class="space-y-4">
          <div class="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
            <textarea
              v-model="initialPrompt"
              class="min-h-[120px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Type a message..."
            />
            <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full bg-primary" />
                <span class="text-foreground">
                  {{ agentType === 'claude' ? 'Claude' : agentType === 'codex' ? 'Codex' : 'Gemini' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :class="onlineMachines.length ? 'bg-green-500' : 'bg-gray-400'" />
                <span class="text-foreground">
                  {{
                    selectedMachineId
                      ? machineLabel(machinesStore.getMachine(selectedMachineId)!)
                      : 'Select a machine'
                  }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span>↩︎</span>
                <span>Send</span>
              </div>
              <div class="flex items-center gap-2">
                <span>⇥</span>
                <span>Cycle mode</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
            </svg>
            <Input
              v-model="selectedPath"
              class="h-6 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
              placeholder="/Users/you/projects/my-repo"
            />
          </div>
        </section>

        <section class="grid gap-4 md:grid-cols-2">
          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Agent</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                :variant="agentType === 'claude' ? 'default' : 'outline'"
                @click="agentType = 'claude'"
              >
                Claude
              </Button>
              <Button
                type="button"
                size="sm"
                :variant="agentType === 'codex' ? 'default' : 'outline'"
                @click="agentType = 'codex'"
              >
                Codex
              </Button>
              <Button
                type="button"
                size="sm"
                :variant="agentType === 'gemini' ? 'default' : 'outline'"
                @click="agentType = 'gemini'"
              >
                Gemini
              </Button>
            </div>
          </div>

          <div>
            <p class="text-xs uppercase tracking-wide text-muted-foreground">Machine</p>
            <select
              v-model="selectedMachineId"
              class="mt-2 h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option v-if="machines.length === 0" disabled value="">
                No machines connected
              </option>
              <optgroup v-if="onlineMachines.length > 0" label="Online">
                <option v-for="machine in onlineMachines" :key="machine.id" :value="machine.id">
                  {{ machineLabel(machine) }}
                </option>
              </optgroup>
              <optgroup v-if="offlineMachines.length > 0" label="Offline">
                <option v-for="machine in offlineMachines" :key="machine.id" :value="machine.id">
                  {{ machineLabel(machine) }} (Offline)
                </option>
              </optgroup>
            </select>
            <p v-if="selectedMachineId" class="mt-2 text-xs text-muted-foreground">
              {{ machineSubtitle(machinesStore.getMachine(selectedMachineId)!) }}
            </p>
          </div>
        </section>

        <div class="flex items-center justify-between">
          <Button variant="ghost" @click="router.push('/')">Cancel</Button>
          <div class="flex items-center gap-3">
            <span v-if="pendingStatus" class="text-xs text-muted-foreground">
              {{ pendingStatus }}
            </span>
            <Button :disabled="!canSubmit || isSubmitting" @click="startSession">
              {{ isSubmitting ? 'Starting...' : 'Start Session' }}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
