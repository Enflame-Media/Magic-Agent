<script setup lang="ts">
/**
 * SessionSidebar - Sidebar layout for session navigation
 *
 * Shows active and archived sessions with quick navigation,
 * connection status, and a primary action for starting a new session.
 */

import { computed } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { Button } from '@/components/ui/button';
import { ConnectionStatus } from '@/components/app';
import NavUser from '@/components/NavUser.vue';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { useAuthStore } from '@/stores/auth';
import { useSessionsStore, type Session } from '@/stores/sessions';
import { useDarkMode } from '@/composables/useDarkMode';

const route = useRoute();
const router = useRouter();
const sessionsStore = useSessionsStore();
const { isDark, toggle } = useDarkMode();
const authStore = useAuthStore();

const activeSessions = computed(() => sessionsStore.activeSessions);
const inactiveSessions = computed(() => sessionsStore.inactiveSessions);
const hasAnySessions = computed(() => sessionsStore.count > 0);
const displayName = computed(() => authStore.displayName ?? 'Happy User');
const initials = computed(() => authStore.initials ?? 'HU');
const account = computed(() => authStore.account);
const avatarUrl = computed(() => account.value?.avatar?.url ?? account.value?.avatar?.path ?? '');
const accountLabel = computed(() => {
  if (account.value?.github?.login) return `@${account.value.github.login}`;
  if (account.value?.id) return `Account ${account.value.id.slice(0, 8)}`;
  return 'Signed in';
});

const currentSessionId = computed(() => {
  const id = route.params.id;
  return typeof id === 'string' ? id : null;
});

function startNewSession() {
  router.push('/new');
}

function sessionName(session: Session): string {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.name || meta.title || `Session ${session.id.slice(0, 8)}`;
  } catch {
    return `Session ${session.id.slice(0, 8)}`;
  }
}

function sessionPath(session: Session): string | null {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
}

function lastActivity(session: Session): string {
  const date = new Date(session.updatedAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader class="gap-3">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child tooltip="Happy">
            <RouterLink to="/">
              <span class="text-base font-semibold">Happy</span>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      <div class="px-2">
        <Button class="w-full" @click="startNewSession">
          New Session
        </Button>
      </div>

      <div class="px-2">
        <ConnectionStatus />
      </div>
    </SidebarHeader>

    <SidebarContent>
      <div v-if="!hasAnySessions" class="px-3 text-sm text-muted-foreground">
        Connect a terminal running the Happy CLI to see your sessions.
      </div>

      <template v-else>
        <SidebarGroup v-if="activeSessions.length > 0">
          <SidebarGroupLabel>Active Sessions</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="session in activeSessions" :key="session.id">
              <SidebarMenuButton
                as-child
                :is-active="session.id === currentSessionId"
                size="lg"
              >
                <RouterLink :to="`/session/${session.id}`">
                  <span class="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                  <span class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium leading-none">
                      {{ sessionName(session) }}
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {{ sessionPath(session) ?? 'Active session' }}
                    </span>
                  </span>
                </RouterLink>
              </SidebarMenuButton>
              <SidebarMenuBadge>
                {{ lastActivity(session) }}
              </SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarSeparator v-if="activeSessions.length > 0 && inactiveSessions.length > 0" />

        <SidebarGroup v-if="inactiveSessions.length > 0">
          <SidebarGroupLabel>Archived Sessions</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem v-for="session in inactiveSessions" :key="session.id">
              <SidebarMenuButton
                as-child
                :is-active="session.id === currentSessionId"
                size="lg"
              >
                <RouterLink :to="`/session/${session.id}`">
                  <span class="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60" />
                  <span class="flex flex-col gap-0.5">
                    <span class="text-sm font-medium leading-none">
                      {{ sessionName(session) }}
                    </span>
                    <span class="text-xs text-muted-foreground">
                      {{ sessionPath(session) ?? 'Archived session' }}
                    </span>
                  </span>
                </RouterLink>
              </SidebarMenuButton>
              <SidebarMenuBadge>
                {{ lastActivity(session) }}
              </SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </template>
    </SidebarContent>

    <SidebarFooter class="gap-2">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            tooltip="Toggle theme"
            @click="toggle"
          >
            <svg
              v-if="isDark"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
            <span>{{ isDark ? 'Light mode' : 'Dark mode' }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <NavUser
        :user="{
          name: displayName,
          email: accountLabel,
          avatar: avatarUrl,
          initials,
        }"
      />
    </SidebarFooter>
  </Sidebar>
</template>
