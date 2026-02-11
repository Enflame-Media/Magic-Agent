<script setup lang="ts">
/**
 * Claude Connect - Connect a CLI to the web app.
 */
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ResponsiveContainer from '@/components/app/ResponsiveContainer.vue';

const router = useRouter();

function goBack() {
  router.push('/settings');
}

function connectWithQr() {
  router.push('/auth/scan');
}

function connectWithManual() {
  router.push('/auth/manual');
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
      <h1 class="text-2xl font-semibold">Connect Claude</h1>
    </header>

    <div class="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Link your terminal</CardTitle>
          <CardDescription>
            Run happy-cli on your computer, then connect the session here to sync securely.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <ol class="list-decimal list-inside text-sm text-muted-foreground space-y-1">
            <li>Open a terminal and run <span class="font-mono">happy</span>.</li>
            <li>Choose “Connect device” in the CLI.</li>
            <li>Scan the QR code or paste the link manually.</li>
          </ol>
          <div class="flex flex-wrap gap-3 pt-2">
            <Button @click="connectWithQr">Scan QR code</Button>
            <Button variant="outline" @click="connectWithManual">Paste link</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security note</CardTitle>
          <CardDescription>
            Connection links are processed locally in your browser and are never sent to Happy servers.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  </ResponsiveContainer>
</template>
