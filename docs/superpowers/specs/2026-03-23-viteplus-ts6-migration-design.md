# Vite+ and TypeScript 6 Migration

**Date**: 2026-03-23
**Status**: Approved
**Scope**: Full monorepo

## Summary

Migrate the Happy monorepo to Vite+ (alpha) as a unified toolchain for Vite-based projects and standardize all TypeScript projects on TypeScript 6 compatibility. Non-Vite projects adopt `vite-plus/test` for testing uniformity while keeping their existing build pipelines.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Vite+ alpha risk | Accept | User chose full send |
| Vite+ scope | Vite projects get full migration; others get test imports only | CLI (pkgroll), servers (tsc/wrangler), React Native (Expo) have platform-specific build tools that Vite+ would fight |
| Lint/format consolidation | Partial — Vite projects use `vp check`/`vp format`; non-Vite keep root oxlint/oxfmt | Non-Vite projects lack `vite.config.ts` for Vite+ lint config |
| Custom lint rules | Keep `@happy/lint-rules` as-is | Referenced from both Vite+ configs and standalone oxlint configs, no changes to rules themselves |

## Current State

### TypeScript
- All projects already on `typescript: ^6.0.2`
- 10 tsconfig files with varying levels of TS6 compatibility issues
- Issues: missing `types` fields, missing `rootDir`, deprecated options (`downlevelIteration`, `baseUrl`)

### Build Tools
- **Vite 8.0.2**: `apps/web/vue`, `apps/admin/web`
- **pkgroll**: `apps/cli` (bundles with pkgroll after tsc --noEmit)
- **tsc**: `apps/server/docker`
- **wrangler**: `apps/server/workers`, `apps/admin/api`
- **Expo/Metro**: `apps/web/react`

### Testing
- 8 TypeScript projects use Vitest 4.1.1 (including `dev/lint-rules`)
- CLI and Workers use Stryker for mutation testing

### Linting/Formatting
- Root: oxlint 1.56.0 + oxfmt 0.41.0
- Vue: ESLint config (`eslint.config.js`) + Prettier config (`.prettierrc`) — note: these are config files only, no eslint/prettier packages in vue's own package.json (likely hoisted to root or orphaned)
- Workers: Prettier (`.prettierrc`)
- Custom rules: `@happy/lint-rules` (oxlint JS plugins)

## Section 1: TypeScript 6 Compatibility Fixes

All 10 tsconfig files get updated. Changes are mechanical.

### Missing `types` Field (defaults to `[]` in TS6)

| Project | Fix |
|---------|-----|
| `apps/cli` | Add `"types": ["node"]`, remove `typeRoots` (bundler resolution will still find `@types/*` via `node_modules`; explicit `types` is more correct for TS6) |
| `apps/server/docker` | Add `"types": ["node"]` |
| `packages/schema/errors` | Add `"types": []` (pure Zod schema package, does not use Node.js APIs) |
| `packages/schema/protocol` | Add `"types": []` (pure Zod schema package, does not use Node.js APIs) |
| `apps/web/react` | Extends `expo/tsconfig.base` — verify what the base provides before adding. If base does not set `types`, add `"types": ["react-native"]` or per Expo convention |

### Missing `rootDir`

| Project | Fix |
|---------|-----|
| `apps/server/workers` | Add `"rootDir": "."` (sources in `src/`, `noEmit: true`) |
| `apps/admin/web` | Add `"rootDir": "."` (sources in `src/`, `noEmit: true`) |
| `apps/admin/api` | Add `"rootDir": "."` (sources in `src/`, `noEmit: true`) |
| `apps/web/vue` | Add `"rootDir": "."` (sources in `src/`, `noEmit: true`) |
| `apps/web/vue/scripts/pwa-screenshots` | Add `"rootDir": "."` |
| `apps/web/react` | Extends `expo/tsconfig.base` — verify what the base provides before adding. If base does not set `rootDir`, add `"rootDir": "."` |

Note: `apps/cli` already has `"rootDir": "src"` and both shared packages already have `"rootDir": "./src"` — no changes needed.

### Deprecated Options

| Project | Issue | Fix |
|---------|-------|-----|
| `apps/server/docker` | `downlevelIteration: true` | Remove (unnecessary with ESNext target) |
| `apps/admin/api` | `baseUrl: "."` | Remove. Current `paths` already uses `"@/*": ["./src/*"]` (relative), so no path changes needed. Verify no code uses bare imports resolved through `baseUrl`. |

### server/docker Modernization

The server/docker tsconfig is the most outdated (old-style comments template). Modernize while preserving `module: "commonjs"`:
- Add `"moduleResolution": "node16"` (no moduleResolution currently set)
- Add `"types": ["node"]`
- Add `"rootDir": "./sources"` (this project uses `sources/` not `src/`)
- Remove `downlevelIteration`
- Clean up commented-out options for readability

**Note**: The tsconfig has `"module": "commonjs"` but `package.json` has `"type": "module"`. This is a pre-existing inconsistency outside the scope of this migration, but worth noting. The `"moduleResolution": "node16"` addition is compatible with both module systems.

