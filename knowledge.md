# Project Knowledge

This file gives Codebuff context about your project: goals, commands, conventions, and gotchas.

## Overview

**happy-shared** is a monorepo containing shared packages for the Happy ecosystem - a mobile and web client for Claude Code and Codex enabling remote control and session sharing with end-to-end encryption.

## Quickstart

```bash
# Setup (requires Node.js >= 18, Yarn 4 via Corepack)
corepack enable
yarn install

# Build shared packages (runs automatically on postinstall)
yarn build:errors
yarn build:protocol

# Typecheck
yarn typecheck:errors
yarn typecheck:protocol

# Run tests (per package)
yarn workspace @happy/protocol test
yarn workspace @happy/errors test
yarn workspace @happy/lint-rules test
```

## Architecture

### Key directories
- `packages/schema/protocol/` - Shared Zod schemas for API types (single source of truth)
- `packages/schema/errors/` - Unified error handling (AppError class + error codes)
- `dev/lint-rules/` - Custom oxlint/ESLint rules for codebase conventions
- `docs/` - Cross-project documentation (encryption, error codes, RFCs)

### Consumer projects (external repos, not in this repo)
- `happy-cli` - Node.js CLI wrapper (ESM)
- `happy-app` - React Native mobile/web client (ESM via Expo)
- `happy-server` - Fastify backend (CommonJS)
- `happy-server-workers` - Cloudflare Workers (ESM)

### Data flow
```
happy-cli ←→ happy-server ←→ happy-app
(Node.js)    (Fastify)       (React Native)
   ↓                              ↓
Claude Code                  Mobile UI
```
All communication is end-to-end encrypted via TweetNaCl.

## Conventions

### Formatting/linting
- TypeScript strict mode everywhere
- Use Yarn workspaces (`yarn workspace @happy/protocol <cmd>`)
- Packages output both ESM and CJS formats

### Patterns to follow
- Schema naming: `Api[Entity][Action]Schema` (e.g., `ApiUpdateNewMessageSchema`)
- Type exports: Always export both Zod schema and inferred type
- GitHub naming: Use `GitHub` (capital H) in PascalCase identifiers, `github` in camelCase
- Discriminator fields: Persistent updates use `t`, ephemeral events use `type`

### Things to avoid
- Never break existing schemas - add new fields as optional
- Never remove error codes - may break existing error handling
- Don't modify ID field naming conventions (historical `sid` vs `id` inconsistency preserved for backward compatibility)
- Don't use `any` type - keep strict typing

## Gotchas

- **ID field inconsistency**: Session ID is `id` in new/update-session but `sid` in message/delete updates (HAP-383 legacy)
- **Dual module format**: All packages must work with both ESM and CommonJS consumers
- **Postinstall builds**: `@happy/errors` and `@happy/protocol` are built automatically on `yarn install`
- **Swift generation**: Run `yarn workspace @happy/protocol generate:swift` after schema changes for happy-macos
