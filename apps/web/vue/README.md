# Happy Vue

Vue.js workspace for the Happy web client.

> **Happy** is a mobile and web client for Claude Code and Codex, enabling remote control and session sharing across devices with end-to-end encryption.

## Project Structure

```
happy-vue/
├── apps/
│   └── web/           # Vue.js + Vite web application
├── packages/
│   ├── shared/        # Shared composables and utilities
│   └── protocol/      # Port of @magic-agent/protocol (Zod schemas)
├── .github/
│   └── workflows/     # CI/CD pipelines
├── package.json       # Root workspace configuration
├── .yarnrc.yml        # Yarn v4 configuration
├── tsconfig.base.json # Shared TypeScript configuration
├── CLAUDE.md          # AI assistant guidelines
└── README.md          # This file
```

## Prerequisites

- **Node.js**: 20+ LTS
- **Yarn**: v4 (via Corepack: `corepack enable`)

## Getting Started

```bash
# Enable Corepack (provides Yarn v4)
corepack enable

# Install dependencies
yarn install

# Run web development server
yarn dev:web

# Type check all packages
yarn typecheck

# Build all packages
yarn build
```

## Packages

### `@happy-vue/web`

Vue.js + Vite web application. Features:

- PWA support
- Responsive design
- Shared codebase with mobile

### `@happy-vue/shared`

Shared utilities and composables used by the web app:

- Vue composables
- Utility functions
- Type definitions

### `@happy-vue/protocol`

Port of `@magic-agent/protocol` with Zod schemas for:

- API updates
- Ephemeral events
- Shared types

## Migration Status

This repository is part of the Vue.js migration from React Native.

| Phase | Description            | Status      |
| ----- | ---------------------- | ----------- |
| 0     | Monorepo setup         | ✅ Complete |
| 1     | Web app implementation | 🔜 Planned  |
| 2     | Integration testing    | 🔜 Planned  |
| 3     | Production deployment  | 🔜 Planned  |

See [HAP-660](https://linear.app/enflame-media/issue/HAP-660) for the migration epic.

## Related Projects

- [happy](https://github.com/Enflame-Media/happy) - React Native app (being replaced)
- [happy-cli](https://github.com/Enflame-Media/happy-cli) - CLI wrapper for Claude Code
- [happy-server-workers](https://github.com/Enflame-Media/happy-server-workers) - Backend API

## License

MIT
