<script setup lang="ts">
/**
 * MobileBottomNav - Mobile-optimized bottom navigation
 *
 * Replaces the desktop sidebar on mobile viewports (< 640px).
 * Provides touch-friendly navigation with 44px minimum touch targets.
 *
 * @see HAP-916 - Responsive Design System
 */

import { computed } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import {
  IconHome,
  IconPlus,
  IconUsers,
  IconSettings,
  IconFolder,
} from '@tabler/icons-vue';
import { useSessionsStore } from '@/stores/sessions';
import { cn } from '@/lib/utils';

const route = useRoute();
const sessionsStore = useSessionsStore();

const hasActiveSessions = computed(() => sessionsStore.activeSessions.length > 0);
const sessionCount = computed(() => sessionsStore.count);

interface NavItem {
  name: string;
  to: string;
  icon: typeof IconHome;
  badge?: number | string;
  highlight?: boolean;
}

const navItems = computed<NavItem[]>(() => [
  {
    name: 'Home',
    to: '/',
    icon: IconHome,
  },
  {
    name: 'Sessions',
    to: hasActiveSessions.value
      ? `/session/${sessionsStore.activeSessions[0]?.id}`
      : '/',
    icon: IconFolder,
    badge: sessionCount.value > 0 ? sessionCount.value : undefined,
  },
  {
    name: 'New',
    to: '/new',
    icon: IconPlus,
    highlight: true,
  },
  {
    name: 'Friends',
    to: '/friends',
    icon: IconUsers,
  },
  {
    name: 'Settings',
    to: '/settings',
    icon: IconSettings,
  },
]);

function isActive(item: NavItem): boolean {
  if (item.to === '/') {
    return route.path === '/';
  }
  return route.path.startsWith(item.to);
}
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur-sm safe-area-bottom"
    role="navigation"
    aria-label="Main navigation"
  >
    <ul class="flex items-center justify-around px-2 py-1">
      <li v-for="item in navItems" :key="item.name" class="flex-1">
        <RouterLink
          :to="item.to"
          :class="cn(
            'nav-touch-item relative w-full transition-colors',
            isActive(item)
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground',
            item.highlight && 'text-primary-foreground'
          )"
          :aria-current="isActive(item) ? 'page' : undefined"
        >
          <!-- Highlight button (primary action) -->
          <span
            v-if="item.highlight"
            class="flex h-12 w-12 items-center justify-center rounded-full bg-primary shadow-lg"
          >
            <component :is="item.icon" class="h-6 w-6" stroke-width="2" />
          </span>

          <!-- Regular nav item -->
          <template v-else>
            <span class="relative">
              <component :is="item.icon" class="h-6 w-6" stroke-width="1.5" />
              <!-- Badge -->
              <span
                v-if="item.badge"
                class="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
              >
                {{ typeof item.badge === 'number' && item.badge > 99 ? '99+' : item.badge }}
              </span>
            </span>
            <span class="text-[10px] font-medium leading-tight">
              {{ item.name }}
            </span>
          </template>

          <!-- Active indicator -->
          <span
            v-if="isActive(item) && !item.highlight"
            class="absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full bg-primary"
          />
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
