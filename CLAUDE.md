# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Happy** is a mobile and web client for Claude Code and Codex, enabling remote control and session sharing across devices with end-to-end encryption. This is a TypeScript monorepo containing four projects and shared packages:

1. **happy-cli** (`/happy-cli/`) - Command-line wrapper for Claude Code and Codex
2. **happy-server** (`/happy-server/`) - Backend API server for encrypted sync
3. **happy-app** (`/happy-app/`) - React Native mobile/web client
4. **happy-server-workers** (`/happy-server-workers/`) - Cloudflare Workers edge functions

Each project has its own `CLAUDE.md` with detailed guidelines. **Always consult the project-specific CLAUDE.md when working within that project's directory.**

## Monorepo Structure

```
/happy/
├── packages/           # Shared packages (tracked in happy-shared repo)
│   └── @happy/
│       └── protocol/  # Shared Zod schemas for API updates/events
├── happy-cli/          # Node.js CLI (ESM)
│   ├── src/           # TypeScript sources
│   ├── bin/           # Executable scripts
│   ├── package.json   # Uses yarn
│   └── CLAUDE.md      # CLI-specific guidelines
├── happy-server/       # Fastify server (CommonJS)
│   ├── sources/       # TypeScript sources (note: not 'src')
│   ├── prisma/        # Database schema
│   ├── package.json   # Uses yarn
│   └── CLAUDE.md      # Server-specific guidelines
├── happy-server-workers/ # Cloudflare Workers (ESM)
│   ├── src/           # TypeScript sources
│   ├── wrangler.toml  # Cloudflare config
│   └── package.json   # Uses yarn
├── happy-app/          # Expo React Native (ESM)
│   ├── sources/       # TypeScript sources (note: not 'src')
│   ├── app/           # Expo Router screens
│   ├── package.json   # Uses yarn
│   └── CLAUDE.md      # App-specific guidelines
├── package.json        # Root workspaces config
└── yarn.lock           # Shared lockfile
```

## Package Management

All projects use **yarn** (not npm). The monorepo uses **yarn workspaces** configured in the root `package.json` to:
- Share dependencies across projects (hoisted to root `node_modules/`)
- Link shared packages like `@happy/protocol` via `workspace:*`
- Maintain a single `yarn.lock` for consistent dependency versions

## Shared Packages

Shared packages live in `packages/@happy/` and are tracked in the `happy-shared` GitHub repository (separate from individual project repos).

### @happy/protocol

The `@happy/protocol` package provides shared Zod schemas for:
- **API Updates**: Session, machine, message, artifact, account schemas
- **Ephemeral Events**: Real-time events like typing indicators, cost updates

**Usage:**
```typescript
import { SessionUpdateSchema, MachineUpdateSchema } from '@happy/protocol';
```

**Building:**
```bash
yarn workspace @happy/protocol build
yarn workspace @happy/protocol typecheck
```

Projects consume it via workspace linking:
```json
{
  "dependencies": {
    "@happy/protocol": "workspace:*"
  }
}
```

## Git Repository Structure

The monorepo uses **multiple git repositories**:

