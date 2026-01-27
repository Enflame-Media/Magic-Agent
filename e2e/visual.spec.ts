/**
 * Visual Regression Tests for Happy Vue.js Web Application
 *
 * Uses Percy with Playwright to capture visual snapshots and detect
 * unintended UI changes. These tests verify that critical screens
 * render consistently across updates.
 *
 * @see HAP-876 - Visual Regression Testing Implementation
 * @see HAP-720 - NativeScript Mobile Testing Suite (parent)
 */

import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Test configuration for visual regression
 */
const PERCY_CONFIG = {
  /**
   * Widths to capture for responsive testing
   * Covers mobile, tablet, and desktop viewports
   */
  widths: [375, 768, 1280],

  /**
   * Minimum height to capture (Percy auto-captures full page)
   */
  minHeight: 1024,

  /**
   * Enable JavaScript for dynamic content
   */
  enableJavaScript: true,
};

/**
 * Mobile-specific viewport configuration for visual tests
 */
const MOBILE_VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone12: { width: 390, height: 844 },
  iPhone14Pro: { width: 393, height: 852 },
  pixel5: { width: 393, height: 851 },
  pixel7: { width: 412, height: 915 },
  galaxyS21: { width: 360, height: 800 },
};

test.describe('Visual Regression - Authentication Screens', () => {
  test('Login screen - desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/auth');

    // Wait for page to fully render
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();

    await percySnapshot(page, 'Login Screen - Desktop', {
      widths: [1280],
    });
  });

  test('Login screen - responsive', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Login Screen - Responsive', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('QR Scanner screen', async ({ page, context }) => {
    // Grant camera permissions to avoid permission dialogs in screenshots
    await context.grantPermissions(['camera']);

    await page.goto('/auth/scan');
    await page.waitForLoadState('networkidle');

    // Allow time for camera initialization (camera won't work in test, but UI should render)
    await page.waitForTimeout(1000);

    await percySnapshot(page, 'QR Scanner Screen', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Manual Entry screen', async ({ page }) => {
    await page.goto('/auth/manual');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Manual Entry Screen', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Connecting screen', async ({ page }) => {
    await page.goto('/auth/connect');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Connecting Screen', {
      widths: PERCY_CONFIG.widths,
    });
  });
});

test.describe('Visual Regression - Main Application Screens', () => {
  /**
   * Note: These tests assume the app loads in a disconnected state
   * for consistent visual baselines. The screens show empty/default
   * states which is appropriate for baseline comparison.
   */

  test('Home/Dashboard - empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Dashboard - Empty State', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings page', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings Page', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Account', async ({ page }) => {
    await page.goto('/settings/account');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Account', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Appearance', async ({ page }) => {
    await page.goto('/settings/appearance');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Appearance', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Privacy', async ({ page }) => {
    await page.goto('/settings/privacy');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Privacy', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Notifications', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Notifications', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Features', async ({ page }) => {
    await page.goto('/settings/features');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Features', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - Server', async ({ page }) => {
    await page.goto('/settings/server');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Server', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - MCP', async ({ page }) => {
    await page.goto('/settings/mcp');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - MCP Servers', {
      widths: PERCY_CONFIG.widths,
    });
  });
});

test.describe('Visual Regression - Mobile Viewports', () => {
  /**
   * These tests specifically target mobile device viewports
   * to ensure proper responsive behavior on iOS and Android devices.
   */

  test('Dashboard - iPhone 12', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.iPhone12);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Dashboard - iPhone 12', {
      widths: [MOBILE_VIEWPORTS.iPhone12.width],
    });
  });

  test('Dashboard - Pixel 5', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.pixel5);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Dashboard - Pixel 5', {
      widths: [MOBILE_VIEWPORTS.pixel5.width],
    });
  });

  test('Login - iPhone SE (small screen)', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.iPhoneSE);
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Login - iPhone SE', {
      widths: [MOBILE_VIEWPORTS.iPhoneSE.width],
    });
  });

  test('Login - Galaxy S21', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.galaxyS21);
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Login - Galaxy S21', {
      widths: [MOBILE_VIEWPORTS.galaxyS21.width],
    });
  });

  test('Settings - iPhone 14 Pro', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.iPhone14Pro);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - iPhone 14 Pro', {
      widths: [MOBILE_VIEWPORTS.iPhone14Pro.width],
    });
  });

  test('Settings - Pixel 7', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORTS.pixel7);
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Pixel 7', {
      widths: [MOBILE_VIEWPORTS.pixel7.width],
    });
  });
});

test.describe('Visual Regression - Connection Status Indicators', () => {
  /**
   * Tests for connection status visual states
   */

  test('Connection indicator - disconnected state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The app starts in disconnected state
    // Capture the connection status card specifically
    const statusCard = page.locator('[data-testid="connection-status"]').first();

    // If no specific test ID, capture the whole dashboard
    await percySnapshot(page, 'Connection Status - Disconnected', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - connection indicator', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Settings page shows connection status in profile card
    await percySnapshot(page, 'Settings - Connection Indicator', {
      widths: PERCY_CONFIG.widths,
    });
  });
});

test.describe('Visual Regression - Theme Variations', () => {
  /**
   * Tests for dark/light theme consistency
   * Note: These assume the app respects system theme preferences
   */

  test('Dashboard - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Dashboard - Light Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Dashboard - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Dashboard - Dark Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Login - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Login - Light Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Login - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Login - Dark Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Light Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });

  test('Settings - dark theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Settings - Dark Theme', {
      widths: PERCY_CONFIG.widths,
    });
  });
});
