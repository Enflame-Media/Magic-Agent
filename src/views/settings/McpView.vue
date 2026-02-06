<script setup lang="ts">
/**
 * MCP Servers - Overview of connected MCP servers.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSyncStore } from '@/stores/sync';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();
const syncStore = useSyncStore();

const isConnected = computed(() => syncStore.isConnected);

function goBack() {
  router.push('/settings');
}
</script>

<template>
  <ResponsiveContainer size="narrow" padding="default">
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
      <h1 class="text-2xl font-semibold">MCP Servers</h1>
    </header>

    <Card>
      <CardHeader>
        <CardTitle>Connected servers</CardTitle>
        <CardDescription>
          View MCP tools registered on your connected Claude Code machines.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <p v-if="!isConnected" class="text-sm text-muted-foreground">
          Connect a terminal to load MCP servers.
        </p>
        <p v-else class="text-sm text-muted-foreground">
          MCP servers will appear here once a CLI is connected.
        </p>
        <div class="rounded-lg border p-3 text-sm text-muted-foreground">
          MCP configuration is read-only in the web app. Use the CLI to add or remove servers.
        </div>
      </CardContent>
    </Card>
  </ResponsiveContainer>
</template>
