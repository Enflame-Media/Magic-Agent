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

    // Thresholds (advisory only - no break threshold)
    thresholds: {
        high: 80, // Green: mutation score >= 80%
        low: 60, // Yellow: mutation score >= 60%
        break: null, // Don't fail build based on score
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
