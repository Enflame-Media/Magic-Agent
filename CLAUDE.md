# Happy Admin Dashboard - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This document contains development guidelines for Happy Admin Dashboard. This guide OVERRIDES any default behaviors and MUST be followed exactly.

## Project Overview

**Name**: happy-admin
**Purpose**: Vue.js frontend dashboard for visualizing Analytics Engine sync metrics
**Framework**: Vue.js 3 with Composition API + Tailwind CSS
**Runtime**: Cloudflare Workers (static file serving)
**Language**: TypeScript (strict mode)

## Architecture

This is the **frontend-only** component of the admin dashboard system:

```
┌─────────────────────────┐         ┌─────────────────────────┐
│     happy-admin         │ ──────► │   happy-admin-api       │
│   (Vue.js Dashboard)    │  CORS   │   (Hono API)            │
│                         │ cookies │                         │
│ happy-admin.enflamemedia│         │ happy-admin-api.        │
│        .com             │         │   enflamemedia.com      │
└─────────────────────────┘         └─────────────────────────┘
         │
         ▼
  Cloudflare [site]
  serves ./dist (SPA)
```

### Key Separation

| Concern | Project | Domain |
|---------|---------|--------|
| Vue.js SPA | happy-admin | happy-admin.enflamemedia.com |
| Hono API | happy-admin-api | happy-admin-api.enflamemedia.com |
| Authentication | happy-admin-api | (Better-Auth) |
| Database | happy-admin-api | (D1) |

## Core Technology Stack

- **Runtime**: Cloudflare Workers (static file serving via [site])
- **Frontend**: Vue.js 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Chart.js with vue-chartjs
- **Routing**: Vue Router
- **Language**: TypeScript with strict mode
- **Package Manager**: Yarn (not npm)

## Project Structure

```
/happy-admin
├── src/
│   ├── worker/              # Cloudflare Worker (minimal)
│   │   └── index.ts         # Health check only
│   └── app/                 # Vue.js SPA
│       ├── index.html       # HTML entry point
│       ├── main.ts          # Vue app initialization
│       ├── App.vue          # Root component
│       ├── style.css        # Tailwind imports
│       ├── lib/
│       │   └── api.ts       # API client (calls happy-admin-api)
│       ├── composables/     # Vue composables
│       ├── components/      # Vue components
│       └── views/           # Page components
│           ├── Login.vue    # Auth page
│           └── Dashboard.vue # Metrics dashboard
├── dist/                    # Built SPA (served by [site])
├── wrangler.toml            # Cloudflare Workers config
├── vite.config.ts           # Vite build config
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies and scripts
```

## Development Workflow

### Commands

```bash
# Install dependencies
yarn install

# Start local development server
yarn dev

# Start Vite dev server with HMR (for frontend development)
yarn dev:vite

# Build Vue.js SPA
yarn build:app

# Type checking
yarn typecheck

# Linting
yarn lint
yarn lint:fix

# Deploy to Cloudflare Workers
yarn deploy:dev
yarn deploy:prod
```

### Local Development

**For frontend development with HMR:**
```bash
# Terminal 1: Run API worker (in happy-admin-api directory)
cd ../happy-admin-api && yarn dev

# Terminal 2: Run Vite dev server with HMR
yarn dev:vite
# Frontend runs at http://localhost:5173
# API runs at http://localhost:8788
```

**For integrated testing:**
```bash
# Build SPA and run with Wrangler
yarn build:app && yarn dev
# Worker runs at http://localhost:8787
```

## API Client Configuration

The frontend communicates with `happy-admin-api` via cross-origin requests.

### Base URL Configuration (`src/app/lib/api.ts`)

```typescript
function getApiBaseUrl(): string {
    // Local development
    if (hostname === 'localhost') return 'http://localhost:8788';

    // Development environment
    if (hostname.includes('-dev.enflamemedia.com'))
        return 'https://happy-admin-api-dev.enflamemedia.com';

    // Production environment
    return 'https://happy-admin-api.enflamemedia.com';
}
```

### Authentication

All API requests include `credentials: 'include'` for cross-origin cookie handling:

```typescript
const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
    credentials: 'include',
});
```

## Vue.js Conventions

### Component Structure

```vue
<script setup lang="ts">
/**
 * Component description
 */
import { ref, computed, onMounted } from 'vue';

// Props and emits first
const props = defineProps<{ ... }>();

// Reactive state
const loading = ref(false);

// Computed properties
const formattedData = computed(() => ...);

// Methods
async function fetchData() { ... }

// Lifecycle
onMounted(() => { ... });
</script>

<template>
    <!-- Template content -->
</template>
```

### Router Navigation Guards

Authentication is enforced via router guards in `main.ts`:

```typescript
router.beforeEach(async (to, from, next) => {
    if (to.meta.requiresAuth) {
        const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
            credentials: 'include',
        });
        if (!response.ok) {
            next({ name: 'login' });
            return;
        }
    }
    next();
});
```

## Code Style

- Use **4 spaces** for indentation
- Vue components use PascalCase (e.g., `Dashboard.vue`)
- TypeScript files use camelCase (e.g., `api.ts`)
- Use functional and declarative programming patterns
- Prefer interfaces over types

## Important Reminders

1. **Use 4 spaces** for indentation
2. **Use yarn**, not npm
3. **Never commit `.dev.vars`** (even though this project doesn't use secrets)
4. **API calls go to happy-admin-api** - this frontend has no backend
5. **Build before deploying** - `yarn build:app` must run before deploy
6. **Cross-origin cookies** - all API requests need `credentials: 'include'`

## Related Documentation

- [Root CLAUDE.md](../CLAUDE.md) - Monorepo overview
- [happy-admin-api CLAUDE.md](../happy-admin-api/CLAUDE.md) - API backend
- [Vue.js Docs](https://vuejs.org/)
- [Chart.js Docs](https://www.chartjs.org/)
