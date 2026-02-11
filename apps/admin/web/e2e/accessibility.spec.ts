/**
 * Accessibility E2E Tests for Happy Admin Dashboard
 *
 * Tests WCAG compliance using axe-core for automated accessibility testing.
 * Covers:
 * - Login page accessibility
 * - Dashboard page accessibility
 * - Admin users page accessibility
 *
 * @see HAP-889 - Add Accessibility Testing with axe-core
 * @see HAP-686 - Phase 4: Implement Comprehensive Testing Suite
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
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

/**
 * Helper to create a detailed violation report for debugging
 */
function formatViolations(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
    return violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        description: violation.description,
        help: violation.help,
        helpUrl: violation.helpUrl,
        nodes: violation.nodes.map((node) => ({
            html: node.html,
            failureSummary: node.failureSummary,
            target: node.target,
        })),
    }));
}

test.describe('Accessibility - Login Page', () => {
    test.beforeEach(async ({ page }) => {
        // Start fresh without auth for login page tests
        await page.goto('/login');
        await page.waitForLoadState('networkidle');
    });

    test('should have no accessibility violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        // Log violations for debugging if any exist
        if (accessibilityScanResults.violations.length > 0) {
            console.log(
                'Accessibility violations found:',
                JSON.stringify(formatViolations(accessibilityScanResults.violations), null, 2)
            );
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have no critical or serious violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        // Filter for only critical and serious violations
        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalViolations.length > 0) {
            console.log(
                'Critical/serious violations:',
                JSON.stringify(formatViolations(criticalViolations), null, 2)
            );
        }

        expect(criticalViolations).toEqual([]);
    });

    test('form elements should have accessible labels', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .include('form')
            .withRules(['label', 'label-title-only'])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper color contrast', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withRules(['color-contrast', 'color-contrast-enhanced'])
            .analyze();

        // Filter for critical contrast issues only
        const criticalContrast = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalContrast).toEqual([]);
    });

    test('should be keyboard navigable', async ({ page }) => {
        // Test that all interactive elements are reachable via Tab key
        const emailInput = page.locator('input[type="email"]');
        const passwordInput = page.locator('input[type="password"]');
        const submitButton = page.locator('button[type="submit"]');

        // Tab to email input
        await page.keyboard.press('Tab');
        await expect(emailInput).toBeFocused();

        // Tab to password input
        await page.keyboard.press('Tab');
        await expect(passwordInput).toBeFocused();

        // Tab to submit button
        await page.keyboard.press('Tab');
        await expect(submitButton).toBeFocused();
    });
});

test.describe('Accessibility - Dashboard Page', () => {
    // Use authenticated state for dashboard tests
    test.use({
        storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should have no accessibility violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            // Exclude chart canvases as they may have known issues
            .exclude('canvas')
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log(
                'Dashboard accessibility violations:',
                JSON.stringify(formatViolations(accessibilityScanResults.violations), null, 2)
            );
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have no critical or serious violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('canvas')
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalViolations.length > 0) {
            console.log(
                'Critical/serious violations on dashboard:',
                JSON.stringify(formatViolations(criticalViolations), null, 2)
            );
        }

        expect(criticalViolations).toEqual([]);
    });

    test('header should be accessible', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .include('header')
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('navigation should be keyboard accessible', async ({ page }) => {
        // Test that key navigation elements are focusable
        const header = page.locator('header');
        await expect(header).toBeVisible();

        // Check that buttons in header are focusable
        const focusableElements = header.locator('button, a, [tabindex="0"]');
        const count = await focusableElements.count();

        // Should have at least some focusable elements (refresh, sign out, etc.)
        expect(count).toBeGreaterThan(0);

        // Test Tab navigation through header
        await page.keyboard.press('Tab');
        const activeElement = page.locator(':focus');
        await expect(activeElement).toBeVisible();
    });

    test('tables should have proper structure', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .include('table')
            .withRules([
                'td-headers-attr',
                'th-has-data-cells',
                'table-duplicate-name',
                'table-fake-caption',
            ])
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withRules(['heading-order', 'empty-heading', 'page-has-heading-one'])
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('interactive elements should have accessible names', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withRules(['button-name', 'link-name', 'input-button-name'])
            .exclude('canvas')
            .analyze();

        expect(accessibilityScanResults.violations).toEqual([]);
    });
});

test.describe('Accessibility - Admin Users Page', () => {
    // Use authenticated state
    test.use({
        storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
    });

    test.beforeEach(async ({ page }) => {
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');
    });

    test('should have no accessibility violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

        if (accessibilityScanResults.violations.length > 0) {
            console.log(
                'Admin users page violations:',
                JSON.stringify(formatViolations(accessibilityScanResults.violations), null, 2)
            );
        }

        expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have no critical or serious violations', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        if (criticalViolations.length > 0) {
            console.log(
                'Critical/serious violations on admin users page:',
                JSON.stringify(formatViolations(criticalViolations), null, 2)
            );
        }

        expect(criticalViolations).toEqual([]);
    });

    test('page should have proper landmark regions', async ({ page }) => {
        const accessibilityScanResults = await new AxeBuilder({ page })
            .withRules(['landmark-one-main', 'region'])
            .analyze();

        // Landmark issues are typically moderate/minor, so focus on critical ones
        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });
});

test.describe('Accessibility - Responsive Design', () => {
    // Use authenticated state
    test.use({
        storageState: path.join(__dirname, '../.playwright/.auth/user.json'),
    });

    test('mobile viewport should maintain accessibility', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('canvas')
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });

    test('tablet viewport should maintain accessibility', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const accessibilityScanResults = await new AxeBuilder({ page })
            .exclude('canvas')
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });
});

test.describe('Accessibility - Error States', () => {
    test('login error messages should be accessible', async ({ page }) => {
        await page.goto('/login');

        // Fill in invalid credentials to trigger error
        await page.fill('input[type="email"]', 'invalid@example.com');
        await page.fill('input[type="password"]', 'wrongpassword');
        await page.click('button[type="submit"]');

        // Wait for error message to appear
        await page.waitForSelector('.text-red-600, [role="alert"]', { timeout: 5000 });

        const accessibilityScanResults = await new AxeBuilder({ page })
            .withRules(['aria-valid-attr', 'aria-valid-attr-value', 'aria-allowed-role'])
            .analyze();

        const criticalViolations = accessibilityScanResults.violations.filter(
            (v) => v.impact === 'critical' || v.impact === 'serious'
        );

        expect(criticalViolations).toEqual([]);
    });
});
