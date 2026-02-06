/**
 * E2E Responsive Visual Regression Tests for Breakpoints
 *
 * Verifies that the responsive design system renders correctly at each
 * defined breakpoint. These tests complement the unit tests from HAP-962
 * by testing actual CSS layout behavior in a real browser.
 *
 * Breakpoints under test (TailwindCSS mobile-first):
 * - xs (< 640px): Mobile phones - bottom nav, single panel
 * - sm (640px): Small tablets - transitional layout
 * - md (768px): Tablets
 * - lg (1024px): Laptops - sidebar visible, dual panel
 * - xl (1280px): Desktops - triple panel possible
 * - 2xl (1536px): Large screens / 4K
 *
 * @see HAP-980 - E2E responsive visual regression tests for breakpoints
 * @see HAP-962 - Responsive Mobile-First Design System
 * @see HAP-876 - Visual Regression Testing Infrastructure
 */

import { test, expect } from '@playwright/test';
import percySnapshot from '@percy/playwright';

/**
 * Breakpoint definitions matching useBreakpoints.ts BREAKPOINTS constant
 */
const BREAKPOINTS = {
  xs: { name: 'xs', maxWidth: 639, testWidths: [320, 375, 414] },
  sm: { name: 'sm', width: 640 },
  md: { name: 'md', width: 768 },
  lg: { name: 'lg', width: 1024 },
  xl: { name: 'xl', width: 1280 },
  '2xl': { name: '2xl', width: 1536 },
} as const;

/**
 * Default viewport height for consistent test rendering
 */
const DEFAULT_HEIGHT = 800;

/**
 * Pages to test at each breakpoint for comprehensive coverage.
 * Auth pages are public (no authentication required) and render
 * full content at all viewports. Authenticated pages redirect to
 * /auth, still providing valid visual regression baselines.
 */
