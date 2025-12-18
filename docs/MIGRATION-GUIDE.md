# Migration Guide: happy-server to happy-server-workers

This guide documents the differences between the Node.js/Fastify `happy-server` and the Cloudflare Workers `happy-server-workers` implementation, providing guidance for developers and clients migrating to the new backend.

## Table of Contents

1. [Overview](#overview)
2. [Architecture Comparison](#architecture-comparison)
3. [Database Migration](#database-migration)
4. [API Compatibility](#api-compatibility)
5. [WebSocket Migration](#websocket-migration)
6. [Authentication Changes](#authentication-changes)
7. [Storage Migration](#storage-migration)
8. [Configuration Changes](#configuration-changes)
9. [Development Workflow](#development-workflow)
10. [Client Migration](#client-migration)

---

## Overview

### Why Migrate?

| Benefit | Description |
|---------|-------------|
| **Global Edge** | Workers run in 300+ cities vs single region |
| **Lower Latency** | Edge-first reduces round-trip times |
| **Auto-scaling** | No capacity planning needed |
| **Cost Efficiency** | Pay per request, no idle servers |
| **Zero Maintenance** | No server patches or updates |

### Migration Status

| Component | Status |
|-----------|--------|
| REST API Routes | ✅ Complete |
| Authentication | ✅ Complete |
| Database (D1) | ✅ Complete |
| WebSocket (Durable Objects) | ✅ Complete |
| File Storage (R2) | ✅ Complete |
| Client Compatibility | ✅ Verified |

---

## Architecture Comparison

### Technology Stack

| Component | happy-server | happy-server-workers |
|-----------|-------------|----------------------|
| **Runtime** | Node.js | Cloudflare Workers |
| **Framework** | Fastify | Hono |
| **Database** | PostgreSQL + Prisma | D1 (SQLite) + Drizzle |
| **WebSocket** | Socket.io + Redis | Durable Objects |
| **File Storage** | MinIO/S3 | R2 |
| **Deployment** | Traditional server | Serverless edge |

### Infrastructure

```
happy-server:
┌─────────────────────────────────────────────────────────────┐
│                    Single Region Deployment                  │
├─────────────────────────────────────────────────────────────┤
│  Node.js Server (Fastify)                                   │
│       │              │              │                        │
│       ▼              ▼              ▼                        │
│  PostgreSQL      Redis (Pub/Sub)   MinIO/S3                 │
└─────────────────────────────────────────────────────────────┘

happy-server-workers:
┌─────────────────────────────────────────────────────────────┐
│                Cloudflare Edge Network (Global)              │
├─────────────────────────────────────────────────────────────┤
│  Hono Workers (Edge Compute)                                │
│       │              │              │                        │
│       ▼              ▼              ▼                        │
│     D1           Durable Objects     R2                     │
│  (SQLite)        (WebSocket)      (Storage)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Migration

### Schema Compatibility

The D1 schema maintains 100% parity with the original Prisma schema (20 tables).

### Type Mappings

| Prisma (PostgreSQL) | Drizzle (SQLite/D1) | Notes |
|---------------------|---------------------|-------|
| `Bytes` | `blob({ mode: 'buffer' })` | For encryption fields |
| `Json` | `text({ mode: 'json' })` | Auto JSON serialization |
| `DateTime` | `integer({ mode: 'timestamp_ms' })` | Unix timestamps in ms |
| `BigInt` | `integer()` | SQLite 64-bit integers |
| `Boolean` | `integer({ mode: 'boolean' })` | 0 = false, 1 = true |
| `@default(cuid())` | Application layer | Use `createId()` |
| `@updatedAt` | `$onUpdate(() => new Date())` | Drizzle auto-update |
| Enum types | `text()` + CHECK constraint | SQL-level validation |

### Key Schema Changes

1. **Account.avatar field REMOVED**
   - Frontend generates avatars dynamically (initials/placeholders)
   - No server-side image processing needed

2. **RelationshipStatus enum**
   - PostgreSQL native enum → SQLite TEXT with CHECK constraint
   - Values: `'none' | 'requested' | 'pending' | 'friend' | 'rejected'`

3. **ID Generation**
   - Prisma: `@default(cuid())` (database-level)
   - Drizzle: Application-layer using `createId()` from `@/utils/id`

### Data Migration

If migrating data from PostgreSQL to D1:

```bash
# Export from PostgreSQL
pg_dump --data-only --format=custom happy_db > happy_dump.sql

# Transform for SQLite (manual process)
# - Convert BYTEA to BLOB
# - Convert TIMESTAMP to INTEGER (milliseconds)
# - Convert JSON columns to TEXT
# - Handle enum values as TEXT

# Import to D1
wrangler d1 execute happy-prod --remote --file=transformed_data.sql
```

---

## API Compatibility

### Endpoint Compatibility

All REST API endpoints maintain the same paths, request/response formats:

| Category | Endpoints | Compatibility |
|----------|-----------|---------------|
| Authentication | `/v1/auth/*` | ✅ 100% |
| Sessions | `/v1/sessions/*`, `/v2/sessions/*` | ✅ 100% |
| Machines | `/v1/machines/*` | ✅ 100% |
| Artifacts | `/v1/artifacts/*` | ✅ 100% |
| Access Keys | `/v1/access-keys/*` | ✅ 100% |
| Connect | `/v1/connect/*` | ✅ 100% |
| Account | `/v1/account/*` | ✅ 100% |
| Users | `/v1/users/*` | ✅ 100% |
| Feed | `/v1/feed` | ✅ 100% |
| KV | `/v1/kv/*` | ✅ 100% |
| Push | `/v1/push-tokens/*` | ✅ 100% |
| Voice | `/v1/voice/*` | ✅ 100% |
| Version | `/v1/version` | ✅ 100% |

### Request/Response Format

No changes to JSON payloads. Same Zod schemas used for validation.

### HTTP Headers

Same authentication headers supported:
- `Authorization: Bearer <token>`
- Query parameter: `?token=<token>`

### Error Responses

Same error format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

---

## WebSocket Migration

### Protocol Changes

| Aspect | happy-server | happy-server-workers |
|--------|-------------|----------------------|
| Library | Socket.io | Native WebSocket |
| Transport | WebSocket + Fallbacks | WebSocket only |
| Endpoint | `/socket.io/` | `/v1/updates` |
| State | Redis Pub/Sub | Durable Objects |

### Connection Migration

**Old (Socket.io):**
```javascript
const socket = io('https://api.example.com', {
  auth: { token: 'xxx' },
  query: { clientType: 'user-scoped' }
});
```

**New (Native WebSocket):**
```javascript
const ws = new WebSocket(
  'wss://api.example.com/v1/updates?token=xxx&clientType=user-scoped'
);
```

### Message Format

The server accepts both formats (automatic normalization):

**Client format (Socket.io style):**
```json
{
  "event": "session-update",
  "data": { "sessionId": "abc123" },
  "ackId": "req_1234"
}
```

**Server format (Workers style):**
```json
{
  "type": "session-update",
  "payload": { "sessionId": "abc123" },
  "timestamp": 1701432000000,
  "messageId": "msg_1234"
}
```

### Connection Types

Same three connection types supported:

| Type | Purpose | Required Params |
|------|---------|-----------------|
| `user-scoped` | Mobile app | token |
| `session-scoped` | Session viewer | token, sessionId |
| `machine-scoped` | CLI daemon | token, machineId |

### Close Codes

New custom close codes:

| Code | Meaning |
|------|---------|
| 4001 | AUTH_FAILED |
| 4002 | INVALID_HANDSHAKE |
| 4003 | MISSING_SESSION_ID |
| 4004 | MISSING_MACHINE_ID |
| 4005 | CONNECTION_LIMIT_EXCEEDED |

---

## Authentication Changes

### Token Generation

Both use privacy-kit for token generation. Same token format and verification.

### Flow Differences

No changes to authentication flows:
- Direct auth (Ed25519 signature)
- Terminal pairing (QR code flow)
- Account pairing (mobile-to-mobile)

### Token Compatibility

**Important**: Tokens from happy-server are NOT compatible with happy-server-workers because they use different `HANDY_MASTER_SECRET` values. Users must re-authenticate when switching backends.

---

## Storage Migration

### File Storage

| Aspect | happy-server | happy-server-workers |
|--------|-------------|----------------------|
| Provider | MinIO/S3 | R2 |
| API | AWS S3 SDK | R2 Binding |
| Limits | Configurable | 5MB avatar, 50MB doc, 100MB general |

### Migration Path

R2 is S3-compatible. Existing files can be migrated:

```bash
# Using rclone
rclone copy s3:happy-bucket r2:happy-dev-uploads --progress
```

### API Endpoints

Same upload endpoints:
- `POST /v1/uploads` - General upload
- `POST /v1/uploads/avatar` - Avatar upload
- `GET /v1/uploads/:id/download` - Download

---

## Configuration Changes

### Environment Variables

**happy-server (.env):**
```bash
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
S3_ENDPOINT=https://minio.example.com
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
S3_BUCKET=happy-uploads
HANDY_MASTER_SECRET=...
```

**happy-server-workers (.dev.vars / wrangler secrets):**
```bash
ENVIRONMENT=development
HANDY_MASTER_SECRET=...
ELEVENLABS_API_KEY=...  # Optional
GITHUB_CLIENT_SECRET=...  # Optional
```

### Bindings (wrangler.toml)

Workers use bindings instead of connection strings:
```toml
[[env.dev.d1_databases]]
binding = "DB"
database_name = "happy-dev"
database_id = "xxx"

[[env.dev.r2_buckets]]
binding = "UPLOADS"
bucket_name = "happy-dev-uploads"

[[env.dev.durable_objects.bindings]]
name = "CONNECTION_MANAGER"
class_name = "ConnectionManager"
```

---

## Development Workflow

### Local Development

**happy-server:**
```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run server
yarn dev
```

**happy-server-workers:**
```bash
# No external dependencies needed
# D1 and R2 auto-created locally by Wrangler
yarn dev
```

### Testing

**happy-server:**
```bash
yarn test  # Jest
```

**happy-server-workers:**
```bash
yarn test  # Vitest
```

### Deployment

**happy-server:**
```bash
# Build and deploy to server
yarn build
pm2 restart happy-server
```

**happy-server-workers:**
```bash
# Deploy to Cloudflare
yarn deploy:prod
```

---

## Client Migration

### happy-cli

**Only change required**: Update server URL

```bash
# Environment variable
export HAPPY_SERVER_URL=https://happy-api.enflamemedia.com

# Or in .env
HAPPY_SERVER_URL=https://happy-api.enflamemedia.com
```

No code changes required. WebSocket already migrated to native WebSocket (HAP-261).

### happy-app

**Only change required**: Update server URL

```bash
# In .env or build config
EXPO_PUBLIC_HAPPY_SERVER_URL=https://happy-api.enflamemedia.com
```

No code changes required. WebSocket already migrated to native WebSocket (HAP-261).

### Re-authentication Required

Because the `HANDY_MASTER_SECRET` differs between backends, users will need to:
1. Re-authenticate the mobile app
2. Re-pair CLI devices with the mobile app

---

## Rollback Plan

If issues arise after migration, rollback is straightforward:

1. **Client rollback**: Update server URLs back to happy-server
2. **No data sync needed**: Databases are independent

To resume happy-server:
```bash
# Point clients to old server
HAPPY_SERVER_URL=https://old-api.example.com
```

---

## Post-Migration Checklist

- [ ] Clients updated to new server URL
- [ ] Users re-authenticated on mobile app
- [ ] CLI devices re-paired
- [ ] Verify session sync working
- [ ] Verify real-time WebSocket updates
- [ ] Verify file uploads/downloads
- [ ] Monitor error rates (should be < 1%)
- [ ] Monitor latency (P95 should be < 500ms)

---

## FAQ

### Q: Will my existing sessions/data be available?

A: No, the databases are separate. This is a fresh start. For data migration, coordinate with the development team.

### Q: Do I need to update my CLI?

A: Only the server URL configuration. No code update required.

### Q: What if the Workers backend has issues?

A: Rollback by pointing clients back to the old server URL. Both backends can run simultaneously.

### Q: Are the APIs exactly the same?

A: Yes, 100% API compatibility. Same endpoints, same request/response formats.

### Q: What about WebSocket reliability?

A: Durable Objects with hibernation provide better reliability than Socket.io. Automatic reconnection is supported.

---

**Document Version**: 1.0
**Last Updated**: 2024-12-03
**Maintained By**: Happy Development Team
