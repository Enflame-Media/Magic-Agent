# happy-shared

[![CI](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml/badge.svg)](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml)
[![Shared Types Validation](https://github.com/Enflame-Media/happy-shared/actions/workflows/shared-types-validation.yml/badge.svg)](https://github.com/Enflame-Media/happy-shared/actions/workflows/shared-types-validation.yml)

Shared packages and root configurations for the Happy monorepo.

## Overview

This repository contains shared code used across the Happy ecosystem - a mobile and web client for Claude Code and Codex enabling remote control and session sharing with end-to-end encryption.

## Packages

### @magic-agent/protocol

Shared Zod schemas and TypeScript types for the Happy sync protocol.

```typescript
import { ApiUpdateSchema, ApiEphemeralUpdateSchema } from '@magic-agent/protocol';
```

See [packages/schema/protocol/README.md](packages/schema/protocol/README.md) for detailed documentation.

## Repository Structure

```
happy-shared/
├── packages/
│   └── @happy/
│       └── protocol/    # Shared Zod schemas for API updates/events
├── .github/
│   └── workflows/       # CI/CD workflows
├── docs/                # Shared documentation
├── package.json         # Root workspace configuration
└── yarn.lock            # Shared lockfile
```

## Development

### Prerequisites

- Node.js >= 18.0.0
- Yarn 4 (enabled via Corepack)

### Setup

```bash
# Enable Corepack for Yarn 4
corepack enable

# Install dependencies
yarn install

# Build the protocol package
yarn workspace @magic-agent/protocol build

# Type check
yarn workspace @magic-agent/protocol typecheck
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `yarn build:protocol` | Build @magic-agent/protocol |
| `yarn typecheck:protocol` | Type check @magic-agent/protocol |

## CI/CD Pipeline

The repository uses GitHub Actions for continuous integration. Every PR triggers:

| Check | Projects | Description |
|-------|----------|-------------|
| **Type Check** | apps/cli, apps/web/react, apps/server/workers | TypeScript compilation |
| **Lint** | apps/cli, apps/web/react, apps/server/workers | ESLint/OxLint validation |
| **Tests** | apps/server/workers | Vitest test suite |
| **Build** | apps/cli, apps/server/workers | Production build verification |

### Branch Protection

PRs require all CI checks to pass before merge. The `ci-summary` job acts as a single status check that blocks merge if any quality gate fails.

### Dependabot

Security updates are automated via Dependabot:
- Weekly scans for npm vulnerabilities
- GitHub Actions dependency updates
- Grouped minor/patch updates to reduce PR noise

## Related Repositories

| Repository | Description |
|------------|-------------|
| [happy](https://github.com/Enflame-Media/happy) | React Native mobile/web app |
| apps/cli | Node.js CLI wrapper |
| apps/server/docker | Fastify backend server |
| apps/server/workers | Cloudflare Workers edge functions |

## License

MIT
