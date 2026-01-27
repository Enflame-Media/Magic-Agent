<script setup lang="ts">
/**
 * Features Settings - Experimental and advanced feature controls.
 */
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';

const router = useRouter();

const showContextMeter = ref(true);
const enableCompactSessions = ref(false);
const enableAdvancedTools = ref(false);

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <header class="flex items-center gap-4 mb-6">
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
      <h1 class="text-2xl font-semibold">Features</h1>
    </header>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Experimental</CardTitle>
          <CardDescription>Try in-development features before they ship.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p class="font-medium">Context meter</p>
              <p class="text-sm text-muted-foreground">Show context usage in the session header.</p>
            </div>
            <Switch v-model:checked="showContextMeter" />
          </div>
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p class="font-medium">Compact sessions</p>
              <p class="text-sm text-muted-foreground">Use denser session rows in lists.</p>
            </div>
            <Switch v-model:checked="enableCompactSessions" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced</CardTitle>
          <CardDescription>Controls for power-user workflows.</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p class="font-medium">Advanced tool views</p>
              <p class="text-sm text-muted-foreground">Enable experimental tool renderers.</p>
            </div>
            <Switch v-model:checked="enableAdvancedTools" />
          </div>
          <p class="text-sm text-muted-foreground">
            These options are stored locally and will be wired to shared settings.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
