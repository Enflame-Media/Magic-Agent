# Vite+ and TypeScript 6 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Happy monorepo to Vite+ unified toolchain for Vite-based projects and ensure full TypeScript 6 compatibility across all 10 tsconfig files.

**Architecture:** Staged migration — TS6 tsconfig fixes first (low risk, mechanical), then vitest→vite-plus/test import rewrites for non-Vite projects, then full Vite+ migration for Vue/admin-web. Each project gets its own commit for isolated rollback.

**Tech Stack:** TypeScript 6.0.2, Vite+ (alpha), Vitest 4.1.1, oxlint, oxfmt, pkgroll, wrangler, Expo

**Spec:** `docs/superpowers/specs/2026-03-23-viteplus-ts6-migration-design.md`

---

## File Map

### tsconfig changes (Task 1)
- Modify: `packages/schema/errors/tsconfig.json`
- Modify: `packages/schema/protocol/tsconfig.json`
- Modify: `apps/cli/tsconfig.json`
- Modify: `apps/server/docker/tsconfig.json`
- Modify: `apps/server/workers/tsconfig.json`
- Modify: `apps/admin/api/tsconfig.json`
- Modify: `apps/admin/web/tsconfig.json`
- Modify: `apps/web/vue/tsconfig.json`
- Modify: `apps/web/vue/scripts/pwa-screenshots/tsconfig.json`
- Modify: `apps/web/react/tsconfig.json`

### Non-Vite test migration (Tasks 2-7)
- Modify: `apps/cli/vitest.config.ts` + `apps/cli/vitest.stryker.config.ts` + `apps/cli/package.json` + ~86 test files
- Modify: `apps/server/docker/vitest.config.ts` + `apps/server/docker/package.json` + ~19 test files
- Modify: `apps/server/workers/vitest.config.ts` + `apps/server/workers/package.json` + ~63 test files
- Modify: `apps/admin/api/vitest.config.ts` + `apps/admin/api/package.json` + ~5 test files
- Modify: `apps/web/react/vitest.config.ts` + `apps/web/react/vitest.setup.ts` + `apps/web/react/package.json` + ~84 test files
- Modify: `dev/lint-rules/vitest.config.js` + `dev/lint-rules/package.json` + 1 test file

### Full Vite+ migration (Tasks 8-9)
- Modify: `apps/admin/web/vite.config.ts` + `apps/admin/web/vitest.config.ts` (merge) + `apps/admin/web/test/setup.ts` + `apps/admin/web/package.json` + ~5 test files
- Modify: `apps/web/vue/vite.config.ts` + `apps/web/vue/vitest.config.ts` (merge) + `apps/web/vue/src/__tests__/setup.ts` + `apps/web/vue/package.json` + `apps/web/vue/tsconfig.json` + ~117 test files
- Delete: `apps/web/vue/eslint.config.js`, `apps/web/vue/.prettierrc`
- Delete: `apps/server/workers/.prettierrc`

---

## Task 1: TypeScript 6 tsconfig fixes (all projects)

**Files:**
- Modify: all 10 tsconfig.json files listed above

- [ ] **Step 1: Fix `packages/schema/errors/tsconfig.json`**

Add `"types": []` (pure Zod package, no Node.js APIs):

```json
{
  "compilerOptions": {
    "types": [],
    ...existing options...
  }
}
```

- [ ] **Step 2: Fix `packages/schema/protocol/tsconfig.json`**

Same as errors — add `"types": []`.

- [ ] **Step 3: Fix `apps/cli/tsconfig.json`**

Remove `typeRoots`, add `types`:

```json
{
  "compilerOptions": {
    "types": ["node"],
    // REMOVE: "typeRoots": ["./node_modules/@types"],
    ...existing options...
  }
}
```

- [ ] **Step 4: Modernize `apps/server/docker/tsconfig.json`**

