<script setup lang="ts">
/**
 * Artifacts View - Full-page artifact browser
 *
 * Displays all session artifacts with file tree navigation
 * and content preview. Can be filtered by session ID.
 *
 * Features:
 * - Offline viewing with cached artifacts (HAP-874)
 * - Session-specific artifact filtering
 *
 * Routes:
 * - /artifacts - All artifacts
 * - /session/:id/artifacts - Session-specific artifacts
 *
 * @see HAP-874 - Offline Artifact Caching
 */

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useArtifactsStore } from '@/stores/artifacts';
import { ArtifactViewer, EmptyState, OfflineIndicator, PullToRefresh } from '@/components/app';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useOfflineArtifacts } from '@/composables/useOfflineArtifacts';
import { useBreakpoints } from '@/composables/useBreakpoints';

const route = useRoute();
const router = useRouter();
const artifactsStore = useArtifactsStore();

// HAP-874: Offline artifacts support
// HAP-932: Pull-to-refresh integration
const { loadCachedArtifacts, loadCachedForSession } = useOfflineArtifacts();
const { isMobile } = useBreakpoints();

// Pull-to-refresh handler (HAP-932)
async function handleRefresh(): Promise<void> {
  if (sessionId.value) {
    // Refresh session-specific artifacts
    await loadCachedForSession(sessionId.value);
  } else {
    // Refresh all artifacts
    await loadCachedArtifacts();
  }
}

// Session ID from route (optional)
const sessionId = computed(() => (route.params.id as string) ?? null);

// Loading state
const isLoading = ref(true);

// Page title
const pageTitle = computed(() => {
  if (sessionId.value) {
    return 'Session Artifacts';
  }
  return 'All Artifacts';
});

// Artifact count
const artifactCount = computed(() => {
  if (sessionId.value) {
    return artifactsStore.artifactsForSession(sessionId.value).length;
  }
  return artifactsStore.count;
});

// Has artifacts?
const hasArtifacts = computed(() => artifactCount.value > 0);

// Navigate back
function goBack() {
  if (sessionId.value) {
    router.push(`/session/${sessionId.value}`);
  } else {
    router.push('/');
  }
}

// Simulate loading (in real app, this would fetch artifacts)
onMounted(() => {
  globalThis.setTimeout(() => {
    isLoading.value = false;
  }, 500);
});
</script>

<template>
  <div class="flex flex-col h-screen bg-background">
    <!-- Header -->
    <header class="flex items-center gap-4 px-4 py-3 border-b bg-background sticky top-0 z-10">
      <!-- Back button -->
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

      <!-- Title -->
      <div class="flex-1 min-w-0">
        <h1 class="font-semibold truncate">{{ pageTitle }}</h1>
        <p class="text-sm text-muted-foreground">
          {{ artifactCount }} {{ artifactCount === 1 ? 'file' : 'files' }}
        </p>
      </div>

      <!-- HAP-874: Offline indicator -->
      <OfflineIndicator />
    </header>

    <!-- Content with pull-to-refresh (HAP-932) -->
    <PullToRefresh
      :enabled="isMobile"
      :mobile-only="true"
      class="flex-1 overflow-hidden"
      @refresh="handleRefresh"
    >
      <div class="h-full p-4">
        <!-- Loading -->
        <div v-if="isLoading" class="h-full flex items-center justify-center">
          <div class="space-y-4 w-full max-w-md">
            <Skeleton class="h-8 w-3/4" />
            <Skeleton class="h-4 w-1/2" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </div>

        <!-- Empty state -->
        <EmptyState
          v-else-if="!hasArtifacts"
          title="No artifacts"
          :description="
            sessionId
              ? 'This session has no artifacts yet.'
              : 'You don\'t have any artifacts. Artifacts are created during Claude Code sessions.'
          "
        />

        <!-- Artifact viewer -->
        <ArtifactViewer
          v-else
          :session-id="sessionId"
          class="h-full"
        />
      </div>
    </PullToRefresh>
  </div>
</template>
