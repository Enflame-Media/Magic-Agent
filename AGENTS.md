# Repository Guidelines

## Project Structure & Module Organization
- Root workspace config lives in `package.json` with Yarn workspaces.
- Shared packages live in `packages/schema/`:
  - `packages/schema/protocol/` for Zod schemas and shared API types.
  - `packages/schema/errors/` for AppError utilities.
  - `dev/lint-rules/` for custom ESLint/Oxlint rules.
- Product apps and services live under `apps/` (for example `apps/web/react/`, `apps/cli/`, `apps/server/workers/`, `apps/admin/web/`, `apps/admin/api/`).
- `apps/cli/` is the Node.js CLI wrapper (TypeScript, ESM).
- `apps/web/react/` is the Expo React Native mobile/web client.
- `apps/server/workers/` is the Cloudflare Workers backend.
- `apps/web/vue/` is a separate Yarn workspace for Vue web + mobile clients.
- `apps/macos/` is an Xcode project for the native SwiftUI macOS app.
- CI workflows live in `.github/workflows/` (CodeQL, bundle size, shared-types validation).
- Cross-project documentation lives in `docs/`.
- Each project has its own `CLAUDE.md` with local conventions; consult it before making changes there.

## Product Functionality & Workflow
- Happy enables remote control and session sharing for Claude Code/Codex with end-to-end encryption.
- CLI generates keypairs, presents QR codes, and syncs session updates; apps decrypt and render real-time state.
- Server workers act as encrypted relays; no plaintext session data is stored server-side.
- Typical change flow: update shared schemas in `@happy/protocol`, then update clients that consume them.

## Build, Test, and Development Commands
- `yarn install` installs workspace dependencies (Yarn 4 via Corepack).
- `yarn build:protocol` builds `@happy/protocol`.
- `yarn build:errors` builds `@happy/errors`.
- `yarn typecheck:protocol` or `yarn typecheck:errors` runs TypeScript checks.
- `yarn workspace @happy/protocol test` runs protocol tests (Vitest).
- `yarn workspace @happy/errors test` runs errors tests (Vitest).
- `yarn workspace @happy/lint-rules test` runs lint-rules tests (Vitest).

## Project-Specific Commands
- `apps/cli/`: `yarn dev`, `yarn build`, `yarn test`, `yarn lint`.
- `apps/web/react/`: `yarn start`, `yarn ios` or `yarn android`, `yarn test`, `yarn typecheck`.
- `apps/server/workers/`: `yarn dev`, `yarn deploy:dev`, `yarn deploy:prod`, `yarn db:migrate:local`.
- `apps/web/vue/`: `yarn dev:web`, `yarn dev:mobile`, `yarn build`, `yarn lint`, `yarn test`.
- `apps/macos/`: `xcodebuild build -scheme Happy`, `xcodebuild test -scheme Happy`, or open `Happy.xcodeproj` in Xcode.

## Protocol & Schema Details
- `@happy/protocol` is the single source of truth for Zod schemas and TypeScript types.
- Schemas cover updates (session, machine, message, artifact, account), ephemeral events, and payload wrappers.
- Use helper accessors in `@happy/protocol` for ID fields (`sid`, `machineId`) when available.
- Swift types for the macOS client are generated via `packages/schema/protocol/scripts/generate-swift.ts`.

## Coding Style & Naming Conventions
- TypeScript/ESM is the default in shared packages.
- Indentation is 4 spaces in TypeScript and JSON files; match existing file style.
- Use existing naming patterns in each package (e.g., `GitHub` casing rules are enforced by lint rules).
- Prefer small, focused modules; keep shared types in `@happy/protocol` instead of duplicating across projects.
- Linting uses Oxlint across projects, with custom rules from `@happy/lint-rules` and optional ESLint/Prettier in `apps/web/vue/`.

## Testing Guidelines
- Tests are co-located next to source (`src/*.test.ts`, `src/rules/*.test.js`).
- Use Vitest for unit tests in shared packages.
- When updating shared types or errors, add or adjust tests in the same package.
- `apps/macos/` uses Xcode tests (`xcodebuild test -scheme Happy`).

## Commit & Pull Request Guidelines
- Commit messages are short, imperative, and often follow Conventional Commits, sometimes with ticket scopes (e.g., `feat(HAP-766): ...`).
- PRs should include a clear summary, linked issue (if applicable), and testing notes.
- Include screenshots or clips for UI changes in `apps/web/react/` or `apps/admin/web/`.

## Security & Configuration Tips
- Never commit secrets or real `.env` files.
- Use project-specific env templates (`.env.example`, `.env.dev`) and follow each project’s `CLAUDE.md` for configuration details.
