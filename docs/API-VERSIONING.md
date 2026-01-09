# API Versioning Policy

This document describes the API versioning strategy for Happy Server, including how versions are managed, what constitutes breaking vs. non-breaking changes, and how the CI pipeline enforces API contract stability.

## Versioning Strategy

### URL-Based Versioning

Happy Server uses **URL path versioning** with the `/v1/` prefix:

```
https://api.happy.engineering/v1/sessions
https://api.happy.engineering/v1/auth/token
```

This approach was chosen for:
- **Explicitness**: The version is clearly visible in every request
- **Cacheability**: Different versions can be cached independently
- **Simplicity**: Easy to understand and implement

### Current Version

| Version | Status | Description |
|---------|--------|-------------|
| `/v1/` | **Current** | Production API, actively maintained |

### Future Versions

When a new major version is needed (e.g., `/v2/`):
1. Both versions will run in parallel during a deprecation period
2. Clients will be notified via push notifications and app updates
3. The old version will be deprecated with a sunset date
4. After the sunset date, the old version will return `410 Gone`

## Change Classification

### Non-Breaking Changes (Safe)

These changes are backward-compatible and can be deployed without version increment:

| Change Type | Example | Safe? |
|-------------|---------|-------|
| Add new endpoint | `POST /v1/sessions/archive` | ✅ |
| Add optional request field | `{ "name": "...", "tags"?: [] }` | ✅ |
| Add response field | `{ "id": "...", "createdAt": "..." }` | ✅ |
| Widen accepted values | Accept both `"active"` and `"ACTIVE"` | ✅ |
| Add new enum value (response) | Status: `"pending"` → `"pending" \| "queued"` | ✅ |
| Increase rate limits | 100 req/min → 200 req/min | ✅ |
| Improve error messages | Better descriptions | ✅ |

### Breaking Changes (Require New Version)

These changes break existing clients and require a new API version:

| Change Type | Example | Breaking? |
|-------------|---------|-----------|
| Remove endpoint | Delete `GET /v1/legacy` | ❌ |
| Remove request field | Remove `{ "oldField": "..." }` | ❌ |
| Remove response field | Remove `"legacyId"` from response | ❌ |
| Rename field | `userId` → `user_id` | ❌ |
| Change field type | `"count": "5"` → `"count": 5` | ❌ |
| Add required request field | New required `"apiVersion"` field | ❌ |
| Change URL structure | `/v1/sessions` → `/v1/claude/sessions` | ❌ |
| Narrow accepted values | Remove accepted enum value | ❌ |
| Change authentication | Bearer → API Key | ❌ |
| Reduce rate limits | 100 req/min → 50 req/min | ❌ |

## OpenAPI Specification

### Automatic Generation

The OpenAPI specification is automatically generated from route schemas using `@fastify/swagger` and Zod schemas:

```bash
# Generate OpenAPI spec
cd apps/server/docker
yarn openapi:generate        # Creates openapi.json
yarn openapi:generate:yaml   # Creates openapi.yaml
```

### Accessing the Spec

| Method | URL/Command |
|--------|-------------|
| Runtime (JSON) | `GET /documentation/json` |
| Runtime (YAML) | `GET /documentation/yaml` |
| Generated file | `apps/server/docker/openapi.json` |
| CI Artifact | Download from GitHub Actions |

### CI Validation

The CI pipeline validates the OpenAPI spec on every PR:

1. **Generation**: Spec is generated from current route schemas
2. **Linting**: Validated using Redocly CLI for OpenAPI 3.0 compliance
3. **Artifact**: Uploaded as a build artifact for review

```yaml
# .github/workflows/ci.yml
openapi-server:
  name: OpenAPI - happy-server
  steps:
    - run: yarn openapi:generate
    - run: npx @redocly/cli lint openapi.json
```

## Schema Drift Detection

Schema drift occurs when the server's API schemas diverge from what clients expect. The CI pipeline includes automated drift detection to catch these issues before they reach production.

### How It Works

1. **Protocol Schema Extraction**: The `@happy/protocol` package's Zod schemas are converted to JSON Schema format
2. **OpenAPI Schema Extraction**: The server's OpenAPI spec contains schemas derived from route definitions
3. **Comparison**: A comparison script identifies mismatches between protocol and server schemas
4. **Breaking Change Detection**: Optional `oasdiff` integration detects breaking changes vs. baseline

### Running Locally

```bash
# Extract protocol schemas to JSON
yarn schema:extract

# Generate OpenAPI spec (if not already done)
cd apps/server/docker && yarn openapi:generate && cd ../../..

# Compare schemas
yarn schema:compare

# For CI-style markdown output
yarn schema:compare --ci

# With verbose output
yarn schema:compare --verbose

# Compare against a baseline (breaking change detection)
yarn schema:compare --baseline path/to/baseline-openapi.json
```

### CI Integration

The `schema-drift` job runs on every PR:

```yaml
schema-drift:
  name: Schema Drift Detection
  needs: [build-protocol, openapi-server]
  steps:
    - run: yarn schema:extract
    - run: yarn schema:compare --ci
```

**Artifacts produced:**
- `protocol-schemas` - JSON Schema representation of `@happy/protocol`
- `schema-drift-report` - Markdown report of any detected drift