| Repository | Tracks | GitHub |
|------------|--------|--------|
| `happy-shared` | Root configs, `packages/`, docs | [Enflame-Media/happy-shared](https://github.com/Enflame-Media/happy-shared) |
| `happy-app` | Mobile/web app code | [Enflame-Media/happy](https://github.com/Enflame-Media/happy) |
| `happy-cli` | CLI wrapper code | Individual repo |
| `happy-server` | Backend server code | Individual repo |
| `happy-server-workers` | Cloudflare Workers | Individual repo |

Each project directory has its own `.git/` - they are independent repositories.

## Development Workflow

### Working on a Single Project

Navigate to the project directory and follow its specific `CLAUDE.md`:

```bash
# CLI development
cd happy-cli
yarn build && yarn test

# Server development
cd happy-server
yarn dev  # Uses .env.dev

# Mobile app development
cd happy-app
yarn start
```

### Cross-Project Changes

When changes span multiple projects:

1. **Protocol/API changes**: Update in this order:
   - `happy-server` - Update API endpoints/types first
   - `happy-cli` - Update API client to match
   - `happy-app` - Update sync logic to match

2. **Type definitions**: Use `@happy/protocol` for shared types. Project-specific types remain in:
   - Shared: `packages/@happy/protocol/` (Zod schemas for API updates/events)
   - Server: `sources/app/api/types.ts`
   - CLI: `src/api/types.ts`
   - App: `sources/sync/types.ts`

3. **Testing**: Test each project independently after changes

## System Architecture

### Authentication Flow
1. CLI generates keypair and displays QR code
2. Mobile app scans QR and approves connection
3. Server facilitates challenge-response authentication
4. All subsequent data is end-to-end encrypted

### Session Synchronization
1. CLI wraps Claude Code and captures session state
2. CLI encrypts and sends updates to server via WebSocket
3. Server relays encrypted messages to connected mobile devices
4. Mobile app decrypts and displays real-time session state

### Data Flow
```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  happy-cli  │◄──────► │ happy-server │◄──────► │  happy-app  │
│  (Node.js)  │ encrypt │  (Fastify)   │ encrypt │ (React Native)│
│             │  WSS    │              │  WSS    │             │
└─────────────┘         └──────────────┘         └─────────────┘
       │                                                  │
       ▼                                                  ▼
  Claude Code                                      Mobile UI
  (subprocess)                                    (encrypted view)
```

## Common Commands

### Building All Projects
```bash
# From root
cd happy-cli && yarn build
cd ../happy-server && yarn build
cd ../happy-app && yarn typecheck
```

### Running Tests
```bash
# CLI tests (includes integration tests)
cd happy-cli && yarn test

# Server tests
cd happy-server && yarn test

# App tests
cd happy-app && yarn test
```

### Local Development with All Components
```bash
# Terminal 1: Start server locally
cd happy-server
yarn dev

# Terminal 2: Run CLI with local server
cd happy-cli
yarn dev:local-server

# Terminal 3: Run mobile app with local server
cd happy-app
yarn start:local-server
```

## Important Notes

- **Path aliases**: All three projects use `@/*` to import from their respective source directories
- **Source directories**: CLI uses `src/`, server and app use `sources/`
- **Module systems**: CLI uses ESM, server uses CommonJS, app uses ESM (via Expo)
- **TypeScript**: All projects use strict mode
- **Encryption**: End-to-end encryption using TweetNaCl (NaCl Box) - server never sees plaintext
- **Database**: Server uses Prisma with PostgreSQL (never modify schema without migrations)
- **Environment variables**: Each project has its own `.env` file structure (see Environment & Secrets section below)

## Code Style Conventions

### GitHub Naming Convention

When referencing GitHub in code:

| Context | Convention | Example |
|---------|------------|---------|
| Type/Class/Schema names | `GitHub` (PascalCase with capital H) | `GitHubProfileSchema`, `GitHubUser` |
| Variable names | `github` (camelCase) | `githubToken`, `existingGithubConnection` |
| Function names | `GitHub` in name | `createGitHubToken`, `verifyGitHubToken` |
| URL paths | `github` (lowercase) | `/v1/connect/github/callback` |
| Translation keys | `github` (lowercase) | `t('modals.disconnectGithub')` |
| File names | `github` (lowercase) | `apiGithub.ts`, `githubConnect.ts` |

This follows the official GitHub branding (capital H) while respecting language-specific conventions.

## Environment & Secrets Management

### Environment File Structure

Each project follows a consistent pattern for environment files:

| File | Purpose | Committed to Git |
|------|---------|------------------|
| `.env.example` | Template with all variables and descriptions | Yes |
| `.env.dev` | Local development with safe defaults | Yes |
| `.env.staging` | Staging environment template | Yes |
| `.env` | Active environment (copied from template) | No |
| `.env.local` | Local overrides | No |
| `.env.production` | Production values | No |

### Project-Specific Variables

#### happy-cli
- `HAPPY_SERVER_URL` - API server URL
- `HAPPY_WEBAPP_URL` - Web application URL
- `HAPPY_HOME_DIR` - Local data directory (~/.happy)
- `DEBUG` - Enable verbose logging

#### happy-server
- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection for pub/sub (required)
- `HAPPY_MASTER_SECRET` - Master encryption key (required, replaces deprecated `HANDY_MASTER_SECRET`)
- `S3_*` - S3/MinIO storage configuration (required)
- `ELEVENLABS_API_KEY` - Voice synthesis (optional)
- `GITHUB_*` - GitHub OAuth integration (optional)

#### happy-app
- `EXPO_PUBLIC_HAPPY_SERVER_URL` - API server URL (baked into app at build time)

#### happy-server-workers (Cloudflare)
- Uses `.dev.vars` for local development (gitignored)
- Production secrets via `wrangler secret put`
- Bindings (D1, R2, Durable Objects) in `wrangler.toml`

### Generating Secrets

Use the provided script to generate cryptographic secrets:

```bash
cd happy-server
./scripts/generate-secrets.sh
./scripts/generate-secrets.sh --env production
```

This generates:
- `HAPPY_MASTER_SECRET` - 32-byte hex for JWT signing (replaces deprecated `HANDY_MASTER_SECRET`)
- `GITHUB_WEBHOOK_SECRET` - Webhook signature verification
- TweetNaCl keypairs for client encryption

### Cloudflare Secrets (Workers)

For `happy-server-workers`, production secrets are managed via Wrangler:

```bash
cd happy-server-workers

# Set a secret
wrangler secret put HAPPY_MASTER_SECRET --env prod

# List all secrets
wrangler secret list --env prod

# Delete a secret
wrangler secret delete SECRET_NAME --env prod
```

Required production secrets:
- `HAPPY_MASTER_SECRET` - Authentication and encryption (replaces deprecated `HANDY_MASTER_SECRET`)

Optional:
- `ELEVENLABS_API_KEY` - Voice features
- `GITHUB_PRIVATE_KEY` - GitHub App authentication
- `GITHUB_CLIENT_SECRET` - GitHub OAuth

### Secret Rotation

See `happy-server/docs/SECRET-ROTATION.md` for detailed procedures on rotating secrets, including:
- Impact assessment for each secret type
- Step-by-step rotation procedures
- Emergency rotation checklist
- Cloudflare Secrets commands reference

### Security Best Practices

1. **Never commit secrets** - All `.env` files with real credentials are gitignored
2. **Use different secrets per environment** - Dev, staging, and production should have unique secrets
3. **Rotate quarterly** - Regular rotation reduces exposure window
4. **Use Cloudflare Secrets for Workers** - Never put production secrets in `wrangler.toml`
5. **Generate cryptographically secure secrets** - Use `openssl rand -hex 32` or the provided script

## Security Considerations

- All sensitive data is encrypted client-side before transmission
- Server acts as a "zero-knowledge" relay - cannot decrypt messages
- Authentication uses cryptographic signatures, no passwords
- Session IDs and encryption keys never leave the client devices

## Project Dependencies

- **happy-cli** depends on: Claude Code (globally installed, not bundled)
- **happy-server** depends on: Nothing (standalone)
- **happy-app** depends on: Nothing (standalone)

All three communicate via the HTTP/WebSocket API defined by happy-server.

## When Working Across Projects

1. **Always check project-specific CLAUDE.md** before making changes
2. **Respect different conventions** (ESM vs CommonJS, src vs sources, 2-space vs 4-space indentation)
3. **Test independently** - each project has its own test suite
4. **Consider backward compatibility** - mobile apps may be on older versions
5. **Update @happy/protocol first** when changing shared types, then update consuming projects
6. **Commit to correct repo** - shared packages go to `happy-shared`, project code to individual repos
