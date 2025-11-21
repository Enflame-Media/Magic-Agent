# Happy Server Workers - Development Guidelines

This document contains development guidelines for the Happy Server on Cloudflare Workers. This guide OVERRIDES any default behaviors and MUST be followed exactly.

## Project Overview

**Name**: happy-server-workers
**Purpose**: Cloudflare Workers implementation of Happy Server
**Framework**: Hono with OpenAPI 3.1 (via @hono/zod-openapi)
**Runtime**: Cloudflare Workers
**Language**: TypeScript (strict mode)

## Core Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono v4+
- **Language**: TypeScript with strict mode
- **Testing**: Vitest
- **Development Tool**: Wrangler CLI v3+
- **Package Manager**: Yarn (not npm)

## Architecture

This is a serverless implementation of Happy Server, designed to run on Cloudflare's global edge network. It replaces the traditional Node.js/Fastify server with a Workers-based architecture.

### Key Differences from happy-server

| Aspect | happy-server | happy-server-workers |
|--------|--------------|----------------------|
| Runtime | Node.js | Cloudflare Workers |
| Framework | Fastify | Hono |
| Database | PostgreSQL + Prisma | D1 + Drizzle ORM |
| WebSockets | Socket.io | Durable Objects (future) |
| File Storage | MinIO/S3 | R2 (future) |
| Deployment | Traditional server | Serverless edge |

## Development Workflow

### Commands

```bash
# Install dependencies
yarn install

# Start local development server
yarn dev

# Type checking
yarn typecheck

# Linting
yarn lint
yarn lint:fix

# Code formatting
yarn format

# Run tests
yarn test
yarn test:watch

# Deploy to Cloudflare Workers
yarn deploy
```

### Local Development

The `yarn dev` command starts Wrangler's local development server on port 8787:

```bash
yarn dev
# Server runs at http://localhost:8787
```

Access the development server:
- Root: http://localhost:8787/
- Health check: http://localhost:8787/health

## Code Style and Structure

### General Principles

- Use **4 spaces** for indentation (matching happy-server convention)
- Write concise, technical TypeScript code with accurate examples
- Use functional and declarative programming patterns
- Prefer iteration and modularization over code duplication
- Use descriptive variable names with auxiliary verbs
- **Always use absolute imports** with `@/*` prefix
- Prefer interfaces over types
- Avoid enums; use const objects or unions instead
- Use TypeScript strict mode

### Folder Structure

```
/src
├── /middleware        # Hono middleware
│   ├── logger.ts     # Request logging
│   ├── error.ts      # Error handling
│   └── cors.ts       # CORS configuration
├── /routes           # API routes (future)
├── /utils            # Utility functions
└── index.ts          # Main entry point
```

### Naming Conventions

- Use lowercase with dashes for directories (e.g., `api-routes`)
- File and function names should match for utilities
- Test files use `.spec.ts` suffix

## Environment Variables

### Local Development

Environment variables for local development are stored in `.dev.vars`:

```bash
ENVIRONMENT=development
# Add more variables as needed
```

⚠️ **IMPORTANT**: Never commit `.dev.vars` to version control - it's gitignored by default.

### Accessing Environment Variables

In Workers, access environment variables via the context:

```typescript
app.get('/example', (c) => {
    const env = c.env.ENVIRONMENT;
    return c.json({ env });
});
```

