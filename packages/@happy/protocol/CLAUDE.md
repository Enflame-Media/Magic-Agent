# @happy/protocol - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

## Package Overview

**@happy/protocol** provides shared Zod schemas and TypeScript types for the Happy sync protocol. This is the **single source of truth** for all API types used across the four consumer projects.

## Why This Package Exists

The Happy monorepo had ~95 duplicated types across four projects, causing schema drift bugs (notably HAP-383: `sessionId` vs `sid` inconsistency). This package:

1. **Single source of truth** - All protocol types defined once
2. **Zod validation** - Runtime validation matches TypeScript types
3. **Dual format** - Works with both ESM and CommonJS projects

## Commands

```bash
# Build ESM + CJS output
yarn build

# Type check without emitting
yarn typecheck

# Run tests
yarn test
yarn test:watch

# Remove dist folder
yarn clean
```

## Structure

```
src/
├── index.ts          # Re-exports all modules
├── common.ts         # Shared types (GitHubProfile, ImageRef, VersionedValue)
├── common.test.ts    # Tests for common types
├── payloads.ts       # Payload wrapper schemas (UpdatePayload, EphemeralPayload)
├── updates/          # Persistent event schemas
│   └── index.ts      # Session, Machine, Artifact, Account updates
└── ephemeral/        # Transient event schemas
    └── index.ts      # Activity, Usage, Machine status events
```

## Development Guidelines

### Adding New Schemas

1. **Determine category**: Is it persistent (updates/) or transient (ephemeral/)?
2. **Add Zod schema with JSDoc**: Include `@description` and `@example` tags
3. **Export from index.ts**: Add both schema and inferred type
4. **Add tests**: Test parsing and type inference
5. **Update README.md**: Document in the appropriate table

### Schema Naming Convention

- Schemas: `Api[Entity][Action]Schema` (e.g., `ApiUpdateNewMessageSchema`)
- Types: `Api[Entity][Action]` (e.g., `ApiUpdateNewMessage`)
- Union schemas: `ApiUpdateSchema`, `ApiEphemeralUpdateSchema`

### Type Exports

Always export both the Zod schema and the inferred TypeScript type:

```typescript
export const ApiNewSessionSchema = z.object({
    t: z.literal('new-session'),
    sid: z.string(),
    // ...
});

export type ApiNewSession = z.infer<typeof ApiNewSessionSchema>;
```

### Versioned Values Pattern

For optimistic concurrency, use the versioned value helpers:

```typescript
import { VersionedValueSchema, NullableVersionedValueSchema } from '@happy/protocol';

// Non-nullable versioned field
metadata: VersionedValueSchema,

// Nullable versioned field
agentState: NullableVersionedValueSchema,
```

## Consumer Projects

| Project | Module Format | Import Path |
|---------|---------------|-------------|
| happy-cli | ESM | `@happy/protocol` |
| happy-app | ESM (Expo) | `@happy/protocol` |
| happy-server | CommonJS | `@happy/protocol` |
| happy-server-workers | ESM | `@happy/protocol` |

## Testing

Tests use Vitest and are colocated with source files:

```bash
yarn test              # Run once
yarn test:watch        # Watch mode
```

## Output Files

After building, `dist/` contains:

| File | Format | Purpose |
|------|--------|---------|
| `index.js` | ESM | Modern ES modules |
| `index.cjs` | CommonJS | Legacy require() support |
| `index.d.ts` | TypeScript | ESM type declarations |
| `index.d.cts` | TypeScript | CJS type declarations |

## ID Field Naming Conventions

### ⚠️ Important: Inconsistent Field Names

The protocol schemas use **different field names** for the same semantic concept (session ID / machine ID). This is documented in [README.md](./README.md#field-name-reference) and must be considered when:

1. Adding new schemas (follow existing pattern for the update category)
2. Reviewing consumer code (verify correct field accessor)
3. Writing tests (use correct field name per update type)

**Quick Reference:**

| Semantic Meaning | Persistent Updates | Ephemeral Events |
|------------------|-------------------|------------------|
| Session ID | `id` (new/update-session) or `sid` (message/delete) | `id` |
| Machine ID | `machineId` | `machineId` or `id` (activity) |
| Discriminator | `t` | `type` |

**Root Cause**: Historical schema drift (HAP-383). Preserved for backward compatibility.

### Discriminator Field Difference

- **Persistent updates** use `t` field (e.g., `update.t === 'new-session'`)
- **Ephemeral events** use `type` field (e.g., `event.type === 'activity'`)

This is intentional and must be preserved. See [README.md](./README.md#discriminator-fields) for details.

## Important Rules

1. **Never break existing schemas** - Add new fields as optional
2. **Test both formats** - ESM and CJS consumers must work
3. **JSDoc all exports** - Document with `@description` and `@example`
4. **Keep discriminator patterns** - Persistent updates use `t`, ephemeral events use `type`
5. **Preserve field name conventions** - Follow the ID field naming documented above
