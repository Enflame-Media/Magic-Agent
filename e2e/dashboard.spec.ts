/**
 * Dashboard Navigation E2E Tests for Happy Admin
 *
 * Tests the dashboard navigation and core UI elements including:
 * - Page layout and header
 * - Navigation between routes
 * - Time range selector
 * - Auto-refresh toggle
 * - Platform selector
 * - Language selector
 * - Responsive design
 *
 * @see HAP-719 - Phase 4.1: Implement Playwright E2E Testing Suite
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use authenticated state for all dashboard tests
test.use({
    storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
});

test.describe('Dashboard Layout', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('displays header with all controls', async ({ page }) => {
        // Header should be visible
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Check header title
        await expect(header.locator('h1')).toContainText(/Sync Metrics|Dashboard|Happy Admin/i);

        // Check for key controls
        await expect(header.locator('button:has-text("Refresh")')).toBeVisible();
        await expect(header.locator('button:has-text("Sign Out")')).toBeVisible();
    });

    test('displays time range selector', async ({ page }) => {
        // Date range selector should be visible
        const dateSelector = page.locator('[class*="DateRangeSelector"], select, [role="combobox"]').first();
        await expect(dateSelector).toBeVisible();
    });

    test('displays auto-refresh toggle', async ({ page }) => {
        // Auto-refresh button should be visible
        const autoRefreshButton = page.locator('button:has-text("Auto")');
        await expect(autoRefreshButton).toBeVisible();
    });

    test('displays metrics summary section', async ({ page }) => {
        // Wait for data to load
        await page.waitForLoadState('networkidle');

        // Summary cards should be present
        const summarySection = page.locator('.grid').first();
        await expect(summarySection).toBeVisible();
    });

    test('displays bundle size section', async ({ page }) => {
        // Bundle size section header
        const bundleHeader = page.locator('h2:has-text("Bundle Size")');
        await expect(bundleHeader).toBeVisible();
    });

    test('displays validation metrics section', async ({ page }) => {
        // Validation section header
        const validationHeader = page.locator('h2:has-text("Validation")');
        await expect(validationHeader).toBeVisible();
    });

    test('displays metrics table', async ({ page }) => {
        // Wait for data to load
        await page.waitForLoadState('networkidle');

        // Table should be present
        const table = page.locator('table');
        await expect(table).toBeVisible();

        // Table headers should match expected columns
        const headers = page.locator('th');
        await expect(headers).toHaveCount(6); // Type, Mode, Count, Avg Duration, P95 Duration, Success Rate
    });
});

test.describe('Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('navigates to admin users page', async ({ page }) => {
        // Click on Users link/button
        await page.click('a:has-text("Users"), button:has-text("Users")');

        // Should navigate to users page
        await page.waitForURL('**/admin/users');
        await expect(page).toHaveURL(/\/admin\/users/);
    });

    test('returns to dashboard from admin users', async ({ page }) => {
        // Navigate to users
        await page.goto('/admin/users');

        // Navigate back (using browser back or logo/link)
        await page.goBack();

        // Should be on dashboard
        await expect(page).toHaveURL('/');
    });

    test('admin users page displays user management content', async ({ page }) => {
        await page.goto('/admin/users');

        // Should have appropriate content
        await expect(page.locator('h1, h2')).toContainText(/Users|Admin/i);
    });
});

test.describe('Time Range Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('can change time range', async ({ page }) => {
        // Find time range selector
        const selector = page.locator('[class*="DateRangeSelector"], select').first();
        await expect(selector).toBeVisible();

        // Click to open dropdown/options
        await selector.click();

        // Select a different option (e.g., 7 days)
        await page.click('option:has-text("7"), [role="option"]:has-text("7")');

        // Verify selection changed (or wait for data reload)
        await page.waitForLoadState('networkidle');
    });
});

test.describe('Auto-Refresh Toggle', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('toggles auto-refresh state', async ({ page }) => {
        const autoRefreshButton = page.locator('button:has-text("Auto")');
        await expect(autoRefreshButton).toBeVisible();

        // Get initial state
        const initialText = await autoRefreshButton.textContent();
        const wasOn = initialText?.includes('On');

        // Toggle
        await autoRefreshButton.click();

        // Verify state changed
        const newText = await autoRefreshButton.textContent();
        const isNowOn = newText?.includes('On');

        expect(isNowOn).not.toBe(wasOn);
    });
});

