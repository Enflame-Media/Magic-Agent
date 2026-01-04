# Happy Admin API - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../CLAUDE.md) for overall architecture and cross-project guidelines.

---

This document contains development guidelines for Happy Admin API. This guide OVERRIDES any default behaviors and MUST be followed exactly.

## Project Overview

**Name**: happy-admin-api
**Purpose**: Backend API for the admin dashboard, handling authentication and Analytics Engine queries
**Framework**: Hono with OpenAPI 3.1 (via @hono/zod-openapi)
**Runtime**: Cloudflare Workers
**Language**: TypeScript (strict mode)

## Architecture

This is the **API-only** component of the admin dashboard system:

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
                                    ┌─────────────────────────┐
                                    │    Main Happy D1        │
                                    │  (happy-dev/happy-prod) │
                                    │                         │
                                    │  Better-Auth tables     │
                                    │  shared with ecosystem  │
                                    └─────────────────────────┘
```

### Key Separation

| Concern | Project | Domain |
|---------|---------|--------|
| Vue.js SPA | happy-admin | happy-admin.enflamemedia.com |
| Hono API | happy-admin-api | happy-admin-api.enflamemedia.com |
| Authentication | happy-admin-api | (handles Better-Auth) |
| Database | happy-admin-api | (D1 bindings) |

## Core Technology Stack

- **Runtime**: Cloudflare Workers
- **API Framework**: Hono v4+
- **API Documentation**: @hono/zod-openapi + @hono/swagger-ui
- **Authentication**: Better-Auth with D1 adapter
- **Database**: D1 (SQLite) - uses main happy D1 databases
- **Language**: TypeScript with strict mode
- **Package Manager**: Yarn (not npm)

## Project Structure

```
/happy-admin-api
├── src/
│   ├── index.ts           # Main Hono app entry with CORS
│   ├── env.ts             # Environment type definitions
│   ├── auth.ts            # Better-Auth configuration
│   ├── middleware/
│   │   ├── auth.ts        # Auth middleware (session + admin role check)
│   │   └── csrf.ts        # CSRF protection middleware (HAP-616)
│   └── routes/
│       ├── auth.ts        # Better-Auth mount
│       └── metrics.ts     # Analytics Engine queries
├── migrations/
│   └── 0001_better_auth_init.sql
├── wrangler.toml          # Cloudflare Workers config
├── tsconfig.json          # TypeScript config
└── package.json           # Dependencies and scripts
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

# Linting
yarn lint
yarn lint:fix

# Deploy to Cloudflare Workers
yarn deploy:dev
yarn deploy:prod

# Database migrations (Better-Auth)
yarn db:generate
yarn db:migrate        # Development
yarn db:migrate:prod   # Production
```

### Local Development

```bash
yarn dev
# API runs at http://localhost:8788
# Swagger UI at http://localhost:8788/api/docs
```

**Note**: Local development uses port 8788 (different from happy-admin's 8787) to allow running both simultaneously.

## Linting

This project uses **oxlint** exclusively (no ESLint). The configuration is in `oxlint.json`.

### Key Features

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

### Custom Rules

- `happy/github-casing`: Enforces "GitHub" (not "Github") in PascalCase identifiers (HAP-502)
- `happy/protocol-helpers`: Enforces `getSessionId()`/`getMachineId()` helpers (HAP-658)

### Dependencies

- `oxlint`: Core linter (v1.36.0+)
- `@happy/lint-rules`: Custom rules (workspace package)

## Cross-Origin Configuration

### CORS Settings

The API allows requests from the dashboard domains:

```typescript
const ALLOWED_ORIGINS = [
    'http://localhost:5173',      // Vite dev
    'http://localhost:8787',      // happy-admin local
    'https://happy-admin.enflamemedia.com',
    'https://happy-admin-dev.enflamemedia.com',
];
```

### Cookie Settings (Better-Auth)

Cross-origin cookies require specific settings:

```typescript
advanced: {
    crossSubDomainCookies: {
        enabled: true,
        domain: '.enflamemedia.com',
    },
    defaultCookieAttributes: {
        secure: true,
        sameSite: 'none',
        httpOnly: true,
    },
}
```

## Database

### D1 Bindings

This API uses the **main Happy D1 databases**, not separate admin databases:

| Environment | Database Name | Database ID |
|-------------|---------------|-------------|
| Development | happy-dev | 402f86c0-7405-49cc-9667-93ad06fe4206 |
| Production | happy-prod | f547b6d8-035d-4550-a5cf-acea4c533901 |

### Better-Auth Tables

The following tables are managed by Better-Auth:

- `users` - Admin user accounts
- `sessions` - Active sessions
- `accounts` - OAuth/email accounts
- `verifications` - Email verification tokens

### Migrations

```bash
# Apply migrations to development D1
yarn db:migrate

