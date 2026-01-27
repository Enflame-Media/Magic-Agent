<script setup lang="ts">
/**
 * AppBreadcrumbs - Dynamic breadcrumb navigation component
 *
 * Generates breadcrumb trail from current route using vue-router meta
 * or explicit path mapping. Supports nested routes and dynamic segments.
 *
 * @see HAP-918 - Desktop Enhancements - Breadcrumb Navigation
 */

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useSessionsStore } from '@/stores/sessions';

/**
 * Breadcrumb item structure
 */
interface BreadcrumbData {
  label: string;
  path: string;
  isCurrent: boolean;
}

/**
 * Route name to display label mapping
 */
const ROUTE_LABELS: Record<string, string> = {
  home: 'Dashboard',
  'new-session': 'New Session',
  session: 'Session',
  'session-message': 'Message',
  'session-info': 'Session Info',
  'session-artifacts': 'Session Artifacts',
  artifacts: 'Artifacts',
  friends: 'Friends',
  'friend-profile': 'Friend',
  settings: 'Settings',
  'settings-account': 'Account',
  'settings-appearance': 'Appearance',
  'settings-language': 'Language',
  'settings-notifications': 'Notifications',
  'settings-usage': 'Usage',
  'settings-features': 'Features',
  'settings-privacy': 'Privacy',
  'settings-voice': 'Voice',
  'settings-voice-language': 'Voice Language',
  'settings-connect-claude': 'Connect Claude',
  'settings-server': 'Server',
  'settings-mcp': 'MCP',
  'settings-mcp-server': 'MCP Server',
  'settings-storage': 'Storage',
  auth: 'Login',
  'auth-scan': 'Scan QR',
  'auth-manual': 'Manual Entry',
  'auth-connect': 'Connecting',
  'terminal-connect': 'Terminal Connect',
};

/**
 * Route parent hierarchy for building breadcrumb trail
 */
const ROUTE_PARENTS: Record<string, string> = {
  'new-session': 'home',
  session: 'home',
  'session-message': 'session',
  'session-info': 'session',
  'session-artifacts': 'session',
  artifacts: 'home',
  friends: 'home',
  'friend-profile': 'friends',
  'settings-account': 'settings',
  'settings-appearance': 'settings',
  'settings-language': 'settings',
  'settings-notifications': 'settings',
  'settings-usage': 'settings',
  'settings-features': 'settings',
  'settings-privacy': 'settings',
  'settings-voice': 'settings',
  'settings-voice-language': 'settings-voice',
  'settings-connect-claude': 'settings',
  'settings-server': 'settings',
  'settings-mcp': 'settings',
  'settings-mcp-server': 'settings-mcp',
  'settings-storage': 'settings',
  'auth-scan': 'auth',
  'auth-manual': 'auth',
  'auth-connect': 'auth',
};

const route = useRoute();
const router = useRouter();
const sessionsStore = useSessionsStore();

/**
 * Get session name from ID
 */
function getSessionName(sessionId: string): string {
  const session = sessionsStore.getSession(sessionId);
  if (!session) return `Session ${sessionId.slice(0, 8)}`;

  try {
    const meta = JSON.parse(session.metadata);
    return meta.name || meta.title || `Session ${sessionId.slice(0, 8)}`;
  } catch {
    return `Session ${sessionId.slice(0, 8)}`;
  }
}

/**
 * Get label for a route
 */
function getRouteLabel(routeName: string, params: Record<string, string | string[]>): string {
  // Check for custom meta label first
  const routeRecord = router.getRoutes().find(r => r.name === routeName);
  if (routeRecord?.meta?.breadcrumbLabel && typeof routeRecord.meta.breadcrumbLabel === 'string') {
    return routeRecord.meta.breadcrumbLabel;
  }

  // Special handling for dynamic routes
  if (routeName === 'session' && params.id) {
    const sessionId = Array.isArray(params.id) ? (params.id[0] ?? '') : params.id;
    return getSessionName(sessionId);
  }

  if (routeName === 'session-info' && params.id) {
    return 'Info';
  }

  if (routeName === 'session-artifacts' && params.id) {
    return 'Artifacts';
  }

  if (routeName === 'session-message' && params.messageId) {
    return 'Message';
  }

  if (routeName === 'friend-profile' && params.id) {
    return 'Profile';
  }

  if (routeName === 'settings-mcp-server' && params.server) {
    const server = Array.isArray(params.server) ? (params.server[0] ?? 'Server') : params.server;
    return server;
  }

  // Use mapped label or route name
  return ROUTE_LABELS[routeName] || routeName;
}

/**
 * Build path for a route with params
 */
function buildPath(routeName: string, currentParams: Record<string, string | string[]>): string {
  try {
    const resolved = router.resolve({ name: routeName, params: currentParams });
    return resolved.path;
  } catch {
    return '/';
  }
}

/**
 * Build breadcrumb trail from current route
 */
const breadcrumbs = computed<BreadcrumbData[]>(() => {
  const currentRouteName = String(route.name ?? '');
  const params = route.params as Record<string, string | string[]>;

  // Don't show breadcrumbs for home or auth routes
  if (currentRouteName === 'home' || currentRouteName.startsWith('auth')) {
    return [];
  }

  // Check if route should be hidden from breadcrumbs
  if (route.meta.hideBreadcrumb) {
    return [];
  }

  const trail: BreadcrumbData[] = [];
  let currentName = currentRouteName;
  const visited = new Set<string>();

  // Build trail from current route up to root
  while (currentName && !visited.has(currentName)) {
    visited.add(currentName);

    trail.unshift({
      label: getRouteLabel(currentName, params),
      path: buildPath(currentName, params),
      isCurrent: currentName === currentRouteName,
    });

    // Get parent from meta or mapping
    const routeRecord = router.getRoutes().find(r => r.name === currentName);
    const metaParent = routeRecord?.meta?.breadcrumbParent;
    const parentName = (typeof metaParent === 'string' ? metaParent : undefined) || ROUTE_PARENTS[currentName];

    if (parentName && parentName !== 'home') {
      currentName = parentName;
    } else {
      break;
    }
  }

  // Add home at the start if we have any trail items
  if (trail.length > 0) {
    trail.unshift({
      label: 'Dashboard',
      path: '/',
      isCurrent: false,
    });
  }

  return trail;
});

/**
 * Whether to show breadcrumbs
 */
const showBreadcrumbs = computed(() => breadcrumbs.value.length > 1);
</script>

<template>
  <Breadcrumb v-if="showBreadcrumbs" class="flex-shrink-0">
    <BreadcrumbList>
      <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
        <BreadcrumbItem>
          <BreadcrumbPage v-if="crumb.isCurrent">
            {{ crumb.label }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else as-child>
            <RouterLink :to="crumb.path">
              {{ crumb.label }}
            </RouterLink>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < breadcrumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
