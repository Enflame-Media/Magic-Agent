# Remote Logging for Development

This document describes the remote logging feature that enables developers to debug mobile (happy-app) and CLI (happy-cli) applications by streaming console logs to a development server. This feature is designed exclusively for local development and has multiple production guardrails.

## Overview

Remote logging captures console output (`log`, `info`, `warn`, `error`, `debug`) from client applications and sends it to the development server where it can be viewed in real-time. This is particularly useful for:

- **Mobile debugging**: View logs from iOS/Android devices when physical debugging tools are unavailable
- **AI-assisted debugging**: Feed logs to AI assistants (Claude, etc.) for automated issue analysis
- **Cross-device debugging**: Debug multiple clients simultaneously from a single console

```
                          Remote Logging Architecture
                          ===========================

┌─────────────────┐                              ┌─────────────────────────────┐
│   happy-app     │                              │   happy-server-workers      │
│   (React Native)│                              │   (Cloudflare Workers)      │
│                 │                              │                             │
│  console.log()  │      HTTPS POST              │  POST /logs-combined-from-  │
│       │         │  ────────────────────►       │  cli-and-mobile-for-simple- │
│       ▼         │                              │  ai-auto-debugging          │
│  remoteLogger   │  Batched logs (1s interval)  │       │                     │
│  patches console│  Max 50 entries per batch    │       ▼                     │
│                 │                              │  console.log() to Workers   │
└─────────────────┘                              │  Logs (viewable in Dash)    │
                                                 └─────────────────────────────┘

                     Security Guardrails:
                     • __DEV__ mode only (client)
                     • Localhost/private IPs only (client)
                     • Non-production environments only (server)
                     • Optional token authentication
                     • Rate limiting (60 req/min)
                     • Automatic data redaction
```

## When to Use Remote Logging

**Use remote logging when:**
- Debugging React Native issues on physical devices
- Need to correlate logs across multiple clients
- Working on features that involve complex mobile/server interactions
- Sharing debugging context with AI assistants

**Do NOT use for:**
- Production environments (blocked at both client and server)
- Performance-sensitive testing (batching adds latency)
- Security-sensitive operations (logs are redacted but still transmitted)