This file needs the most work. Replace the entire file with a clean version preserving the same behavior:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "commonjs",
    "moduleResolution": "node16",
    "lib": ["es2018", "esnext.asynciterable"],
    "outDir": "./dist",
    "rootDir": "./sources",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSourceMap": true,
    "inlineSources": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "paths": {
      "@/*": ["./sources/*"]
    }
  },
  "include": ["sources/**/*"]
}
```

Key changes from old file:
- Added `moduleResolution: "node16"`
- Added `types: ["node"]`
- Added `rootDir: "./sources"`
- Removed `downlevelIteration` (deprecated in TS6, unnecessary with ESNext target)
- Removed all commented-out options for readability

- [ ] **Step 5: Fix `apps/server/workers/tsconfig.json`**

Add `rootDir`:

```json
"rootDir": ".",
```

Place it after `"outDir": "./dist"` (line 11).

- [ ] **Step 6: Fix `apps/admin/api/tsconfig.json`**

Remove `baseUrl`, add `rootDir`:

```json
// REMOVE: "baseUrl": ".",
"rootDir": ".",
```

The `paths` already use `"@/*": ["./src/*"]` which is relative — no path changes needed.

- [ ] **Step 7: Fix `apps/admin/web/tsconfig.json`**

Add `rootDir`:

```json
"rootDir": ".",
```

Place it after `"outDir": "./dist"` (line 11).

- [ ] **Step 8: Fix `apps/web/vue/tsconfig.json`**

Add `rootDir`:

```json
"rootDir": ".",
```

Place it after the `"strict": true` line.

- [ ] **Step 9: Fix `apps/web/vue/scripts/pwa-screenshots/tsconfig.json`**

Add `rootDir`:

```json
"rootDir": ".",
```

- [ ] **Step 10: Fix `apps/web/react/tsconfig.json`**

This extends `expo/tsconfig.base`. Run `yarn install` in apps/web/react first, then check if the base already provides `types` and `rootDir`:

```bash
cd apps/web/react && cat node_modules/expo/tsconfig.base.json
```

If the base does NOT provide them, add:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "types": ["react-native"],
    "rootDir": ".",
    "paths": { ... }
  }
}
```

If the base already provides them, skip.

- [ ] **Step 11: Verify all typecheck passes**

Run typecheck for each project:

```bash
cd /volume1/Projects/happy
cd packages/schema/errors && yarn typecheck
cd ../../..
cd packages/schema/protocol && yarn typecheck
cd ../../..
cd apps/cli && npx tsc --noEmit
cd ../..
cd apps/server/docker && yarn typecheck
cd ../..
cd apps/server/workers && yarn typecheck
cd ../..
cd apps/admin/api && yarn typecheck
cd ../..
cd apps/admin/web && yarn typecheck
cd ../..
cd apps/web/vue && yarn typecheck
cd ../..
cd apps/web/react && npx tsc --noEmit
```

Expected: All pass. If any fail, diagnose and fix the tsconfig for that project before moving on.

- [ ] **Step 12: Commit**

```bash
git add packages/schema/errors/tsconfig.json packages/schema/protocol/tsconfig.json \
  apps/cli/tsconfig.json apps/server/docker/tsconfig.json apps/server/workers/tsconfig.json \
  apps/admin/api/tsconfig.json apps/admin/web/tsconfig.json apps/web/vue/tsconfig.json \
  apps/web/vue/scripts/pwa-screenshots/tsconfig.json apps/web/react/tsconfig.json
git commit -m "fix: update all tsconfig files for TypeScript 6 compatibility

Add missing types fields (defaults to [] in TS6), add explicit rootDir,
remove deprecated downlevelIteration and baseUrl options, modernize
server/docker tsconfig with moduleResolution node16."
```

---

## Task 2: Install vite-plus and verify it works

Before rewriting anything, install vite-plus and confirm basic functionality.

**Files:**
- Modify: root `package.json` (or individual project package.json files)

- [ ] **Step 1: Install vite-plus globally in the monorepo**

```bash
cd /volume1/Projects/happy
yarn add -D vite-plus -W
```

If this doesn't work with workspace hoisting, install per-project in tasks 3-9 instead.

- [ ] **Step 2: Verify vp CLI is available**

```bash
npx vp --version
```

Expected: Version output, no errors.

- [ ] **Step 3: Check vite-plus test import compatibility**

Create a temporary test file to confirm the import path:

```bash
cd /volume1/Projects/happy
node -e "require('vite-plus/test')" 2>&1 || echo "CJS import failed"
node --input-type=module -e "import { describe } from 'vite-plus/test'" 2>&1 || echo "ESM import failed"
```

Document the correct import path. If `vite-plus/test` doesn't work, check docs for the correct path.

