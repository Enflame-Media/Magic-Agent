/**
 * Authentication E2E Tests for Happy Admin Dashboard
 *
 * Tests the complete authentication flow including:
 * - Login with valid credentials
 * - Login validation (invalid credentials)
 * - Logout functionality
 * - Session persistence
 * - Protected route redirection
 *
 * @see HAP-719 - Phase 4.1: Implement Playwright E2E Testing Suite
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test credentials - should match what's set up in auth.setup.ts
 */
const TEST_USER = {
    email: process.env.E2E_TEST_EMAIL || 'admin@test.local',
    password: process.env.E2E_TEST_PASSWORD || 'TestPassword123!',
};

test.describe('Authentication Flow', () => {
    test.describe('Login Page', () => {
        test.beforeEach(async ({ page }) => {
            // Start fresh without auth for login tests
            await page.goto('/login');
        });

        test('displays login form correctly', async ({ page }) => {
            // Check page title/heading
            await expect(page.locator('h1')).toContainText(/Happy Admin|Sign In/i);

            // Check form elements
            await expect(page.locator('input[type="email"]')).toBeVisible();
            await expect(page.locator('input[type="password"]')).toBeVisible();
            await expect(page.locator('button[type="submit"]')).toBeVisible();

            // Check labels
            await expect(page.locator('label[for="email"]')).toBeVisible();
            await expect(page.locator('label[for="password"]')).toBeVisible();
        });

        test('shows validation for empty fields', async ({ page }) => {
            // Try to submit empty form
            await page.click('button[type="submit"]');

            // HTML5 validation should prevent submission
            // The email input should be invalid
            const emailInput = page.locator('input[type="email"]');
            await expect(emailInput).toBeFocused();
        });

        test('shows error for invalid credentials', async ({ page }) => {
            // Fill in invalid credentials
            await page.fill('input[type="email"]', 'invalid@example.com');
            await page.fill('input[type="password"]', 'wrongpassword');

            // Submit form
            await page.click('button[type="submit"]');

            // Wait for and verify error message
            await expect(page.locator('.text-red-600, [role="alert"]')).toBeVisible({
                timeout: 5000,
            });
        });

        test('successful login redirects to dashboard', async ({ page }) => {
            // Fill in valid credentials
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);

            // Submit form
            await page.click('button[type="submit"]');

            // Wait for redirect to dashboard
            await page.waitForURL('/', { timeout: 10000 });

            // Verify dashboard content is visible
            await expect(page.locator('header')).toBeVisible();
        });

        test('login button shows loading state', async ({ page }) => {
            // Fill in credentials
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);

            // Click submit and check for loading state
            await page.click('button[type="submit"]');

            // Button should show loading text or be disabled
            const submitButton = page.locator('button[type="submit"]');
            await expect(submitButton).toBeDisabled();
        });

        test('preserves redirect query parameter after login', async ({ page }) => {
            // Navigate to a protected route
            await page.goto('/admin/users');

            // Should be redirected to login with redirect param
            await expect(page).toHaveURL(/\/login\?redirect=/);

            // Login
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);
            await page.click('button[type="submit"]');

            // Should redirect to original protected route
            await page.waitForURL('**/admin/users', { timeout: 10000 });
        });
    });

    test.describe('Authenticated Session', () => {
        // Use stored auth state from setup
        test.use({
            storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
        });

        test('dashboard is accessible when authenticated', async ({ page }) => {
            await page.goto('/');

            // Should not redirect to login
            await expect(page).not.toHaveURL(/\/login/);

            // Dashboard content should be visible
            await expect(page.locator('header')).toBeVisible();
        });

        test('admin users page is accessible when authenticated', async ({ page }) => {
            await page.goto('/admin/users');

            // Should not redirect to login
            await expect(page).not.toHaveURL(/\/login/);
        });
    });

    test.describe('Logout', () => {
        // Use stored auth state from setup
        test.use({
            storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
        });

        test('logout button is visible on dashboard', async ({ page }) => {
            await page.goto('/');

            // Find logout/sign out button
            const logoutButton = page.locator('button:has-text("Sign Out"), button:has-text("Logout")');
            await expect(logoutButton).toBeVisible();
        });

        test('clicking logout redirects to login page', async ({ page }) => {
            await page.goto('/');

            // Click logout button
            await page.click('button:has-text("Sign Out"), button:has-text("Logout")');

            // Should redirect to login
            await page.waitForURL('**/login', { timeout: 10000 });
        });

        test('after logout, protected routes redirect to login', async ({ page }) => {
            await page.goto('/');

            // Logout
            await page.click('button:has-text("Sign Out"), button:has-text("Logout")');
            await page.waitForURL('**/login');

            // Try to access protected route
            await page.goto('/');

            // Should redirect to login
            await expect(page).toHaveURL(/\/login/);
        });
    });

    test.describe('Session Persistence', () => {
        test('session persists across page reloads', async ({ page }) => {
            // Login
            await page.goto('/login');
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('/');

            // Reload page
            await page.reload();

            // Should still be on dashboard
            await expect(page).toHaveURL('/');
            await expect(page.locator('header')).toBeVisible();
        });

        test('session persists across new tabs', async ({ page, context }) => {
            // Login in first page
            await page.goto('/login');
            await page.fill('input[type="email"]', TEST_USER.email);
            await page.fill('input[type="password"]', TEST_USER.password);
            await page.click('button[type="submit"]');
            await page.waitForURL('/');

            // Open new page in same context (shares cookies)
            const newPage = await context.newPage();
            await newPage.goto('/');

            // Should be authenticated in new tab
            await expect(newPage).toHaveURL('/');
            await expect(newPage.locator('header')).toBeVisible();
        });
    });
});
