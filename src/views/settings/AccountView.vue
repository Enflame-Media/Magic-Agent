<script setup lang="ts">
/**
 * Account Settings - Profile and Authentication Management
 *
 * Allows users to:
 * - View and edit profile information
 * - Manage connected accounts (GitHub, Claude)
 * - View account status
 */

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

const router = useRouter();
const authStore = useAuthStore();

// User info
const displayName = computed(() => authStore.displayName || 'User');
const initials = computed(() => authStore.initials || 'U');
const account = computed(() => authStore.account);
const isGitHubConnected = computed(() => !!account.value?.github);

// Dialog state
const showDisconnectDialog = ref(false);

function goBack() {
  router.push('/settings');
}

// Placeholder handlers for account actions
function connectGitHub() {
  // Would trigger GitHub OAuth flow
  toast.info('GitHub OAuth not yet implemented');
}

function openDisconnectDialog() {
  showDisconnectDialog.value = true;
}

function handleDisconnect() {
  // Would call API to disconnect
  toast.info('Disconnect not yet implemented');
  showDisconnectDialog.value = false;
}
</script>

<template>
  <div class="container mx-auto px-4 py-6 max-w-2xl">
    <!-- Header -->
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
      <h1 class="text-2xl font-semibold">Account</h1>
    </header>

    <div class="space-y-6">
      <!-- Profile Section -->
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div class="flex items-center gap-4">
            <Avatar class="h-16 w-16">
              <AvatarFallback class="text-lg bg-primary/10 text-primary">
                {{ initials }}
              </AvatarFallback>
            </Avatar>
            <div>
              <p class="text-lg font-medium">{{ displayName }}</p>
              <p class="text-sm text-muted-foreground">
                Account ID: {{ account?.id?.slice(0, 8) }}...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Connected Accounts -->
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>External services linked to your account</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <!-- GitHub -->
          <div class="flex items-center justify-between p-3 rounded-lg border">
            <div class="flex items-center gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              <div>
                <p class="font-medium">GitHub</p>
                <p v-if="isGitHubConnected && account?.github" class="text-sm text-muted-foreground">
                  @{{ account.github.login }}
                </p>
                <p v-else class="text-sm text-muted-foreground">
                  Not connected
                </p>
              </div>
            </div>
            <Button
              v-if="isGitHubConnected"
              variant="outline"
              size="sm"
              @click="openDisconnectDialog"
            >
              Disconnect
            </Button>
            <Button
              v-else
              variant="outline"
              size="sm"
              @click="connectGitHub"
            >
              Connect
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Disconnect GitHub Dialog -->
    <AlertDialog v-model:open="showDisconnectDialog">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect GitHub?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove your GitHub connection. You can reconnect at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" @click="handleDisconnect">
            Disconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
