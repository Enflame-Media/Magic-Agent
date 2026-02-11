<script setup lang="ts">
/**
 * DesktopNavigation - Desktop sidebar navigation wrapper
 *
 * Renders the sidebar navigation for desktop viewports (lg+).
 * Automatically hidden on mobile where MobileBottomNav takes over.
 *
 * This is a layout-level component that wraps SessionSidebar with
 * responsive visibility and resizable panel integration.
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 * @see HAP-916 - Responsive Design System
 * @see HAP-927 - Resizable Sidebar
 */

import { computed, type HTMLAttributes } from 'vue';
import { cn } from '@/lib/utils';
import { useBreakpoints } from '@/composables/useBreakpoints';

export interface DesktopNavigationProps {
  /**
   * Whether the navigation is collapsed (icon-only mode)
   * @default false
   */
  collapsed?: boolean;

  /**
   * Width of the navigation in pixels (when not collapsed)
   * @default 256
   */
  width?: number;

  /**
   * Additional CSS classes
   */
  class?: HTMLAttributes['class'];
}

const props = withDefaults(defineProps<DesktopNavigationProps>(), {
  collapsed: false,
  width: 256,
});

defineEmits<{
  /** Emitted when collapse state changes */
  (e: 'toggle-collapse'): void;
  /** Emitted when width changes via resize */
  (e: 'resize', width: number): void;
}>();

const { isDesktop } = useBreakpoints();

const navStyle = computed(() => ({
  width: props.collapsed ? '48px' : `${props.width}px`,
}));

const navClass = computed(() =>
  cn(
    'hidden lg:flex flex-col h-full border-r border-border bg-sidebar-background transition-[width] duration-200 ease-in-out',
    props.collapsed && 'items-center',
    props.class,
  )
);
</script>

<template>
  <nav
    v-if="isDesktop"
    :class="navClass"
    :style="navStyle"
    role="navigation"
    aria-label="Desktop navigation"
  >
    <slot />
  </nav>
</template>
