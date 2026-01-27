# Happy Vue - Development Guidelines

> **Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy Vue.js web client.

## Project Overview

**Happy Vue** is a Vue.js web application for the Happy mobile/web client. It provides remote control and session sharing for Claude Code with end-to-end encryption.

## Architecture

### Directory Structure

```
apps/web/vue/
├── src/
│   ├── components/     # Vue components
│   ├── composables/    # Vue composables (hooks)
│   ├── stores/         # Pinia stores
│   ├── services/       # API and utility services
│   ├── views/          # Page/route views
│   ├── shared/         # Shared utilities (purchases, analytics, url)
│   ├── i18n/           # Internationalization
│   ├── lib/            # Utility libraries
│   └── assets/         # Static assets and styles
├── public/             # Static public files
├── e2e/                # Playwright E2E tests
├── scripts/            # Build and deployment scripts
├── wrangler.toml       # Cloudflare Workers config
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

### Key Dependencies

- **@happy/protocol** - Shared Zod schemas from root monorepo (`workspace:*`)
- **Vue 3** - Frontend framework with Composition API
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **TailwindCSS 4** - Styling with ShadCN-Vue components
- **Vite 7** - Build tool
- **Zod** - Schema validation

## Development Guidelines

### Package Manager

**Always use yarn v4** from the root monorepo:

```bash
# From root monorepo - install all dependencies
cd /volume1/Projects/happy
yarn install

# From Vue app directory - run scripts
cd apps/web/vue
yarn dev       # Start dev server
yarn build     # Build for production
yarn typecheck # Run TypeScript check
```

### TypeScript

- All code uses TypeScript with **strict mode**
- Path alias: `@/*` → `./src/*`
- Protocol types from `@happy/protocol`

### Path Aliases

```typescript
// Import from local source
import { useAuthStore } from '@/stores/auth';

// Import shared utilities
import { openUrl, trackPurchaseEvent } from '@/shared';

// Import protocol types (from root monorepo)
import { ApiUpdateSchema, type ApiUpdate } from '@happy/protocol';
```

### Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Vue Composition API (not Options API)
- `<script setup>` syntax preferred

## Common Commands

```bash
# Development
yarn dev          # Start dev server (Vite)

# Building
yarn build        # TypeScript check + Vite build

# Quality
yarn typecheck    # Type check
yarn lint         # Lint (handled at root level)
yarn test         # Run unit tests (Vitest)
yarn test:run     # Run tests once
yarn test:coverage # Run tests with coverage

# E2E Testing
yarn test:e2e     # Run Playwright tests
yarn test:e2e:ui  # Run with Playwright UI

# Deployment
yarn deploy:dev   # Deploy to development (Cloudflare Workers)
yarn deploy:prod  # Deploy to production (Cloudflare Workers)

# Maintenance
yarn clean        # Clean build artifacts
```

## Deployment

### Cloudflare Workers

The app is deployed as a static SPA on Cloudflare Workers:

- **Development**: `happy-vue-dev.enflamemedia.com`
- **Production**: `happy-vue.enflamemedia.com`

Configuration is in `wrangler.toml`.

## Testing

### Unit Tests (Vitest)

```bash
yarn test         # Watch mode
yarn test:run     # Single run
yarn test:coverage # With coverage
```

### E2E Tests (Playwright)

```bash
yarn test:e2e           # All browsers
yarn test:e2e:chromium  # Chromium only
yarn test:e2e:ui        # With UI
```

### Visual Regression (Percy)

```bash
yarn test:e2e:visual:local  # Local only
yarn test:e2e:visual        # With Percy (requires PERCY_TOKEN)
```

## Related Documentation

- Root monorepo: [`../../../CLAUDE.md`](../../../CLAUDE.md)
- Protocol package: [`../../../packages/schema/protocol/CLAUDE.md`](../../../packages/schema/protocol/CLAUDE.md)
- Visual regression: [`docs/VISUAL-REGRESSION-TESTING.md`](./docs/VISUAL-REGRESSION-TESTING.md)
- Linear issue: [HAP-935](https://linear.app/enflame-media/issue/HAP-935)
