<script setup lang="ts">
/**
 * Root Vue component for Happy web application
 *
 * Renders the router-view for client-side navigation.
 * Includes dark mode toggle, Sonner toast provider, WebSocket sync,
 * session revival error handling, responsive layout (HAP-916),
 * keyboard shortcuts with command palette (HAP-918),
 * resizable sidebar with drag handles (HAP-927),
 * mobile swipe navigation (HAP-919),
 * and skip links with ARIA landmarks for accessibility (HAP-963).
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useWindowSize } from '@vueuse/core';
import { Toaster } from '@/components/ui/sonner';
import { useSync } from '@/composables/useSync';
import { useSessionRevival } from '@/composables/useSessionRevival';
import { useRevivalCooldown, type RevivalCooldownState } from '@/composables/useRevivalCooldown';
import { useBreakpoints } from '@/composables/useBreakpoints';
import { useKeyboardShortcuts } from '@/composables/useKeyboardShortcuts';
import { useSidebarState } from '@/composables/useSidebarState';
import { useSwipeNavigation, shouldEnableSwipeForRoute } from '@/composables/useSwipeNavigation';
import { useAuthStore } from '@/stores/auth';
import { storeToRefs } from 'pinia';
import SessionErrorDialog from '@/components/app/SessionErrorDialog.vue';
import RevivalCooldownBanner from '@/components/app/RevivalCooldownBanner.vue';
import SessionSidebar from '@/components/app/SessionSidebar.vue';
import MobileBottomNav from '@/components/app/MobileBottomNav.vue';
import CommandPalette from '@/components/app/CommandPalette.vue';
import SkipLink from '@/components/app/SkipLink.vue';
import SiteHeader from '@/components/SiteHeader.vue';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const route = useRoute();

// Initialize WebSocket sync - auto-connects when authenticated (HAP-671)
useSync();

// Initialize global keyboard shortcuts (HAP-918, HAP-963)
// This registers Cmd/Ctrl+K for command palette, Cmd/Ctrl+/ for sidebar, and Escape for closing modals
const {
  registerSidebarToggle,
  unregisterSidebarToggle,
} = useKeyboardShortcuts();

// Session revival error handling (HAP-736)
const {
  revivalFailed,
  copySessionId,
  archiveFailedSession,
  dismissError,
} = useSessionRevival();

// Session revival cooldown banner (HAP-870)
// Note: useRevivalCooldown's return type has an incorrect interface definition
// (uses `typeof ref<T>` instead of `Ref<T>`), so we cast to access .value
const { cooldown: cooldownRef, clearCooldown } = useRevivalCooldown();
const cooldown = computed(() => (cooldownRef as { value: RevivalCooldownState | null }).value);

// Responsive breakpoints (HAP-916)
const { isMobile } = useBreakpoints();

// Swipe navigation for mobile (HAP-919)
const mobileMainRef = ref<HTMLElement | null>(null);
const swipeEnabled = computed(() => isMobile.value && shouldEnableSwipeForRoute(route.name));
const { containerRef: swipeContainerRef } = useSwipeNavigation({
  enabled: swipeEnabled.value,
  threshold: 50,
  enableBack: true,
  enableForward: true,
});

// Sync swipe container ref with mobile main ref
watch(mobileMainRef, (el) => {
  swipeContainerRef.value = el;
}, { immediate: true });

// Resizable sidebar state (HAP-927)
const { width: sidebarWidth, setWidth: setSidebarWidth, reset: resetSidebarWidth, toggleCollapsed, config: sidebarConfig } = useSidebarState();
const { width: windowWidth } = useWindowSize();

// Register Cmd/Ctrl+/ sidebar toggle (HAP-963)
onMounted(() => {
  registerSidebarToggle('app-sidebar', () => {
    toggleCollapsed();
  });
});

onUnmounted(() => {
  unregisterSidebarToggle('app-sidebar');
});

// Convert pixel width to percentage for ResizablePanel
// Based on window width since ResizablePanelGroup fills the viewport
const sidebarDefaultSize = computed(() => {
  if (windowWidth.value === 0) return 15; // Fallback during SSR
  return (sidebarWidth.value / windowWidth.value) * 100;
});

// Min/max percentages calculated from pixel constraints
const sidebarMinSize = computed(() => {
  if (windowWidth.value === 0) return 10;
  return (sidebarConfig.minWidth / windowWidth.value) * 100;
});

const sidebarMaxSize = computed(() => {
  if (windowWidth.value === 0) return 25;
  return (sidebarConfig.maxWidth / windowWidth.value) * 100;
});

// Handle resize events to persist width in pixels
function handleSidebarResize(size: number) {
  if (windowWidth.value > 0) {
    const pixelWidth = Math.round((size / 100) * windowWidth.value);
    setSidebarWidth(pixelWidth);
  }
}

// Auth state for conditional UI
const authStore = useAuthStore();
const { isAuthenticated } = storeToRefs(authStore);

const showShell = computed(() => isAuthenticated.value && route.meta.requiresAuth);
const pageTitle = computed(() => {
  const name = String(route.name ?? '');
  const titles: Record<string, string> = {
    home: 'Dashboard',
    'new-session': 'New Session',
    session: 'Session',
    'session-info': 'Session Details',
    'session-artifacts': 'Session Artifacts',
    artifacts: 'Artifacts',
    friends: 'Friends',
    'friend-profile': 'Friend Profile',
    settings: 'Settings',
    'settings-account': 'Account',
    'settings-appearance': 'Appearance',
    'settings-language': 'Language',
    'settings-privacy': 'Privacy',
    'settings-voice': 'Voice',
  };

  return titles[name] ?? 'Happy';
});
</script>

<template>
  <!-- Sonner toast provider for notifications -->
  <Toaster />

  <!-- Global command palette (HAP-918) -->
  <CommandPalette />

  <!-- Session revival error dialog (HAP-736) -->
  <SessionErrorDialog
    :revival-failed="revivalFailed"
    @copy="copySessionId"
    @archive="archiveFailedSession"
    @dismiss="dismissError"
  />

  <!-- Session revival cooldown banner (HAP-870) -->
  <RevivalCooldownBanner
    v-if="cooldown"
    :remaining-seconds="cooldown.remainingSeconds"
    @dismiss="clearCooldown"
  />

  <!-- Desktop layout with resizable sidebar (HAP-916, HAP-927) -->
  <div v-if="showShell && !isMobile" id="happy-app" class="min-h-screen bg-background">
    <!-- Skip link for keyboard/screen reader users (HAP-963) -->
    <SkipLink target-id="main-content" />

    <SidebarProvider class="min-h-svh">
      <ResizablePanelGroup direction="horizontal" class="min-h-svh">
        <!-- Sidebar panel with drag-to-resize (HAP-927) -->
        <ResizablePanel
          :default-size="sidebarDefaultSize"
          :min-size="sidebarMinSize"
          :max-size="sidebarMaxSize"
          @resize="handleSidebarResize"
        >
          <SessionSidebar />
        </ResizablePanel>

        <!-- Resize handle with tooltip for discoverability (HAP-934) -->
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <ResizableHandle
                class="hover:bg-primary/20 transition-colors"
                aria-label="Resize sidebar"
                @dblclick="resetSidebarWidth"
              />
            </TooltipTrigger>
            <TooltipContent>
              Double-click to reset to default width
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <!-- Main content panel -->
        <ResizablePanel :default-size="100 - sidebarDefaultSize">
          <SidebarInset>
            <SiteHeader :title="pageTitle" />
            <main id="main-content" class="flex min-h-0 flex-1 flex-col" role="main" :aria-label="pageTitle">
              <RouterView />
            </main>
          </SidebarInset>
        </ResizablePanel>
      </ResizablePanelGroup>
    </SidebarProvider>
  </div>

  <!-- Mobile layout with bottom navigation and swipe gestures (HAP-916, HAP-919) -->
  <div v-else-if="showShell && isMobile" id="happy-app" class="min-h-screen bg-background">
    <!-- Skip link for keyboard/screen reader users (HAP-963) -->
    <SkipLink target-id="main-content" />

    <SiteHeader :title="pageTitle" class="sticky top-0 z-40" />
    <main
      id="main-content"
      ref="mobileMainRef"
      class="flex min-h-0 flex-1 flex-col pb-20 touch-pan-y"
      role="main"
      :aria-label="pageTitle"
    >
      <RouterView />
    </main>
    <MobileBottomNav />
  </div>

  <!-- Unauthenticated layout -->
  <div v-else class="min-h-screen bg-background">
    <main role="main" aria-label="Authentication">
      <RouterView />
    </main>
  </div>
</template>