### Issue Severity

| Severity | Description | Blocks PR |
|----------|-------------|-----------|
| 🔴 Error | Breaking type mismatch | Yes |
| 🟡 Warning | Potential compatibility issue | No |
| 🔵 Info | Informational difference | No |

### Troubleshooting Common Issues

#### Type Mismatch

```
🔴 [type_mismatch] updates.ApiMessage.id: Type mismatch: protocol has "string", OpenAPI has "integer"
```

**Cause**: Protocol schema and server route schema define different types for the same field.

**Fix**: Align the Zod schemas in both locations. Usually the protocol schema is the source of truth.

#### Missing Property

```
🟡 [missing] common.UserProfile.avatar: Property exists in protocol but not in OpenAPI
```

**Cause**: The protocol defines a property that the server doesn't expose in its OpenAPI spec.

**Fix**: Either add the property to the server route schema, or remove it from the protocol if it's not part of the API contract.

#### Enum Drift

```
🟡 [enum_diff] common.RelationshipStatus: Enum values in protocol missing from OpenAPI: rejected
```

**Cause**: The protocol defines enum values that the server doesn't document.

**Fix**: Ensure both schemas define the same set of valid enum values.

### Schema Matching Strategy

Not all protocol schemas are expected to match OpenAPI schemas:

| Schema Type | Expected in OpenAPI | Notes |
|-------------|---------------------|-------|
| Common types (GitHubProfile, ImageRef) | Sometimes | Depends on route usage |
| Update events (ApiUpdate*) | No | WebSocket-only, not REST |
| Ephemeral events | No | Real-time only |
| Payload wrappers | No | Internal wire format |

The comparison script only reports mismatches for schemas that exist in both locations.

## Schema Definition Guidelines

### Using Zod for Route Schemas

All route schemas should use Zod for type-safe validation:

```typescript
import { z } from "zod";

app.post('/v1/sessions', {
    schema: {
        body: z.object({
            name: z.string().describe("Session name"),
            machineId: z.string().uuid().describe("Machine identifier"),
        }),
        response: {
            200: z.object({
                id: z.string().uuid(),
                name: z.string(),
                createdAt: z.string().datetime(),
            }),
            400: z.object({
                error: z.string(),
                code: z.string(),
            }),
        },
    },
}, handler);
```

### Documentation Best Practices

1. **Use `.describe()`** on Zod schemas for OpenAPI descriptions
2. **Define all response codes** including error responses
3. **Use appropriate Zod types** (`z.string().uuid()`, `z.string().datetime()`)
4. **Group endpoints with tags** in route handlers

## Shared Types with @happy/protocol

The `@happy/protocol` package contains shared Zod schemas for API payloads:

```typescript
// In @happy/protocol
export const SessionUpdateSchema = z.object({
    sessionId: z.string(),
    status: z.enum(["active", "paused", "completed"]),
    // ...
});

// In happy-server route
import { SessionUpdateSchema } from "@happy/protocol";

app.post('/v1/sessions/update', {
    schema: {
        body: SessionUpdateSchema,
    },
}, handler);
```

This ensures type consistency between:
- `happy-server` (API producer)
- `happy-cli` (API consumer)
- `happy-app` (API consumer)

## Deprecation Process

### Deprecating an Endpoint

1. Add `deprecated: true` to the route schema
2. Add `X-Deprecated` response header with sunset date
3. Update OpenAPI spec description with deprecation notice
4. Log usage of deprecated endpoints for monitoring
5. After sunset date, return `410 Gone`

```typescript
app.get('/v1/legacy-endpoint', {
    schema: {
        deprecated: true,
        description: "**DEPRECATED**: Use /v1/new-endpoint instead. Sunset: 2025-06-01",
    },
}, handler);
```

### Deprecating a Field

1. Mark field as deprecated in Zod schema
2. Continue accepting the field but ignore it
3. Stop including in responses after sunset
4. Document in changelog

## Monitoring & Alerts

### API Contract Monitoring

- **CI Failure**: OpenAPI validation fails on PR
- **Schema Drift**: Detected by comparing generated spec to baseline
- **Deprecated Usage**: Logged and alerted when deprecated endpoints are called

### Recommended Monitoring

```typescript
// Log deprecated endpoint usage
app.addHook('onRequest', (request, reply, done) => {
    if (isDeprecated(request.url)) {
        log({
            module: 'api-deprecation',
            level: 'warn',
            url: request.url,
            userId: request.userId,
        }, 'Deprecated endpoint accessed');
    }
    done();
});
```

## Related Documentation

- [Encryption Architecture](./ENCRYPTION-ARCHITECTURE.md) - E2E encryption design
- [RFC: Shared Types Package](./RFC-SHARED-TYPES-PACKAGE.md) - @happy/protocol design
- [@happy/protocol CLAUDE.md](../packages/schema/protocol/CLAUDE.md) - Protocol package guidelines

## Changelog

| Date | Change | Issue |
|------|--------|-------|
| 2025-12-26 | Add schema drift detection CI job | HAP-565 |
| 2025-12-26 | Initial API versioning policy | HAP-473 |