**NOT** via `process.env` (that's Node.js specific).

### Production Secrets

For production, use Wrangler secrets:

```bash
# Set a secret
wrangler secret put SECRET_NAME

# List secrets
wrangler secret list

# Delete a secret
wrangler secret delete SECRET_NAME
```

## Middleware

### Order Matters

Middleware is applied in the order defined:

```typescript
app.use('*', logger());      // 1. Log request
app.use('*', cors());        // 2. Handle CORS
// Routes here
app.onError(errorHandler);   // Last: Error handling
```

### Creating Custom Middleware

```typescript
import type { MiddlewareHandler } from 'hono';

export const myMiddleware = (): MiddlewareHandler => {
    return async (c, next) => {
        // Before request
        await next();
        // After request
    };
};
```

## Routing

### Basic Routes

```typescript
// GET route
app.get('/users', (c) => {
    return c.json({ users: [] });
});

// POST route with body
app.post('/users', async (c) => {
    const body = await c.req.json();
    return c.json({ created: body }, 201);
});

// Route with parameters
app.get('/users/:id', (c) => {
    const id = c.req.param('id');
    return c.json({ id });
});
```

### Nested Routes

```typescript
// Create a sub-app
const apiRoutes = new Hono();

apiRoutes.get('/users', (c) => c.json({ users: [] }));
apiRoutes.get('/posts', (c) => c.json({ posts: [] }));

// Mount to main app
app.route('/api/v1', apiRoutes);
```

## TypeScript Configuration

### Path Aliases

The project uses `@/*` path aliases for cleaner imports:

```typescript
// ✅ Good
import { logger } from '@/middleware/logger';

// ❌ Bad
import { logger } from '../middleware/logger';
```

### Strict Mode

TypeScript strict mode is enabled with additional checks:

- `noUnusedLocals`: Error on unused variables
- `noUnusedParameters`: Error on unused parameters
- `noImplicitReturns`: All code paths must return
- `noFallthroughCasesInSwitch`: No fallthrough in switch

## Testing

### Writing Tests

```typescript
import { describe, it, expect } from 'vitest';
import app from '@/index';

describe('GET /', () => {
    it('returns welcome message', async () => {
        const res = await app.request('/');
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.message).toContain('Welcome');
    });
});
```

### Running Tests

```bash
# Run once
yarn test

# Watch mode
yarn test:watch
```

## Deployment

### Prerequisites

1. Cloudflare account with Workers enabled
2. Wrangler CLI authenticated:

```bash
wrangler login
```

### Deploy to Production

```bash
# Deploy to production
yarn deploy

# Deploy to specific environment
wrangler deploy --env staging
```

### Deployment Checklist

- [ ] All tests passing (`yarn test`)
- [ ] Type checks passing (`yarn typecheck`)
- [ ] Linting passing (`yarn lint`)
- [ ] Environment variables set via `wrangler secret`
- [ ] `wrangler.toml` configured correctly

## Cloudflare Workers Specifics

### Compatibility Date

The project uses `compatibility_date = "2025-01-08"` in `wrangler.toml`. This determines which Workers runtime features are available.

### Compatibility Flags

- `nodejs_compat`: Enables Node.js compatibility layer for APIs like `Buffer`, `process`, etc.

### Limitations

Cloudflare Workers have specific limitations:

- **CPU Time**: 10ms for free tier, 50ms for paid (can be extended with [Unbound](https://developers.cloudflare.com/workers/platform/pricing/#workers))
- **Memory**: 128 MB
- **Request Size**: 100 MB
- **Response Size**: Unlimited
- **Subrequests**: 50 per request (free), 1000 (paid)

Design your application within these constraints.

## Migration Guide

This Workers implementation is Phase 1 of migrating from happy-server. Future phases will add:

- **Phase 2**: Database migration (PostgreSQL → D1)
- **Phase 3**: API routes migration
- **Phase 4**: WebSocket/real-time (Durable Objects)
- **Phase 5**: File storage (R2)
- **Phase 6**: Testing and production deployment

## Common Patterns

### Error Handling

```typescript
import { HTTPException } from 'hono/http-exception';

app.get('/protected', (c) => {
    if (!c.req.header('Authorization')) {
        throw new HTTPException(401, {
            message: 'Unauthorized',
        });
    }
    return c.json({ data: 'sensitive' });
});
```

### Type-Safe Environment

```typescript
interface Env {
    DATABASE_URL: string;
    API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.get('/data', async (c) => {
    // c.env is now typed!
    const dbUrl = c.env.DATABASE_URL;
    return c.json({ dbUrl });
});
```

## Important Reminders

1. **Use 4 spaces** for indentation (not 2)
2. **Use yarn**, not npm
3. **Always use `@/*` imports** for src files
4. **Never commit `.dev.vars`** (contains secrets)
5. **Test locally with `yarn dev`** before deploying
6. **Workers ≠ Node.js** - some Node APIs not available
7. **Access env via `c.env`**, not `process.env`

## Database (D1 + Drizzle ORM)

### Overview

The database has been migrated from Prisma/PostgreSQL to Drizzle ORM/D1 (Cloudflare's SQLite database). This migration maintains 100% schema parity with 20+ tables while adapting to SQLite's constraints.

### Schema Location

- **Schema Definition**: `src/db/schema.ts` (complete Drizzle schema for all tables)
- **Database Client**: `src/db/client.ts` (typed database access)
- **Migrations**: `drizzle/migrations/` (generated SQL migrations)
- **Configuration**: `drizzle.config.ts` (Drizzle Kit config)

### PostgreSQL → SQLite Type Mappings

| Prisma (PostgreSQL) | Drizzle (SQLite) | Notes |
|---------------------|------------------|-------|
| `Bytes` | `blob({ mode: 'buffer' })` | For encryption (TweetNaCl) |
| `Json` | `text({ mode: 'json' })` | Auto JSON serialization |
| `DateTime` | `integer({ mode: 'timestamp_ms' })` | Unix timestamps in ms |
| `BigInt` | `integer()` | SQLite 64-bit integers |
| `Boolean` | `integer({ mode: 'boolean' })` | 0 = false, 1 = true |
| `cuid()` default | Application layer | Use `@paralleldrive/cuid2` |
| `@updatedAt` | `$onUpdate(() => new Date())` | Drizzle auto-update |
| Enum types | `text()` + CHECK constraint | SQL-level validation |

### Database Commands

```bash
# Generate migrations from schema changes
yarn db:generate

# Apply migrations to local D1 database
yarn db:migrate

# Open Drizzle Studio (database GUI)
yarn db:studio

# Seed test data
yarn db:seed

# Validate schema parity with Prisma
yarn db:compare
```

### Key Schema Changes from Prisma

1. **Account.avatar field REMOVED**
   - Frontend generates avatars dynamically (initials/placeholders)
   - Eliminates server-side image processing complexity
   - No database storage needed for avatar images

2. **RelationshipStatus enum**
   - PostgreSQL native enum → SQLite TEXT with CHECK constraint
   - Values: `'none' | 'requested' | 'pending' | 'friend' | 'rejected'`
   - Enforced at database level: `CHECK (status IN (...))`

3. **Composite Primary Keys**
   - UserRelationship uses `primaryKey({ columns: [fromUserId, toUserId] })`
   - SQLite doesn't support `@@id` directive like Prisma

4. **ID Generation**
   - Prisma `@default(cuid())` → Application-layer using `createId()` from `@paralleldrive/cuid2`
   - No database-level default for IDs

5. **Encryption Fields**
   - All `Bytes` fields (dataEncryptionKey, token, etc.) → `blob({ mode: 'buffer' })`
   - Preserves binary data integrity for TweetNaCl encryption

### Usage Examples

#### Basic Query
```typescript
import { getDb } from '@/db/client';

export default {
    async fetch(request: Request, env: Env) {
        const db = getDb(env.DB);

        // Query accounts
        const accounts = await db.select().from(schema.accounts);

        return Response.json(accounts);
    },
};
```

#### Relational Query
```typescript
import { getDb } from '@/db/client';

export default {
    async fetch(request: Request, env: Env) {
        const db = getDb(env.DB);

        // Query with relations using Drizzle Relational API
        const accountWithSessions = await db.query.accounts.findFirst({
            where: (accounts, { eq }) => eq(accounts.id, 'account_id_here'),
            with: {
                sessions: true,
                machines: true,
                artifacts: true,
            },
        });

        return Response.json(accountWithSessions);
    },
};
```

#### Insert with Generated ID
```typescript
import { createId } from '@paralleldrive/cuid2';
import { getDb } from '@/db/client';
import { schema } from '@/db/schema';

export default {
    async fetch(request: Request, env: Env) {
        const db = getDb(env.DB);

        const newAccount = await db.insert(schema.accounts).values({
            id: createId(), // Application-layer ID generation
            publicKey: 'ed25519_pk_...',
            seq: 0,
            feedSeq: 0,
            // ... other fields
        }).returning();

        return Response.json(newAccount);
    },
};
```

#### Transaction Example
```typescript
import { getDb } from '@/db/client';
import { schema } from '@/db/schema';

export default {
    async fetch(request: Request, env: Env) {
        const db = getDb(env.DB);

        const result = await db.transaction(async (tx) => {
            // Insert account
            const [account] = await tx.insert(schema.accounts).values({
                id: createId(),
                publicKey: 'pk_...',
            }).returning();

            // Insert session for that account
            const [session] = await tx.insert(schema.sessions).values({
                id: createId(),
                accountId: account.id,
                tag: 'main',
                metadata: JSON.stringify({ device: 'web' }),
            }).returning();

            return { account, session };
        });

        return Response.json(result);
    },
};
```

### Migration Best Practices

1. **Always generate migrations**: Don't manually edit migration files
2. **Test locally first**: Use local D1 database before production
3. **Validate schema parity**: Run `yarn db:compare` after changes
4. **Backup before migration**: D1 doesn't support automatic rollbacks
5. **Handle breaking changes**: Create new migrations, don't edit existing ones

### Schema Validation

The `src/db/comparison-tool.ts` validates 100% parity with the original Prisma schema:
- Table count (20 tables)
- Expected table names
- Key field presence (Account, Session, etc.)
- Relation definitions
- Schema adjustments (avatar removal, enum conversions)

Run validation:
```bash
yarn db:compare
```

### Troubleshooting

**Error: "Table already exists"**
- Drop and recreate local D1 database: `wrangler d1 execute DB --local --command="DROP TABLE IF EXISTS ..."`

**Error: "Foreign key constraint failed"**
- Ensure `PRAGMA foreign_keys = ON` in migration files
- Check that referenced records exist before inserting

**Error: "No such table"**
- Run migrations: `yarn db:migrate`
- Verify D1 database exists: `wrangler d1 list`

**Type errors in queries**
- Regenerate schema: `yarn db:generate`
- Ensure `@/*` path aliases working in tsconfig.json

## Authentication & OpenAPI

### Overview

The authentication system uses **privacy-kit** for token generation/verification, preserving the exact same auth flow as happy-server. **Better-Auth integration was deferred to HAP-29** due to HAP-10 (POC) not being completed.

### OpenAPI 3.1 Specification

The server uses `@hono/zod-openapi` to automatically generate OpenAPI 3.1 documentation from Zod schemas.

**Access the OpenAPI spec:**
```bash
curl http://localhost:8787/openapi.json
```

**Key features:**
- All routes defined with `createRoute()` from `@hono/zod-openapi`
- Request/response validation via Zod schemas
- Automatic OpenAPI documentation generation
- OpenAPI 3.1 compliant (not 3.0 or Swagger 2.0)

### Auth Module (Privacy-Kit)

**Location:** `src/lib/auth.ts`

**Initialization:**
```typescript
import { initAuth } from '@/lib/auth';

// Initialize with master secret (done automatically in middleware)
await initAuth(env.HANDY_MASTER_SECRET);
```

**Token Generation:**
```typescript
import { createToken } from '@/lib/auth';

const token = await createToken(userId, { session: 'session_id' });
// Returns: JWT-style token string
```

**Token Verification:**
```typescript
import { verifyToken } from '@/lib/auth';

const verified = await verifyToken(token);
if (verified) {
    console.log(verified.userId);    // User ID
    console.log(verified.extras);    // Optional extras (e.g., session ID)
}
```

**Cache Management:**
```typescript
import { invalidateUserTokens, invalidateToken, getCacheStats } from '@/lib/auth';

// Invalidate all tokens for a user (e.g., on logout)
invalidateUserTokens(userId);

// Invalidate specific token
invalidateToken(token);

// Get cache statistics
const stats = getCacheStats();
console.log(`Cache size: ${stats.size} tokens`);
```

### Auth Middleware

**Location:** `src/middleware/auth.ts`

**Protecting Routes:**
```typescript
import { authMiddleware } from '@/middleware/auth';

// Apply to specific route
app.get('/v1/sessions', authMiddleware(), async (c) => {
    const userId = c.get('userId');              // Always defined after middleware
    const extras = c.get('sessionExtras');       // Optional extras from token
    // ... fetch user's data
});

// Apply to route prefix
app.use('/v1/sessions/*', authMiddleware());
```

**Optional Authentication:**
```typescript
import { optionalAuthMiddleware } from '@/middleware/auth';

app.get('/v1/public/data', optionalAuthMiddleware(), async (c) => {
    const userId = c.get('userId');  // May be undefined
    if (userId) {
        // Show personalized data
    } else {
        // Show public data
    }
});
```

### Auth Routes

**Location:** `src/routes/auth/index.ts`

All auth routes are OpenAPI-documented and use Zod validation.

#### POST /v1/auth - Direct Public Key Authentication

**Use case:** Client has Ed25519 keypair and wants to authenticate directly.

**Request:**
```json
{
    "publicKey": "base64-encoded-ed25519-public-key",
    "challenge": "base64-encoded-challenge",
    "signature": "base64-encoded-ed25519-signature"
}
```

**Response (200):**
```json
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Flow:**
1. Client generates Ed25519 keypair
2. Server sends challenge (not implemented yet - client generates challenge)
3. Client signs challenge with private key
4. Server verifies signature with public key
5. Server creates/updates account in database
6. Server generates authentication token

#### POST /v1/auth/request - Terminal Pairing (CLI → Mobile)

**Use case:** happy-cli wants to pair with happy-app.

**Request:**
```json
{
    "publicKey": "base64-encoded-x25519-public-key",
    "supportsV2": true
}
```

**Response (200) - Pending:**
```json
{
    "state": "requested"
}
```

**Response (200) - Already Authorized:**
```json
{
    "state": "authorized",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "response": "base64-encoded-encrypted-response"
}
```

**Flow:**
1. CLI generates X25519 keypair
2. CLI displays QR code with public key
3. CLI calls POST /v1/auth/request (creates pending request)
4. CLI polls GET /v1/auth/request/status until approved
5. Mobile scans QR and calls POST /v1/auth/response
6. CLI receives token and encrypted response

#### GET /v1/auth/request/status - Check Pairing Status

**Query Parameters:**
- `publicKey`: Base64-encoded public key to check

**Response:**
```json
{
    "status": "not_found" | "pending" | "authorized",
    "supportsV2": true
}
```

#### POST /v1/auth/response - Approve Terminal Pairing 🔒

**Auth Required:** Yes (Bearer token)

**Request:**
```json
{
    "publicKey": "base64-encoded-public-key-of-terminal",
    "response": "base64-encoded-encrypted-approval-response"
}
```

**Response (200):**
```json
{
    "success": true
}
```

**Flow:**
1. Mobile app is already authenticated (has token)
2. Mobile scans CLI's QR code (gets public key)
3. Mobile approves pairing via this endpoint
4. Server updates terminal auth request with response and mobile's user ID
5. CLI's next poll receives token and response

#### POST /v1/auth/account/request - Account Pairing (Mobile → Mobile)

**Use case:** happy-app wants to pair with another happy-app.

**Same flow as terminal pairing, but for mobile-to-mobile pairing.**

#### POST /v1/auth/account/response - Approve Account Pairing 🔒

**Auth Required:** Yes (Bearer token)

**Same as POST /v1/auth/response, but for account pairing.**

### Security Considerations

**Token Security:**
- Tokens are generated using privacy-kit persistent tokens (cryptographically signed)
- Tokens are cached in-memory for fast verification
- No expiration implemented yet (privacy-kit tokens can be configured with TTL)

**Public Key Cryptography:**
- Ed25519 for signature verification (direct auth)
- X25519 for encryption (pairing flows)
- TweetNaCl library used for all crypto operations

**Database Storage:**
- Public keys stored as hex strings
- No private keys ever stored on server
- Auth requests store encrypted responses (server cannot decrypt)

**Best Practices:**
- Always use HTTPS in production
- Set HANDY_MASTER_SECRET via `wrangler secret` (never commit)
- Validate public key lengths before processing
- Rate limit auth endpoints to prevent brute force

### Future Migration to Better-Auth

**Status:** Deferred to HAP-29 (blocked by HAP-10 POC)

Once HAP-10 (Better-Auth Custom Provider POC) is complete and proves Better-Auth can support public key authentication, the migration path is:

1. Complete HAP-10 POC validation
2. Implement Better-Auth custom provider for Ed25519 auth
3. Migrate privacy-kit auth to Better-Auth (HAP-29)
4. Update all auth routes to use Better-Auth sessions
5. Handle token migration (privacy-kit → Better-Auth format)

**Current state:** privacy-kit auth is production-ready and fully functional. Better-Auth migration is an optimization, not a blocker.

## Resources

- [Hono Documentation](https://hono.dev/)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Reference](https://developers.cloudflare.com/workers/wrangler/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with D1 Guide](https://orm.drizzle.team/docs/get-started-sqlite#cloudflare-d1)
- [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [R2 Storage](https://developers.cloudflare.com/r2/)
