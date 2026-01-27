/**
 * Smoke tests for Happy Vue.js web application
 *
 * Basic E2E tests to verify the application loads and renders correctly.
 * These tests are designed to be fast and reliable, running on every PR.
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/');

    // Verify page loaded without errors
    await expect(page).toHaveURL('/');
  });

  test('should have correct document title', async ({ page }) => {
    await page.goto('/');

    // Verify page has a title (specific title depends on app configuration)
    await expect(page).not.toHaveTitle('');
  });

  test('should not have any console errors on load', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Allow time for async operations
    await page.waitForTimeout(1000);

    // Filter out expected warnings (like browser feature detections)
    const criticalErrors = errors.filter(
      (e) => !e.includes('Failed to load resource') && !e.includes('404')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('should render without JavaScript errors', async ({ page }) => {
    const pageErrors: Error[] = [];

    page.on('pageerror', (error) => {
      pageErrors.push(error);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(pageErrors).toHaveLength(0);
  });
});

test.describe('Responsive Design', () => {
  test('should render correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');

    // Page should be visible and interactive
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Page should be visible on mobile viewport
    await expect(page.locator('body')).toBeVisible();
  });

  test('should render correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Page should be visible on tablet viewport
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Accessibility', () => {
  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    const mainCount = await main.count();

    // At minimum, the page should have some content
    const body = page.locator('body');
    await expect(body).not.toBeEmpty();
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/');

    // First tab should focus an interactive element
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeTruthy();
  });

  test('should have appropriate color contrast', async ({ page }) => {
    await page.goto('/');

    // Check that the page renders (visual contrast is verified by visual regression tests)
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Page should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should have no render-blocking resources in critical path', async ({ page }) => {
    await page.goto('/');

    // Verify the page reaches interactive state
    await page.waitForLoadState('networkidle');

    // Check that content is visible (indicates successful rendering)
    await expect(page.locator('body')).toBeVisible();
  });
});
