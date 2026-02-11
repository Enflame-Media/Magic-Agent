# Happy Admin Troubleshooting Guide

Common issues and solutions for the Happy Admin dashboard.

## Deployment Issues

### DNS/Custom Domain Not Working

**Symptoms:**
- `ERR_NAME_NOT_RESOLVED` when accessing `happy-admin.enflamemedia.com`
- SSL certificate errors

**Solutions:**

1. **Verify DNS propagation:**
   ```bash
   dig happy-admin.enflamemedia.com
   ```
   Should return Cloudflare IPs.

2. **Check wrangler.toml routes:**
   ```toml
   routes = [
       { pattern = "happy-admin.enflamemedia.com", custom_domain = true }
   ]
   ```

3. **Redeploy after DNS changes:**
   ```bash
   yarn deploy:prod
   ```

4. **Wait for SSL provisioning** (can take up to 15 minutes for new domains).

### /ready Returns 503

**Symptoms:**
- `/ready` returns `{"ready":false,"checks":{"database":true,"analyticsConfig":false}}`

**Cause:** Missing Analytics Engine secrets.

**Solution:**
```bash
# Set the required secrets
wrangler secret put ANALYTICS_ACCOUNT_ID --env prod
wrangler secret put ANALYTICS_API_TOKEN --env prod
```

Verify with:
```bash
curl https://happy-admin.enflamemedia.com/ready
```

### D1 Database Errors

**Symptoms:**
- 500 errors on auth routes
- `/ready` shows `"database":false`

**Solutions:**

1. **Verify database exists:**
   ```bash
   wrangler d1 list
   ```

2. **Check database ID in wrangler.toml** matches the created database.

3. **Run migrations:**
   ```bash
   yarn db:migrate        # For dev
   yarn db:migrate:prod   # For prod
   ```

4. **Verify D1 binding:**
   ```bash
   wrangler d1 execute happy-admin-prod --command "SELECT 1"
   ```

## Authentication Issues

### Login Returns 401

**Symptoms:**
- Valid credentials rejected
- Session cookie not set

**Solutions:**

1. **Check CORS configuration** in `src/worker/index.ts`:
   ```typescript
   trustedOrigins: [
       'https://happy-admin.enflamemedia.com',
       'https://happy-admin-dev.enflamemedia.com',
   ]
   ```

2. **Verify BETTER_AUTH_SECRET is set:**
   ```bash
   wrangler secret list --env prod
   ```

3. **Clear browser cookies** and retry.

### Session Expires Immediately

**Symptoms:**
- Logged out after refresh
- Session cookie not persisted

**Solutions:**

1. **Check session configuration** in `src/worker/auth.ts`:
   ```typescript
   session: {
       expiresIn: 60 * 60 * 24 * 7, // 7 days
   }
   ```

2. **Verify cookie domain** matches the deployment URL.

3. **Check for HTTPS** - cookies may not persist on HTTP.

### No Admin Account Exists

**How to create the first admin:**

1. **Via API (development):**
   ```bash
   curl -X POST https://happy-admin-dev.enflamemedia.com/api/auth/sign-up/email \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"secure-password","name":"Admin"}'
   ```

2. **Via D1 directly** (if API is down):
   ```bash
   wrangler d1 execute happy-admin-prod --command "SELECT * FROM users"
   ```

## Analytics Issues

### Charts Show No Data

**Symptoms:**
- Dashboard loads but all charts are empty
- API returns empty arrays

**Possible Causes:**

1. **No sync data yet:**
   - Verify happy-server-workers is writing to Analytics Engine
   - Check the correct dataset name (`sync_metrics_dev` or `sync_metrics_prod`)

2. **Wrong environment secrets:**
   - Dev dashboard should query dev dataset
   - Prod dashboard should query prod dataset

3. **API token permissions:**
   - Token needs "Account Analytics Read" permission

**Debug Steps:**
```bash
# Check if Analytics Engine has data
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: text/plain" \
  -d "SELECT COUNT(*) FROM sync_metrics_prod WHERE timestamp > NOW() - INTERVAL '24' HOUR"
```

