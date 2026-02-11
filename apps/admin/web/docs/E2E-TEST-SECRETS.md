# E2E Test Environment Secrets Configuration

> **Related Issues**: HAP-888, HAP-719

This document provides detailed instructions for configuring E2E test credentials for the happy-admin dashboard's Playwright test suite.

## Overview

The E2E tests require dedicated test credentials to authenticate against the happy-admin application. These credentials are used by Playwright to perform authenticated actions during testing.

### Why Dedicated Test Accounts?

1. **CI/CD Reliability**: Tests need consistent, dedicated accounts that won't be modified by regular users
2. **Security**: Using hardcoded credentials is a security risk; secrets should be managed properly
3. **Test Isolation**: Dedicated test accounts prevent interference with production data

## Required Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `E2E_TEST_EMAIL` | Email address of the test user account | `e2e-test@enflamemedia.com` |
| `E2E_TEST_PASSWORD` | Password for the test user account | (secure password) |

## Configuration

### 1. GitHub Actions (CI/CD)

Configure secrets in the GitHub repository settings:

1. Navigate to **Repository Settings** > **Secrets and variables** > **Actions**
2. Click **New repository secret**
3. Add the following secrets:
   - `E2E_TEST_EMAIL`: The test account email
   - `E2E_TEST_PASSWORD`: The test account password

```yaml
# Secrets are referenced in .github/workflows/e2e.yml:
env:
  E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL }}
  E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD }}
```

### 2. Local Development

For local E2E testing, add the credentials to your `.dev.vars` file:

```bash
# Add to .dev.vars (gitignored)
E2E_TEST_EMAIL=e2e-test@test.local
E2E_TEST_PASSWORD=TestPassword123!
```

## Creating a Test User

### Option A: Using the Better-Auth Sign-Up Endpoint (Recommended)

```bash
# Start the local development server
yarn dev

# Create a test user via the API
curl -X POST http://localhost:8787/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "e2e-test@test.local",
    "password": "TestPassword123!",
    "name": "E2E Test User"
  }'
```

### Option B: Direct D1 Database Insertion

For CI/CD environments or when you need to seed the database:

```bash
# Using wrangler d1 execute
wrangler d1 execute happy-admin-dev --command="
INSERT INTO users (id, email, name, emailVerified, createdAt, updatedAt)
VALUES (
  'e2e-test-user-id',
  'e2e-test@test.local',
  'E2E Test User',
  1,
  datetime('now'),
  datetime('now')
);
"
```

**Note**: Better-Auth hashes passwords automatically. If inserting directly into the database, you'll need to hash the password using the same algorithm (typically bcrypt or argon2).

### Option C: Create During Test Setup (Advanced)

For more complex scenarios, you can create the test user programmatically in the Playwright setup:

```typescript
// e2e/fixtures/create-test-user.ts
import { request } from '@playwright/test';

export async function createTestUser(baseURL: string) {
    const context = await request.newContext({ baseURL });

    try {
        await context.post('/api/auth/sign-up/email', {
            data: {
                email: process.env.E2E_TEST_EMAIL,
                password: process.env.E2E_TEST_PASSWORD,
                name: 'E2E Test User',
            },
        });
    } catch (error) {
        // User may already exist, which is fine
        console.log('Test user creation:', error);
    }

    await context.dispose();
}
```

## Environment-Specific Configuration

### Development Environment

| Variable | Value |
|----------|-------|
| `E2E_TEST_EMAIL` | `e2e-test@test.local` |
| `E2E_TEST_PASSWORD` | `TestPassword123!` (or generate a secure password) |

### Staging Environment

| Variable | Value |
|----------|-------|
| `E2E_TEST_EMAIL` | `e2e-test@staging.enflamemedia.com` |
| `E2E_TEST_PASSWORD` | (stored in GitHub Secrets) |

### Production Environment

**Important**: E2E tests should NOT run against production. If you need production smoke tests, use a separate test account with restricted permissions.

## Fallback Behavior

The E2E workflow includes fallback credentials for backwards compatibility:

```yaml
E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL || 'admin@test.local' }}
E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD || 'TestPassword123!' }}
```

**Warning**: Relying on fallback credentials is not recommended for CI/CD. Always configure proper secrets.

## Troubleshooting

### Tests Fail with "Invalid credentials"

1. Verify the test user exists in the database
2. Check that the password matches exactly (case-sensitive)
3. Ensure the `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` environment variables are set

### Tests Fail with "Session expired"

1. Check that `BETTER_AUTH_SECRET` is configured correctly
2. Verify the test user's email is verified in the database

### GitHub Actions Tests Failing

1. Verify secrets are configured in repository settings
2. Check the workflow logs for environment variable issues
3. Ensure the test environment (D1 database) is properly seeded

## Security Considerations

1. **Never use production credentials** for E2E testing
2. **Rotate test credentials periodically** (recommended: quarterly)
3. **Use strong passwords** even for test accounts
4. **Restrict test account permissions** to only what's needed for testing
5. **Never commit credentials** to version control

## Related Files

- `e2e/auth.setup.ts` - Authentication setup for Playwright
- `.github/workflows/e2e.yml` - GitHub Actions E2E workflow
- `.dev.vars.example` - Example environment variables
- `playwright.config.ts` - Playwright configuration

## References

- [HAP-719](https://linear.app/enflame-media/issue/HAP-719) - Phase 4.1: Implement Playwright E2E Testing Suite
- [HAP-888](https://linear.app/enflame-media/issue/HAP-888) - Configure E2E Test Environment Secrets
- [Playwright Authentication Docs](https://playwright.dev/docs/auth)
- [Better-Auth Documentation](https://www.better-auth.com/)
