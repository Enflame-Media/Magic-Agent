# Cloudflare Infrastructure Setup Guide

This guide provides step-by-step instructions for configuring the Cloudflare account and enabling all required services for the Happy application deployment.

> **Prerequisites**: Admin access to Cloudflare account `81f483e6767ea3194467ecef42840f79`

---

## Table of Contents

1. [Overview](#overview)
2. [Account Verification](#account-verification)
3. [Enable Workers Paid Plan](#enable-workers-paid-plan)
4. [Install and Authenticate Wrangler CLI](#install-and-authenticate-wrangler-cli)
5. [Create D1 Databases](#create-d1-databases)
6. [Create R2 Buckets](#create-r2-buckets)
7. [Configure Custom Domains](#configure-custom-domains)
8. [Generate API Tokens](#generate-api-tokens)
9. [Configure Billing Alerts](#configure-billing-alerts)
10. [Verify Two-Factor Authentication](#verify-two-factor-authentication)
11. [Deploy Test Worker](#deploy-test-worker)
12. [Resource Documentation](#resource-documentation)
13. [Team Setup](#team-setup)
14. [Troubleshooting](#troubleshooting)

---

## Overview

### Two-Environment Strategy

Happy uses **two isolated environments** for simplified deployment and faster iteration:

- **Development (`dev`)**: Local and remote development, testing, experimentation
- **Production (`prod`)**: Live application serving real users

No staging environment - deploy directly from dev to prod after validation.

### Services Required

- **Cloudflare Workers Paid Plan** ($5/month minimum)
  - Enables Durable Objects
  - Extended CPU time (500ms vs 50ms)
  - Higher request limits

- **D1 Databases** (SQLite-based, currently free in beta)
  - Development: `happy-dev`
  - Production: `happy-prod`

- **R2 Object Storage** (Free tier available, then $0.015/GB/month)
  - Development: `happy-dev-uploads`
  - Production: `happy-prod-uploads`

- **Durable Objects** (Included in Paid plan)
  - For stateful WebSocket handling
  - Configured later in Phase 4

### Domain Configuration

- **Backend API**: `happy-api.enflamemedia.com` (production only)
- **Frontend**: `happy.enflamemedia.com` (production only)

Development uses `*.workers.dev` subdomain.

### Estimated Costs

- Workers Paid: **$5/month minimum**
- D1: **Free** (currently in beta, 500MB storage per database)
- R2: **~$0.015/GB/month** storage + egress
- Durable Objects: **$0.015/GB-month** storage + **$12.50/million** requests
- **Initial estimate**: $25-50/month for development + production

---

## Account Verification

### 1. Access Cloudflare Dashboard

1. Navigate to https://dash.cloudflare.com/
2. Log in with admin credentials
3. Verify you see account: **Enflame Media** (Account ID: `81f483e6767ea3194467ecef42840f79`)

### 2. Check Current Plan

1. In dashboard, go to **Workers & Pages** (left sidebar)
2. Check plan status in top-right corner
3. Should show **"Workers Paid"** or option to upgrade

**✅ Verification**: Workers Paid plan is enabled

---

## Enable Workers Paid Plan

> **Note**: According to issue HAP-11, the Workers Paid plan is already enabled. Skip to next section if confirmed.

If not enabled:

1. Navigate to **Workers & Pages** → **Plans**
2. Click **"Upgrade to Workers Paid"**
3. Confirm payment method
4. Complete purchase ($5/month minimum)

**Benefits unlocked:**
- ✅ Durable Objects access
- ✅ 500ms CPU time limit (vs 50ms free)
- ✅ Extended request limits
- ✅ D1 storage beyond 500MB

---

## Install and Authenticate Wrangler CLI

### Installation

Wrangler is the CLI tool for managing Cloudflare Workers.

```bash
# Global installation (recommended)
npm install -g wrangler

# Or use project-local version (already in package.json)
cd happy-server-workers
yarn install
```

### Authentication

```bash
# Login to Cloudflare account
wrangler login
```

This will:
1. Open a browser window
2. Prompt you to authorize Wrangler
3. Store authentication token locally

### Verify Authentication

```bash
# Should display your account details
wrangler whoami
```

Expected output:
```
👋 You are logged in with an OAuth Token, associated with the email 'your-email@example.com'.
┌──────────────────────────────────────┬──────────────────────────────────┐
│ Account Name                         │ Account ID                       │
├──────────────────────────────────────┼──────────────────────────────────┤
│ Enflame Media                        │ 81f483e6767ea3194467ecef42840f79 │
└──────────────────────────────────────┴──────────────────────────────────┘
```

---

## Create D1 Databases

D1 is Cloudflare's SQLite-based database service running on Workers.

### Development Database

```bash
wrangler d1 create happy-dev
```

**Output** (example):
```
✅ Successfully created DB 'happy-dev'!

[[d1_databases]]
binding = "DB"
database_name = "happy-dev"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

**📝 IMPORTANT**: Copy the `database_id` value!

### Production Database

```bash
wrangler d1 create happy-prod
```

Copy the `database_id` from output.

### Update wrangler.toml

Edit `wrangler.toml` and replace placeholder database IDs:

```toml
# In [env.dev] section
[[env.dev.d1_databases]]
binding = "DB"
database_name = "happy-dev"
database_id = "YOUR_ACTUAL_DEV_DATABASE_ID"  # ← Replace this

# In [env.prod] section
[[env.prod.d1_databases]]
binding = "DB"
database_name = "happy-prod"
database_id = "YOUR_ACTUAL_PROD_DATABASE_ID"  # ← Replace this
```

### Verify D1 Databases

```bash
# List all D1 databases
wrangler d1 list
```

Should show both databases: `happy-dev`, `happy-prod`

---

## Create R2 Buckets

R2 is Cloudflare's S3-compatible object storage service.

### Development Bucket

```bash
wrangler r2 bucket create happy-dev-uploads
```

### Production Bucket

```bash
wrangler r2 bucket create happy-prod-uploads
```

### Verify R2 Buckets

```bash
# List all R2 buckets
wrangler r2 bucket list
```

Should show both buckets: `happy-dev-uploads`, `happy-prod-uploads`

### R2 Configuration Notes

- Buckets are automatically bound in `wrangler.toml` via `[[env.*.r2_buckets]]` sections
- No additional IDs needed (buckets referenced by name only)
- Access via `c.env.UPLOADS` in Worker code

---

## Configure Custom Domains

Custom domains route traffic from your domain to your Workers.

> **Note**: Custom domains are configured for **production only**. Development uses `*.workers.dev` subdomain.

### Prerequisites

- Domain `enflamemedia.com` must be managed in Cloudflare DNS
- Decision: Use subdomains of existing `enflamemedia.com` zone (not separate zone)

### Option A: Using Cloudflare Dashboard

1. Navigate to **Workers & Pages** → **Your Worker** (production)
2. Go to **Settings** → **Triggers** → **Custom Domains**
3. Click **"Add Custom Domain"**
4. Enter domain: `happy-api.enflamemedia.com`
5. Click **"Add Domain"**
6. Repeat for `happy.enflamemedia.com` (if needed for frontend)

### Option B: Using Wrangler CLI

Uncomment the `routes` section in `wrangler.toml` for production:

```toml
[env.prod]
name = "happy-server-workers-prod"
vars = { ENVIRONMENT = "production" }
routes = [
    { pattern = "happy-api.enflamemedia.com", custom_domain = true }
]
```

Then deploy:

```bash
wrangler deploy --env prod
```

### Verify Domain Configuration

1. Visit https://happy-api.enflamemedia.com/health
2. Should return JSON health check response
3. Check DNS propagation: `dig happy-api.enflamemedia.com`

---

## Generate API Tokens

API tokens allow programmatic access to your Cloudflare account. Generate tokens with **minimal required permissions**.

### Development Token (for local `wrangler dev`)

**Purpose**: Local development and testing

**Permissions needed**:
- Account / Workers Scripts / Edit
- Account / D1 / Read
- Account / R2 / Read

**Steps**:
1. Go to **Profile** → **API Tokens** → **Create Token**
2. Use template: **"Edit Cloudflare Workers"**
3. Modify permissions to add D1 and R2 read access
4. Set Account: `Enflame Media`
5. Create token
6. **Save securely** in team password manager

**Usage**:
```bash
# Set in environment
export CLOUDFLARE_API_TOKEN="your-dev-token"

# Or store in ~/.wrangler/config/default.toml
```

### CI/CD Token (for GitHub Actions deployment)

**Purpose**: Automated deployments from GitHub Actions

**Permissions needed**:
- Account / Workers Scripts / Edit
- Account / Workers Routes / Edit
- Account / D1 / Edit
- Account / R2 / Edit

**Steps**:
1. Create token with template: **"Edit Cloudflare Workers"**
2. Add D1 and R2 edit permissions
3. Set Account: `Enflame Media`
4. **Restrict by IP** (if possible, to GitHub Actions IP ranges)
5. Create token
6. Store in GitHub repository secrets as `CLOUDFLARE_API_TOKEN`

### Admin Token (for emergency access)

**Purpose**: Emergency account access and recovery

**Permissions needed**:
- Account / All resources / Edit (or global API key)

**Steps**:
1. Create token with broad permissions
2. Store in **secure team vault** (not in code)
3. Only use for emergencies (account recovery, manual overrides)

### Token Security Best Practices

- ✅ **Use scoped tokens** - only grant necessary permissions
- ✅ **Rotate tokens regularly** - every 90 days minimum
- ✅ **Never commit tokens** to version control
- ✅ **Use separate tokens** for dev/CI/admin
- ✅ **Monitor token usage** in Cloudflare dashboard
- ❌ **Never use Global API Key** for automation

---

## Configure Billing Alerts

Set up alerts to monitor Cloudflare costs and prevent unexpected bills.

### Steps

1. Navigate to Cloudflare Dashboard → **Billing**
2. Click **"Notifications"** or **"Billing Preferences"**
3. Enable **"Billing Email Notifications"**
4. Add email addresses for alerts

### Recommended Alert Thresholds

- **$50/month** - Warning threshold (expected baseline)
- **$100/month** - Review threshold (check for inefficiencies)
- **$200/month** - Critical threshold (investigate immediately)

### Monitoring Resources

- **Workers**: Check request counts and CPU time usage
- **D1**: Monitor database size and query counts
- **R2**: Track storage size and egress bandwidth
- **Durable Objects**: Monitor active objects and request volume

### Manual Cost Monitoring

```bash
# Not available via CLI - use dashboard
# Navigate to: Cloudflare Dashboard → Account → Billing → Usage
```

**Set calendar reminder**: Review billing monthly (1st of each month)

---

## Verify Two-Factor Authentication

Two-factor authentication (2FA) adds critical security to your Cloudflare account.

### Check Current Status

1. Go to **Profile** → **Authentication**
2. Check if **"Two-Factor Authentication"** is enabled
3. Should show: **"Enabled via Authenticator App"** or **"Security Key"**

### Enable 2FA (if not enabled)

1. Profile → Authentication → **"Enable Two-Factor Authentication"**
2. Choose method:
   - **Authenticator App** (Google Authenticator, Authy, 1Password)
   - **Security Key** (YubiKey, hardware token)
3. Follow setup wizard
4. **Save recovery codes** in secure location

### Team Access

Ensure at least **2 people** have admin access with 2FA enabled:
- ✅ Admin Account (primary)
- ✅ Ryan Jackson (backup)

**Recovery plan**: Document process for account recovery if both admins unavailable

---

## Deploy Test Worker

Verify account setup by deploying a test Worker to each environment.

### Development Deployment

```bash
# Deploy to dev environment
wrangler deploy --env dev
```

**Expected output**:
```
✨ Successfully published your Worker!
✨ https://happy-server-workers-dev.SUBDOMAIN.workers.dev
```

### Test Development Worker

```bash
# Health check
curl https://happy-server-workers-dev.SUBDOMAIN.workers.dev/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-17T12:00:00.000Z",
  "version": "0.0.0"
}
```

### Production Deployment

```bash
wrangler deploy --env prod
```

Test: `curl https://happy-server-workers-prod.SUBDOMAIN.workers.dev/health`

### Verify Both Environments

Both deployments should:
- ✅ Return 200 status code
- ✅ Return valid JSON response
- ✅ Include correct `ENVIRONMENT` value in response

---

## Resource Documentation

Document all created resources for team reference and disaster recovery.

### Resource Inventory Template

Create a secure document (team wiki, password manager notes, or Notion) with:

```markdown
# Happy Cloudflare Resources

**Last Updated**: 2025-01-17
**Account ID**: 81f483e6767ea3194467ecef42840f79

## D1 Databases

| Environment | Database Name | Database ID                          |
|-------------|---------------|--------------------------------------|
| Development | happy-dev     | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| Production  | happy-prod    | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |

## R2 Buckets

| Environment | Bucket Name          | Purpose      |
|-------------|----------------------|--------------|
| Development | happy-dev-uploads    | File uploads |
| Production  | happy-prod-uploads   | File uploads |

## Workers

| Environment | Worker Name              | URL                                          | Custom Domain              |
|-------------|--------------------------|----------------------------------------------|----------------------------|
| Development | happy-server-workers-dev | https://happy-server-workers-dev.*.workers.dev | N/A                        |
| Production  | happy-server-workers-prod| https://happy-server-workers-prod.*.workers.dev| happy-api.enflamemedia.com |

## API Tokens

| Token Name  | Purpose              | Permissions                     | Location              |
|-------------|----------------------|---------------------------------|-----------------------|
| Dev Token   | Local development    | Workers:Edit, D1:Read, R2:Read  | Team password manager |
| CI/CD Token | GitHub Actions       | Workers:Edit, D1:Edit, R2:Edit  | GitHub Secrets        |
| Admin Token | Emergency access     | Account:All                     | Secure team vault     |

## Custom Domains

| Domain                     | Points To                 | Status |
|----------------------------|---------------------------|--------|
| happy-api.enflamemedia.com | happy-server-workers-prod | Active |
| happy.enflamemedia.com     | (Frontend, future)        | TBD    |

## Billing Information

- **Plan**: Workers Paid ($5/month)
- **Billing Email**: [Primary billing contact]
- **Alert Thresholds**: $50, $100, $200/month
- **Payment Method**: [Card ending in XXXX]

## Access Control

| Name          | Role  | 2FA Enabled | Last Login |
|---------------|-------|-------------|------------|
| Admin Account | Admin | ✅          | YYYY-MM-DD |
| Ryan Jackson  | Admin | ✅          | YYYY-MM-DD |
```

### Storage Location

Store this documentation in:
- **Primary**: Team password manager (1Password, Bitwarden, etc.)
- **Backup**: Secure team wiki (Notion, Confluence, internal docs)
- **NOT**: Public repository, Slack, email, or unsecured locations

---

## Team Setup

Enable all team members to deploy and develop with Cloudflare Workers.

### Prerequisites for Each Team Member

1. **Cloudflare account access** (or API token)
2. **Wrangler CLI installed** globally
3. **Node.js 18+** and **Yarn** installed
4. **Repository cloned**: `git clone <repo-url>`

### Setup Steps (Per Team Member)

1. **Install dependencies**:
   ```bash
   cd happy-server-workers
   yarn install
   ```

2. **Authenticate Wrangler**:
   ```bash
   wrangler login
   # Or use API token:
   export CLOUDFLARE_API_TOKEN="token-from-password-manager"
   ```

3. **Verify authentication**:
   ```bash
   wrangler whoami
   ```

4. **Test local development**:
   ```bash
   yarn dev
   # Visit: http://localhost:8787/health
   ```

5. **Deploy to dev environment** (optional):
   ```bash
   wrangler deploy --env dev
   ```

### Team Workflow

- **Local development**: `yarn dev` (no deployment needed)
- **Deploy to dev**: `wrangler deploy --env dev` (test changes)
- **Deploy to production**: Via CI/CD pipeline (main branch merges) OR manual `wrangler deploy --env prod`

### Troubleshooting Team Setup

**Issue**: `wrangler login` fails

**Solution**: Use API token instead:
```bash
export CLOUDFLARE_API_TOKEN="your-token"
wrangler whoami  # Verify
```

**Issue**: "Account not found" error

**Solution**: Check account access in Cloudflare dashboard → Account members

---

## Troubleshooting

### Common Issues

#### 1. Wrangler Authentication Fails

**Symptom**: `Error: Not authenticated`

**Solutions**:
- Run `wrangler logout` then `wrangler login`
- Check API token expiration in dashboard
- Verify account access (may have been removed)

#### 2. D1 Database Not Found

**Symptom**: `Error: D1 database with ID 'xxx' not found`

**Solutions**:
- Run `wrangler d1 list` to verify database exists
- Check `database_id` in `wrangler.toml` matches actual ID
- Ensure database wasn't deleted accidentally

#### 3. R2 Bucket Access Denied

**Symptom**: `Error: R2 bucket 'xxx' not found or access denied`

**Solutions**:
- Run `wrangler r2 bucket list` to verify bucket exists
- Check `bucket_name` in `wrangler.toml` matches exactly
- Verify R2 is enabled on account (Workers Paid plan)

#### 4. Custom Domain Not Working

**Symptom**: Domain returns 404 or DNS error

**Solutions**:
- Check DNS propagation: `dig happy-api.enflamemedia.com`
- Verify domain added in Workers dashboard → Triggers
- Ensure domain is in Cloudflare DNS (not external)
- Wait 5-10 minutes for DNS propagation

#### 5. Workers Paid Plan Required

**Symptom**: `Error: Durable Objects require Workers Paid plan`

**Solutions**:
- Verify plan in dashboard: Workers & Pages → Plans
- Upgrade if on free plan ($5/month)
- Contact Cloudflare support if payment issue

#### 6. Deployment Fails with Type Errors

**Symptom**: `Error: TypeScript compilation failed`

**Solutions**:
- Run locally first: `yarn typecheck`
- Fix all type errors before deployment
- Ensure `@cloudflare/workers-types` is installed

### Getting Help

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Discord**: https://discord.gg/cloudflaredev
- **Support**: https://dash.cloudflare.com/ → Support

### Emergency Contacts

- **Cloudflare Support**: Via dashboard (Enterprise plans only)
- **Team Admins**:
  - Primary: Admin Account
  - Backup: Ryan Jackson

---

## Next Steps

After completing this setup:

1. ✅ **All services enabled** (Workers Paid, D1, R2, Durable Objects)
2. ✅ **Resources created** (2 databases, 2 buckets)
3. ✅ **Configuration updated** (`wrangler.toml` with real IDs)
4. ✅ **Test Worker deployed** (both environments)
5. ✅ **Team enabled** (Wrangler installed, authenticated)
6. ✅ **Documentation completed** (resource inventory created)

**Proceed to**: [HAP-1: Phase 1 - Cloudflare Workers Foundation and Project Setup](https://linear.app/enflame-media/issue/HAP-1)

---

## Checklist Summary

Use this checklist to track progress:

### Account & Plan
- [ ] Verified access to Cloudflare account `81f483e6767ea3194467ecef42840f79`
- [ ] Workers Paid plan enabled and verified
- [ ] Durable Objects accessible (included in Paid plan)
- [ ] D1 service enabled and accessible
- [ ] R2 service enabled and accessible
- [ ] Two-factor authentication verified on account

### Development Environment
- [ ] Development D1 database created (`happy-dev`)
- [ ] Development R2 bucket created (`happy-dev-uploads`)
- [ ] Test Worker deployed successfully to dev environment
- [ ] `wrangler.toml` updated with actual dev D1 database ID

### Production Environment
- [ ] Production D1 database created (`happy-prod`)
- [ ] Production R2 bucket created (`happy-prod-uploads`)
- [ ] Test Worker deployed successfully to production environment
- [ ] `wrangler.toml` updated with actual prod D1 database ID
- [ ] Custom domain configured: `happy-api.enflamemedia.com`
- [ ] Custom domain configured: `happy.enflamemedia.com` (if applicable)

### API Tokens & Access
- [ ] Development API token generated and stored
- [ ] CI/CD API token generated and stored in GitHub Secrets
- [ ] Admin API token generated and stored securely
- [ ] Wrangler CLI installed for all team members
- [ ] All team members authenticated with Wrangler

### Monitoring & Documentation
- [ ] Billing alerts configured ($50, $100, $200 monthly spend)
- [ ] Resource naming conventions documented
- [ ] All resource IDs documented in secure location (team wiki/vault)

**Total**: 22 acceptance criteria

---

## Automated Verification

After completing the manual setup steps, use the automated verification script to validate your configuration:

```bash
# Verify both dev and prod environments
./scripts/verify-cloudflare-setup.sh

# Verify specific environment only
./scripts/verify-cloudflare-setup.sh --env dev
./scripts/verify-cloudflare-setup.sh --env prod
```

The script checks:
- ✅ Wrangler CLI installed and authenticated
- ✅ Correct Cloudflare account (81f483e6767ea3194467ecef42840f79)
- ✅ D1 databases exist (`happy-dev`, `happy-prod`)
- ✅ D1 database IDs in wrangler.toml match actual IDs
- ✅ R2 buckets exist (`happy-dev-uploads`, `happy-prod-uploads`)
- ✅ R2 buckets configured in wrangler.toml
- ✅ Worker deployment configuration valid
- ✅ Project structure complete

**Output Example:**
```
═══════════════════════════════════════════════════════════
  Cloudflare Setup Verification
  Environment: all
═══════════════════════════════════════════════════════════

1. Wrangler CLI
───────────────────────────────────────────────────────────
✓ Wrangler CLI installed (v4.46.0)
✓ Wrangler authenticated with correct account

2. Configuration Files
───────────────────────────────────────────────────────────
✓ wrangler.toml exists
✓ Account ID configured in wrangler.toml

...

═══════════════════════════════════════════════════════════
  Verification Summary
═══════════════════════════════════════════════════════════

Passed:   18
Warnings: 0
Failed:   0

✓ All checks passed!
```

---

**Document Version**: 1.1 (Two-Environment Strategy)
**Last Updated**: 2025-01-17
**Maintained By**: Happy Development Team