- [ ] **Step 4: Check vitest.config import path for vite-plus**

```bash
node --input-type=module -e "import { defineConfig } from 'vite-plus/test/config'" 2>&1 || echo "config import path different"
node --input-type=module -e "import { defineConfig } from 'vite-plus'" 2>&1 || echo "root import failed"
```

Document the correct defineConfig import path for vitest configs.

- [ ] **Step 5: Check Stryker vitest-runner peer dep**

```bash
cd apps/cli
cat node_modules/@stryker-mutator/vitest-runner/package.json | grep -A5 peerDependencies
```

If it requires `vitest` as peer, those two projects (cli, workers) keep `vitest` alongside `vite-plus`.

- [ ] **Step 5b: Check `vitest-axe` peer dep (Vue project)**

```bash
cat apps/web/vue/node_modules/vitest-axe/package.json | grep -A5 peerDependencies 2>/dev/null
```

If `vitest-axe` requires `vitest` as peer, keep `vitest` alongside `vite-plus` for the Vue project.

- [ ] **Step 5c: Verify vite-plus `check` block config syntax**

```bash
# Create a minimal test vite.config.ts to verify the check block syntax
cat > /tmp/test-vp-check.ts << 'EOF'
import { defineConfig } from 'vite-plus';
export default defineConfig({ check: { rules: {} } });
EOF
npx vp check --config /tmp/test-vp-check.ts --help 2>&1 | head -5
```

If the `check` block syntax doesn't work, check Vite+ docs for the correct configuration format before using it in Tasks 8-9.

- [ ] **Step 5d: Verify if `@vitejs/plugin-vue` is needed with vite-plus**

```bash
# Check if vite-plus bundles Vue support natively
node -e "const vp = require('vite-plus'); console.log(Object.keys(vp))" 2>&1 | grep -i vue
```

If vite-plus does NOT include Vue plugin natively, `@vitejs/plugin-vue` must be retained in vue and admin/web projects.

- [ ] **Step 6: Commit (if root package.json changed)**

```bash
git add package.json yarn.lock
git commit -m "chore: install vite-plus as root devDependency"
```

---

## Task 3: Migrate `dev/lint-rules` test imports

Smallest project — 1 test file, good proof of concept.

**Files:**
- Modify: `dev/lint-rules/vitest.config.js`
- Modify: `dev/lint-rules/package.json`
- Modify: `dev/lint-rules/src/rules/github-casing.test.js`
- Modify: `dev/lint-rules/src/rules/protocol-helpers.test.js`

- [ ] **Step 1: Update vitest.config.js import**

Change:
```javascript
import { defineConfig } from 'vitest/config';
```
To (use verified path from Task 2 Step 4):
```javascript
import { defineConfig } from 'vite-plus/test/config';
```

- [ ] **Step 2: Update package.json dependencies**

Remove `vitest` from devDependencies. Add `vite-plus` if not hoisted from root.

- [ ] **Step 3: Rewrite test file imports**

Both test files import from `vitest` via the `RuleTester` (ESLint). Check if they directly import `vitest`:

```bash
grep -n "from 'vitest'" dev/lint-rules/src/rules/*.test.js
```

If found, rewrite `'vitest'` → `'vite-plus/test'`.

- [ ] **Step 4: Run tests**

```bash
cd dev/lint-rules && yarn test
```

Expected: All 48 tests pass.

- [ ] **Step 5: Commit**

```bash
git add dev/lint-rules/
git commit -m "chore(lint-rules): migrate vitest imports to vite-plus/test"
```

---

## Task 4: Migrate `apps/admin/api` test imports

**Files:**
- Modify: `apps/admin/api/vitest.config.ts`
- Modify: `apps/admin/api/package.json`
- Modify: 4 test files in `apps/admin/api/src/`

- [ ] **Step 1: Update vitest.config.ts**

```typescript
import { defineConfig } from 'vite-plus/test/config';

export default defineConfig({
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
        globals: false,
    },
});
```

- [ ] **Step 2: Update package.json**

Remove `vitest` from devDependencies. Add `vite-plus` if needed.

- [ ] **Step 3: Rewrite test imports**

```bash
grep -rn "from 'vitest'" apps/admin/api/src/ | grep -v node_modules
```

