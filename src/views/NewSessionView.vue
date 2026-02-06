<script setup lang="ts">
/**
 * New Session View
 *
 * Mirrors the Happy mobile flow for starting a new session:
 * - Select machine
 * - Choose path
 * - Pick session type + agent
 *
 * Uses TanStack Form with Zod validation.
 */

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { useForm } from '@tanstack/vue-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, FieldLabel, FieldError, isInvalid } from '@/components/ui/form';
import { useMachinesStore, type Machine } from '@/stores/machines';
import { machineSpawnNewSession, isTemporaryPidSessionId, pollForRealSession } from '@/services/sync/ops';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();
const { t } = useI18n();
const machinesStore = useMachinesStore();

// ─────────────────────────────────────────────────────────────────────────────
// Form Schema
// ─────────────────────────────────────────────────────────────────────────────

const newSessionSchema = z.object({
  machineId: z.string().min(1, 'Please select a machine'),
  path: z.string()
    .min(1, 'Path is required')
    .regex(/^\//, 'Path must be an absolute path starting with /'),
  sessionType: z.enum(['simple', 'worktree']),
  agentType: z.enum(['claude', 'codex', 'gemini']),
  initialPrompt: z.string().default(''),
});

type NewSessionFormValues = z.infer<typeof newSessionSchema>;

type SessionType = 'simple' | 'worktree';
type AgentType = 'claude' | 'codex' | 'gemini';

// ─────────────────────────────────────────────────────────────────────────────
// Form Setup
// ─────────────────────────────────────────────────────────────────────────────

const isSubmitting = ref(false);
const pendingStatus = ref<string | null>(null);

const machines = computed(() => machinesStore.machinesList);
const onlineMachines = computed(() => machinesStore.onlineMachines);
const offlineMachines = computed(() => machinesStore.offlineMachines);

// Get default machine (first online, or first available)
const defaultMachineId = computed(() => {
  const preferred = onlineMachines.value[0] ?? machines.value[0];
  return preferred?.id ?? '';
});

const form = useForm({
  defaultValues: {
    machineId: defaultMachineId.value,
    path: '',
    sessionType: 'simple' as SessionType,
    agentType: 'claude' as AgentType,
    initialPrompt: '',
  },
  onSubmit: async ({ value }) => {
    // Validate with Zod before submitting
    const result = newSessionSchema.safeParse(value);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? 'Validation failed');
      return;
    }
    await startSession(result.data);
  },
});

// Update machine selection when machines list changes
watch(
  [machines, defaultMachineId],
  ([, newDefault]) => {
    const currentMachine = form.getFieldValue('machineId');
    if (!currentMachine && newDefault) {
      form.setFieldValue('machineId', newDefault);
    }
  },
  { immediate: true }
);

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Submit Handler
// ─────────────────────────────────────────────────────────────────────────────

