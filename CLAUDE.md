# Happy Vue - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This file provides guidance to Claude Code when working with the Happy Vue.js web client.

## Project Overview

**Happy Vue** is a Vue.js workspace for the Happy web client. This is part of the migration from React Native to a Vue.js architecture.

## Architecture

### Monorepo Structure

```
happy-vue/
├── apps/
│   └── web/           # Vue.js + Vite
├── packages/
│   ├── shared/        # Shared composables, utilities
│   └── protocol/      # Port of @happy/protocol
├── package.json       # Root workspace config (yarn workspaces)
├── .yarnrc.yml        # Yarn v4 configuration
└── tsconfig.base.json
```

### Package Naming Convention

All packages use the `@happy-vue/` scope:

- `@happy-vue/web` - Web application
- `@happy-vue/shared` - Shared utilities
- `@happy-vue/protocol` - Protocol types

## Development Guidelines

### Package Manager

**Always use yarn v4** (not npm or pnpm):

```bash
# Enable Corepack first (provides yarn v4)
corepack enable

# Install dependencies
yarn install

# Add a dependency to a specific package
yarn workspace @happy-vue/web add vue

# Run a script in a specific package
yarn workspace @happy-vue/web dev

# Run a script in all packages
yarn workspaces foreach -A run build
```

### TypeScript

- All code uses TypeScript with **strict mode**
- Shared configuration in `tsconfig.base.json`
- Each package extends the base config

### Path Aliases

Standard path alias pattern across all packages:

- `@/*` → `./src/*` (local source)
- `@happy-vue/shared` → `../../packages/shared/src`
- `@happy-vue/protocol` → `../../packages/protocol/src`

### Code Style

- 2-space indentation
- Single quotes for strings
- Semicolons required
- Vue Composition API (not Options API)
- `<script setup>` syntax preferred

## Common Commands

```bash
# Development
yarn dev:web          # Start web dev server

# Building
yarn build            # Build all packages
yarn build:web        # Build web only

# Quality
yarn typecheck        # Type check all packages
yarn lint             # Lint all packages
yarn test             # Run all tests

# Maintenance
yarn clean            # Clean all build artifacts
```

## Key Patterns

### Shared Code

Business logic should be placed in `@happy-vue/shared`:

```typescript
// packages/shared/src/composables/useSession.ts
export function useSession() {
  // Shared session logic
}

// apps/web/src/components/SessionView.vue
import { useSession } from '@happy-vue/shared';
```

### Protocol Types

API types come from `@happy-vue/protocol`:

```typescript
import { ApiUpdateSchema, type ApiUpdate } from '@happy-vue/protocol';
```

## Related Documentation

- Root monorepo: `../CLAUDE.md`
- Protocol package: `../../../packages/schema/protocol/CLAUDE.md`
- Migration epic: [HAP-660](https://linear.app/enflame-media/issue/HAP-660)

## Migration Context

This repository is being built as part of the Vue.js migration:

| Phase | Description    | Issues  |
| ----- | -------------- | ------- |
| 0     | Monorepo setup | HAP-661 |
| 1     | Web app        | TBD     |

Reference the original React Native app at `../react/` for implementation details.
