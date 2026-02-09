# Vue App Flatten & Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flatten the Vue app from nested workspace structure to single app, replacing duplicate @happy-vue/protocol with canonical @magic-agent/protocol

**Architecture:** Move `apps/web/vue/apps/web/` contents up to `apps/web/vue/`, migrate `@happy-vue/shared` code into `src/shared/`, replace all `@happy-vue/protocol` imports with `@magic-agent/protocol` from root monorepo

**Tech Stack:** Vue 3, Vite, TypeScript, Cloudflare Workers, Zod

---

## Pre-Flight Checklist

Before starting, verify:
- [ ] Clean git status in `apps/web/vue/` (commit or stash changes)
- [ ] No running dev servers
- [ ] Run `yarn install` from root to ensure dependencies are current

---

## Task 1: Backup Current Structure

**Files:**
- None modified (safety checkpoint)

**Step 1: Create git branch for restructuring**

```bash
cd /volume1/Projects/happy/apps/web/vue
git checkout -b refactor/flatten-vue-structure
```

**Step 2: Verify clean state**

Run: `git status`
Expected: Clean working directory or only expected changes

---

## Task 2: Move Shared Code to App Source

**Files:**
- Create: `apps/web/vue/apps/web/src/shared/purchases/types.ts`
- Create: `apps/web/vue/apps/web/src/shared/purchases/index.ts`
- Create: `apps/web/vue/apps/web/src/shared/analytics/types.ts`
- Create: `apps/web/vue/apps/web/src/shared/analytics/index.ts`
- Create: `apps/web/vue/apps/web/src/shared/url/index.ts`
- Create: `apps/web/vue/apps/web/src/shared/index.ts`

**Step 1: Create shared directory structure**

```bash
cd /volume1/Projects/happy/apps/web/vue
mkdir -p apps/web/src/shared/purchases
mkdir -p apps/web/src/shared/analytics
mkdir -p apps/web/src/shared/url
```

**Step 2: Copy shared module files**

```bash
cp packages/shared/src/purchases/types.ts apps/web/src/shared/purchases/
cp packages/shared/src/purchases/index.ts apps/web/src/shared/purchases/
cp packages/shared/src/analytics/types.ts apps/web/src/shared/analytics/
cp packages/shared/src/analytics/index.ts apps/web/src/shared/analytics/
cp packages/shared/src/url/index.ts apps/web/src/shared/url/
cp packages/shared/src/index.ts apps/web/src/shared/
```

**Step 3: Update shared/index.ts module comment**

Edit `apps/web/src/shared/index.ts` to update the comment:
- Change `@happy-vue/shared` references to `@/shared`

**Step 4: Commit the shared code move**

```bash
git add apps/web/src/shared/
git commit -m "chore: copy shared code into app src/shared directory"
```

---

## Task 3: Update Shared Code Imports in App

**Files:**
- Modify: `apps/web/vue/apps/web/src/views/SettingsView.vue`
- Modify: `apps/web/vue/apps/web/src/composables/usePurchases.ts`
- Modify: `apps/web/vue/apps/web/src/components/app/PaywallDialog.vue`
- Modify: `apps/web/vue/apps/web/src/stores/purchases.ts`

**Step 1: Find and replace @happy-vue/shared imports**

Run this command to see all files needing changes:

```bash
cd /volume1/Projects/happy/apps/web/vue
grep -r "@happy-vue/shared" apps/web/src --include="*.ts" --include="*.vue" -l
```

**Step 2: Update each file's imports**

For each file found, change:
```typescript
// FROM:
import { ... } from '@happy-vue/shared';
// TO:
import { ... } from '@/shared';
```

Files to update:
- `apps/web/src/views/SettingsView.vue`
- `apps/web/src/composables/usePurchases.ts`
- `apps/web/src/components/app/PaywallDialog.vue`
- `apps/web/src/stores/purchases.ts`

**Step 3: Verify TypeScript compiles**

Run: `cd apps/web && yarn typecheck`
Expected: No errors related to @/shared imports

**Step 4: Commit import updates**

```bash
git add apps/web/src/
git commit -m "refactor: update @happy-vue/shared imports to @/shared"
```

---

## Task 4: Replace @happy-vue/protocol with @magic-agent/protocol

**Files:**
- Modify: `apps/web/vue/apps/web/package.json`
- Modify: `apps/web/vue/apps/web/tsconfig.json`
- Modify: Multiple source files (stores, services, composables, components)

**Step 1: Update package.json dependency**

Edit `apps/web/vue/apps/web/package.json`:
```json
// REMOVE from dependencies:
"@happy-vue/protocol": "workspace:*",

// ADD to dependencies:
"@magic-agent/protocol": "workspace:*",
```

**Step 2: Update tsconfig.json paths**

