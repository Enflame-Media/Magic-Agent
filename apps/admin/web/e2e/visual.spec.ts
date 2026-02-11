/**
 * Visual Regression E2E Tests for Happy Admin Dashboard
 *
 * These tests capture screenshots of key UI components and compare
 * them against baseline images to detect visual regressions.
 *
 * Run locally: yarn test:e2e --grep "visual regression"
 * Update snapshots: yarn test:e2e:update-snapshots
 *
 * @see HAP-719 - Phase 4.1: Implement Playwright E2E Testing Suite
 */
import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use authenticated state for all visual regression tests
test.use({
    storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
});

/**
 * Wait for all charts and animations to complete before screenshot
 */
async function waitForChartsToRender(page: import('@playwright/test').Page) {
    await page.waitForLoadState('networkidle');
    // Wait for Chart.js animations (typically 1000ms)
    await page.waitForTimeout(1500);
    // Disable any remaining animations
    await page.evaluate(() => {
        document.querySelectorAll('*').forEach((el) => {
            (el as HTMLElement).style.animation = 'none';
            (el as HTMLElement).style.transition = 'none';
        });
    });
}

test.describe('Visual Regression - Login Page', () => {
    test('login page appearance', async ({ page }) => {
        // Clear auth state for login page test
        await page.context().clearCookies();
        await page.goto('/login');

        await expect(page.locator('form')).toBeVisible();
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('login-page.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });

    test('login form focus state', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/login');

        // Focus on email input
        await page.locator('input[type="email"]').focus();
        await page.waitForTimeout(200);

        await expect(page.locator('form')).toHaveScreenshot('login-form-focus.png', {
            animations: 'disabled',
        });
    });

    test('login error state', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/login');

        // Trigger error by submitting invalid credentials
        await page.fill('input[type="email"]', 'invalid@test.com');
        await page.fill('input[type="password"]', 'wrong');
        await page.click('button[type="submit"]');

        // Wait for error to appear
        await page.waitForSelector('.text-red-600, [role="alert"]', { timeout: 5000 });
        await page.waitForTimeout(300);

        await expect(page.locator('.card, form').first()).toHaveScreenshot('login-error-state.png', {
            animations: 'disabled',
        });
    });
});

test.describe('Visual Regression - Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForChartsToRender(page);
    });

    test('full dashboard view', async ({ page }) => {
        await expect(page).toHaveScreenshot('dashboard-full.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05, // Allow 5% for dynamic data
        });
    });

    test('dashboard header', async ({ page }) => {
        const header = page.locator('header');
        await expect(header).toHaveScreenshot('dashboard-header.png', {
            animations: 'disabled',
        });
    });

    test('metrics summary cards', async ({ page }) => {
        const summarySection = page.locator('.grid').first();
        await expect(summarySection).toHaveScreenshot('metrics-summary.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });

    test('sync metrics charts section', async ({ page }) => {
        const chartsGrid = page.locator('.grid').nth(1);
        await expect(chartsGrid).toHaveScreenshot('sync-charts.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.1, // Higher tolerance for chart data
        });
    });

    test('metrics table', async ({ page }) => {
        const table = page.locator('table').first();
        await table.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);

        await expect(table).toHaveScreenshot('metrics-table.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });
});

test.describe('Visual Regression - Bundle Size Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForChartsToRender(page);
        await page.locator('h2:has-text("Bundle Size")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
    });

    test('bundle size section header', async ({ page }) => {
        const bundleHeader = page.locator('h2:has-text("Bundle Size")').locator('..');
        await expect(bundleHeader).toHaveScreenshot('bundle-header.png', {
            animations: 'disabled',
        });
    });

    test('bundle size chart', async ({ page }) => {
        const bundleSection = page.locator('h2:has-text("Bundle Size")').locator('..').locator('..');
        const bundleChartArea = bundleSection.locator('.grid');

        await expect(bundleChartArea).toHaveScreenshot('bundle-chart-area.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.1,
        });
    });
});

test.describe('Visual Regression - Validation Section', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await waitForChartsToRender(page);
        await page.locator('h2:has-text("Validation")').scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
    });

    test('validation section header', async ({ page }) => {
        const validationHeader = page.locator('h2:has-text("Validation")').locator('..');
        await expect(validationHeader).toHaveScreenshot('validation-header.png', {
            animations: 'disabled',
        });
    });

    test('validation summary cards', async ({ page }) => {
        const validationSection = page.locator('h2:has-text("Validation")').locator('..').locator('..');
        const summaryCards = validationSection.locator('[class*="Summary"], .grid').first();

        await expect(summaryCards).toHaveScreenshot('validation-summary.png', {
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });
});

test.describe('Visual Regression - Responsive Design', () => {
    test('mobile viewport (375x667)', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await waitForChartsToRender(page);

        await expect(page).toHaveScreenshot('dashboard-mobile.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });

    test('tablet viewport (768x1024)', async ({ page }) => {
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await waitForChartsToRender(page);

        await expect(page).toHaveScreenshot('dashboard-tablet.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });

    test('desktop viewport (1280x720)', async ({ page }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('/');
        await waitForChartsToRender(page);

        await expect(page).toHaveScreenshot('dashboard-desktop.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });

    test('large desktop viewport (1920x1080)', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.goto('/');
        await waitForChartsToRender(page);

        await expect(page).toHaveScreenshot('dashboard-large-desktop.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });
});

test.describe('Visual Regression - Admin Users Page', () => {
    test('admin users page', async ({ page }) => {
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('admin-users.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

test.describe('Visual Regression - Dark Mode', () => {
    test.beforeEach(async ({ page }) => {
        // Enable dark mode via prefers-color-scheme
        await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('dashboard dark mode', async ({ page }) => {
        await page.goto('/');
        await waitForChartsToRender(page);

        await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
            fullPage: true,
            animations: 'disabled',
            maxDiffPixelRatio: 0.05,
        });
    });

    test('login page dark mode', async ({ page }) => {
        await page.context().clearCookies();
        await page.goto('/login');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('login-dark-mode.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

test.describe('Visual Regression - Loading States', () => {
    test('dashboard loading state', async ({ page }) => {
        // Slow down API responses
        await page.route('**/api/metrics/**', async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 10000));
            route.continue();
        });

        await page.goto('/');
        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('dashboard-loading.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});

test.describe('Visual Regression - Error States', () => {
    test('dashboard error state', async ({ page }) => {
        // Force API error
        await page.route('**/api/metrics/**', (route) => {
            route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Internal server error' }),
            });
        });

        await page.goto('/');
        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot('dashboard-error.png', {
            fullPage: true,
            animations: 'disabled',
        });
    });
});
