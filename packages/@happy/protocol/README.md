# @happy/protocol

Shared protocol types for the Happy monorepo. This package provides **Zod schemas** and **TypeScript types** for the Happy sync protocol, serving as the single source of truth across all four consumer projects.

## Installation

This package is automatically available within the Happy monorepo via **yarn workspaces**. No additional installation is required.

```bash
# From monorepo root - already included in workspace
yarn install
```

## Usage

### ESM (happy-cli, happy-app, happy-server-workers)

```typescript
import {
  ApiUpdateSchema,
  ApiEphemeralUpdateSchema,
  type ApiUpdate,
  type ApiEphemeralUpdate
} from '@happy/protocol';

// Validate incoming update
const result = ApiUpdateSchema.safeParse(data);
if (result.success) {
  const update: ApiUpdate = result.data;
  switch (update.t) {
    case 'new-message':
      // Note: new-message uses 'sid', not 'id'
      console.log('Session:', update.sid);
      console.log('Message:', update.message);
      break;
    case 'new-session':
      // Note: new-session uses 'id', not 'sid'
      console.log('New session:', update.id);
      break;
    // ... handle other types (see Field Name Reference below)
  }
}
```

### CommonJS (happy-server)

```javascript
const { ApiUpdateSchema, ApiEphemeralUpdateSchema } = require('@happy/protocol');

// Same usage as ESM
const result = ApiUpdateSchema.safeParse(data);
```

## Available Exports

### Update Schemas (Persistent Events)

These are state changes that are stored and synced across devices.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateSchema` | `ApiUpdate` | Discriminated union of all update types |
| `ApiUpdateNewMessageSchema` | `ApiUpdateNewMessage` | New encrypted message in session |
| `ApiUpdateNewSessionSchema` | `ApiUpdateNewSession` | New session created |
| `ApiDeleteSessionSchema` | `ApiDeleteSession` | Session archived/deleted |
| `ApiUpdateSessionStateSchema` | `ApiUpdateSessionState` | Session state change |
| `ApiUpdateAccountSchema` | `ApiUpdateAccount` | Account metadata update |
| `ApiNewMachineSchema` | `ApiNewMachine` | New machine registered |
| `ApiUpdateMachineStateSchema` | `ApiUpdateMachineState` | Machine state change |
| `ApiNewArtifactSchema` | `ApiNewArtifact` | New artifact created |
| `ApiUpdateArtifactSchema` | `ApiUpdateArtifact` | Artifact updated |
| `ApiDeleteArtifactSchema` | `ApiDeleteArtifact` | Artifact deleted |
| `ApiRelationshipUpdatedSchema` | `ApiRelationshipUpdated` | Friend relationship change |
| `ApiNewFeedPostSchema` | `ApiNewFeedPost` | Activity feed post |
| `ApiKvBatchUpdateSchema` | `ApiKvBatchUpdate` | KV store batch update |

### Ephemeral Schemas (Transient Events)

Real-time status updates that don't require persistence.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiEphemeralUpdateSchema` | `ApiEphemeralUpdate` | Union of all ephemeral types |
| `ApiEphemeralActivityUpdateSchema` | `ApiEphemeralActivityUpdate` | Session activity status |
| `ApiEphemeralUsageUpdateSchema` | `ApiEphemeralUsageUpdate` | Token/cost usage |
| `ApiEphemeralMachineActivityUpdateSchema` | `ApiEphemeralMachineActivityUpdate` | Machine activity |
| `ApiEphemeralMachineStatusUpdateSchema` | `ApiEphemeralMachineStatusUpdate` | Machine online/offline |

### Payload Wrappers

Container schemas for WebSocket message sequencing.

| Schema | Type | Description |
|--------|------|-------------|
| `ApiUpdateContainerSchema` | `ApiUpdateContainer` | Sequenced update wrapper |
| `UpdatePayloadSchema` | `UpdatePayload` | Server-side wire format |
| `EphemeralPayloadSchema` | `EphemeralPayload` | Ephemeral wrapper |

### Common Types

Shared types used across the protocol.

| Schema | Type | Description |
|--------|------|-------------|
| `GitHubProfileSchema` | `GitHubProfile` | GitHub OAuth profile data |
| `ImageRefSchema` | `ImageRef` | Image/avatar reference |
| `RelationshipStatusSchema` | `RelationshipStatus` | User relationship enum |
| `UserProfileSchema` | `UserProfile` | Social user profile |
| `FeedBodySchema` | `FeedBody` | Activity feed content |
| `EncryptedContentSchema` | `EncryptedContent` | Encrypted payload wrapper |
| `VersionedValueSchema` | `VersionedValue` | Optimistic concurrency value |
| `NullableVersionedValueSchema` | `NullableVersionedValue` | Nullable versioned value |

## Field Name Reference

### Session ID Field Names

