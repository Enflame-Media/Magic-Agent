/**
 * Stryker Mutator Configuration
 *
 * Mutation testing configuration for happy-server-workers.
 * Validates test quality by introducing mutations and verifying tests catch them.
 *
 * @see https://stryker-mutator.io/docs/stryker-js/configuration
 * @type {import('@stryker-mutator/api/core').StrykerOptions}
 */
export default {
    // Package manager (matches monorepo)
    packageManager: 'yarn',

    // Files to mutate (production code only)
    // Exclusions match vitest.config.ts coverage.exclude
    mutate: [
        'src/**/*.ts',
        // Exclude test files
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        // Test utilities - not production code
        '!src/__tests__/**',
        // Auth module uses Ed25519 crypto not available in Node.js test env
        '!src/lib/auth.ts',
        // Privacy-kit shim and test route - development/debugging only
        '!src/lib/privacy-kit-shim.ts',
        '!src/routes/test/**',
        // Re-export files contain no logic
        '!src/durable-objects/index.ts',
        // DB schema is mostly type definitions with no runtime logic
        '!src/db/schema.ts',
        // DB seed and comparison tool are dev utilities
        '!src/db/seed.ts',
        '!src/db/comparison-tool.ts',
    ],

    // Test runner configuration
    testRunner: 'vitest',
    vitest: {
        configFile: 'vitest.config.ts',
    },

    // TypeScript validation - filters out type-invalid mutants
    checkers: ['typescript'],
    tsconfigFile: 'tsconfig.json',

    // Coverage analysis - maps mutants to specific tests
    coverageAnalysis: 'perTest',

    // Output reporters
    reporters: ['clear-text', 'progress', 'html', 'json'],
    htmlReporter: {
        fileName: 'reports/mutation/html/index.html',
    },
    jsonReporter: {
        fileName: 'reports/mutation/mutation.json',
    },

    // Performance settings
    concurrency: 4,
    timeoutMS: 10000,
    timeoutFactor: 2.5,
    dryRunTimeoutMinutes: 10,

    // Incremental mode - speeds up subsequent runs
    incremental: true,
    incrementalFile: 'reports/mutation/stryker-incremental.json',

    // Thresholds - Phase 2: Soft enforcement (HAP-905)
    // Baseline period (2026-01-25 to 2026-02-19) complete.
    // Workers has 95% line coverage; break threshold set conservatively.
    // Phase 3 (hard enforcement) will raise break to 70 after stabilization.
    thresholds: {
        high: 80, // Green: mutation score >= 80%
        low: 60, // Yellow: mutation score >= 60%
        break: 60, // Fail build if mutation score drops below 60%
    },

    // Optimization
    ignoreStatic: true,
    maxTestRunnerReuse: 50,

    // Cleanup
    tempDirName: '.stryker-tmp',
    cleanTempDir: true,

    // Files to ignore when copying to sandbox
    ignorePatterns: [
        'dist',
        'coverage',
        'reports',
        '.wrangler',
        'load-tests',
        '*.log',
    ],
};