Replace all `from 'vitest'` with `from 'vite-plus/test'`.

- [ ] **Step 4: Run tests**

```bash
cd apps/admin/api && yarn test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/admin/api/
git commit -m "chore(admin-api): migrate vitest imports to vite-plus/test"
```

---

## Task 5: Migrate `apps/server/docker` test imports

**Files:**
- Modify: `apps/server/docker/vitest.config.ts`
- Modify: `apps/server/docker/package.json`
- Modify: ~19 test files in `apps/server/docker/sources/`

- [ ] **Step 1: Update vitest.config.ts**

```typescript
import { defineConfig } from 'vite-plus/test/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts', '**/*.spec.ts'],
  },
  plugins: [tsconfigPaths()]
});
```

- [ ] **Step 2: Update package.json**

Remove `vitest` from devDependencies. Keep `vite-tsconfig-paths`. Add `vite-plus` if needed.

- [ ] **Step 3: Rewrite test imports**

```bash
grep -rn "from 'vitest'" apps/server/docker/sources/ | grep -v node_modules
```

Replace all `from 'vitest'` with `from 'vite-plus/test'`. Note: this project uses `globals: true` so many test files may not have direct vitest imports.

- [ ] **Step 4: Run tests**

```bash
cd apps/server/docker && yarn test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/server/docker/
git commit -m "chore(server-docker): migrate vitest imports to vite-plus/test"
```

---

## Task 6: Migrate `apps/server/workers` test imports + remove Prettier

**Files:**
- Modify: `apps/server/workers/vitest.config.ts`
- Modify: `apps/server/workers/package.json`
- Modify: ~8 test files in `apps/server/workers/src/`
- Delete: `apps/server/workers/.prettierrc`

- [ ] **Step 1: Update vitest.config.ts**

```typescript
import { defineConfig } from 'vite-plus/test/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/**/*.{test,spec}.ts'],
        exclude: ['node_modules', 'dist', '.wrangler'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                '.wrangler/',
                '**/*.spec.ts',
                '**/*.test.ts',
                'src/__tests__/**',
                'src/lib/auth.ts',
                'src/lib/privacy-kit-shim.ts',
                'src/routes/test/**',
                'src/durable-objects/index.ts',
                'src/db/schema.ts',
                'src/db/seed.ts',
                'src/db/comparison-tool.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 50,
            },
        },
        reporters: ['default'],
        silent: false,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
```

- [ ] **Step 2: Update package.json**

Remove `vitest`, `@vitest/coverage-v8`, `prettier` from devDependencies. Add `vite-plus` if needed.

Check Stryker: if `@stryker-mutator/vitest-runner` requires `vitest` as peer dep (from Task 2 Step 5), keep `vitest` in devDependencies.

- [ ] **Step 3: Delete `.prettierrc`**

```bash
rm apps/server/workers/.prettierrc
```

Formatting is handled by root `oxfmt`.

- [ ] **Step 4: Rewrite test imports**

```bash
grep -rn "from 'vitest'" apps/server/workers/src/ | grep -v node_modules
```

Replace all `from 'vitest'` with `from 'vite-plus/test'`. Also check setup files:

```bash
grep -rn "from 'vitest'" apps/server/workers/ --include='*.ts' | grep -v node_modules | grep -v '.spec.ts' | grep -v '.test.ts'
```

- [ ] **Step 4b: Update Stryker config if it references vitest.config.ts**

Check `apps/server/workers/stryker.config.mjs` — if it has `vitest: { configFile: 'vitest.config.ts' }`, verify that the rewritten config (now importing from `vite-plus/test/config`) still works with `@stryker-mutator/vitest-runner`. Run a dry-run:

```bash
cd apps/server/workers && yarn mutate:dry-run
```

If it fails, the Stryker runner may need `vitest` to remain as a peer dep.

- [ ] **Step 5: Run tests**

```bash
cd apps/server/workers && yarn test
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/server/workers/
git commit -m "chore(server-workers): migrate vitest to vite-plus/test, remove prettier"
```

---

## Task 7: Migrate `apps/cli` and `apps/web/react` test imports

**Files:**
- Modify: `apps/cli/vitest.config.ts` + `apps/cli/package.json` + ~44 test files
- Modify: `apps/web/react/vitest.config.ts` + `apps/web/react/package.json` + ~84 test files

