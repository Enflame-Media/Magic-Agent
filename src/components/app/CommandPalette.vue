<script setup lang="ts">
/**
 * CommandPalette - Global command palette for navigation and actions
 *
 * Provides Cmd/Ctrl+K searchable command interface for:
 * - Quick navigation to sessions
 * - Application-wide actions (new session, settings, etc.)
 * - Theme toggling
 *
 * @see HAP-918 - Desktop Enhancements - Keyboard Shortcuts
 */

import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandPaletteState } from '@/composables/useKeyboardShortcuts';
import { useSessionsStore, type Session } from '@/stores/sessions';
import { useDarkMode } from '@/composables/useDarkMode';

const router = useRouter();
const sessionsStore = useSessionsStore();
const { isDark, toggle: toggleDarkMode } = useDarkMode();
const { isOpen, close } = useCommandPaletteState();

const searchQuery = ref('');

// Sessions for quick navigation
const activeSessions = computed(() => sessionsStore.activeSessions);

// Navigation items
const navigationItems = [
  { label: 'Home', icon: 'home', path: '/', shortcut: 'H' },
  { label: 'New Session', icon: 'plus', path: '/new', shortcut: 'N' },
  { label: 'Artifacts', icon: 'file', path: '/artifacts', shortcut: 'A' },
  { label: 'Friends', icon: 'users', path: '/friends', shortcut: 'F' },
  { label: 'Settings', icon: 'settings', path: '/settings', shortcut: 'S' },
];

// Settings pages
const settingsItems = [
  { label: 'Account Settings', path: '/settings/account' },
  { label: 'Appearance', path: '/settings/appearance' },
  { label: 'Language', path: '/settings/language' },
  { label: 'Privacy', path: '/settings/privacy' },
  { label: 'Voice Settings', path: '/settings/voice' },
];

function getSessionName(session: Session): string {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.name || meta.title || `Session ${session.id.slice(0, 8)}`;
  } catch {
    return `Session ${session.id.slice(0, 8)}`;
  }
}

function getSessionPath(session: Session): string | null {
  try {
    const meta = JSON.parse(session.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
}

function navigateTo(path: string) {
  router.push(path);
  close();
  searchQuery.value = '';
}

function handleToggleTheme() {
  toggleDarkMode();
  close();
  searchQuery.value = '';
}

// Reset search when dialog closes
watch(isOpen, (open) => {
  if (!open) {
    searchQuery.value = '';
  }
});
</script>

<template>
  <CommandDialog
    :open="isOpen"
    title="Command Palette"
    description="Search for commands, sessions, or navigate to pages"
    @update:open="(open: boolean) => !open && close()"
  >
    <CommandInput
      v-model="searchQuery"
      placeholder="Type a command or search..."
    />
    <CommandList>
      <CommandEmpty>No results found.</CommandEmpty>

      <!-- Quick Actions -->
      <CommandGroup heading="Actions">
        <CommandItem value="new-session" @select="navigateTo('/new')">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <span>New Session</span>
          <CommandShortcut>⌘N</CommandShortcut>
        </CommandItem>
        <CommandItem
          value="toggle-theme"
          @select="handleToggleTheme"
        >
          <svg
            v-if="isDark"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
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
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
          <span>{{ isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}</span>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <!-- Active Sessions -->
      <CommandGroup v-if="activeSessions.length > 0" heading="Active Sessions">
        <CommandItem
          v-for="session in activeSessions"
          :key="session.id"
          :value="`session-${session.id}`"
          @select="navigateTo(`/session/${session.id}`)"
        >
          <span class="mr-2 h-2 w-2 rounded-full bg-emerald-500" />
          <div class="flex flex-col">
            <span>{{ getSessionName(session) }}</span>
            <span v-if="getSessionPath(session)" class="text-xs text-muted-foreground">
              {{ getSessionPath(session) }}
            </span>
          </div>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator v-if="activeSessions.length > 0" />

      <!-- Navigation -->
      <CommandGroup heading="Navigation">
        <CommandItem
          v-for="item in navigationItems"
          :key="item.path"
          :value="item.label.toLowerCase()"
          @select="navigateTo(item.path)"
        >
          <svg
            v-if="item.icon === 'home'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <svg
            v-else-if="item.icon === 'plus'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          <svg
            v-else-if="item.icon === 'file'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <svg
            v-else-if="item.icon === 'users'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <svg
            v-else-if="item.icon === 'settings'"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>{{ item.label }}</span>
          <CommandShortcut v-if="item.shortcut">⌘{{ item.shortcut }}</CommandShortcut>
        </CommandItem>
      </CommandGroup>

      <CommandSeparator />

      <!-- Settings Pages -->
      <CommandGroup heading="Settings">
        <CommandItem
          v-for="item in settingsItems"
          :key="item.path"
          :value="`settings-${item.label.toLowerCase()}`"
          @select="navigateTo(item.path)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="mr-2 h-4 w-4"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>{{ item.label }}</span>
        </CommandItem>
      </CommandGroup>
    </CommandList>
  </CommandDialog>
</template>