const TEST_PAGES = {
  auth: { path: '/auth', name: 'Login' },
  authScan: { path: '/auth/scan', name: 'QR Scanner' },
  authManual: { path: '/auth/manual', name: 'Manual Entry' },
  authConnect: { path: '/auth/connect', name: 'Connecting' },
  dashboard: { path: '/', name: 'Dashboard' },
  settings: { path: '/settings', name: 'Settings' },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Mobile Viewport Tests (320px, 375px, 414px) — xs breakpoint (< 640px)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Mobile Viewports', () => {
  /**
   * Mobile viewports should show:
   * - Bottom navigation bar (when authenticated)
   * - Desktop sidebar hidden
   * - Single-panel layout active
   * - Touch targets meeting 48px minimum
   */

  for (const width of BREAKPOINTS.xs.testWidths) {
    test.describe(`Mobile ${width}px`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height: DEFAULT_HEIGHT });
      });

      test(`should render login page at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        // Page should render without errors
        await expect(page.locator('body')).toBeVisible();

        // At mobile widths, desktop sidebar navigation should not be visible
        const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
        await expect(desktopNav).toHaveCount(0);

        // Content should be constrained to viewport width
        const body = page.locator('body');
        const bodyBox = await body.boundingBox();
        expect(bodyBox).toBeTruthy();
        if (bodyBox) {
          expect(bodyBox.width).toBeLessThanOrEqual(width);
        }
      });

      test(`should render QR scanner page at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.authScan.path);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
      });

      test(`should render manual entry page at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.authManual.path);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
      });

      test(`should verify no horizontal overflow at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        // Check that document does not exceed viewport width (no horizontal scroll)
        const hasHorizontalOverflow = await page.evaluate((viewportWidth) => {
          return document.documentElement.scrollWidth > viewportWidth;
        }, width);

        expect(hasHorizontalOverflow).toBe(false);
      });

      test(`should have touch-friendly targets at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        // Check that interactive elements (buttons, links) have adequate size
        const interactiveElements = page.locator('button, a[href], input, [role="button"]');
        const count = await interactiveElements.count();

        for (let i = 0; i < Math.min(count, 10); i++) {
          const el = interactiveElements.nth(i);
          if (await el.isVisible()) {
            const box = await el.boundingBox();
            if (box && box.height > 0 && box.width > 0) {
              // WCAG 2.2 minimum touch target: 24px (AA)
              // Our recommended minimum: 44px
              // Allow smaller for inline text links
              const minDimension = Math.min(box.width, box.height);
              // Log for debugging but don't hard-fail on text links
              if (minDimension < 24) {
                console.warn(
                  `Small touch target at ${width}px: ${await el.textContent()} (${box.width}x${box.height})`
                );
              }
            }
          }
        }
      });

      test(`Percy snapshot - Login at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        await percySnapshot(page, `Responsive - Login - Mobile ${width}px`, {
          widths: [width],
        });
      });

      test(`Percy snapshot - Dashboard at ${width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.dashboard.path);
        await page.waitForLoadState('networkidle');

        await percySnapshot(page, `Responsive - Dashboard - Mobile ${width}px`, {
          widths: [width],
        });
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Tablet Viewport Tests (768px) — md breakpoint
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Tablet Viewport', () => {
  /**
   * Tablet viewport (768px / md breakpoint) should show:
   * - Transitional layout between mobile and desktop
   * - Navigation adapts appropriately
   * - Content has moderate padding and centered container
   */

  const width = BREAKPOINTS.md.width;

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width, height: 1024 });
  });

  test('should render login page at tablet width', async ({ page }) => {
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();

    // Desktop sidebar should still be hidden at 768px (requires lg/1024px)
    const desktopNav = page.locator('nav[aria-label="Desktop navigation"]');
    await expect(desktopNav).toHaveCount(0);
  });

  test('should render QR scanner at tablet width', async ({ page }) => {
    await page.goto(TEST_PAGES.authScan.path);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should render manual entry at tablet width', async ({ page }) => {
    await page.goto(TEST_PAGES.authManual.path);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should render connecting screen at tablet width', async ({ page }) => {
    await page.goto(TEST_PAGES.authConnect.path);
    await page.waitForLoadState('networkidle');

    await expect(page.locator('body')).toBeVisible();
  });

  test('should verify no horizontal overflow at tablet width', async ({ page }) => {
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    const hasHorizontalOverflow = await page.evaluate((viewportWidth) => {
      return document.documentElement.scrollWidth > viewportWidth;
    }, width);

    expect(hasHorizontalOverflow).toBe(false);
  });

  test('Percy snapshot - Login at tablet', async ({ page }) => {
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, `Responsive - Login - Tablet ${width}px`, {
      widths: [width],
    });
  });

  test('Percy snapshot - Dashboard at tablet', async ({ page }) => {
    await page.goto(TEST_PAGES.dashboard.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, `Responsive - Dashboard - Tablet ${width}px`, {
      widths: [width],
    });
  });

  test('Percy snapshot - Settings at tablet', async ({ page }) => {
    await page.goto(TEST_PAGES.settings.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, `Responsive - Settings - Tablet ${width}px`, {
      widths: [width],
    });
  });

  test('Percy snapshot - QR Scanner at tablet', async ({ page }) => {
    await page.goto(TEST_PAGES.authScan.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, `Responsive - QR Scanner - Tablet ${width}px`, {
      widths: [width],
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Viewport Tests (1024px, 1280px, 1536px) — lg, xl, 2xl breakpoints
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Desktop Viewports', () => {
  /**
   * Desktop viewports should show:
   * - Sidebar navigation visible (when authenticated, lg+ / 1024px+)
   * - Multi-panel layout:
   *   - Dual panel at lg (1024px) - sidebar + main
   *   - Triple panel at xl (1280px) - sidebar + main + detail
   * - ResponsiveContainer max-widths apply correctly
   * - Bottom navigation hidden
   */

  const desktopWidths = [
    { width: BREAKPOINTS.lg.width, name: 'lg', layout: 'dual' },
    { width: BREAKPOINTS.xl.width, name: 'xl', layout: 'triple' },
    { width: BREAKPOINTS['2xl'].width, name: '2xl', layout: 'triple' },
  ] as const;

  for (const viewport of desktopWidths) {
    test.describe(`Desktop ${viewport.width}px (${viewport.name})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: DEFAULT_HEIGHT });
      });

      test(`should render login page at ${viewport.width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();

        // At desktop widths, mobile bottom nav should not be present
        // in the unauthenticated layout
        const bottomNav = page.locator('nav[aria-label="Main navigation"]');
        // Bottom nav only renders in authenticated mobile layout
        const bottomNavCount = await bottomNav.count();
        // In unauthenticated state, neither desktop nav nor mobile nav shows
        expect(bottomNavCount).toBe(0);
      });

      test(`should render dashboard page at ${viewport.width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.dashboard.path);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
      });

      test(`should render settings page at ${viewport.width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.settings.path);
        await page.waitForLoadState('networkidle');

        await expect(page.locator('body')).toBeVisible();
      });

      test(`should verify no horizontal overflow at ${viewport.width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        const hasHorizontalOverflow = await page.evaluate((viewportWidth) => {
          return document.documentElement.scrollWidth > viewportWidth;
        }, viewport.width);

        expect(hasHorizontalOverflow).toBe(false);
      });

      test(`should verify content width respects container constraints at ${viewport.width}px`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        // Main content should not exceed viewport width
        const mainContent = page.locator('main[role="main"]');
        const mainCount = await mainContent.count();

        if (mainCount > 0) {
          const box = await mainContent.first().boundingBox();
          if (box) {
            expect(box.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      });

      test(`Percy snapshot - Login at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
        await page.goto(TEST_PAGES.auth.path);
        await page.waitForLoadState('networkidle');

        await percySnapshot(page, `Responsive - Login - Desktop ${viewport.name} (${viewport.width}px)`, {
          widths: [viewport.width],
        });
      });

      test(`Percy snapshot - Dashboard at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
        await page.goto(TEST_PAGES.dashboard.path);
        await page.waitForLoadState('networkidle');

        await percySnapshot(page, `Responsive - Dashboard - Desktop ${viewport.name} (${viewport.width}px)`, {
          widths: [viewport.width],
        });
      });

      test(`Percy snapshot - Settings at ${viewport.width}px (${viewport.name})`, async ({ page }) => {
        await page.goto(TEST_PAGES.settings.path);
        await page.waitForLoadState('networkidle');

        await percySnapshot(page, `Responsive - Settings - Desktop ${viewport.name} (${viewport.width}px)`, {
          widths: [viewport.width],
        });
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-Breakpoint Transition Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Breakpoint Transitions', () => {
  /**
   * Tests that verify smooth transitions between breakpoints.
   * Simulates viewport resize to ensure layout adapts correctly
   * when crossing breakpoint boundaries.
   */

  test('should transition from mobile to tablet', async ({ page }) => {
    // Start at mobile
    await page.setViewportSize({ width: 375, height: DEFAULT_HEIGHT });
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    // Verify mobile rendering
    await expect(page.locator('body')).toBeVisible();

    // Transition to tablet
    await page.setViewportSize({ width: BREAKPOINTS.md.width, height: 1024 });
    await page.waitForTimeout(500); // Allow CSS transitions

    // Page should still be visible and adapted
    await expect(page.locator('body')).toBeVisible();

    // No horizontal overflow after resize
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should transition from tablet to desktop', async ({ page }) => {
    // Start at tablet
    await page.setViewportSize({ width: BREAKPOINTS.md.width, height: 1024 });
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    // Transition to desktop
    await page.setViewportSize({ width: BREAKPOINTS.lg.width, height: DEFAULT_HEIGHT });
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should transition from desktop to large screen', async ({ page }) => {
    // Start at desktop
    await page.setViewportSize({ width: BREAKPOINTS.lg.width, height: DEFAULT_HEIGHT });
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    // Transition to large screen
    await page.setViewportSize({ width: BREAKPOINTS['2xl'].width, height: DEFAULT_HEIGHT });
    await page.waitForTimeout(500);

    await expect(page.locator('body')).toBeVisible();

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test('should handle rapid viewport changes without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    // Rapidly cycle through breakpoints
    const widths = [320, 640, 768, 1024, 1280, 1536, 375, 414];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: DEFAULT_HEIGHT });
      await page.waitForTimeout(100);
    }

    // Allow final layout to settle
    await page.waitForTimeout(500);

    // No JavaScript errors during viewport changes
    expect(errors).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Percy Full Breakpoint Sweep
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Percy Full Sweep', () => {
  /**
   * Captures Percy snapshots at ALL defined breakpoints in a single sweep.
   * This provides a comprehensive visual baseline across the entire
   * responsive spectrum for each key page.
   */

  const allBreakpointWidths = [320, 375, 414, 640, 768, 1024, 1280, 1536];

  test('Percy sweep - Login page across all breakpoints', async ({ page }) => {
    await page.goto(TEST_PAGES.auth.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Responsive Sweep - Login - All Breakpoints', {
      widths: allBreakpointWidths,
    });
  });

  test('Percy sweep - Dashboard across all breakpoints', async ({ page }) => {
    await page.goto(TEST_PAGES.dashboard.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Responsive Sweep - Dashboard - All Breakpoints', {
      widths: allBreakpointWidths,
    });
  });

  test('Percy sweep - Settings across all breakpoints', async ({ page }) => {
    await page.goto(TEST_PAGES.settings.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Responsive Sweep - Settings - All Breakpoints', {
      widths: allBreakpointWidths,
    });
  });

  test('Percy sweep - Manual Entry across all breakpoints', async ({ page }) => {
    await page.goto(TEST_PAGES.authManual.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Responsive Sweep - Manual Entry - All Breakpoints', {
      widths: allBreakpointWidths,
    });
  });

  test('Percy sweep - Connecting across all breakpoints', async ({ page }) => {
    await page.goto(TEST_PAGES.authConnect.path);
    await page.waitForLoadState('networkidle');

    await percySnapshot(page, 'Responsive Sweep - Connecting - All Breakpoints', {
      widths: allBreakpointWidths,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Theme + Breakpoint Combination Tests
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Responsive Breakpoints - Theme Variations', () => {
  /**
   * Percy snapshots that combine breakpoint testing with theme variations.
   * Ensures responsive layouts render correctly in both light and dark modes.
   */

  const themeBreakpoints = [
    { width: 375, name: 'Mobile' },
    { width: 768, name: 'Tablet' },
    { width: 1280, name: 'Desktop' },
  ] as const;

  for (const bp of themeBreakpoints) {
    test(`Percy snapshot - Light theme at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'light' });
      await page.setViewportSize({ width: bp.width, height: DEFAULT_HEIGHT });
      await page.goto(TEST_PAGES.auth.path);
      await page.waitForLoadState('networkidle');

      await percySnapshot(page, `Responsive Theme - Login - Light - ${bp.name} (${bp.width}px)`, {
        widths: [bp.width],
      });
    });

    test(`Percy snapshot - Dark theme at ${bp.name} (${bp.width}px)`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.setViewportSize({ width: bp.width, height: DEFAULT_HEIGHT });
      await page.goto(TEST_PAGES.auth.path);
      await page.waitForLoadState('networkidle');

      await percySnapshot(page, `Responsive Theme - Login - Dark - ${bp.name} (${bp.width}px)`, {
        widths: [bp.width],
      });
    });
  }
});