- [ ] **Step 1: Update `apps/cli/vitest.config.ts`**

```typescript
import { defineConfig } from 'vite-plus/test/config'
import { resolve } from 'node:path'
import dotenv from 'dotenv'

const testEnv = dotenv.config({
    path: '.env.integration-test'
}).parsed

export default defineConfig({
    test: {
        globals: false,
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globalSetup: ['./src/test-setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData/**',
                '**/*.test.ts',
                'src/daemon/**',
                'src/codex/**',
                'src/api/api.ts',
                'src/api/apiSession.ts',
                'src/api/apiMachine.ts',
                'src/api/rpc/**',
                'src/api/notifications.ts',
                'src/api/socketUtils.ts',
                'src/api/webAuth.ts',
                'src/ui/ink/**',
                'src/ui/auth.ts',
                'src/index.ts',
                'src/lib.ts',
                'src/modules/common/**',
                'src/claude/sessionHandler.ts',
                'src/claude/utils/sendToHappyServer.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 50,
            },
        },
        env: {
            ...process.env,
            ...testEnv,
        }
    },
    resolve: {
        alias: {
            '@': resolve('./src'),
        },
    },
})
```

- [ ] **Step 2: Update `apps/cli/package.json`**

Remove `vitest`, `@vitest/coverage-v8` from devDependencies. Add `vite-plus` if needed.

Check Stryker: if `@stryker-mutator/vitest-runner` requires `vitest` peer dep, keep `vitest`.

- [ ] **Step 3: Rewrite CLI test imports**

```bash
grep -rn "from 'vitest'" apps/cli/src/ | grep -v node_modules
```

Replace all `from 'vitest'` with `from 'vite-plus/test'`. Also update the Stryker-specific vitest config:

```bash
grep -n "from 'vitest" apps/cli/vitest.stryker.config.ts
```

Replace `from 'vitest/config'` with `from 'vite-plus/test/config'` in `vitest.stryker.config.ts`.

- [ ] **Step 3b: Verify Stryker dry-run**

```bash
cd apps/cli && yarn mutate:dry-run
```

If it fails, keep `vitest` as a peer dep alongside `vite-plus` for this project.

- [ ] **Step 4: Run CLI tests**

```bash
cd apps/cli && yarn test
```

Expected: All tests pass.

- [ ] **Step 4b: Commit CLI**

```bash
git add apps/cli/
git commit -m "chore(cli): migrate vitest imports to vite-plus/test"
```

- [ ] **Step 5: Update `apps/web/react/vitest.config.ts`**

```typescript
import { defineConfig } from 'vite-plus/test/config'
import { resolve } from 'node:path'

export default defineConfig({
    define: {
        __DEV__: 'true',
    },
    test: {
        globals: false,
        environment: 'node',
        include: ['sources/**/*.{spec,test}.ts'],
        setupFiles: ['./vitest.setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/**',
                'dist/**',
                '**/*.d.ts',
                '**/*.config.*',
                '**/mockData/**',
                '**/__testdata__/**',
                '**/*.spec.ts',
                '**/*.test.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 50,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve('./sources'),
            'react-native': resolve('./__mocks__/react-native.ts'),
            'expo-secure-store': resolve('./__mocks__/expo-secure-store.ts'),
            'expo-updates': resolve('./__mocks__/expo-updates.ts'),
            'expo-modules-core': resolve('./__mocks__/expo-modules-core.ts'),
            'expo-crypto': resolve('./__mocks__/expo-crypto.ts'),
        },
    },
})
```

- [ ] **Step 6: Update `apps/web/react/package.json`**

Remove `vitest`, `@vitest/coverage-v8` from devDependencies. Add `vite-plus` if needed.

- [ ] **Step 7: Rewrite React test imports**

```bash
grep -rn "from 'vitest'" apps/web/react/sources/ | grep -v node_modules
```

Replace all `from 'vitest'` with `from 'vite-plus/test'`.

Also update the setup file:
```bash
grep -n "from 'vitest'" apps/web/react/vitest.setup.ts
```
Replace any vitest imports there too.

- [ ] **Step 8: Run React tests**

```bash
cd apps/web/react && yarn test
```

Expected: All tests pass.

