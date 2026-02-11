/**
 * Playwright E2E Test Configuration for Happy Admin Dashboard
 *
 * This configuration sets up end-to-end testing with:
 * - Visual regression testing with screenshot comparisons
 * - Multi-browser testing (Chromium, Firefox, WebKit)
 * - Automatic dev server startup for CI
 * - Authentication state persistence
 *
 * @see https://playwright.dev/docs/test-configuration
 * @see HAP-719 - Phase 4.1: Implement Playwright E2E Testing Suite
 */
import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
    /**
     * Directory containing test files
     */
    testDir: './e2e',

    /**
     * Run tests in files in parallel
     */
    fullyParallel: true,

    /**
     * Fail the build on CI if you accidentally left test.only in the source code.
     */
    forbidOnly: !!process.env.CI,

    /**
     * Retry on CI only
     */
    retries: process.env.CI ? 2 : 0,

    /**
     * Opt out of parallel tests on CI for stability
     */
    workers: process.env.CI ? 1 : undefined,

    /**
     * Reporter configuration
     * - 'html': Generate HTML report for local development
     * - 'github': GitHub Actions annotations in CI
     * - 'list': Console output for test progress
     */
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }], ['list']]
        : [['html', { open: 'on-failure' }], ['list']],

    /**
     * Global test timeout (30 seconds)
     */
    timeout: 30000,

    /**
     * Assertion timeout (5 seconds)
     */
    expect: {
        timeout: 5000,
        /**
         * Visual regression tolerance configuration
         * Allow small differences due to font rendering, antialiasing, etc.
         */
        toHaveScreenshot: {
            maxDiffPixels: 100,
            maxDiffPixelRatio: 0.01,
        },
    },

    /**
     * Shared settings for all projects below
     */
    use: {
        /**
         * Base URL to use in actions like `await page.goto('/')`.
         */
        baseURL: 'http://localhost:8787',

        /**
         * Collect trace when retrying the failed test
         */
        trace: 'on-first-retry',

        /**
         * Capture screenshot on failure
         */
        screenshot: 'only-on-failure',

        /**
         * Record video only when retrying a test for first time
         */
        video: 'on-first-retry',

        /**
         * Browser viewport size
         */
        viewport: { width: 1280, height: 720 },
    },

    /**
     * Configure projects for major browsers
     */
    projects: [
        /**
         * Authentication setup project
         * Runs before other tests to set up authenticated state
         */
        {
            name: 'setup',
            testMatch: /.*\.setup\.ts/,
        },

        /**
         * Desktop Chrome - Primary testing browser
         */
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
            },
            dependencies: ['setup'],
        },

        /**
         * Desktop Firefox - Secondary browser for cross-browser testing
         */
        {
            name: 'firefox',
            use: {
                ...devices['Desktop Firefox'],
            },
            dependencies: ['setup'],
        },

        /**
         * Desktop Safari - For WebKit compatibility
         */
        {
            name: 'webkit',
            use: {
                ...devices['Desktop Safari'],
            },
            dependencies: ['setup'],
        },

        /**
         * Mobile Chrome - For responsive design testing
         */
        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
            },
            dependencies: ['setup'],
        },

        /**
         * Mobile Safari - For iOS responsive testing
         */
        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 12'],
            },
            dependencies: ['setup'],
        },
    ],

    /**
     * Run your local dev server before starting the tests
     */
    webServer: {
        command: 'yarn dev',
        url: 'http://localhost:8787',
        reuseExistingServer: !process.env.CI,
        timeout: 120000, // 2 minutes to start server
    },

    /**
     * Directory for test artifacts (screenshots, videos, traces)
     */
    outputDir: './e2e-results',

    /**
     * Snapshot directory for visual regression tests
     */
    snapshotDir: './e2e/__snapshots__',

    /**
     * Global setup script (optional, for database seeding etc.)
     */
    // globalSetup: require.resolve('./e2e/global-setup.ts'),
});
