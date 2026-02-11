# Happy Admin - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This document contains development guidelines for Happy Admin. This guide OVERRIDES any default behaviors and MUST be followed exactly.

## Project Overview

**Name**: happy-admin
**Purpose**: Admin dashboard for visualizing Analytics Engine sync metrics
**Framework**: Hono with OpenAPI 3.1 (via @hono/zod-openapi) + Vue.js 3
**Runtime**: Cloudflare Workers
**Language**: TypeScript (strict mode)

## Core Technology Stack

- **Runtime**: Cloudflare Workers
- **API Framework**: Hono v4+
- **API Documentation**: @hono/zod-openapi + @hono/swagger-ui
- **Authentication**: Better-Auth with D1 adapter
- **Frontend**: Vue.js 3 with Composition API
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Database**: D1 (SQLite) for auth storage
- **Language**: TypeScript with strict mode
- **Package Manager**: Yarn (not npm)

## Architecture

### Project Structure

```
/happy-admin
├── src/
│   ├── worker/              # Cloudflare Worker (API)
│   │   ├── index.ts         # Main Hono app entry
│   │   ├── env.ts           # Environment type definitions
│   │   ├── auth.ts          # Better-Auth configuration
│   │   └── routes/          # API route handlers
│   │       ├── auth.ts      # Better-Auth mount
│   │       └── metrics.ts   # Analytics Engine queries
│   ├── app/                 # Vue.js SPA
│   │   ├── index.html       # HTML entry point
│   │   ├── main.ts          # Vue app initialization
│   │   ├── App.vue          # Root component
│   │   ├── style.css        # Tailwind imports
│   │   └── views/           # Page components
│   │       ├── Login.vue    # Auth page
│   │       └── Dashboard.vue # Metrics dashboard
│   └── db/                  # Database schemas (future)
├── wrangler.toml            # Cloudflare Workers config
├── vite.config.ts           # Vite build config
├── tailwind.config.js       # Tailwind configuration
├── tsconfig.json            # TypeScript config
└── package.json             # Dependencies and scripts
```

### Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Edge                          │
├─────────────────────────────────────────────────────────────┤
│  Request → Worker (Hono)                                    │
│     ├── /api/auth/* → Better-Auth handler                   │
│     ├── /api/metrics/* → Analytics Engine SQL API           │
│     ├── /api/docs → Swagger UI                              │
│     └── /* → Static assets (Vue.js SPA from [site])         │
└─────────────────────────────────────────────────────────────┘
```

## Development Workflow

### Commands

```bash
# Install dependencies
yarn install

# Start local development server
yarn dev

# Type checking
yarn typecheck

# Linting (oxlint with type-aware mode)
yarn lint
yarn lint:fix

# Build Vue.js SPA
yarn build:app

# Deploy to Cloudflare Workers
yarn deploy:dev
yarn deploy:prod

# Database migrations (Better-Auth)
yarn db:generate
yarn db:migrate
```

### Local Development

```bash
yarn dev
# Worker runs at http://localhost:8787
# API at http://localhost:8787/api/
# Swagger UI at http://localhost:8787/api/docs
```

For frontend development with hot reload:

```bash
# Terminal 1: Run worker
yarn dev

# Terminal 2: Run Vite dev server (optional, for HMR)
npx vite --config vite.config.ts
```

## Code Style and Structure

### General Principles

- Use **4 spaces** for indentation (matching happy-server-workers)
- Write concise, technical TypeScript code
- Use functional and declarative programming patterns
- **Always use absolute imports** with `@/*` prefix
- Prefer interfaces over types
- Avoid enums; use const objects or unions

### Naming Conventions

- Use lowercase with dashes for directories (e.g., `api-routes`)
- Vue components use PascalCase (e.g., `Dashboard.vue`)
- TypeScript files use camelCase (e.g., `metrics.ts`)

## Linting

This project uses **oxlint** exclusively (no ESLint). The configuration is in `oxlint.json`.

### Key Features

- **Type-aware linting**: Uses `--type-aware` flag for TypeScript-aware rules
- **JS Plugins**: Custom rules from `@happy/lint-rules` package
- **Performance**: oxlint is 50-100x faster than ESLint

### Configuration (`oxlint.json`)

```json
{
    "plugins": ["eslint", "typescript", "oxc", "vitest", "unicorn"],
    "jsPlugins": ["@happy/lint-rules"],
    "rules": {
        "happy/github-casing": "warn",
        "happy/protocol-helpers": "warn"
    }
}
```

### Commands

```bash
# Run linting
yarn lint

# Run linting with auto-fix
yarn lint:fix
```

### Dependencies

- `oxlint`: Core linter (v1.36.0+)
- `oxlint-tsgolint`: Type-aware linting support (v0.10.1+)
- `@happy/lint-rules`: Custom rules (workspace package)

## Environment Variables & Secrets

### Required Secrets (via wrangler secret)

| Secret | Purpose |
|--------|---------|
| `ANALYTICS_ACCOUNT_ID` | Cloudflare account ID for Analytics Engine |
| `ANALYTICS_API_TOKEN` | API token with Analytics Read permission |
| `BETTER_AUTH_SECRET` | Session signing secret |

### Setting Secrets

```bash
# Development
wrangler secret put ANALYTICS_ACCOUNT_ID --env dev
wrangler secret put ANALYTICS_API_TOKEN --env dev
wrangler secret put BETTER_AUTH_SECRET --env dev

# Production
wrangler secret put ANALYTICS_ACCOUNT_ID --env prod
wrangler secret put ANALYTICS_API_TOKEN --env prod
wrangler secret put BETTER_AUTH_SECRET --env prod
```

### Local Development (.dev.vars)

Create `.dev.vars` for local development:

```bash
ENVIRONMENT=development
ANALYTICS_ACCOUNT_ID=your-account-id
ANALYTICS_API_TOKEN=your-api-token
BETTER_AUTH_SECRET=dev-secret-min-32-chars
```

⚠️ **Never commit `.dev.vars`** - it's gitignored.

## API Routes

### Authentication (Better-Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-in/email` | POST | Email/password login |
| `/api/auth/sign-up/email` | POST | Create admin account |
| `/api/auth/sign-out` | POST | End session |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/reference` | GET | OpenAPI docs for auth |

### Metrics API

All metrics endpoints require authentication.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/summary` | GET | 24h aggregated metrics by type/mode |
| `/api/metrics/timeseries` | GET | Time-bucketed metrics |
| `/api/metrics/cache-hits` | GET | Profile cache hit rate |
| `/api/metrics/mode-distribution` | GET | Full/incremental/cached distribution |

### Documentation

| Endpoint | Description |
|----------|-------------|
| `/api/openapi.json` | OpenAPI 3.1 specification |
| `/api/docs` | Swagger UI |

## Analytics Engine Integration

This project queries the `sync_metrics_dev` and `sync_metrics_prod` datasets created by `happy-server-workers` (HAP-546).

### Query Pattern

```typescript
// Use the SQL API, not direct bindings
const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'text/plain',
        },
        body: sqlQuery,
    }
);
```

### Available Fields (from happy-server-workers)

| Field | Type | Description |
|-------|------|-------------|
| `blob1` | string | Sync type (session, machine, etc.) |
| `blob2` | string | Sync mode (full, incremental, cached) |
| `blob3` | string | Cache status (hit, miss) |
| `double1` | number | Duration in milliseconds |
| `double2` | number | Success flag (1 = success, 0 = failure) |

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
        // Check session with Better-Auth
        const response = await fetch('/api/auth/session');
        if (!response.ok) {
            next({ name: 'login' });
            return;
        }
    }
    next();
});
```

## Database (D1)

Better-Auth manages its own tables in D1:

- `users` - Admin user accounts
- `sessions` - Active sessions
- `accounts` - OAuth accounts (not used currently)

### Migrations

```bash
# Generate migration from Better-Auth schema
yarn db:generate

# Apply to development
yarn db:migrate

# Apply to production
yarn db:migrate:prod
```

## Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. D1 database created for each environment
3. Analytics Engine dataset (created by happy-server-workers)
4. Required secrets set via `wrangler secret`

### Deploy Steps

```bash
# 1. Build Vue.js SPA
yarn build:app

# 2. Deploy to development
yarn deploy:dev

# 3. Deploy to production
yarn deploy:prod
```

### Environment Configuration

Update `wrangler.toml` with actual database IDs:

```toml
[[env.dev.d1_databases]]
binding = "DB"
database_name = "happy-admin-dev"
database_id = "YOUR_DEV_DB_ID"  # From: wrangler d1 create happy-admin-dev
```

## Testing

### Unit Tests (Vitest)

Unit tests use Vitest with Vue Test Utils and happy-dom:

```bash
# Run unit tests
yarn test

# Run unit tests in watch mode
yarn test:watch

# Run unit tests with coverage
yarn test:coverage
```

Test files are located alongside source files with `.test.ts` suffix.

### E2E Tests (Playwright)

End-to-end tests use Playwright for browser automation:

```bash
# Run E2E tests
yarn test:e2e

# Run E2E tests with UI mode
yarn test:e2e:ui

# View test report
yarn test:e2e:report

# Update visual regression snapshots
yarn test:e2e:update-snapshots
```

E2E test files are in the `e2e/` directory:
- `auth.spec.ts` - Authentication flow tests
- `dashboard.spec.ts` - Dashboard navigation tests
- `charts.spec.ts` - Chart interaction tests
- `visual.spec.ts` - Visual regression tests
- `accessibility.spec.ts` - WCAG accessibility tests (axe-core)
- `auth.setup.ts` - Authentication setup for test isolation

### Test Configuration

- **Unit tests**: `vitest.config.ts`
- **E2E tests**: `playwright.config.ts`

### Accessibility Tests (axe-core)

Accessibility tests use `@axe-core/playwright` for automated WCAG compliance testing:

```bash
# Run accessibility tests only
yarn test:e2e --grep "Accessibility"

# Run accessibility tests with verbose output
yarn test:e2e --grep "Accessibility" --reporter=list
```

The accessibility tests check for:
- **WCAG 2.0/2.1 Level A & AA compliance** - Core accessibility standards
- **Keyboard navigation** - All interactive elements must be keyboard accessible
- **Color contrast** - Text must have sufficient contrast ratios
- **Form accessibility** - Form elements must have proper labels
- **Semantic structure** - Proper heading hierarchy and landmark regions
- **ARIA compliance** - Valid ARIA attributes and roles

Tests cover:
- Login page (unauthenticated state)
- Dashboard page (authenticated state)
- Admin users page (authenticated state)
- Responsive viewports (mobile/tablet)
- Error states (validation messages)

### CI Integration

E2E tests run in GitHub Actions via `.github/workflows/e2e.yml`:
- Parallel test execution across 3 shards
- Multi-browser testing (Chromium, Firefox, WebKit)
- Visual regression testing on main branch
- Accessibility testing with axe-core on every PR
- Test artifacts uploaded on failure

### Visual Regression Baselines

Visual regression tests compare screenshots against baseline images stored in `e2e/__snapshots__/`.

**IMPORTANT**: Baselines must be generated in a CI environment (Ubuntu) to ensure consistency. Do not generate baselines locally as rendering may differ across operating systems.

**Generating New Baselines:**

1. Create a feature branch with your UI changes
2. Push to GitHub to trigger the E2E workflow
3. If visual regression tests fail, download the artifacts and review
4. If the new screenshots are correct, trigger the baseline update workflow:
   - Go to **Actions** > **E2E Tests** > **Run workflow**
   - Check **Update visual regression snapshots** checkbox
   - Select the target branch
   - Click **Run workflow**
5. The workflow will automatically commit updated baselines

**Manual Update (CI):**
```bash
# Run this in CI environment only
yarn test:e2e:update-snapshots --project=chromium --grep "visual regression"
```

**Baseline Directory Structure:**
```
e2e/__snapshots__/
├── visual.spec.ts-snapshots/
│   ├── login-page-chromium.png
│   ├── dashboard-full-chromium.png
│   ├── dashboard-mobile-chromium.png
│   └── ...
└── charts.spec.ts-snapshots/
    ├── sync-metrics-charts-chromium.png
    ├── bundle-size-section-chromium.png
    └── ...
```

**Troubleshooting Visual Regression Failures:**

1. **Flaky tests**: Ensure `maxDiffPixelRatio` is set appropriately (0.05-0.1 for charts)
2. **Animation artifacts**: Tests disable animations via `animations: 'disabled'`
3. **Loading states**: Tests wait for `networkidle` before screenshots
4. **Platform differences**: Only update baselines from CI (Ubuntu), not locally

### Environment Variables for E2E

E2E tests require dedicated test credentials configured as GitHub Actions secrets:

| Secret | Purpose | Documentation |
|--------|---------|---------------|
| `E2E_TEST_EMAIL` | Test account email | [docs/E2E-TEST-SECRETS.md](./docs/E2E-TEST-SECRETS.md) |
| `E2E_TEST_PASSWORD` | Test account password | [docs/E2E-TEST-SECRETS.md](./docs/E2E-TEST-SECRETS.md) |

**Setup Steps:**
1. Navigate to **Repository Settings** > **Secrets and variables** > **Actions**
2. Add `E2E_TEST_EMAIL` secret (e.g., `e2e-test@enflamemedia.com`)
3. Add `E2E_TEST_PASSWORD` secret (secure password)
4. Create the test user in the target environment (see [docs/E2E-TEST-SECRETS.md](./docs/E2E-TEST-SECRETS.md))

For local E2E testing, add credentials to `.dev.vars`:
```bash
E2E_TEST_EMAIL=e2e-test@test.local
E2E_TEST_PASSWORD=TestPassword123!
```

## Important Reminders

1. **Use 4 spaces** for indentation (not 2)
2. **Use yarn**, not npm
3. **Always use `@/*` imports** for src files
4. **Never commit `.dev.vars`** (contains secrets)
5. **Test locally with `yarn dev`** before deploying
6. **Workers ≠ Node.js** - some Node APIs not available
7. **Access env via `c.env`**, not `process.env`
8. **OpenAPI routes** must use `createRoute()` from `@hono/zod-openapi`

## Related Documentation

- [Root CLAUDE.md](../CLAUDE.md) - Monorepo overview
- [apps/server/workers CLAUDE.md](../../server/workers/CLAUDE.md) - Similar patterns
- [E2E Test Secrets Setup](./docs/E2E-TEST-SECRETS.md) - Configuring E2E test credentials
- [Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Better-Auth Docs](https://www.better-auth.com/)
- [Hono OpenAPI Docs](https://hono.dev/examples/zod-openapi)
- [axe-core Playwright Docs](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright) - Accessibility testing
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility standards
