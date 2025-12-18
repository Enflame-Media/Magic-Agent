# Deployment Runbook

This runbook provides step-by-step deployment procedures for Happy Server Workers.

## Table of Contents

1. [Overview](#overview)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Development Deployment](#development-deployment)
4. [Production Deployment](#production-deployment)
5. [Database Migrations](#database-migrations)
6. [Secrets Management](#secrets-management)
7. [Rollback Procedures](#rollback-procedures)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Emergency Procedures](#emergency-procedures)

---

## Overview

### Environments

| Environment | Worker Name | Custom Domain | Purpose |
|-------------|-------------|---------------|---------|
| Development | `happy-server-workers-dev` | `happy-api-dev.enflamemedia.com` | Testing, development |
| Production | `happy-server-workers-prod` | `happy-api.enflamemedia.com` | Live user traffic |

### Deployment Tools

- **Wrangler CLI**: Primary deployment tool (`wrangler deploy`)
- **Deploy Script**: `./scripts/deploy.sh` (adds checks and confirmation)
- **Yarn Scripts**: `yarn deploy:dev`, `yarn deploy:prod`

---

## Pre-Deployment Checklist

Before any deployment, verify:

### Code Quality

- [ ] All tests pass (`yarn test`)
- [ ] Type checking passes (`yarn typecheck`)
- [ ] Linting passes (`yarn lint`)
- [ ] No unmerged changes to main branch
- [ ] Code reviewed and approved

### Configuration

- [ ] `wrangler.toml` is correct for target environment
- [ ] All required secrets are set for target environment
- [ ] Database migrations are generated and tested

### Communication

- [ ] Team notified of deployment
- [ ] Users notified if breaking changes (production only)
- [ ] On-call engineer available (production only)

---

## Development Deployment

### Quick Deploy

```bash
# Navigate to project
cd happy-server-workers

# Deploy to development
yarn deploy:dev
```

### Detailed Steps

1. **Pull latest changes**:
   ```bash
   git pull origin main
   ```

2. **Install dependencies**:
   ```bash
   yarn install
   ```

3. **Run pre-flight checks**:
   ```bash
   yarn typecheck
   yarn test
   yarn lint
   ```

4. **Deploy**:
   ```bash
   ./scripts/deploy.sh dev
   # Or: wrangler deploy --env dev
   ```

5. **Verify deployment**:
   ```bash
   curl https://happy-api-dev.enflamemedia.com/health
   ```

### Development Environment Details

```
Worker: happy-server-workers-dev
URL: https://happy-api-dev.enflamemedia.com
D1 Database: happy-dev
R2 Bucket: happy-dev-uploads
```

---

## Production Deployment

> **CAUTION**: Production deployments affect live users.

### Pre-Production Checklist

- [ ] Successfully deployed to development first
- [ ] Smoke tests passed in development
- [ ] Database migrations applied to production D1
- [ ] Secrets verified in production environment
- [ ] Rollback plan prepared

### Production Deploy Steps

1. **Final verification**:
   ```bash
   # Ensure on main branch with latest code
   git checkout main
   git pull origin main

   # Run all checks
   yarn typecheck
   yarn test
   yarn lint
   ```

2. **Apply database migrations** (if needed):
   ```bash
   yarn db:migrate:prod
   ```

3. **Deploy**:
   ```bash
   ./scripts/deploy.sh prod
   ```

   The script will prompt for confirmation:
   ```
   ⚠ You are about to deploy to PRODUCTION!
   Type 'yes' to confirm:
   ```

4. **Verify deployment**:
   ```bash
   # Health check
   curl https://happy-api.enflamemedia.com/health

   # OpenAPI spec
   curl https://happy-api.enflamemedia.com/openapi.json
   ```

5. **Monitor for errors**:
   - Check Cloudflare Analytics (Workers & Pages → Overview)
   - Check Cloudflare Logs (Workers & Pages → Logs)
   - Monitor error rates for first 15 minutes

### Production Environment Details

```
Worker: happy-server-workers-prod
URL: https://happy-api.enflamemedia.com
D1 Database: happy-prod
R2 Bucket: happy-prod-uploads
```

---

## Database Migrations

### Migration Workflow

1. **Make schema changes** in `src/db/schema.ts`

2. **Generate migration**:
   ```bash
   yarn db:generate
   ```

3. **Test locally**:
   ```bash
   yarn db:migrate
   yarn dev
   # Test affected functionality
   ```

4. **Apply to development**:
   ```bash
   yarn db:migrate:remote
   ```

5. **Deploy to development** and verify

6. **Apply to production**:
   ```bash
   yarn db:migrate:prod
   ```

7. **Deploy to production**

### Migration Commands Reference

| Command | Target | Purpose |
|---------|--------|---------|
| `yarn db:migrate` | Local | Apply to local D1 |
| `yarn db:migrate:remote` | Dev | Apply to remote dev D1 |
| `yarn db:migrate:prod` | Prod | Apply to remote prod D1 |

### Verify Migrations Applied

```bash
# Check local database
yarn db:status

# Check remote dev
wrangler d1 execute happy-dev --remote --command="SELECT name FROM sqlite_master WHERE type='table'"

# Check remote prod
wrangler d1 execute happy-prod --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

---

## Secrets Management

### Required Secrets

| Secret | Required | Purpose |
|--------|----------|---------|
| `HANDY_MASTER_SECRET` | Yes | Auth token generation |
| `ELEVENLABS_API_KEY` | No | Voice synthesis |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth |
| `GITHUB_WEBHOOK_SECRET` | No | GitHub webhooks |

### Set Secrets

```bash
# Development
wrangler secret put HANDY_MASTER_SECRET --env dev

# Production
wrangler secret put HANDY_MASTER_SECRET --env prod
```

### List Secrets

```bash
# Development
wrangler secret list --env dev

# Production
wrangler secret list --env prod
```

### Rotate Secrets

> **WARNING**: Rotating `HANDY_MASTER_SECRET` invalidates ALL existing auth tokens.

1. Generate new secret:
   ```bash
   openssl rand -hex 32
   ```

2. Set new secret:
   ```bash
   wrangler secret put HANDY_MASTER_SECRET --env prod
   ```

3. Deploy (optional but recommended):
   ```bash
   yarn deploy:prod
   ```

4. Notify users of required re-authentication

---

## Rollback Procedures

### Immediate Rollback

Cloudflare Workers supports instant rollbacks via the dashboard:

1. Navigate to **Workers & Pages** → **happy-server-workers-prod**
2. Go to **Deployments** tab
3. Find the previous working deployment
4. Click **Rollback to this deployment**

### CLI Rollback

```bash
# List deployments
wrangler deployments list --env prod

# Rollback to specific deployment
wrangler rollback <deployment-id> --env prod
```

### Database Rollback

D1 does not support automatic rollbacks. For data issues:

1. **Restore from backup** (if available)
2. **Create reverse migration** to undo changes
3. **Manual data fix** via SQL commands

---

## Post-Deployment Verification

### Health Checks

```bash
# Basic health
curl https://happy-api.enflamemedia.com/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-12-03T12:00:00.000Z",
  "version": "0.0.0"
}
```

### API Smoke Tests

Run the smoke test script:

```bash
./scripts/smoke-test.sh --env prod
```

Or verify key endpoints manually:

```bash
# OpenAPI spec
curl https://happy-api.enflamemedia.com/openapi.json

# Version endpoint
curl -X POST https://happy-api.enflamemedia.com/v1/version \
  -H "Content-Type: application/json" \
  -d '{"platform":"ios","version":"1.0.0","app_id":"com.ex3ndr.happy"}'
```

### Monitoring

Check these in the Cloudflare Dashboard:

1. **Request volume**: Workers & Pages → Overview
2. **Error rate**: Should be < 1%
3. **Response times**: P95 should be < 500ms
4. **CPU time**: Should be < 50ms average

---

## Emergency Procedures

### High Error Rate (> 5%)

1. **Immediate**: Rollback to previous deployment
   ```bash
   # Via dashboard or CLI
   wrangler rollback <previous-deployment-id> --env prod
   ```

2. **Investigate**: Check Cloudflare logs for error patterns

3. **Fix**: Create patch and deploy to dev first

4. **Re-deploy**: Once fixed, deploy new version

### WebSocket Connection Issues

1. **Check Durable Object health**:
   ```bash
   curl https://happy-api.enflamemedia.com/v1/websocket/stats \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Review DO logs** in Cloudflare dashboard

3. If needed, **redeploy** to reset Durable Objects:
   ```bash
   yarn deploy:prod
   ```

### Database Issues

1. **Check D1 health**:
   ```bash
   wrangler d1 execute happy-prod --remote --command="SELECT 1"
   ```

2. **Check recent queries** in Cloudflare Analytics → D1

3. **Emergency read-only mode**: Deploy version that disables writes

### Complete Outage

1. **Notify team** immediately
2. **Check Cloudflare Status**: https://www.cloudflarestatus.com/
3. **Open support ticket** if Cloudflare issue
4. **Rollback** if deployment-related
5. **Post-incident review** within 24 hours

---

## Deployment Schedule

### Recommended Times

- **Development**: Anytime
- **Production**: Weekdays, 10am-4pm local time
- **Emergency**: Anytime with on-call support

### No-Deploy Windows

- Holiday weekends
- Major company events
- During known Cloudflare maintenance

---

## Contacts

| Role | Contact |
|------|---------|
| Primary On-Call | Ryan Jackson |
| Secondary On-Call | [TBD] |
| Cloudflare Support | https://dash.cloudflare.com/ → Support |

---

## Appendix: Deployment Commands Reference

```bash
# Development deployment
yarn deploy:dev                    # Via yarn script
./scripts/deploy.sh dev            # Via deploy script
wrangler deploy --env dev          # Direct wrangler

# Production deployment
yarn deploy:prod                   # Via yarn script
./scripts/deploy.sh prod           # Via deploy script
wrangler deploy --env prod         # Direct wrangler

# Dry run (see what would deploy)
./scripts/deploy.sh dev --dry-run
./scripts/deploy.sh prod --dry-run

# Database migrations
yarn db:migrate                    # Local
yarn db:migrate:remote             # Dev remote
yarn db:migrate:prod               # Prod remote

# Secrets
wrangler secret put <NAME> --env <dev|prod>
wrangler secret list --env <dev|prod>
wrangler secret delete <NAME> --env <dev|prod>

# Rollback
wrangler deployments list --env prod
wrangler rollback <deployment-id> --env prod

# Logs
wrangler tail --env dev            # Stream dev logs
wrangler tail --env prod           # Stream prod logs
```

---

**Document Version**: 1.0
**Last Updated**: 2024-12-03
**Maintained By**: Happy Development Team