Edit `apps/web/vue/apps/web/tsconfig.json` paths section:
```json
// REMOVE these paths:
"@happy-vue/protocol": ["../../packages/protocol/src"],
"@happy-vue/protocol/*": ["../../packages/protocol/src/*"],
"@happy-vue/shared": ["../../packages/shared/src"],
"@happy-vue/shared/*": ["../../packages/shared/src/*"],

// These will remain after flatten (relative paths will change):
"@/*": ["./src/*"]
```

Note: `@magic-agent/protocol` doesn't need a path alias - it's resolved via node_modules from workspace dependency.

**Step 3: Find all @happy-vue/protocol imports**

```bash
cd /volume1/Projects/happy/apps/web/vue
grep -r "@happy-vue/protocol" apps/web/src --include="*.ts" --include="*.vue" -l
```

**Step 4: Update all protocol imports**

For each file, change:
```typescript
// FROM:
import { ... } from '@happy-vue/protocol';
// TO:
import { ... } from '@magic-agent/protocol';
```

Key files to update:
- `apps/web/src/services/sync/handlers.ts`
- `apps/web/src/stores/artifacts.ts`
- `apps/web/src/stores/auth.ts`
- `apps/web/src/stores/machines.ts`
- `apps/web/src/stores/messages.ts`
- `apps/web/src/stores/sessions.ts`
- `apps/web/src/services/sessions.ts`
- `apps/web/src/composables/useSessionSharing.ts`
- `apps/web/src/composables/useFriends.ts`
- `apps/web/src/composables/useFriendSearch.ts`
- `apps/web/src/composables/useFriendStatus.ts`
- All components in `apps/web/src/components/app/sharing/`
- `apps/web/src/components/app/UserProfileCard.vue`
- `apps/web/src/components/app/FriendRequestCard.vue`
- `apps/web/src/views/FriendProfileView.vue`

**Step 5: Handle API differences**

The `@magic-agent/protocol` has additional types that `@happy-vue/protocol` was missing. Review each import to ensure the types exist. Key additions in @magic-agent/protocol:
- `ApiEphemeralMachineDisconnectedUpdate` - add to imports where machine events are handled
- `friendshipDate` field - available on account schemas

**Step 6: Run yarn install from root**

```bash
cd /volume1/Projects/happy
yarn install
```

**Step 7: Verify TypeScript compiles**

```bash
cd /volume1/Projects/happy/apps/web/vue/apps/web
yarn typecheck
```

Expected: No errors (or only errors unrelated to protocol imports)

**Step 8: Commit protocol migration**

```bash
git add .
git commit -m "refactor: migrate from @happy-vue/protocol to @magic-agent/protocol"
```

---

## Task 5: Flatten Directory Structure

**Files:**
- Move: All files from `apps/web/vue/apps/web/` to `apps/web/vue/`
- Delete: `apps/web/vue/apps/` directory
- Delete: `apps/web/vue/packages/` directory

**Step 1: Move web app files up one level**

```bash
cd /volume1/Projects/happy/apps/web/vue

# Move all files from apps/web/ to root (preserving hidden files)
mv apps/web/.env.* . 2>/dev/null || true
mv apps/web/.wrangler . 2>/dev/null || true
mv apps/web/wrangler.toml .
mv apps/web/package.json .
mv apps/web/tsconfig.json .
mv apps/web/vite.config.ts .
mv apps/web/index.html .
mv apps/web/components.json .
mv apps/web/vitest.config.ts .
mv apps/web/playwright.config.ts .
mv apps/web/appium.config.ts .
mv apps/web/browserstack.config.ts .

# Move directories
mv apps/web/src .
mv apps/web/public .
mv apps/web/e2e .
mv apps/web/scripts .

# Move dist and other build artifacts if present
mv apps/web/dist . 2>/dev/null || true
mv apps/web/coverage . 2>/dev/null || true
mv apps/web/test-results . 2>/dev/null || true
mv apps/web/playwright-report . 2>/dev/null || true
```

**Step 2: Remove old directories**

```bash
rm -rf apps/
rm -rf packages/
```

**Step 3: Update tsconfig.json**

Edit `tsconfig.json` - remove workspace-relative paths:

