/**
 * Authentication Setup for Playwright E2E Tests
 *
 * This setup script runs before other tests to create an authenticated
 * browser state that can be reused across tests.
 *
 * @see https://playwright.dev/docs/auth
 * @see HAP-719 - Phase 4.1: Implement Playwright E2E Testing Suite
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Path to store authenticated state for reuse across tests
 */
const authFile = path.join(__dirname, '../.playwright/.auth/user.json');

/**
 * Test credentials for E2E testing
 *
 * These should be configured via environment variables in CI
 * or use test accounts created specifically for E2E testing.
 */
const TEST_USER = {
    email: process.env.E2E_TEST_EMAIL || 'admin@test.local',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

setup('authenticate', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Wait for the login form to be visible
    await expect(page.locator('form')).toBeVisible();

    // Fill in credentials
    await page.fill('input[type="email"]', TEST_USER.email);
    await page.fill('input[type="password"]', TEST_USER.password);

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard (successful login)
    // This also verifies the login was successful
    await page.waitForURL('/', { timeout: 10000 });

    // Verify we're on the dashboard by checking for expected content
    await expect(page.locator('header')).toBeVisible();

    // Store the authenticated state for reuse
    await page.context().storageState({ path: authFile });
});