- [ ] **Step 9: Commit React**

```bash
git add apps/web/react/
git commit -m "chore(react): migrate vitest imports to vite-plus/test"
```

---

## Task 8: Full Vite+ migration — `apps/admin/web`

This is the first full Vite+ migration. It's smaller than the Vue app (fewer plugins) and serves as a proof of concept.

**Files:**
- Modify: `apps/admin/web/vite.config.ts` (merge vitest config into it)
- Delete: `apps/admin/web/vitest.config.ts`
- Modify: `apps/admin/web/package.json`
- Modify: ~5 test files

- [ ] **Step 1: Rewrite `vite.config.ts` to use vite-plus**

Merge the existing `vite.config.ts` and `vitest.config.ts` into one file:

```typescript
import { defineConfig } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
    plugins: [vue()],
    root: './src/app',
    base: '/',
    build: {
        outDir: '../../dist',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'src/app/index.html'),
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src'),
            '@app': resolve(__dirname, 'src/app'),
            '@worker': resolve(__dirname, 'src/worker'),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:8787',
                changeOrigin: true,
            },
        },
    },
    test: {
        include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            reportsDirectory: './coverage',
            include: ['src/app/**/*.ts', 'src/app/**/*.vue'],
            exclude: [
                'src/**/*.test.ts',
                'src/**/*.spec.ts',
                'src/**/*.d.ts',
                'src/app/main.ts',
                'node_modules/**',
            ],
            thresholds: {
                statements: 60,
                branches: 60,
                functions: 60,
                lines: 60,
            },
        },
        clearMocks: true,
        restoreMocks: true,
        environmentOptions: {
            happyDOM: {
                settings: {
                    disableCSSFileLoading: true,
                    disableJavaScriptFileLoading: true,
                },
            },
        },
    },
    check: {
        jsPlugins: ['@happy/lint-rules'],
        rules: {
            'happy/github-casing': 'warn',
            'happy/protocol-helpers': 'warn',
        },
    },
});
```

**Important notes:**
- Verify that `vp build` respects the non-standard `root: './src/app'` config. If it doesn't, keep using `vite build` as the build command and only use `vp test` and `vp check`.
- The existing `vitest.config.ts` uses `'@': resolve(__dirname, 'src/app')` while `vite.config.ts` uses `'@': resolve(__dirname, 'src')`. The tsconfig uses `"@/*": ["./src/*"]`. The merged config uses `src` (matching tsconfig). Verify tests still pass — if any test imports relied on `@` resolving to `src/app`, they will need updating.
- If `@vitejs/plugin-vue` is NOT bundled by vite-plus (check Task 2 Step 5d), keep it as a dependency and in the plugins array.

- [ ] **Step 2: Delete `vitest.config.ts`**

```bash
rm apps/admin/web/vitest.config.ts
```

- [ ] **Step 3: Update package.json**

Remove: `vite`, `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-vue`
Add: `vite-plus`

Update scripts:
```json
{
  "dev": "vp dev",
  "build:app": "vp build",
  "test": "vp test",
  "test:watch": "vp test --watch",
  "test:coverage": "vp test --coverage",
  "lint": "vp check",
  "lint:fix": "vp check --fix",
  "format": "vp format"
}
```

If `vp build` doesn't work with `root: './src/app'`, keep `build:app` as the original vite command.

- [ ] **Step 4: Rewrite test imports (including setup files)**

```bash
grep -rn "from 'vitest'" apps/admin/web/src/ apps/admin/web/test/ | grep -v node_modules
grep -rn "from 'vite'" apps/admin/web/src/ | grep -v node_modules | grep -v vite-plus
```

Replace `'vitest'` → `'vite-plus/test'` and `'vite'` → `'vite-plus'` where applicable. Don't forget `test/setup.ts` which may import from vitest.

- [ ] **Step 5: Verify build**

```bash
cd apps/admin/web
vp build  # or yarn build:app
```

Expected: Build succeeds, output in `dist/`.

- [ ] **Step 6: Verify tests**

```bash
cd apps/admin/web
vp test
```

Expected: All tests pass.

- [ ] **Step 7: Verify lint**

```bash
cd apps/admin/web
vp check
```

Expected: Lint passes (possibly with existing warnings, but no new errors).

