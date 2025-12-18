# happy-shared

[![CI](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml/badge.svg)](https://github.com/Enflame-Media/happy-shared/actions/workflows/ci.yml)

Shared packages and root configurations for the Happy monorepo.

## Overview

This repository contains shared code used across the Happy ecosystem - a mobile and web client for Claude Code and Codex enabling remote control and session sharing with end-to-end encryption.

## Packages

### @happy/protocol

Shared Zod schemas and TypeScript types for the Happy sync protocol.

```typescript
import { ApiUpdateSchema, ApiEphemeralUpdateSchema } from '@happy/protocol';
```

See [packages/@happy/protocol/README.md](packages/@happy/protocol/README.md) for detailed documentation.

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
yarn workspace @happy/protocol build

# Type check
yarn workspace @happy/protocol typecheck
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `yarn build:protocol` | Build @happy/protocol |
| `yarn typecheck:protocol` | Type check @happy/protocol |

## Related Repositories

| Repository | Description |
|------------|-------------|
| [happy](https://github.com/Enflame-Media/happy) | React Native mobile/web app |
| happy-cli | Node.js CLI wrapper |
| happy-server | Fastify backend server |
| happy-server-workers | Cloudflare Workers edge functions |

## License

MIT