test.describe('Refresh Button', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('refresh button triggers data reload', async ({ page }) => {
        // Wait for initial load
        await page.waitForLoadState('networkidle');

        // Set up request interception to verify API calls
        const apiCalls: string[] = [];
        page.on('request', (request) => {
            if (request.url().includes('/api/')) {
                apiCalls.push(request.url());
            }
        });

        // Click refresh
        const refreshButton = page.locator('button:has-text("Refresh")');
        await refreshButton.click();

        // Wait for requests
        await page.waitForLoadState('networkidle');

        // Verify API calls were made
        expect(apiCalls.length).toBeGreaterThan(0);
    });

    test('refresh button shows loading state', async ({ page }) => {
        const refreshButton = page.locator('button:has-text("Refresh")');

        // Click refresh
        await refreshButton.click();

        // Button should be disabled or show loading
        await expect(refreshButton).toBeDisabled();
    });
});

test.describe('Platform Selector', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('platform selector is visible in bundle section', async ({ page }) => {
        // Scroll to bundle section
        await page.locator('h2:has-text("Bundle Size")').scrollIntoViewIfNeeded();

        // Platform selector should be visible
        const platformSelector = page.locator('[class*="PlatformSelector"], select').first();
        await expect(platformSelector).toBeVisible();
    });

    test('can select different platform', async ({ page }) => {
        // Scroll to bundle section
        await page.locator('h2:has-text("Bundle Size")').scrollIntoViewIfNeeded();

        // Find and click platform selector
        const platformSelector = page.locator('[class*="PlatformSelector"], select').first();
        await platformSelector.click();

        // Select iOS option
        await page.click('option:has-text("iOS"), [role="option"]:has-text("iOS")');

        // Wait for data update
        await page.waitForLoadState('networkidle');
    });
});

test.describe('Language Selector', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('language selector is visible', async ({ page }) => {
        // Language selector should be in header
        const langSelector = page.locator('[class*="LanguageSelector"], select[name="language"], button:has-text("English")');
        await expect(langSelector.first()).toBeVisible();
    });

    test('can change language', async ({ page }) => {
        // Find language selector
        const langSelector = page.locator('[class*="LanguageSelector"], select[name="language"]').first();
        await langSelector.click();

        // Select Spanish
        await page.click('option:has-text("Espa"), [role="option"]:has-text("Espa")');

        // Verify language changed (UI text should change)
        await page.waitForTimeout(500); // Allow for i18n update

        // Some text should now be in Spanish
        await expect(page.locator('body')).toContainText(/(Actualizar|Cerrar|Inicio)/i);
    });
});

test.describe('Responsive Design', () => {
    test('mobile layout shows hamburger menu or stacked controls', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Header should still be visible
        await expect(page.locator('header')).toBeVisible();

        // Content should be visible (may be stacked)
        await expect(page.locator('main')).toBeVisible();
    });

    test('tablet layout adapts grid properly', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');

        // Dashboard should be visible
        await expect(page.locator('header')).toBeVisible();
        await expect(page.locator('main')).toBeVisible();
    });

    test('large desktop layout shows full grid', async ({ page }) => {
        // Set large desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');

        // Dashboard should display in full layout
        await expect(page.locator('header')).toBeVisible();

        // Grid should use multiple columns (check by verifying charts are side by side)
        const gridContainer = page.locator('.grid').first();
        await expect(gridContainer).toBeVisible();
    });
});

test.describe('Error Handling', () => {
    test('displays error message on API failure', async ({ page }) => {
        // Intercept API calls and force failure
        await page.route('**/api/metrics/**', (route) => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' }),
            });
        });

        await page.goto('/');

        // Error message should be displayed
        await expect(page.locator('.text-red-600, [role="alert"]')).toBeVisible({
            timeout: 10000,
        });
    });

    test('retry button is visible on error', async ({ page }) => {
        // Intercept API calls and force failure
        await page.route('**/api/metrics/**', (route) => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' }),
            });
        });

        await page.goto('/');

        // Try again button should be visible
        await expect(page.locator('button:has-text("Try Again"), button:has-text("Retry")')).toBeVisible({
            timeout: 10000,
        });
    });
});

test.describe('Loading States', () => {
    test('shows loading indicator during data fetch', async ({ page }) => {
        // Slow down API responses
        await page.route('**/api/metrics/**', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            route.continue();
        });

        await page.goto('/');

        // Loading indicator should be visible
        const loadingIndicator = page.locator('.animate-spin, [aria-busy="true"]');
        await expect(loadingIndicator.first()).toBeVisible();
    });
});