async function startSession(values: NewSessionFormValues): Promise<void> {
  isSubmitting.value = true;
  pendingStatus.value = null;

  const spawnStartTime = Date.now();

  let result;
  try {
    result = await machineSpawnNewSession({
      machineId: values.machineId,
      directory: values.path,
      approvedNewDirectoryCreation: true,
      agent: values.agentType,
    });
  } catch (error) {
    console.error('[NewSessionView] Failed to spawn session:', error);
    toast.error(t('newSession.failedToStart'));
    isSubmitting.value = false;
    return;
  }

  let sessionId: string | null = null;

  // Handle success response
  if (result.type === 'success') {
    // Validate sessionId is present and non-empty
    if (!result.sessionId) {
      console.error('[NewSessionView] Success response missing sessionId:', result);
      toast.error(t('newSession.sessionSpawningFailed'));
      isSubmitting.value = false;
      return;
    }

    sessionId = result.sessionId;

    // Check if this is a temporary PID-based session ID (CLI is still waiting for real session)
    if (isTemporaryPidSessionId(result.sessionId)) {
      pendingStatus.value = t('newSession.sessionPolling');
      const realSessionId = await pollForRealSession(values.machineId, spawnStartTime, {
        interval: 5000,
        maxAttempts: 24,
        onPoll: (attempt, maxAttempts) => {
          pendingStatus.value = t('newSession.sessionPollingProgress', { attempt, maxAttempts });
        },
      });

      if (!realSessionId) {
        pendingStatus.value = null;
        // Session is starting but taking too long - inform user but don't treat as error
        toast.warning(t('newSession.sessionStartingSlow'));
        isSubmitting.value = false;
        return;
      }

      sessionId = realSessionId;
      pendingStatus.value = null;
    }
  } else if (result.type === 'requestToApproveDirectoryCreation') {
    toast.error(t('newSession.directoryDoesNotExist'));
    isSubmitting.value = false;
    return;
  } else if (result.type === 'error') {
    toast.error(result.errorMessage || t('newSession.failedToStart'));
    isSubmitting.value = false;
    return;
  } else {
    // Unknown response type - log for debugging and show generic error
    console.error('[NewSessionView] Unexpected response type:', result);
    toast.error(t('newSession.failedToStart'));
    isSubmitting.value = false;
    return;
  }

  // Final validation that we have a valid session ID
  if (!sessionId) {
    console.error('[NewSessionView] No session ID after processing:', result);
    toast.error(t('newSession.sessionSpawningFailed'));
    isSubmitting.value = false;
    return;
  }

  if (values.initialPrompt?.trim()) {
    toast.info('Prompt saved locally. Use the CLI to send messages for now.');
  }

  toast.success(t('newSession.sessionStarted'));
  router.push(`/session/${sessionId}`);
  isSubmitting.value = false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form State
// ─────────────────────────────────────────────────────────────────────────────

const canSubmit = computed(() => {
  const machineId = form.getFieldValue('machineId');
  const path = form.getFieldValue('path');
  return Boolean(machineId && path?.trim());
});
</script>

<template>
  <div class="h-full overflow-auto bg-background">
    <ResponsiveContainer size="narrow" padding="comfortable">
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

      <form @submit.prevent="form.handleSubmit">
        <div class="space-y-8">
          <!-- Session Type -->
          <form.Field name="sessionType" v-slot="{ field }">
            <section>
              <p class="text-sm font-medium mb-3">Session Type</p>
              <div class="space-y-3">
                <button
                  type="button"
                  class="flex items-center gap-3 text-sm"
                  @click="field.handleChange('simple')"
                >
                  <span
                    class="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center"
                  >
                    <span
                      class="h-2 w-2 rounded-full bg-primary"
                      :class="field.state.value === 'simple' ? 'opacity-100' : 'opacity-0'"
                    />
                  </span>
                  Simple
                </button>
                <button
                  type="button"
                  class="flex items-center gap-3 text-sm text-muted-foreground"
                  @click="field.handleChange('worktree')"
                >
                  <span
                    class="h-4 w-4 rounded-full border border-muted-foreground flex items-center justify-center"
                  >
                    <span
                      class="h-2 w-2 rounded-full bg-primary"
                      :class="field.state.value === 'worktree' ? 'opacity-100' : 'opacity-0'"
                    />
                  </span>
                  Worktree
                </button>
              </div>
            </section>
          </form.Field>

          <!-- Initial Prompt & Path -->
          <section class="space-y-4">
            <form.Field name="initialPrompt" v-slot="{ field }">
              <div class="rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <textarea
                  :value="field.state.value"
                  @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
                  @blur="field.handleBlur"
                  class="min-h-[120px] w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Type a message..."
                />
                <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <form.Field name="agentType" v-slot="{ field: agentField }">
                    <div class="flex items-center gap-2">
                      <span class="h-2 w-2 rounded-full bg-primary" />
                      <span class="text-foreground">
                        {{ agentField.state.value === 'claude' ? 'Claude' : agentField.state.value === 'codex' ? 'Codex' : 'Gemini' }}
                      </span>
                    </div>
                  </form.Field>
                  <form.Field name="machineId" v-slot="{ field: machineField }">
                    <div class="flex items-center gap-2">
                      <span class="h-2 w-2 rounded-full" :class="onlineMachines.length ? 'bg-green-500' : 'bg-gray-400'" />
                      <span class="text-foreground">
                        {{
                          machineField.state.value
                            ? machineLabel(machinesStore.getMachine(machineField.state.value)!)
                            : 'Select a machine'
                        }}
                      </span>
                    </div>
                  </form.Field>
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
            </form.Field>

            <form.Field name="path" v-slot="{ field }">
              <Field :data-invalid="isInvalid(field)">
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
                    :id="field.name"
                    :model-value="field.state.value"
                    @input="field.handleChange(($event.target as HTMLInputElement).value)"
                    @blur="field.handleBlur"
                    class="h-6 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
                    placeholder="/Users/you/projects/my-repo"
                  />
                </div>
                <FieldError
                  v-if="isInvalid(field)"
                  :errors="field.state.meta.errors"
                  class="mt-1 ml-4"
                />
              </Field>
            </form.Field>
          </section>

          <!-- Agent & Machine Selection -->
          <section class="grid gap-4 md:grid-cols-2">
            <form.Field name="agentType" v-slot="{ field }">
              <Field>
                <FieldLabel class="text-xs uppercase tracking-wide text-muted-foreground">Agent</FieldLabel>
                <div class="mt-2 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    :variant="field.state.value === 'claude' ? 'default' : 'outline'"
                    @click="field.handleChange('claude')"
                  >
                    Claude
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    :variant="field.state.value === 'codex' ? 'default' : 'outline'"
                    @click="field.handleChange('codex')"
                  >
                    Codex
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    :variant="field.state.value === 'gemini' ? 'default' : 'outline'"
                    @click="field.handleChange('gemini')"
                  >
                    Gemini
                  </Button>
                </div>
              </Field>
            </form.Field>

            <form.Field name="machineId" v-slot="{ field }">
              <Field :data-invalid="isInvalid(field)">
                <FieldLabel class="text-xs uppercase tracking-wide text-muted-foreground">Machine</FieldLabel>
                <select
                  :value="field.state.value"
                  @change="field.handleChange(($event.target as HTMLSelectElement).value)"
                  @blur="field.handleBlur"
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
                <p v-if="field.state.value" class="mt-2 text-xs text-muted-foreground">
                  {{ machineSubtitle(machinesStore.getMachine(field.state.value)!) }}
                </p>
                <FieldError
                  v-if="isInvalid(field)"
                  :errors="field.state.meta.errors"
                  class="mt-1"
                />
              </Field>
            </form.Field>
          </section>

          <!-- Actions -->
          <div class="flex items-center justify-between">
            <Button type="button" variant="ghost" @click="router.push('/')">Cancel</Button>
            <div class="flex items-center gap-3">
              <span v-if="pendingStatus" class="text-xs text-muted-foreground">
                {{ pendingStatus }}
              </span>
              <Button type="submit" :disabled="!canSubmit || isSubmitting">
                {{ isSubmitting ? 'Starting...' : 'Start Session' }}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </ResponsiveContainer>
  </div>
</template>