## Section 2: Vite+ Full Migration (Vue & Admin Web)

### apps/web/vue

**Add:**
- `vite-plus` package

**Remove:**
- `vite`, `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-vue`
- Config files: `eslint.config.js`, `.prettierrc` (orphaned config files — no eslint/prettier deps in this project's package.json)

**Keep (register in Vite+ config):**
- `@cloudflare/vite-plugin`
- `vite-plugin-pwa`
- `@tailwindcss/vite`

**Rewrite `vite.config.ts`:**
- Import from `vite-plus` instead of `vite`
- Add `test` block (from vitest config)
- Add `check` block (lint config, referencing `@happy/lint-rules`)
- Add `format` block

**Update tsconfig `types` field:**
- Change `"types": ["vite/client", "vitest/globals"]` → `"types": ["vite-plus/client", "vite-plus/test/globals"]` (or whatever vite-plus provides — verify during implementation)

**Rewrite imports in all source/test files:**
- `'vitest'` → `'vite-plus/test'`
- `'vite'` → `'vite-plus'` (where applicable)

**Update `package.json` scripts:**
- `dev` → `vp dev`
- `build` → `vp build`
- `test` → `vp test`
- `lint` / `lint:fix` → `vp check` / `vp check --fix`
- `format` → `vp format`

### apps/admin/web

Same pattern as `apps/web/vue` but with important differences:

**Add:** `vite-plus`

**Remove:** `vite`, `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-vue`

**Non-standard `root` config**: The current `vite.config.ts` uses `root: './src/app'` to build a Vue SPA that is served as static assets by a Cloudflare Worker. The build output goes to `../../dist` and is deployed via `wrangler deploy` as a static site bucket. Verify that `vp build` respects this non-standard `root` configuration. If not, keep the explicit `root` and `build.outDir` settings in the vite-plus config.

**Rewrite:** `vite.config.ts`, test imports, package.json scripts

## Section 3: Vitest → vite-plus/test (Non-Vite Projects)

Six projects keep their build pipelines but switch test imports:

| Project | Build Tool (unchanged) |
|---------|----------------------|
| `apps/cli` | pkgroll |
| `apps/server/docker` | tsc |
| `apps/server/workers` | wrangler |
| `apps/admin/api` | wrangler |
| `apps/web/react` | expo/metro |
| `dev/lint-rules` | oxc (lint rule compiler) |

**Per project:**
1. Add `vite-plus` as devDependency
2. Remove `vitest`, `@vitest/coverage-v8` as direct dependencies
3. Rewrite all `import { ... } from 'vitest'` → `import { ... } from 'vite-plus/test'`
4. Update `vitest.config.ts` / `vitest.config.js` if present — rewrite `import { defineConfig } from 'vitest/config'` to the vite-plus equivalent (verify `'vite-plus/test/config'` or similar during implementation)
5. Update Stryker configs (CLI and Workers): The `@stryker-mutator/vitest-runner` plugin may still require `vitest` as a peer dependency. Verify compatibility before removing `vitest`. If Stryker needs `vitest` directly, keep it as a devDependency alongside `vite-plus` for those two projects only.

**Workers cleanup:**
- Remove `.prettierrc` (formatting handled by root `oxfmt`)
- Remove `prettier` devDependency

## Section 4: Verification Strategy

### Per-project verification (after each migration):
1. Dependencies resolve (`yarn install` or `vp install`)
2. Type check passes (`tsc --noEmit` or `vp check`)
3. Tests pass (`vp test` or project-specific test command)
4. Build succeeds (`vp build` or project-specific build)
5. Lint passes (`vp check` or `oxlint`)

### Execution order (least risky first):
1. TS6 fixes across all tsconfig files
2. Shared packages (`schema/protocol`, `schema/errors`) — TS6 only
3. Non-Vite projects test migration (cli, servers, lint-rules) — import rewrites
4. `apps/admin/web` — full Vite+ migration (smaller, good test case)
5. `apps/web/vue` — full Vite+ migration (larger, more plugins)

### Rollback
Each project gets its own commit. Revert a single project without affecting others.

## Turbo Pipeline Compatibility

Root `turbo.json` uses generic task names (`build`, `test`, `lint`, `format`, `typecheck`). These are mapped via each project's `package.json` scripts. Since we are updating the scripts in each project's `package.json` (e.g., `"test": "vp test"` instead of `"vitest run"`), Turbo will invoke the correct commands without any changes to `turbo.json` itself.

## What We Are NOT Changing

- Expo/Metro pipeline for React Native
- Wrangler build pipeline for Workers
- pkgroll for CLI packaging
- `@happy/lint-rules` package itself (just its test imports)
- Root `turbo.json` task definitions
- Root oxlint/oxfmt setup (stays for non-Vite projects)
- The `module: "commonjs"` / `"type": "module"` inconsistency in server/docker (pre-existing, out of scope)
- Stryker mutation testing configs preserved as-is if `@stryker-mutator/vitest-runner` requires `vitest` peer dependency