- [ ] **Step 8: Commit**

```bash
git add apps/admin/web/
git commit -m "feat(admin-web): migrate to Vite+ unified toolchain

Consolidate vite.config.ts and vitest.config.ts into single vite-plus config.
Replace vite/vitest/eslint/prettier with vite-plus for build, test, lint, format."
```

---

## Task 9: Full Vite+ migration — `apps/web/vue`

Largest migration — most plugins, complex vitest config with Vue deduplication.

**Files:**
- Modify: `apps/web/vue/vite.config.ts` (merge vitest config)
- Delete: `apps/web/vue/vitest.config.ts`
- Delete: `apps/web/vue/eslint.config.js`
- Delete: `apps/web/vue/.prettierrc`
- Modify: `apps/web/vue/package.json`
- Modify: `apps/web/vue/tsconfig.json` (update types)
- Modify: ~117 test files

- [ ] **Step 1: Rewrite `vite.config.ts` to use vite-plus**

Merge the existing `vite.config.ts` and `vitest.config.ts`:

```typescript
import { defineConfig } from 'vite-plus';
import vue from '@vitejs/plugin-vue';
import { cloudflare } from '@cloudflare/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

const rootNodeModules = path.resolve(__dirname, '../../../node_modules');

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      // ... keep entire existing PWA config unchanged ...
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Vue deduplication aliases (HAP-983)
      'vue': path.resolve(rootNodeModules, 'vue'),
      '@vue/runtime-core': path.resolve(rootNodeModules, '@vue/runtime-core'),
      '@vue/runtime-dom': path.resolve(rootNodeModules, '@vue/runtime-dom'),
      '@vue/reactivity': path.resolve(rootNodeModules, '@vue/reactivity'),
      '@vue/shared': path.resolve(rootNodeModules, '@vue/shared'),
    },
    dedupe: [
      'vue',
      '@vue/runtime-core',
      '@vue/runtime-dom',
      '@vue/reactivity',
      '@vue/shared',
    ],
  },
  build: {
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['reka-ui', 'class-variance-authority', 'clsx', 'tailwind-merge'],
          'i18n-vendor': ['vue-i18n'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**/*', 'node_modules/**/*'],
    setupFiles: ['./src/__tests__/setup.ts'],
    isolate: true,
    pool: 'threads',
    reporters: ['verbose', 'json'],
    outputFile: {
      json: './test-results/vitest-results.json',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.{test,spec}.ts',
        'src/**/*.d.ts',
        'src/main.ts',
        'src/App.vue',
        'src/vite-env.d.ts',
        'src/__tests__/**/*',
      ],
      thresholds: {
        'src/services/encryption.ts': { lines: 80, functions: 80, branches: 80, statements: 80 },
        'src/stores/**/*.ts': { lines: 65, functions: 65, branches: 55, statements: 65 },
        'src/lib/**/*.ts': { lines: 80, functions: 80, branches: 60, statements: 80 },
        'src/composables/**/*.ts': { lines: 12, functions: 10, branches: 12, statements: 12 },
        'src/components/**/*.vue': { lines: 2, functions: 1, branches: 2, statements: 2 },
        'src/views/**/*.vue': { lines: 0, functions: 0, branches: 0, statements: 0 },
      },
    },
    snapshotFormat: {
      printBasicPrototype: false,
    },
  },
  check: {
    jsPlugins: ['@happy/lint-rules'],
    rules: {
      'happy/github-casing': 'warn',
      'happy/protocol-helpers': 'warn',
    },
  },
});
```

Note: The `resolve.alias` and `resolve.dedupe` config from the old `vitest.config.ts` is merged into the main config. This means the Vue deduplication applies to both build and test, which is correct behavior.

- [ ] **Step 2: Delete old config files**

```bash
rm apps/web/vue/vitest.config.ts
rm apps/web/vue/eslint.config.js
rm apps/web/vue/.prettierrc
```

- [ ] **Step 3: Update tsconfig.json**

Two changes needed:

**a) Update `types` field** — change `"types": ["vite/client", "vitest/globals"]` to:

```json
"types": ["vite-plus/client", "vite-plus/test/globals"]
```

Verify the actual type paths by checking:
```bash
ls node_modules/vite-plus/client.d.ts 2>/dev/null
ls node_modules/vite-plus/test/globals.d.ts 2>/dev/null
```

