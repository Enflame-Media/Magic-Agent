<script setup lang="ts">
/**
 * Login View - Entry point for authentication
 *
 * Renders the shadcn-vue login-03 block with Happy authentication flows.
 */

import { ref } from 'vue';
import { useRouter } from 'vue-router';
import LoginForm from '@/components/new-york-v4/blocks/login-03/components/LoginForm.vue';

const router = useRouter();
const isLoading = ref(false);

function goToScanner() {
  router.push('/auth/scan');
}

function goToMobileAuth() {
  router.push('/auth/connect');
}

function goToManualEntry() {
  router.push('/auth/manual');
}
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div class="hidden flex-col justify-between bg-muted/40 px-10 py-12 lg:flex">
        <div>
          <h1 class="text-2xl font-semibold">Happy</h1>
          <p class="mt-2 max-w-md text-sm text-muted-foreground">
            Secure, end-to-end encrypted remote control for Claude Code sessions.
            Pair your CLI and keep context in sync across every device.
          </p>
        </div>
        <div class="rounded-2xl border bg-background/80 p-6 text-sm text-muted-foreground shadow-sm">
          <p class="font-medium text-foreground">Encrypted by default</p>
          <p class="mt-2">
            Your session data is encrypted on-device. The relay never sees plaintext.
          </p>
        </div>
      </div>
      <div class="flex items-center justify-center px-6 py-12">
        <LoginForm
          class="w-full max-w-sm"
          :is-loading="isLoading"
          @mobile-auth="goToMobileAuth"
          @scan="goToScanner"
          @manual="goToManualEntry"
        />
      </div>
    </div>
  </div>
</template>