### API Token Invalid

**Symptoms:**
- 401/403 from Analytics Engine API
- `analyticsConfig: false` in /ready check

**Solution:**

1. **Create new API token** in Cloudflare Dashboard:
   - Go to Account Settings > API Tokens
   - Create Token with "Account Analytics Read" permission

2. **Update secret:**
   ```bash
   wrangler secret put ANALYTICS_API_TOKEN --env prod
   ```

## Vue.js Frontend Issues

### Blank Page After Deploy

**Symptoms:**
- `/` returns 200 but shows blank page
- Console shows 404 for JS/CSS assets

**Solutions:**

1. **Rebuild and redeploy:**
   ```bash
   yarn build:app
   yarn deploy:prod
   ```

2. **Check Vite base URL** in `vite.config.ts`:
   ```typescript
   base: '/'  // Should be root
   ```

3. **Verify dist folder contents:**
   ```bash
   ls -la dist/
   ls -la dist/assets/
   ```

### Charts Not Rendering

**Symptoms:**
- Dashboard loads but chart areas are blank
- No console errors

**Solutions:**

1. **Check Chart.js import** in component:
   ```typescript
   import { Chart, registerables } from 'chart.js';
   Chart.register(...registerables);
   ```

2. **Verify vue-chartjs version** compatibility with Vue 3.

3. **Check for CSS conflicts** with Tailwind that may hide canvas elements.

## Development Issues

### Local Dev Server Won't Start

**Symptoms:**
- `yarn dev` fails with errors
- Port 8787 already in use

**Solutions:**

1. **Kill existing process:**
   ```bash
   lsof -i :8787 | grep LISTEN | awk '{print $2}' | xargs kill
   ```

2. **Check .dev.vars exists:**
   ```bash
   cp .dev.vars.example .dev.vars
   # Fill in actual values
   ```

3. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   yarn install
   ```

### TypeScript Errors

**Symptoms:**
- `yarn typecheck` fails
- Red squiggles in editor

**Common Fixes:**

1. **Update types:**
   ```bash
   yarn add -D @cloudflare/workers-types@latest
   ```

2. **Check tsconfig.json paths** match actual structure.

3. **Restart TypeScript server** in your editor.

## Performance Issues

### Slow Dashboard Load

**Symptoms:**
- Dashboard takes >3 seconds to load
- Charts load sequentially

**Solutions:**

1. **Check Analytics Engine query performance:**
   - Add proper time bounds to queries
   - Use appropriate aggregation (hourly vs minutely)

2. **Enable request caching** for static assets (automatic with Cloudflare).

3. **Check for N+1 queries** - batch API requests where possible.

## Logs and Debugging

### View Worker Logs

```bash
# Real-time logs (dev)
wrangler tail --env dev

# Real-time logs (prod)
wrangler tail --env prod
```

### Enable Verbose Logging

In `wrangler.toml`:
```toml
[env.dev.observability.logs]
enabled = true
head_sampling_rate = 1
invocation_logs = true
persist = true
```

### Check Deployment Status

```bash
# List deployments
wrangler deployments list --env prod

# View specific version
wrangler deployments view {version-id} --env prod
```

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `DB is not defined` | D1 binding missing | Check wrangler.toml `[[d1_databases]]` |
| `Analytics Engine query failed` | Invalid SQL or missing token | Verify token and query syntax |
| `CORS blocked` | Origin not in allowed list | Add domain to `trustedOrigins` |
| `Session not found` | Cookie expired or invalid | Clear cookies, re-login |
| `Network error` | Worker crashed or timeout | Check `wrangler tail` for errors |

## Getting Help

1. **Check Cloudflare Dashboard** for error logs
2. **Review [CLAUDE.md](../CLAUDE.md)** for development guidelines
3. **Search [Analytics Schema](./ANALYTICS-SCHEMA.md)** for query examples
4. **File an issue** in the happy-admin repository