## Client Setup (happy-app)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` | No | Set to `1` or `true` to enable remote logging by default on app startup |
| `EXPO_PUBLIC_DEV_LOGGING_TOKEN` | No | Shared secret token for authenticated logging (must match server's `DEV_LOGGING_TOKEN`) |
| `EXPO_PUBLIC_SERVER_URL` | Yes | Server URL (must be localhost or private IP for remote logging) |

### Configuration Examples

**Development `.env` file:**
```bash
# Enable remote logging by default
EXPO_PUBLIC_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=1

# Server URL (must be local/private for remote logging to work)
EXPO_PUBLIC_SERVER_URL=http://192.168.1.100:8787

# Optional: Authentication token (matches server's DEV_LOGGING_TOKEN)
EXPO_PUBLIC_DEV_LOGGING_TOKEN=your-shared-secret-here
```

### Runtime Toggle (Developer Settings UI)

Remote logging can be toggled at runtime without rebuilding:

1. Open the app in development mode
2. Navigate to **Settings > Developer Settings > Remote Logging**
3. Toggle **Remote Logging** on/off
4. View status, server URL, and log buffer statistics

The runtime toggle is available in: `apps/web/react/sources/app/(app)/dev/remote-logging.tsx`

### Programmatic Control

```typescript
import {
    setRemoteLoggingEnabled,
    isRemoteLoggingEnabled,
    getRemoteLoggingStatus,
    validateRemoteLoggingEnvironment,
} from '@/utils/remoteLogger';

// Enable/disable at runtime
setRemoteLoggingEnabled(true);

// Check current state
const enabled = isRemoteLoggingEnabled();

// Get detailed status
const status = getRemoteLoggingStatus();
// { enabled: true, active: true, serverUrl: 'http://...', reason?: 'Error message' }

// Validate environment before enabling
const validation = validateRemoteLoggingEnvironment();
if (!validation.valid) {
    console.warn('Cannot enable remote logging:', validation.error);
}
```

### How It Works

1. **Initialization**: When the app starts in `__DEV__` mode, `remoteLogger.ts` patches console methods
2. **Local Buffering**: All logs are buffered locally (up to 1000 entries or 5MB) for the developer UI
3. **Batching**: When remote logging is enabled, logs are queued and sent every 1 second or when 50 entries accumulate
4. **Redaction**: Sensitive data (tokens, keys, credentials) is automatically redacted before transmission
5. **Background Handling**: Buffer is flushed when the app goes to background to prevent log loss

### Implementation Files

| File | Description |
|------|-------------|
| `apps/web/react/sources/utils/remoteLogger.ts` | Main remote logging implementation |
| `apps/web/react/sources/utils/logger.ts` | Data redaction utilities |
| `apps/web/react/sources/app/(app)/dev/remote-logging.tsx` | Developer settings UI |
| `apps/web/react/sources/sync/appConfig.ts` | Config loading including `devLoggingToken` |

## Server Setup (happy-server-workers)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENVIRONMENT` | Yes | Must be `development` or `staging` (NOT `production`) |
| `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` | Yes | Set to `1` or `true` to enable the endpoint |
| `DEV_LOGGING_TOKEN` | No | Shared secret for authenticated requests |
| `RATE_LIMIT_KV` | No | KV namespace binding for persistent rate limiting |

### Configuration

**Local development (`.dev.vars`):**
```bash
ENVIRONMENT=development
DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=1
DEV_LOGGING_TOKEN=your-shared-secret-here
```

**Remote development/staging (via Wrangler secrets):**
```bash
wrangler secret put DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING --env dev
# Enter: 1

wrangler secret put DEV_LOGGING_TOKEN --env dev
# Enter: your-shared-secret-here
```

### Production Guardrails (HAP-821)

The server enforces strict production guardrails:

1. **Environment Check**: If `ENVIRONMENT=production`, the endpoint returns 403 regardless of other flags
2. **Feature Flag**: Even in non-production, `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING` must be explicitly set
3. **Rate Limiting (HAP-819)**: 60 requests per minute per source/IP combination
4. **Payload Limits (HAP-820)**: Message max 50KB, raw object max 100KB, total request max 200KB

### Endpoint Details

**POST `/logs-combined-from-cli-and-mobile-for-simple-ai-debugging`**

Request body (JSON):
```json
{
    "timestamp": "2024-01-15T10:30:00.000Z",
    "level": "info",
    "message": "User action completed",
    "messageRawObject": [{ "userId": "123", "action": "tap" }],
    "source": "mobile",
    "platform": "ios"
}
```

Response codes:
- `200`: Log recorded successfully
- `401`: Invalid or missing auth token (when `DEV_LOGGING_TOKEN` is configured)
- `403`: Debug logging disabled or blocked in production
- `413`: Payload too large
- `429`: Rate limit exceeded (includes `Retry-After` header)

### Viewing Logs

Logs are sent to Cloudflare Workers console output. View them via:

1. **Wrangler CLI**: `wrangler tail --env dev`
2. **Cloudflare Dashboard**: Workers & Pages > your-worker > Logs
3. **Real-time streams**: Filter by `[mobile]` or `[cli]` prefix

### Implementation Files

| File | Description |
|------|-------------|
| `apps/server/workers/src/routes/dev.ts` | Logging endpoint route handler |
| `apps/server/workers/src/schemas/dev.ts` | Zod schemas and size limits |
| `apps/server/workers/src/lib/rate-limit.ts` | Rate limiting implementation |

## Security Considerations

### What Gets Redacted (Client-Side)

The `redactArgs()` function in `logger.ts` automatically redacts:

| Pattern | Example | Redacted As |
|---------|---------|-------------|
| Bearer tokens | `Bearer eyJ...` | `Bearer [REDACTED]` |
| JWT tokens | `eyJ...eyJ...` | `[REDACTED]` |
| Long alphanumeric (40+ chars) | `sk-abc123...` | `[REDACTED]` |
| Keys named `token`, `secret`, `password`, etc. | `{ apiKey: '...' }` | `{ apiKey: '[REDACTED]' }` |

### URL Allowlist (Client-Side)

Remote logging ONLY works with these URL patterns:

```typescript
const ALLOWED_DEV_URL_PATTERNS = [
    /^https?:\/\/localhost(:\d+)?/i,
    /^https?:\/\/127\.0\.0\.1(:\d+)?/i,
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?/i,        // Private 10.x.x.x
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?/i,       // Private 192.168.x.x
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?/i, // Private 172.16-31.x.x
    /^https?:\/\/\[::1\](:\d+)?/i,                  // IPv6 localhost
];
```

Any attempt to enable remote logging with a non-matching URL will:
1. Log a warning to console
2. Not send any logs to that URL

### Token Authentication

For additional security, configure `DEV_LOGGING_TOKEN`:

1. Generate a token: `openssl rand -hex 32`
2. Set on server: Add to `.dev.vars` or via `wrangler secret put`
3. Set on client: Add to `EXPO_PUBLIC_DEV_LOGGING_TOKEN`
4. Requests without matching token receive 401

## Troubleshooting

### Remote Logging Not Working

| Symptom | Cause | Solution |
|---------|-------|----------|
| Toggle shows "Disabled" | Not in `__DEV__` mode | Rebuild with `yarn start` (not production build) |
| Toggle shows "Pending" | Server URL not allowed | Check URL is localhost or private IP |
| Logs not appearing on server | Env flag not set | Set `DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING=1` |
| 401 Unauthorized | Token mismatch | Verify `DEV_LOGGING_TOKEN` matches on both sides |
| 403 Forbidden | Production environment | Ensure `ENVIRONMENT` is not `production` |
| 429 Rate Limited | Too many logs | Wait for rate limit window (60s) |
| Logs appear duplicated | Console patched multiple times | Check for multiple `remoteLogger` imports |

### Exponential Backoff (HAP-853)

When the server is unreachable, the client uses exponential backoff:

1. First failure: Wait 1 second
2. Subsequent failures: Double the wait (2s, 4s, 8s...)
3. Maximum wait: 5 minutes
4. Success: Reset backoff immediately

This prevents network hammering when offline or server is down.

### Large Payloads (HAP-839, HAP-820)

If logs are being truncated:

1. **Client truncation**: Messages over 100KB are progressively truncated
2. **Server limits**: Message max 50KB, raw object max 100KB
3. **Solution**: Log smaller chunks or reduce verbosity

### Log Buffer Management

The client maintains a local buffer for the developer UI:

| Limit | Value | Purpose |
|-------|-------|---------|
| Max entries | 1000 | Prevent memory bloat |
| Max size | 5MB | Prevent memory bloat |
| Batch size | 50 | Network efficiency |
| Batch interval | 1 second | Balance latency/efficiency |

View buffer stats in Developer Settings > Remote Logging.

## Related Issues

| Issue | Description |
|-------|-------------|
| HAP-842 | Add developer settings toggle for remote logging |
| HAP-836 | Production guardrails (client-side URL allowlist) |
| HAP-821 | Production guardrails (server-side environment check) |
| HAP-840 | Batching support for network efficiency |
| HAP-839 | Payload size limits (client-side truncation) |
| HAP-820 | Payload size limits (server-side validation) |
| HAP-819 | Rate limiting for dev logging endpoint |
| HAP-838 | Automatic data redaction |
| HAP-837 | Token authentication support |
| HAP-853 | Exponential backoff for failed sends |
| HAP-848 | Safe serialization for circular references |

---

*Last updated: January 2026*
*Related issues: HAP-892, HAP-842*
