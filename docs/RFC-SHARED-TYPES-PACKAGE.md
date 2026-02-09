# RFC: Shared Types Package for Happy Monorepo

**Issue**: HAP-383
**Status**: RFC / Investigation Complete
**Date**: 2025-12-17
**Author**: Claude Code

---

## Executive Summary

This RFC recommends implementing a **yarn workspaces-based shared package** (`@magic-agent/protocol`) to consolidate ~95 duplicated type definitions across the Happy monorepo. The investigation identified significant schema drift risk, as evidenced by the recent `sessionId` vs `sid` bug that caused production sync failures.

**Recommendation**: Yarn workspaces with Zod schemas as the source of truth.

---

## Table of Contents

1. [Type Inventory](#1-type-inventory)
2. [Approach Comparison](#2-approach-comparison)
3. [Recommendation](#3-recommendation)
4. [Proof of Concept Design](#4-proof-of-concept-design)
5. [Migration Path](#5-migration-path)
6. [Open Questions - Resolved](#6-open-questions---resolved)
7. [Follow-up Issues](#7-follow-up-issues)

---

## 1. Type Inventory

### 1.1 Summary

| Project | File | Lines | Zod Schemas | TS Types | Total |
|---------|------|-------|-------------|----------|-------|
| happy-app | `sources/sync/apiTypes.ts` | 248 | 18 | 6 | 24 |
| happy-app | `sources/sync/storageTypes.ts` | 189 | 5 | 6 | 11 |
| happy-cli | `src/api/types.ts` | 570 | 20 | 15 | 35 |
| happy-server-workers | `src/durable-objects/types.ts` | 664 | 0 | 25 | 25 |
| happy-server | `sources/app/events/eventRouter.ts` | 623 | 0 | 12 | 12 |
| happy-server | `sources/storage/types.ts` | 101 | 0 | 5 | 5 |
| **Total** | | **2395** | **43** | **69** | **~112** |

**Note**: Many types are duplicated across files, resulting in ~95 unique type definitions with 4x average duplication.

### 1.2 Detailed File Analysis

#### apps/web/react/sources/sync/apiTypes.ts (248 lines)

Primary Zod schemas for client-side validation:

```
ApiMessageSchema          - Encrypted message structure
ApiUpdateNewMessageSchema - new-message update (uses 'sid')
ApiUpdateNewSessionSchema - new-session update
ApiDeleteSessionSchema    - delete-session update
ApiUpdateSessionStateSchema - update-session update
ApiUpdateAccountSchema    - update-account update
ApiUpdateMachineStateSchema - update-machine update
ApiNewMachineSchema       - new-machine update
ApiNewArtifactSchema      - new-artifact update
ApiUpdateArtifactSchema   - update-artifact update
ApiDeleteArtifactSchema   - delete-artifact update
ApiRelationshipUpdatedSchema - relationship-updated update
ApiNewFeedPostSchema      - new-feed-post update
ApiKvBatchUpdateSchema    - kv-batch-update update
ApiUpdateSchema           - Discriminated union of all updates
ApiUpdateContainerSchema  - Wrapper with id, seq, body, createdAt
ApiEphemeralActivityUpdateSchema - Session activity
ApiEphemeralUsageUpdateSchema - Token/cost usage
ApiEphemeralMachineActivityUpdateSchema - Machine activity
ApiEphemeralUpdateSchema  - Union of ephemeral updates
```

#### apps/cli/src/api/types.ts (570 lines)

CLI-specific schemas (many duplicates of app):

```
SessionMessageContentSchema - Same as ApiMessage content
UpdateBodySchema          - Same as ApiUpdateNewMessage
UpdateSessionBodySchema   - Same as ApiUpdateSessionState
UpdateMachineBodySchema   - Same as ApiUpdateMachineState
NewSessionBodySchema      - Same as ApiUpdateNewSession
GitHubProfileSchema       - GitHub user data
UpdateAccountBodySchema   - Same as ApiUpdateAccount
NewMachineBodySchema      - Same as ApiNewMachine
DeleteSessionBodySchema   - Same as ApiDeleteSession
NewArtifactBodySchema     - Same as ApiNewArtifact
UpdateArtifactBodySchema  - Same as ApiUpdateArtifact
DeleteArtifactBodySchema  - Same as ApiDeleteArtifact
RelationshipUpdatedBodySchema - Same as ApiRelationshipUpdated
NewFeedPostBodySchema     - Same as ApiNewFeedPost
KvBatchUpdateBodySchema   - Same as ApiKvBatchUpdate
UpdateSchema              - Container wrapper

+ Socket event interfaces:
ServerToClientEvents      - Server → Client events
ClientToServerEvents      - Client → Server events

+ Domain types:
Session, Machine, MachineMetadata, DaemonState
Metadata, AgentState, MessageContent, UserMessageSchema
EphemeralActivityUpdate, EphemeralUsageUpdate, EphemeralMachineActivityUpdate
```

#### apps/server/workers/src/durable-objects/types.ts (664 lines)

Workers-specific WebSocket types + duplicated protocol types:

```
WebSocket Infrastructure (Workers-specific, keep local):
- ClientType, ConnectionAuthState, ConnectionMetadata
- WebSocketAuthHandshake, CloseCode constants
- WebSocketMessageType, WebSocketMessage, ClientMessage
- NormalizedMessage, type guards
- ErrorMessage, ConnectedMessage
- BroadcastFilter types, ConnectionStats
- ConnectionManagerConfig, DEFAULT_CONFIG
- AuthMessagePayload

Protocol Types (DUPLICATED - should be shared):
- GitHubProfile
- UpdateEvent (large union - uses 'sessionId', not 'sid'!)
- EphemeralEvent
- UpdatePayload, EphemeralPayload
```

**Critical Finding**: `UpdateEvent` uses `sessionId` while app expects `sid`. This is the root cause of the bug!

#### apps/server/docker/sources/app/events/eventRouter.ts (623 lines)

Server event routing + duplicated types:

```
Connection Types (server-specific, keep local):
- SessionScopedConnection, UserScopedConnection, MachineScopedConnection
- ClientConnection union
- RecipientFilter types

Protocol Types (DUPLICATED - should be shared):
- UpdateEvent (identical structure to workers)
- EphemeralEvent (identical structure to workers)
- UpdatePayload, EphemeralPayload

Builder Functions (server-specific, keep local):
- buildNewSessionUpdate, buildNewMessageUpdate
- buildUpdateSessionUpdate, buildDeleteSessionUpdate
- buildUpdateAccountUpdate, buildNewMachineUpdate
- buildUpdateMachineUpdate, buildSessionActivityEphemeral
- buildMachineActivityEphemeral, buildUsageEphemeral
- etc.
```

#### apps/web/react/sources/sync/storageTypes.ts (189 lines)

Client-side storage types:

```
Utility Types:
- UsageHistoryEntry, MAX_USAGE_HISTORY_SIZE, MIN_CONTEXT_CHANGE_FOR_HISTORY

Schemas (some overlap with CLI):
- MetadataSchema, Metadata
- AgentStateSchema, AgentState
- MachineMetadataSchema, MachineMetadata

Interfaces:
- Session (client-side, includes UI state like draft, permissionMode)
- DecryptedMessage
- Machine
- GitStatus
```

#### apps/server/docker/sources/storage/types.ts (101 lines)

Prisma JSON type augmentation:

```
PrismaJson namespace:
- SessionMessageContent
- UsageReportData
- UpdateBody (same structure as UpdateEvent)
- Re-exports: GitHubProfile, GitHubOrg, ImageRef
```

### 1.3 Duplication Categories

#### Category A: Protocol Updates (CRITICAL - caused bug)

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| new-message | Zod (sid) | Zod (sid) | TS (sessionId) | TS (sid) |
| new-session | Zod | Zod | TS | TS |
| update-session | Zod | Zod | TS | TS |
| delete-session | Zod | Zod | TS | TS |
| update-account | Zod | Zod | TS | TS |
| new-machine | Zod | Zod | TS | TS |
| update-machine | Zod | Zod | TS | TS |
| new-artifact | Zod | Zod | TS | TS |
| update-artifact | Zod | Zod | TS | TS |
| delete-artifact | Zod | Zod | TS | TS |
| relationship-updated | Zod | Zod | TS | TS |
| new-feed-post | Zod | Zod | TS | TS |
| kv-batch-update | Zod | Zod | TS | TS |

**Risk**: Field naming inconsistencies (`sid` vs `sessionId`) cause runtime validation failures.

#### Category B: Ephemeral Events

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| activity | Zod | TS | TS | TS |
| usage | Zod | TS | TS | TS |
| machine-activity | Zod | TS | TS | TS |
| machine-status | - | - | TS | TS |

#### Category C: Payload Wrappers

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| UpdatePayload | - | - | TS | TS |
| EphemeralPayload | - | - | TS | TS |
| ApiUpdateContainer | Zod | - | - | - |

#### Category D: Domain Types

| Type | app | cli | workers | server |
|------|-----|-----|---------|--------|
| Metadata | Zod | TS | - | - |
| AgentState | Zod | TS | - | - |
| MachineMetadata | Zod | Zod | - | - |
| DaemonState | - | Zod | - | - |
| GitHubProfile | Zod (import) | Zod | TS | import |
| Session | TS | TS | - | - |
| Machine | TS | TS | - | - |

---

## 2. Approach Comparison

### 2.1 Option A: Yarn Workspaces

**Implementation**: Create `packages/schema/protocol/` with shared Zod schemas, referenced via `"@magic-agent/protocol": "workspace:*"` in each project.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | Low - monorepo already exists |
| **Local Development** | Excellent - symlinked, instant updates |
| **Type Checking** | Excellent - unified compile across projects |
| **Build Complexity** | Medium - dual ESM/CJS output needed |
| **Metro (React Native)** | Medium - requires `watchFolders` config |
| **Future-Proofing** | Medium - migration needed if monorepo splits |
| **Team Learning** | Low - familiar tooling |

**Pros**:
- Simplest setup, no publishing
- Immediate type errors across all projects
- Zero-config local development
- Natural fit for existing monorepo
- TypeScript project references enable incremental builds

**Cons**:
- If monorepo splits, needs migration to npm package
- Metro bundler requires explicit configuration
- happy-server (CommonJS) needs dual build output
- All projects must use yarn

### 2.2 Option B: NPM Package

**Implementation**: Publish `@magic-agent/protocol` to npm (private registry or public), consumed as standard dependency.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | Medium - CI/CD publishing required |
| **Local Development** | Poor - npm link or yalc required |
| **Type Checking** | Good - but only against published version |
| **Build Complexity** | Low - standard npm package |
| **Metro (React Native)** | Low - standard dependency |
| **Future-Proofing** | Excellent - works if repos split |
| **Team Learning** | Low - familiar tooling |

**Pros**:
- Works if monorepo splits
- Standard npm versioning
- No special bundler config needed
- Each project can pin different versions

**Cons**:
- Publishing overhead (CI/CD setup, versioning)
- Version drift possible (opposite of goal)
- More complex release process
- Local development friction (changes require publish cycle)
- Overkill for internal monorepo use

### 2.3 Option C: Code Generation (OpenAPI/Protobuf)

**Implementation**: Define schemas in OpenAPI YAML or Protobuf, generate TypeScript/Zod for each project.

| Aspect | Assessment |
|--------|------------|
| **Setup Complexity** | High - toolchain setup required |
| **Local Development** | Poor - regeneration required on changes |
| **Type Checking** | Good - generated types are consistent |
| **Build Complexity** | High - code generation pipeline |
| **Metro (React Native)** | Low - generated code is standard TS |
| **Future-Proofing** | Excellent - language-agnostic |
| **Team Learning** | High - OpenAPI/Protobuf expertise needed |

**Pros**:
- Language-agnostic source of truth
- Automatic validation generation
- Could generate docs, client SDKs
- Industry standard tooling

**Cons**:
- Significant initial investment
- Zod generation from OpenAPI is imperfect (edge cases)
- Two layers of abstraction (schema → Zod → types)
- Team would need to learn new tooling
- Overkill for TypeScript-only codebase
- Generated code may not match hand-crafted Zod patterns

### 2.4 Comparison Matrix

| Criteria | Weight | Yarn Workspaces | NPM Package | Code Generation |
|----------|--------|-----------------|-------------|-----------------|
| Setup simplicity | High | ★★★★★ | ★★★☆☆ | ★★☆☆☆ |
| Local development | High | ★★★★★ | ★★☆☆☆ | ★★☆☆☆ |
| Type safety across projects | Critical | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Maintenance overhead | Medium | ★★★★☆ | ★★★☆☆ | ★★☆☆☆ |
| React Native support | Medium | ★★★☆☆ | ★★★★★ | ★★★★★ |
| Future flexibility | Low | ★★★☆☆ | ★★★★★ | ★★★★★ |
| Team expertise fit | High | ★★★★★ | ★★★★★ | ★★☆☆☆ |
| **Total (weighted)** | | **4.5** | **3.5** | **3.0** |

---

## 3. Recommendation

### 3.1 Decision: Yarn Workspaces

**Recommendation**: Implement yarn workspaces with Zod schemas as the source of truth.

### 3.2 Rationale

1. **All projects are TypeScript**: No need for language-agnostic schema language
2. **All projects already use Zod**: Direct schema sharing is natural
3. **Monorepo structure exists**: Yarn workspaces fit naturally
4. **Primary goal is compile-time safety**: Workspaces provide immediate cross-project type checking
5. **Small team, internal project**: Publishing overhead is unjustified
6. **Code generation is overengineered**: Two abstraction layers for a TypeScript-only codebase

### 3.3 Open Questions - Resolved

**Q1: Zod schemas vs TypeScript interfaces?**
- **Answer**: Zod schemas
- **Rationale**: Already used everywhere, enables runtime validation

**Q2: Yarn workspaces vs npm package?**
- **Answer**: Yarn workspaces
- **Rationale**: Simpler, no publishing, immediate type checking

**Q3: Minimum viable scope?**
- **Answer**: Protocol types only (Update events, Ephemeral events, Payloads)
- **Rationale**: These caused the bug; storage types can remain local for now

**Q4: React Native bundling?**
- **Answer**: Requires Metro configuration (see §4.4)
- **Rationale**: Add `watchFolders` and potentially `nodeModulesPaths` config

---

## 4. Proof of Concept Design

### 4.1 Package Structure

```
packages/
└── @happy/
    └── protocol/
        ├── package.json
        ├── tsconfig.json
        ├── tsup.config.ts        # Dual ESM/CJS build
        ├── src/
        │   ├── index.ts          # Main exports
        │   ├── updates/
        │   │   ├── index.ts
        │   │   ├── message.ts    # new-message, delete-session
        │   │   ├── session.ts    # new-session, update-session
        │   │   ├── machine.ts    # new-machine, update-machine
        │   │   ├── artifact.ts   # artifact updates
        │   │   ├── account.ts    # update-account
        │   │   └── misc.ts       # relationship, feed, kv
        │   ├── ephemeral/
        │   │   ├── index.ts
        │   │   └── events.ts     # activity, usage, machine-activity
        │   ├── payloads.ts       # UpdatePayload, EphemeralPayload
        │   └── common.ts         # Shared primitives (GitHubProfile, etc.)
        └── dist/
            ├── index.js          # ESM
            ├── index.cjs         # CommonJS (for happy-server)
            └── index.d.ts        # Type declarations
```

### 4.2 Core Types for PoC (Priority 1)

```typescript
// packages/schema/protocol/src/updates/index.ts

import { z } from 'zod';

// Standardize on 'sid' (not 'sessionId') per client expectation
export const ApiUpdateNewMessageSchema = z.object({
    t: z.literal('new-message'),
    sid: z.string(),  // CRITICAL: Use 'sid', not 'sessionId'
    message: z.object({
        id: z.string(),
        seq: z.number(),
        content: z.object({
            t: z.literal('encrypted'),
            c: z.string(),
        }),
        localId: z.string().nullish(),
        createdAt: z.number(),
    }),
});

// ... other update schemas ...

export const ApiUpdateSchema = z.discriminatedUnion('t', [
    ApiUpdateNewMessageSchema,
    ApiUpdateNewSessionSchema,
    ApiDeleteSessionSchema,
    // ... all 13 update types
]);

export type ApiUpdate = z.infer<typeof ApiUpdateSchema>;
```

### 4.3 Build Configuration

```typescript
// packages/schema/protocol/tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],  // Dual output
    dts: true,               // TypeScript declarations
    clean: true,
    sourcemap: true,
    treeshake: true,
    external: ['zod'],       // Peer dependency
});
```

```json
// packages/schema/protocol/package.json
{
    "name": "@magic-agent/protocol",
    "version": "0.0.1",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "import": "./dist/index.js",
            "require": "./dist/index.cjs",
            "types": "./dist/index.d.ts"
        }
    },
    "peerDependencies": {
        "zod": "^3.0.0"
    },
    "devDependencies": {
        "tsup": "^8.0.0",
        "typescript": "^5.0.0",
        "zod": "^3.0.0"
    },
    "scripts": {
        "build": "tsup",
        "typecheck": "tsc --noEmit"
    }
}
```

### 4.4 Metro Configuration (React Native)

```javascript
// apps/web/react/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add workspace packages to watchFolders
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [
    ...(config.watchFolders || []),
    path.resolve(workspaceRoot, 'packages/schema/protocol'),
];

// Resolve workspace packages
config.resolver.nodeModulesPaths = [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
```

### 4.5 Root Workspace Configuration

```json
// package.json (root)
{
    "private": true,
    "workspaces": [
        "packages/schema/*",
        "happy-cli",
        "happy-server",
        "happy-server-workers",
        "happy-app"
    ]
}
```

---

## 5. Migration Path

### Phase 1: Create Package (1-2 days)

1. Create `packages/schema/protocol/` directory structure
2. Add root `package.json` with workspaces config
3. Implement core update schemas (copy from happy-app, standardize field names)
4. Implement ephemeral schemas
5. Implement payload wrappers
6. Build and verify dual output (ESM + CJS)
7. Run `yarn install` to link workspace

**Deliverable**: `@magic-agent/protocol` package builds with ~15 core types

### Phase 2: Integrate happy-app (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to apps/web/react/package.json
2. Update Metro config for workspace resolution
3. Replace imports in `sources/sync/apiTypes.ts`:
   ```typescript
   // Before
   export const ApiUpdateSchema = z.discriminatedUnion('t', [...]);

   // After
   export { ApiUpdateSchema, type ApiUpdate } from '@magic-agent/protocol';
   ```
4. Run `yarn typecheck` to verify
5. Run `yarn start` to verify Metro resolves package

**Validation**: App compiles and runs with shared types

### Phase 3: Integrate happy-cli (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to apps/cli/package.json
2. Replace imports in `src/api/types.ts`
3. Remove duplicated schema definitions
4. Run `yarn typecheck` and `yarn test`

**Validation**: CLI compiles and tests pass

### Phase 4: Integrate happy-server-workers (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to apps/server/workers/package.json
2. Update `src/durable-objects/types.ts`:
   - Import shared types from `@magic-agent/protocol`
   - Keep Workers-specific types (WebSocket infrastructure) local
3. Run `yarn typecheck` and `yarn test`

**Critical**: Ensure `UpdateEvent` field names match shared schema

**Validation**: Workers compile and tests pass

### Phase 5: Integrate happy-server (1 day)

1. Add `"@magic-agent/protocol": "workspace:*"` to apps/server/docker/package.json
2. Verify CommonJS import works: `const { ApiUpdateSchema } = require('@magic-agent/protocol')`
3. Update `sources/app/events/eventRouter.ts`:
   - Import shared types
   - Keep EventRouter class and builder functions local
4. Run `yarn build` and `yarn test`

**Validation**: Server compiles and tests pass

### Phase 6: Cleanup and Documentation (1 day)

1. Remove all duplicated type definitions
2. Add JSDoc comments to shared types
3. Update each project's CLAUDE.md with new import patterns
4. Add CI job to build all projects together

**Validation**: Full monorepo builds with no type errors

### Phase 7: CI Validation (optional, recommended)

1. Create GitHub Action that:
   - Builds `@magic-agent/protocol`
   - Builds all 4 projects
   - Runs type checking across all
2. Fail PR if any project has type errors

**Validation**: CI catches schema drift before merge

---

## 6. Technical Decisions

### 6.1 Field Naming: `sid` vs `sessionId`

**Decision**: Use `sid` consistently

**Rationale**:
- Client (happy-app) expects `sid`
- Bug was caused by workers using `sessionId`
- Shorter field name is acceptable for protocol types

**Migration**:
- Update `apps/server/workers/src/durable-objects/types.ts` to use `sid`
- Update `apps/server/docker/sources/app/events/eventRouter.ts` to use `sid`

### 6.2 Zod Version

**Decision**: Peer dependency on `zod ^3.0.0`

**Rationale**:
- All projects already use Zod 3.x
- Peer dependency avoids version conflicts
- Each project manages own Zod version

### 6.3 Build Tool

**Decision**: Use `tsup` for builds

**Rationale**:
- Simple config for dual ESM/CJS output
- Built-in TypeScript declaration generation
- Fast esbuild-based compilation
- Well-suited for library packages

---

## 7. Follow-up Issues

If this RFC is approved, create the following implementation issues:

### HAP-XXX: Create @magic-agent/protocol package

**Scope**: Set up package structure, implement core types, verify builds

**Acceptance Criteria**:
- [ ] Package structure created
- [ ] 15 core update/ephemeral schemas implemented
- [ ] Dual ESM/CJS build working
- [ ] Root workspace config added

### HAP-XXX: Integrate @magic-agent/protocol in happy-app

**Scope**: Metro config, import migration, type verification

**Acceptance Criteria**:
- [ ] Metro config updated
- [ ] Shared types imported
- [ ] Local duplicates removed
- [ ] App compiles and runs

### HAP-XXX: Integrate @magic-agent/protocol in happy-cli

**Scope**: Import migration, duplicate removal, test verification

### HAP-XXX: Integrate @magic-agent/protocol in happy-server-workers

**Scope**: Import migration, field naming fixes, test verification

### HAP-XXX: Integrate @magic-agent/protocol in happy-server

**Scope**: CommonJS import verification, duplicate removal, test verification

### HAP-XXX: Add CI validation for shared types

**Scope**: GitHub Action to build all projects, type check validation

---

## Appendix A: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Metro bundler issues | Medium | High | Test Metro config in Phase 2 before full migration |
| CommonJS compatibility | Low | Medium | tsup dual output tested in Phase 1 |
| Circular dependency | Low | High | Package only exports types, no runtime deps on projects |
| Breaking change during migration | Medium | Medium | Migrate one project at a time with validation |
| Build time increase | Low | Low | Package build adds ~3-5s, incremental builds available |

## Appendix B: Alternatives Considered

1. **Git submodules**: Rejected - poor DX, version sync issues
2. **Copy-paste with linting**: Rejected - doesn't solve root cause
3. **TypeScript path mapping only**: Rejected - doesn't enable runtime validation
4. **Single source file imported by all**: Rejected - metro can't resolve cross-project imports

---

*This RFC was generated by Claude Code as part of HAP-383 investigation.*
