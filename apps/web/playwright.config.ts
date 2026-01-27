/**
 * Playwright E2E test configuration for Happy Vue.js web application
 *
 * Configures browser testing across Chrome, Firefox, and Safari.
 * Supports both local development and CI environments.
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { defineConfig, devices } from '@playwright/test';

/**
 * Base URL for the application under test.
 * Uses environment variable or defaults to local development server.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  /**
   * Directory containing E2E test files
   */
  testDir: './e2e',

  /**
   * Maximum time one test can run for
   */
  timeout: 30_000,

  /**
   * Run tests in files in parallel
   */
  fullyParallel: true,

  /**
   * Fail the build on CI if you accidentally left test.only in the source code
   */
  forbidOnly: !!process.env.CI,

  /**
   * Retry on CI only - helps with flaky tests in CI environments
   */
  retries: process.env.CI ? 2 : 0,

  /**
   * Opt out of parallel tests on CI - more stable but slower
   */
  workers: process.env.CI ? 1 : undefined,

  /**
   * Reporter configuration
   * - html: Interactive HTML report
   * - list: Console output during test run
   * - json: Machine-readable output for CI integration
   */
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  /**
   * Shared settings for all projects
   */
  use: {
    /* Base URL for page.goto() calls */
    baseURL,

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',
  },

  /**
   * Configure projects for major browsers
   * Tests run against desktop and mobile viewports
   */
  projects: [
    /* Desktop browsers */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Mobile viewports */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Tablet viewport */
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  /**
   * Local dev server configuration
   * Starts Vite dev server before running tests
   */
  webServer: {
    command: 'yarn dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  /**
   * Output directory for test artifacts
   */
  outputDir: 'test-results',
});