# Apply migrations to production D1
yarn db:migrate:prod
```

## API Routes

### Authentication (Better-Auth)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-in/email` | POST | Email/password login |
| `/api/auth/sign-out` | POST | End session |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/reference` | GET | OpenAPI docs for auth |
| `/api/auth/admin/*` | * | Admin user management (admin only) |

**Security Note (HAP-612)**: Public registration is DISABLED. New admin users must be created via the Better-Auth admin API or direct database insertion.

**Security Note (HAP-616)**: All state-changing requests (POST, PUT, DELETE, PATCH) require CSRF protection. The API uses the double-submit cookie pattern - requests must include an `X-CSRF-Token` header matching the `csrf-token` cookie.

### Metrics API (Protected - Admin Only)

All metrics endpoints require admin authorization (HAP-612). Users must:
1. Be authenticated (valid session)
2. Have `role = 'admin'` in the database

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/metrics/summary` | GET | 24h aggregated metrics |
| `/api/metrics/timeseries` | GET | Time-bucketed metrics |
| `/api/metrics/cache-hits` | GET | Profile cache hit rate |
| `/api/metrics/mode-distribution` | GET | Sync mode distribution |
| `/api/metrics/bundle-trends` | GET | Bundle size trends |
| `/api/metrics/bundle-latest` | GET | Latest bundle sizes |

### Health & Documentation

| Endpoint | Description |
|----------|-------------|
| `/` | API info and version |
| `/health` | Health check |
| `/ready` | Readiness check with dependency status |
| `/api/openapi.json` | OpenAPI 3.1 specification |
| `/api/docs` | Swagger UI |

## Admin User Management (HAP-612)

Public registration is disabled for security. New admin users can be created via:

### Option 1: Direct Database Insertion (Wrangler D1)

```bash
# Development
wrangler d1 execute DB --env dev --remote --command "
INSERT INTO users (id, name, email, email_verified, role, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'New Admin',
    'admin@example.com',
    1,
    'admin',
    (cast(unixepoch('subsecond') * 1000 as integer)),
    (cast(unixepoch('subsecond') * 1000 as integer))
);
"

# Then create a password account for the user
# First get the user ID from the insert above, then:
wrangler d1 execute DB --env dev --remote --command "
INSERT INTO accounts (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES (
    lower(hex(randomblob(16))),
    'admin@example.com',
    'credential',
    '<USER_ID_FROM_ABOVE>',
    '<BCRYPT_HASHED_PASSWORD>',
    (cast(unixepoch('subsecond') * 1000 as integer)),
    (cast(unixepoch('subsecond') * 1000 as integer))
);
"
```

### Option 2: Better-Auth Admin API (Requires Existing Admin)

The bootstrap admin (configured in `auth.ts`) can use the Better-Auth admin plugin endpoints:

```bash
# POST /api/auth/admin/create-user
curl -X POST https://happy-admin-api.enflamemedia.com/api/auth/admin/create-user \
  -H "Cookie: happy-admin.session_token=<ADMIN_SESSION>" \
  -H "Content-Type: application/json" \
  -d '{"email": "new@example.com", "password": "secure-password", "name": "New Admin", "role": "admin"}'
```

### Bootstrap Admin

The initial admin is configured in `auth.ts`:
- User ID: `C1zmGOgcvVNskKcTUDgLuYytHmCWOKMs`
- Has Better-Auth admin privileges
- Should have `role = 'admin'` in database (set by migration 0002)

## Environment Variables & Secrets

### Required Secrets (via wrangler secret)

| Secret | Purpose |
|--------|---------|
| `BETTER_AUTH_SECRET` | Session signing secret |

### Secrets Store (via secrets_store_secrets)

| Binding | Purpose |
|---------|---------|
| `ANALYTICS_ACCOUNT_ID` | Cloudflare account ID |
| `ANALYTICS_API_TOKEN` | Analytics Engine API token |

### Setting Secrets

```bash
# Development
wrangler secret put BETTER_AUTH_SECRET --env dev

# Production
wrangler secret put BETTER_AUTH_SECRET --env prod
```

### Local Development (.dev.vars)

Create `.dev.vars` from `.dev.vars.example`:

```bash
ENVIRONMENT=development
BETTER_AUTH_SECRET=dev-secret-for-local-development-only
BETTER_AUTH_URL=http://localhost:8788
```

## Code Style

- Use **4 spaces** for indentation
- Use functional and declarative programming patterns
- **Always use absolute imports** with `@/*` prefix
- Prefer interfaces over types
- Avoid enums; use const objects or unions

## Important Reminders

1. **Use 4 spaces** for indentation
2. **Use yarn**, not npm
3. **Always use `@/*` imports** for src files
4. **Never commit `.dev.vars`** (contains secrets)
5. **Test locally with `yarn dev`** before deploying
6. **Workers ≠ Node.js** - some Node APIs not available
7. **Access env via `c.env`**, not `process.env`
8. **CORS is critical** - dashboard won't work without proper CORS
9. **Cookies need SameSite=None** for cross-origin auth

## Related Documentation

- [Root CLAUDE.md](../CLAUDE.md) - Monorepo overview
- [happy-admin CLAUDE.md](../happy-admin/CLAUDE.md) - Dashboard frontend
- [Analytics Engine Docs](https://developers.cloudflare.com/analytics/analytics-engine/)
- [Better-Auth Docs](https://www.better-auth.com/)
- [Hono CORS](https://hono.dev/docs/middleware/builtin/cors)
