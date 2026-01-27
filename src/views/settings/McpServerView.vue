<script setup lang="ts">
/**
 * MCP Server Detail - Server tool inventory.
 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const router = useRouter();
const route = useRoute();

const serverName = computed(() => String(route.params.server ?? 'Unknown'));

function goBack() {
  router.push('/settings/mcp');
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
      <h1 class="text-2xl font-semibold">{{ serverName }}</h1>
    </header>

    <Card>
      <CardHeader>
        <CardTitle>Tools</CardTitle>
        <CardDescription>
          Tool details will appear here once MCP data is wired to the UI.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="rounded-lg border p-4 text-sm text-muted-foreground">
          No tools loaded yet.
        </div>
      </CardContent>
    </Card>
  </div>
</template>