```json
{
  "compilerOptions": {
    "composite": true,
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "jsx": "preserve",
    "jsxImportSource": "vue",
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noEmit": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    "types": ["vite/client", "vitest/globals"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "vite.config.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Update package.json**

Edit `package.json`:
- Update name if needed (keep `@happy-vue/web` or change to `happy-vue`)
- Remove workspace references
- Ensure `@magic-agent/protocol: workspace:*` is in dependencies
- Remove `@happy-vue/shared` and `@happy-vue/protocol` from dependencies

**Step 5: Remove workspace config files**

```bash
rm -f tsconfig.base.json
rm -f .yarnrc.yml  # If exists and was for workspace-specific config
```

Note: Keep `.yarnrc.yml` if it contains important yarn settings (like nodeLinker).

**Step 6: Commit flatten**

```bash
git add -A
git commit -m "refactor: flatten Vue app structure, remove workspace nesting"
```

---

## Task 6: Update Root Monorepo Configuration

**Files:**
- Modify: `/volume1/Projects/happy/package.json`

**Step 1: Verify workspace path still works**

The root `package.json` has `"apps/web/vue"` in workspaces. After flattening, this path still points to the Vue app (now the app itself, not the workspace root). This should work correctly.

**Step 2: Run yarn install from root**

```bash
cd /volume1/Projects/happy
yarn install
```

**Step 3: Verify @magic-agent/protocol links correctly**

```bash
cd /volume1/Projects/happy/apps/web/vue
ls -la node_modules/@magic-agent/protocol
```

Expected: Symlink to `../../../packages/schema/protocol`

**Step 4: Commit if any root changes needed**

```bash
cd /volume1/Projects/happy
git status
# If changes needed:
git add package.json yarn.lock
git commit -m "chore: update root monorepo for flattened Vue app"
```

---

## Task 7: Verify Build and Tests

**Step 1: Run typecheck**

```bash
cd /volume1/Projects/happy/apps/web/vue
yarn typecheck
```

Expected: PASS with no errors

**Step 2: Run unit tests**

```bash
yarn test:run
```

Expected: All tests pass

**Step 3: Run build**

```bash
yarn build
```

Expected: Vite builds successfully to `dist/`

**Step 4: Run dev server**

```bash
yarn dev
```

Expected: Dev server starts, app loads in browser

**Step 5: Commit verification**

```bash
git add -A
git commit -m "chore: verify build and tests pass after restructure"
```

---

## Task 8: Update Documentation

**Files:**
- Modify: `apps/web/vue/CLAUDE.md`
- Modify: `apps/web/vue/README.md`
- Modify: Root `CLAUDE.md` (if Vue structure is documented there)

**Step 1: Update Vue CLAUDE.md**

Edit `apps/web/vue/CLAUDE.md`:
- Remove references to workspace structure
- Remove references to `@happy-vue/protocol` and `@happy-vue/shared`
- Update directory structure diagram
- Document that it uses `@magic-agent/protocol` from root monorepo
- Document that shared code is in `src/shared/`

**Step 2: Update README.md**

Edit `apps/web/vue/README.md`:
- Update architecture section
- Remove workspace-specific commands
- Update import examples

**Step 3: Update root CLAUDE.md if needed**

Check if the Vue app structure is documented in `/volume1/Projects/happy/CLAUDE.md` and update if necessary.

**Step 4: Commit documentation updates**

```bash
git add -A
git commit -m "docs: update documentation for flattened Vue structure"
```

---

## Task 9: Final Cleanup

**Step 1: Remove any leftover files**

```bash
cd /volume1/Projects/happy/apps/web/vue
# Check for any orphaned files
ls -la
# Remove any workspace artifacts
rm -f turbo.json 2>/dev/null || true
rm -rf .turbo 2>/dev/null || true
```

**Step 2: Clean and reinstall**

```bash
cd /volume1/Projects/happy
rm -rf apps/web/vue/node_modules
yarn install
```

**Step 3: Final verification**

```bash
cd /volume1/Projects/happy/apps/web/vue
yarn typecheck
yarn build
yarn test:run
```

Expected: All pass

**Step 4: Commit cleanup**

```bash
git add -A
git commit -m "chore: final cleanup after Vue restructure"
```

---

## Task 10: Merge and Deploy Verification

**Step 1: Push branch**

```bash
cd /volume1/Projects/happy/apps/web/vue
git push -u origin refactor/flatten-vue-structure
```

**Step 2: Create PR or merge to main**

If using PRs:
```bash
gh pr create --title "refactor: flatten Vue app structure" --body "..."
```

Or merge directly if confident:
```bash
git checkout main
git merge refactor/flatten-vue-structure
git push
```

**Step 3: Deploy to dev environment**

```bash
yarn deploy:dev
```

**Step 4: Verify deployment**

Visit: `https://happy-vue-dev.enflamemedia.com`
Expected: App loads and functions correctly

---

## Post-Implementation Checklist

- [ ] All imports updated from `@happy-vue/protocol` to `@magic-agent/protocol`
- [ ] All imports updated from `@happy-vue/shared` to `@/shared`
- [ ] TypeScript compiles without errors
- [ ] Unit tests pass
- [ ] E2E tests pass (if run)
- [ ] Build succeeds
- [ ] Dev server works
- [ ] Dev deployment works
- [ ] Documentation updated
- [ ] Old packages/ directory removed
- [ ] Old apps/ directory removed

---

## Rollback Plan

If issues arise:

```bash
cd /volume1/Projects/happy/apps/web/vue
git checkout main
git branch -D refactor/flatten-vue-structure
```

This restores the original workspace structure.