The session ID is represented with different field names depending on the update type:

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiUpdateNewSessionSchema` | `new-session` | `id` | `t` | Persistent update |
| `ApiUpdateSessionStateSchema` | `update-session` | `id` | `t` | Persistent update |
| `ApiUpdateNewMessageSchema` | `new-message` | `sid` | `t` | Persistent update |
| `ApiDeleteSessionSchema` | `delete-session` | `sid` | `t` | Persistent update |
| `ApiEphemeralActivityUpdateSchema` | `activity` | `id` | `type` | Ephemeral event |
| `ApiEphemeralUsageUpdateSchema` | `usage` | `id` | `type` | Ephemeral event |

**Pattern Summary:**
- **`id`**: Used in `new-session`, `update-session`, `activity`, `usage`
- **`sid`**: Used in `new-message`, `delete-session`

### Machine ID Field Names

The machine ID is represented with different field names:

| Schema | Update Type | Field Name | Discriminator | Notes |
|--------|-------------|------------|---------------|-------|
| `ApiNewMachineSchema` | `new-machine` | `machineId` | `t` | Persistent update |
| `ApiUpdateMachineStateSchema` | `update-machine` | `machineId` | `t` | Persistent update |
| `ApiEphemeralMachineStatusUpdateSchema` | `machine-status` | `machineId` | `type` | Ephemeral event |
| `ApiEphemeralMachineActivityUpdateSchema` | `machine-activity` | `machineId` | `type` | Ephemeral event |

**Pattern Summary:**
- **`machineId`**: All machine schemas now consistently use `machineId` (standardized in HAP-655)

### Discriminator Fields

**Important:** Persistent updates and ephemeral events use different discriminator field names:

| Category | Discriminator Field | Example |
|----------|---------------------|---------|
| Persistent Updates | `t` | `update.t === 'new-session'` |
| Ephemeral Events | `type` | `event.type === 'activity'` |

### Historical Context

The original naming inconsistency (HAP-383) where `machine-activity` used `id` while other machine schemas used `machineId` has been resolved. All machine schemas now consistently use `machineId` (HAP-655).

### Consumer Code Example

When handling updates, always check the discriminator (`t` or `type`) first:

```typescript
import type { ApiUpdate, ApiEphemeralUpdate } from '@happy/protocol';

// Persistent updates use 't' discriminator
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
    case 'delete-session':
      // Use 'sid' for session ID
      const sessionIdA = update.sid;
      break;
    case 'new-session':
    case 'update-session':
      // Use 'id' for session ID
      const sessionIdB = update.id;
      break;
  }
}

// Ephemeral events use 'type' discriminator
function handleEphemeral(event: ApiEphemeralUpdate) {
  switch (event.type) {
    case 'activity':
    case 'usage':
      // Use 'id' for session ID
      const sessionId = event.id;
      break;
    case 'machine-activity':
      // Use 'id' for machine ID
      const machineIdA = event.id;
      break;
    case 'machine-status':
      // Use 'machineId' for machine ID
      const machineIdB = event.machineId;
      break;
  }
}
```

## Type Guard Patterns

```typescript
import { ApiUpdateSchema, type ApiUpdate, type ApiUpdateType } from '@happy/protocol';

// Type narrowing with switch
function handleUpdate(update: ApiUpdate) {
  switch (update.t) {
    case 'new-message':
      // TypeScript knows: update is ApiUpdateNewMessage
      console.log(update.sid, update.message);
      break;
    case 'new-session':
      // TypeScript knows: update is ApiUpdateNewSession
      console.log(update.id, update.metadata);
      break;
  }
}

// Available type discriminators
const updateTypes: ApiUpdateType[] = [
  'new-message', 'new-session', 'delete-session',
  'update-session', 'update-account', 'new-machine',
  // ... etc
];
```

## Building

```bash
# From packages/@happy/protocol
yarn build        # Build ESM + CJS output
yarn typecheck    # Type check without emitting
yarn clean        # Remove dist folder

# From monorepo root
yarn build:protocol
yarn typecheck:protocol
```

## Output Files

After building, the `dist/` folder contains:

| File | Format | Purpose |
|------|--------|---------|
| `index.js` | ESM | Modern ES modules |
| `index.cjs` | CommonJS | Legacy require() support |
| `index.d.ts` | TypeScript | ESM type declarations |
| `index.d.cts` | TypeScript | CJS type declarations |
| `index.js.map` | Sourcemap | ESM debugging |
| `index.cjs.map` | Sourcemap | CJS debugging |

## Peer Dependencies

This package requires `zod@^3.0.0` as a peer dependency. All consumer projects in the monorepo already have zod installed.

## Why This Package Exists

The Happy monorepo had ~95 duplicated types across four projects, causing schema drift bugs. The most notable was the `sessionId` vs `sid` field naming inconsistency (see HAP-383).

This package:
1. **Single source of truth** - All protocol types defined once
2. **Zod validation** - Runtime validation matches TypeScript types
3. **Dual format** - Works with both ESM and CommonJS projects
4. **Migration path** - Projects can adopt gradually

## Migration Guide

When migrating existing code to use `@happy/protocol`:

1. **Import from package** instead of local types:
   ```typescript
   // Before
   import { ApiUpdate } from '../api/types';

   // After
   import { ApiUpdate } from '@happy/protocol';
   ```

2. **Remove duplicate definitions** from local files

3. **Run typecheck** to catch any mismatches

See individual project integration issues (HAP-385 through HAP-388) for detailed migration steps.

## Related Issues

- **HAP-383**: RFC - Shared Types Package (complete)
- **HAP-384**: Set up yarn workspaces (this package)
- **HAP-385**: Integrate in happy-app
- **HAP-386**: Integrate in happy-cli
- **HAP-387**: Integrate in happy-server-workers
- **HAP-388**: Integrate in happy-server
- **HAP-389**: CI validation

## License

MIT
