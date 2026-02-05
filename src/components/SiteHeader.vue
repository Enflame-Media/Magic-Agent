<script setup lang="ts">
/**
 * SiteHeader - Application header with sidebar trigger, breadcrumbs, and actions
 *
 * @see HAP-916 - Responsive Design System
 * @see HAP-918 - Breadcrumb Navigation
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */
import type { HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Kbd } from '@/components/ui/kbd';
import AppBreadcrumbs from '@/components/app/AppBreadcrumbs.vue';
import { useCommandPaletteState } from '@/composables/useKeyboardShortcuts';
import { useBreakpoints } from '@/composables/useBreakpoints';

const props = defineProps<{
  title?: string;
  class?: HTMLAttributes['class'];
}>();

const { open: openCommandPalette } = useCommandPaletteState();
const { isLargeScreen } = useBreakpoints();
</script>

<template>
  <header
    role="banner"
    :class="cn(
      'flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)',
      props.class,
    )"
  >
    <div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
      <SidebarTrigger class="-ml-1" aria-label="Toggle sidebar" />
      <Separator
        orientation="vertical"
        class="mx-2 data-[orientation=vertical]:h-4"
        aria-hidden="true"
      />

      <!-- Breadcrumbs for xl+ screens (HAP-918) -->
      <AppBreadcrumbs v-if="isLargeScreen" />

      <!-- Title fallback for smaller screens or when no breadcrumbs -->
      <h1 v-if="!isLargeScreen" class="text-base font-medium">
        {{ props.title ?? 'Dashboard' }}
      </h1>

      <div class="ml-auto flex items-center gap-2">
        <slot name="actions" />

        <!-- Command palette trigger for xl+ screens (HAP-918) -->
        <Button
          v-if="isLargeScreen"
          variant="outline"
          size="sm"
          class="hidden xl:flex items-center gap-2 text-muted-foreground"
          aria-label="Open command palette (Cmd+K)"
          @click="openCommandPalette"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span class="hidden lg:inline">Search...</span>
          <Kbd class="hidden lg:inline-flex">&#x2318;K</Kbd>
        </Button>
      </div>
    </div>
  </header>
</template>
