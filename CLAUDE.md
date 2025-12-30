# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Happy Vue** is a Vue.js + NativeScript monorepo for the Happy mobile and web client. This is part of the migration from React Native to a hybrid Vue.js architecture.

## Architecture

### Monorepo Structure

```
happy-vue/
├── apps/
│   ├── web/           # Vue.js + Vite (Phase 1)
│   └── mobile/        # NativeScript-Vue (Phase 2)
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
- `@happy-vue/mobile` - Mobile application
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
yarn dev:mobile       # Start mobile dev

# Building
yarn build            # Build all packages
yarn build:web        # Build web only
yarn build:mobile     # Build mobile only

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

## NativeScript Specifics

When working on the mobile app:

- `nodeLinker: node-modules` is set in `.yarnrc.yml` for NativeScript compatibility
- Platform-specific code uses `.android.ts` / `.ios.ts` suffixes
- Native views are in `App_Resources/`

## Related Documentation

- Root monorepo: `../CLAUDE.md`
- Protocol package: `../packages/@happy/protocol/CLAUDE.md`
- Migration epic: [HAP-660](https://linear.app/enflame-media/issue/HAP-660)

## Migration Context

This repository is being built as part of the Vue.js migration:

| Phase | Description    | Issues  |
| ----- | -------------- | ------- |
| 0     | Monorepo setup | HAP-661 |
| 1     | Web app        | TBD     |
| 2     | Mobile app     | TBD     |

Reference the original React Native app at `../happy-app/` for implementation details.
