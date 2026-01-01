<script setup lang="ts">
/**
 * SessionCard - Displays a single session in the sessions list
 *
 * Shows session name, project path, status, and last activity time.
 * Clickable to navigate to session detail view.
 *
 * Design notes:
 * - Active sessions show a green status dot
 * - Inactive/archived sessions show gray
 * - Project path is truncated with ellipsis for long paths
 */

import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Session } from '@/stores/sessions';

interface Props {
  session: Session;
}

const props = defineProps<Props>();
const router = useRouter();

// Parse encrypted metadata to get display info
// Note: In production, this would use decryption from the sync service
const sessionName = computed(() => {
  try {
    // Attempt to parse metadata JSON (may be encrypted)
    const meta = JSON.parse(props.session.metadata);
    return meta.name || meta.title || `Session ${props.session.id.slice(0, 8)}`;
  } catch {
    return `Session ${props.session.id.slice(0, 8)}`;
  }
});

const projectPath = computed(() => {
  try {
    const meta = JSON.parse(props.session.metadata);
    return meta.path || meta.projectPath || null;
  } catch {
    return null;
  }
});

const statusColor = computed(() =>
  props.session.active ? 'bg-green-500' : 'bg-gray-400'
);

const statusText = computed(() =>
  props.session.active ? 'Active' : 'Archived'
);

const lastActivityFormatted = computed(() => {
  const date = new Date(props.session.updatedAt);
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
});

const avatarInitials = computed(() => {
  const name = sessionName.value;
  return name.slice(0, 2).toUpperCase();
});

function handleClick() {
  router.push(`/session/${props.session.id}`);
}
</script>

<template>
  <Card
    class="cursor-pointer transition-colors hover:bg-accent"
    role="button"
    tabindex="0"
    @click="handleClick"
    @keydown.enter="handleClick"
  >
    <CardHeader class="pb-2">
      <div class="flex items-start gap-4">
        <!-- Avatar -->
        <Avatar class="h-12 w-12">
          <AvatarFallback class="bg-primary/10 text-primary">
            {{ avatarInitials }}
          </AvatarFallback>
        </Avatar>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <CardTitle class="text-base truncate">
              {{ sessionName }}
            </CardTitle>
            <span class="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {{ lastActivityFormatted }}
            </span>
          </div>

          <!-- Project path -->
          <p
            v-if="projectPath"
            class="text-sm text-muted-foreground truncate mt-1"
          >
            {{ projectPath }}
          </p>
        </div>
      </div>
    </CardHeader>

    <CardContent class="pt-0">
      <div class="flex items-center gap-2">
        <span :class="['w-2 h-2 rounded-full', statusColor]" />
        <span class="text-xs text-muted-foreground">{{ statusText }}</span>
      </div>
    </CardContent>
  </Card>
</template>
