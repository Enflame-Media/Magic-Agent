<script setup lang="ts">
/**
 * Server Configuration - Display current API endpoint.
 */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getApiBaseUrl } from '@/services/apiBase';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();

const apiUrl = computed(() => getApiBaseUrl());
const isCustom = computed(() => !!(import.meta.env.VITE_API_URL ?? import.meta.env.VITE_HAPPY_SERVER_URL));

function goBack() {
  router.push('/settings');
}

async function copyUrl() {
  await navigator.clipboard.writeText(apiUrl.value);
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
      <h1 class="text-2xl font-semibold">Server</h1>
    </header>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API endpoint</CardTitle>
          <CardDescription>
            Happy uses this server for sync, auth, and data APIs.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Input :model-value="apiUrl" readonly />
          <div class="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{{ isCustom ? 'Custom server' : 'Default server' }}</span>
          </div>
          <div class="flex gap-2">
            <Button variant="outline" @click="copyUrl">Copy URL</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change server</CardTitle>
          <CardDescription>
            Set <span class="font-mono">VITE_HAPPY_SERVER_URL</span> to override the default in development.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  </ResponsiveContainer>
</template>