If the paths are different, use whatever vite-plus actually exports.

**b) Remove stale `vitest.config.ts` from `include` array** — the tsconfig includes `"vitest.config.ts"` in its `include` array (line 38). Since we delete `vitest.config.ts` in Step 2, remove this entry to prevent a TypeScript "file not found" warning.

- [ ] **Step 4: Update package.json**

Remove: `vite`, `vitest`, `@vitest/coverage-v8`, `@vitejs/plugin-vue`
Keep: `@cloudflare/vite-plugin`, `vite-plugin-pwa`, `@tailwindcss/vite`
Add: `vite-plus`

Update scripts:
```json
{
  "dev": "vp dev",
  "build": "vp check && vp build",
  "test": "vp test",
  "test:run": "vp test run",
  "test:coverage": "vp test --coverage",
  "lint": "vp check",
  "lint:fix": "vp check --fix",
  "format": "vp format",
  "typecheck": "tsc --noEmit"
}
```

- [ ] **Step 5: Rewrite ALL vitest imports (~117 test files + setup files)**

First, find every file with vitest imports (including setup files, not just test files):
```bash
cd apps/web/vue
grep -rn "from 'vitest'" src/ | grep -v node_modules | wc -l
```

For bulk replacement across ALL .ts/.tsx files (not just test files):
```bash
cd apps/web/vue
find src -name '*.ts' -o -name '*.tsx' | xargs grep -l "from 'vitest'" | \
  xargs sed -i "s/from 'vitest'/from 'vite-plus\/test'/g"
```

This catches setup files like `src/__tests__/setup.ts` that also import from vitest.

Also check for `vitest-axe` imports in setup files — if `vitest-axe` depends on `vitest` as peer, keep `vitest` in devDeps:
```bash
grep -rn "vitest-axe" apps/web/vue/src/ | head -5
```

Also check for `from 'vite'` imports in source files:
```bash
grep -rn "from 'vite'" apps/web/vue/src/ | grep -v node_modules | grep -v 'vite-plus' | grep -v '.d.ts'
```

Replace those with `from 'vite-plus'` where applicable.

- [ ] **Step 6: Verify build**

```bash
cd apps/web/vue
vp build
```

Expected: Build succeeds.

- [ ] **Step 7: Verify tests**

```bash
cd apps/web/vue
vp test run
```

Expected: All tests pass.

- [ ] **Step 8: Verify lint**

```bash
cd apps/web/vue
vp check
```

Expected: Passes (with possibly existing warnings).

- [ ] **Step 9: Commit**

```bash
git add apps/web/vue/
git commit -m "feat(vue): migrate to Vite+ unified toolchain

Consolidate vite.config.ts and vitest.config.ts into single vite-plus config.
Remove orphaned eslint.config.js and .prettierrc.
Replace vite/vitest with vite-plus for build, test, lint, format.
Update tsconfig types to vite-plus/client and vite-plus/test/globals.
Rewrite 117 test file imports from vitest to vite-plus/test."
```

---

## Task 10: Final verification and cleanup

- [ ] **Step 1: Run full monorepo build**

```bash
cd /volume1/Projects/happy
yarn install
```

Verify no dependency resolution errors.

- [ ] **Step 2: Run turbo pipeline**

```bash
npx turbo run build test typecheck --filter='./apps/*' --filter='./packages/*' --filter='./dev/*'
```

Expected: All tasks pass across all projects.

- [ ] **Step 3: Verify root oxlint/oxfmt still works**

```bash
npx oxlint .
npx oxfmt --check .
```

Expected: No new errors introduced.

- [ ] **Step 4: Clean up any leftover vitest references**

```bash
grep -rn "from 'vitest'" --include='*.ts' --include='*.tsx' --include='*.js' . | grep -v node_modules | grep -v '.git'
```

Expected: No matches (all rewritten to vite-plus/test).

- [ ] **Step 5: Verify no orphaned config files**

```bash
find . -name 'vitest.config.*' -not -path '*/node_modules/*' | grep -v 'vitest.stryker.config'
```

Expected: No vitest.config files remain (except `vitest.stryker.config.ts` which Stryker needs).

- [ ] **Step 6: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final cleanup after Vite+ migration"
```
