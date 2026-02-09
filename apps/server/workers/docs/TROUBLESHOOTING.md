# Troubleshooting Guide

This guide covers common issues and their solutions for Happy Server Workers development and production.

## Table of Contents

1. [Local Development Issues](#local-development-issues)
2. [Authentication Issues](#authentication-issues)
3. [Database Issues (D1)](#database-issues-d1)
4. [WebSocket Issues (Durable Objects)](#websocket-issues-durable-objects)
5. [File Upload Issues (R2)](#file-upload-issues-r2)
6. [Deployment Issues](#deployment-issues)
7. [Type and Build Issues](#type-and-build-issues)
8. [Performance Issues](#performance-issues)
9. [Client Compatibility Issues](#client-compatibility-issues)

---

## Local Development Issues

### `yarn dev` fails to start

**Symptom**: Wrangler dev server won't start

**Possible Causes & Solutions**:

1. **Missing `.dev.vars`**:
   ```bash
   # Check if file exists
   ls -la .dev.vars

   # If missing, create from template
   cp .dev.vars.example .dev.vars
   # Edit and add HAPPY_MASTER_SECRET
   ```

2. **Invalid secret format**:
   ```bash
   # .dev.vars format should be (no quotes, no spaces around =)
   ENVIRONMENT=development
   HAPPY_MASTER_SECRET=64_hex_characters_here
   ```

3. **Port already in use**:
   ```bash
   # Check what's using port 8787
   lsof -i :8787

   # Kill the process or use different port
   yarn dev --port 8788
   ```

4. **Node.js version mismatch**:
   ```bash
   # Requires Node.js 18+
   node --version

   # If lower, update Node.js
   nvm install 18
   nvm use 18
   ```

### "HAPPY_MASTER_SECRET is required" Error

**Symptom**: Server fails to start with secret error

**Solution**:
```bash
# 1. Verify .dev.vars exists
cat .dev.vars

# 2. Generate a secret if needed
openssl rand -hex 32

# 3. Add to .dev.vars (no quotes!)
echo "HAPPY_MASTER_SECRET=your_generated_secret" >> .dev.vars

# 4. Restart dev server
yarn dev
```

### Hot reload not working

**Symptom**: Changes don't reflect after saving files

**Solution**:
```bash
# Stop current server (Ctrl+C) and restart
yarn dev

# If still not working, clear wrangler cache
rm -rf .wrangler
yarn dev
```

---

## Authentication Issues

### "Invalid token" Error (401)

**Symptom**: API returns 401 Unauthorized

**Possible Causes**:

1. **Token expired or invalid**:
   - Tokens may be invalidated after secret rotation
   - Client needs to re-authenticate

2. **Missing Authorization header**:
   ```bash
   # Correct format
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/sessions
   ```

3. **Token from wrong environment**:
   - Dev tokens don't work in prod (different `HAPPY_MASTER_SECRET`)

**Debug Steps**:
```bash
# Test token verification endpoint
curl -X POST https://api.example.com/v1/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Terminal Pairing Fails

**Symptom**: CLI QR code scan doesn't complete pairing

**Debug Steps**:

1. **Check auth request status**:
   ```bash
   curl "https://api.example.com/v1/auth/request/status?publicKey=YOUR_PUBLIC_KEY"
   ```

2. **Verify public key format**:
   - Should be base64-encoded
   - Should be Ed25519 public key (32 bytes)

3. **Check polling timeout**:
   - Default timeout is 5 minutes
   - QR code may have expired

### "Signature verification failed"

**Symptom**: Direct auth (POST /v1/auth) fails

**Possible Causes**:

1. **Challenge/signature mismatch**: Signature must be for the exact challenge bytes
2. **Key encoding issue**: Public key must be base64-encoded Ed25519 key
3. **Timestamp drift**: Server may reject stale challenges

---

## Database Issues (D1)

### "Table already exists" Error

**Symptom**: Migration fails with duplicate table error

**Solution**:
```bash
# Reset local database (CAUTION: deletes all data)
yarn db:reset

# Re-run migrations
yarn db:migrate
```

### "Foreign key constraint failed"

**Symptom**: Insert/update fails with constraint error

**Causes & Solutions**:

1. **Referenced record doesn't exist**:
   ```sql
   -- Check if parent record exists
   SELECT * FROM accounts WHERE id = 'referenced_account_id';
   ```

2. **Order of operations**: Insert parent records before children

3. **Check foreign key is enabled**:
   ```sql
   PRAGMA foreign_keys;
   -- Should return 1
   ```

### "No such table" Error

**Symptom**: Query fails with table not found

**Solutions**:
```bash
# 1. Run migrations
yarn db:migrate

# 2. Verify migrations applied
yarn db:status

# 3. Check table exists
wrangler d1 execute DB --local --command="SELECT name FROM sqlite_master WHERE type='table'"
```

### Type errors in queries

**Symptom**: TypeScript errors when writing Drizzle queries

**Solutions**:
```bash
# 1. Regenerate schema types
yarn db:generate

# 2. Restart TypeScript server (in VS Code: Cmd+Shift+P → "Restart TS Server")

# 3. Verify imports
import { schema } from '@/db/schema';
import { getDb } from '@/db/client';
```

### Remote D1 not syncing

**Symptom**: Remote database has different data than expected

**Solutions**:
```bash
# Check which database you're connected to
wrangler d1 list

# Verify database ID in wrangler.toml matches
cat wrangler.toml | grep database_id

# Check remote tables
wrangler d1 execute happy-dev --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## WebSocket Issues (Durable Objects)

### WebSocket connection fails

**Symptom**: Client can't establish WebSocket connection

**Debug Steps**:

1. **Check endpoint URL**:
   ```javascript
   // Correct URL format
   const ws = new WebSocket('wss://api.example.com/v1/updates?token=xxx&clientType=user-scoped');
   ```

2. **Verify token is valid**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/account
   ```

3. **Check connection stats**:
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" https://api.example.com/v1/websocket/stats
   ```

### Close code 4001 (AUTH_FAILED)

**Symptom**: WebSocket closes immediately with code 4001

**Cause**: Invalid or missing authentication token

**Solution**: Ensure `token` query parameter or `Authorization` header is valid

### Close code 4003 (MISSING_SESSION_ID)

**Symptom**: WebSocket closes with code 4003

**Cause**: Session-scoped connection without `sessionId`

**Solution**: Add `sessionId` parameter for session-scoped connections:
```javascript
new WebSocket('wss://api.example.com/v1/updates?token=xxx&clientType=session-scoped&sessionId=session_id_here')
```

### Messages not received by clients

**Symptom**: Broadcast sent but clients don't receive

**Debug Steps**:

1. **Check connection is still open**:
   ```javascript
   ws.readyState === WebSocket.OPEN // Should be true
   ```

2. **Verify filter matches**:
   ```json
   // Broadcast with filter
   {
     "filter": { "type": "session", "sessionId": "must_match_client" }
   }
   ```

3. **Check DO logs** in Cloudflare dashboard → Workers → Logs

### Durable Object hibernation issues

**Symptom**: Connections drop after idle period

**Note**: This is expected behavior. The Hibernation API allows DO to be evicted while keeping WebSocket connections open. Clients should implement reconnection logic.

---

## File Upload Issues (R2)

### "File too large" Error

**Symptom**: Upload fails with size error

**Size Limits**:
| Category | Max Size |
|----------|----------|
| Avatar | 5 MB |
| Document | 50 MB |
| General | 100 MB |

**Solution**: Compress file or split into chunks

### "Invalid content type" Error

**Symptom**: Upload rejected for file type

**Allowed Types**:
- Images: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`
- Documents: `application/pdf`, `text/plain`, `application/json`, `text/markdown`

### R2 bucket not found

**Symptom**: Storage operations fail with "bucket not found"

**Solutions**:
```bash
# 1. Verify bucket exists
wrangler r2 bucket list

# 2. Check bucket name in wrangler.toml
cat wrangler.toml | grep bucket_name

# 3. Create bucket if missing
wrangler r2 bucket create happy-dev-uploads
```

---

## Deployment Issues

### "Wrangler authentication failed"

**Symptom**: `wrangler deploy` fails with auth error

**Solutions**:
```bash
# 1. Re-authenticate
wrangler logout
wrangler login

# 2. Or use API token
export CLOUDFLARE_API_TOKEN="your-token"

# 3. Verify authentication
wrangler whoami
```

### "Account not found" Error

**Symptom**: Deploy fails with account error

**Solutions**:
```bash
# 1. Verify account ID in wrangler.toml
cat wrangler.toml | grep account_id

# 2. Check you have access to the account
wrangler whoami
```

### "D1 database with ID 'xxx' not found"

**Symptom**: Deploy fails with database error

**Solutions**:
```bash
# 1. List available databases
wrangler d1 list

# 2. Update wrangler.toml with correct database_id
```

### "Durable Object migration required"

**Symptom**: Deploy fails with DO migration error

**Solution**: Ensure migrations section in `wrangler.toml`:
```toml
[[env.dev.migrations]]
tag = "v1"
new_classes = ["ConnectionManager"]
```

---

## Type and Build Issues

### "Module not found" Error

**Symptom**: TypeScript can't find module

**Common Causes**:

1. **Path alias issue**:
   ```typescript
   // Use @ alias for src imports
   import { logger } from '@/middleware/logger';  // ✓
   import { logger } from '../middleware/logger'; // ✗
   ```

2. **Missing dependency**:
   ```bash
   yarn install
   ```

### TypeScript compilation errors

**Common Fixes**:

```bash
# 1. Run type check to see all errors
yarn typecheck

# 2. Check for unused variables
yarn lint

# 3. Verify tsconfig.json is correct
cat tsconfig.json
```

### "Cannot find name 'Env'"

**Symptom**: TypeScript doesn't recognize Worker env types

**Solution**: Ensure bindings type exists in `src/types/env.ts`:
```typescript
interface Env {
    DB: D1Database;
    UPLOADS: R2Bucket;
    CONNECTION_MANAGER: DurableObjectNamespace;
    HAPPY_MASTER_SECRET: string;
    // ...
}
```

---

## Performance Issues

### Slow response times

**Symptom**: P95 latency > 500ms

**Debug Steps**:

1. **Check database queries**:
   - Add query timing logs
   - Look for N+1 queries
   - Add indexes for frequently queried columns

2. **Check external calls**:
   - R2 operations
   - Third-party API calls

3. **Review Cloudflare Analytics**:
   - Workers & Pages → Analytics
   - Check CPU time per request

### High CPU time

**Symptom**: CPU time approaching 50ms limit

**Solutions**:

1. **Optimize hot paths**: Profile slow functions
2. **Cache computations**: Avoid repeated calculations
3. **Reduce JSON serialization**: Large responses are expensive

### Memory issues

**Symptom**: Worker exceeds 128MB limit

**Solutions**:

1. **Stream large responses**: Don't buffer entire files in memory
2. **Process in chunks**: For large data sets
3. **Avoid memory leaks**: Check for accumulating data

---

## Client Compatibility Issues

### CLI can't connect to new backend

**Symptom**: happy-cli fails to authenticate

**Solution**:
```bash
# Update server URL in CLI config
export HAPPY_SERVER_URL=https://happy-api.enflamemedia.com
```

### Mobile app sync issues

**Symptom**: happy-app doesn't receive real-time updates

**Debug Steps**:

1. **Check WebSocket connection in app**
2. **Verify server URL**:
   ```
   EXPO_PUBLIC_HAPPY_SERVER_URL=https://happy-api.enflamemedia.com
   ```
3. **Check token is valid**: Re-authenticate if needed

### Message format mismatch

**Symptom**: Client sends messages but server doesn't process

**Note**: The server normalizes messages from both formats:
- Client format: `{event, data, ackId}`
- Server format: `{type, payload, timestamp, messageId}`

Both formats are accepted.

---

## Getting Help

### Logs

```bash
# Local development logs
yarn dev  # Logs appear in terminal

# Remote logs (streaming)
wrangler tail --env dev
wrangler tail --env prod

# Cloudflare Dashboard
# Workers & Pages → happy-server-workers-* → Logs
```

### Resources

- [CLAUDE.md](../CLAUDE.md) - Comprehensive development guidelines
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Durable Objects](https://developers.cloudflare.com/workers/learning/using-durable-objects/)
- [R2 Storage](https://developers.cloudflare.com/r2/)

### Support Channels

- **Team Slack**: #happy-dev
- **Cloudflare Support**: https://dash.cloudflare.com/ → Support
- **GitHub Issues**: [Repository Issues](https://github.com/Enflame-Media/happy-server-workers/issues)

---

**Document Version**: 1.0
**Last Updated**: 2024-12-03
**Maintained By**: Happy Development Team
