# Mutation Testing with Stryker Mutator

**Date**: 2026-01-25
**Status**: Approved
**Scope**: Pilot implementation in `apps/server/workers`

## Overview

Incorporate mutation testing using Stryker Mutator to verify the validity of tests. Mutation testing introduces small changes (mutants) to production code and verifies that tests detect these changes. Surviving mutants indicate gaps in test coverage.

## Design Decisions

### Scope
- **Pilot Project**: `apps/server/workers` (1851 tests, ~95% coverage)
- **Expansion**: Other projects after pilot validation

### Execution Strategy
- **Primary**: Local development focus
- **Secondary**: Basic CI validation (advisory, non-blocking)

### Reporting
- **Mode**: Advisory only
- **Outputs**: HTML and JSON reports
- **Thresholds**: None initially (establish baseline first)

## Implementation

### 1. Package Installation

Install in `apps/server/workers`:

```bash
yarn add -D @stryker-mutator/core @stryker-mutator/vitest-runner @stryker-mutator/typescript-checker
```

### 2. Configuration File

Create `apps/server/workers/stryker.config.mjs`:

```javascript
/** @type {import('@stryker-mutator/api/core').StrykerOptions} */
export default {
    // Package manager
    packageManager: 'yarn',

    // Files to mutate (production code only)
    mutate: [
        'src/**/*.ts',
        '!src/**/*.spec.ts',
        '!src/**/*.test.ts',
        '!src/__tests__/**',
        '!src/db/schema.ts',
        '!src/db/seed.ts',
        '!src/db/comparison-tool.ts',
        '!src/lib/privacy-kit-shim.ts',
        '!src/routes/test/**',
        '!src/durable-objects/index.ts',
    ],

    // Test runner configuration
    testRunner: 'vitest',
    vitest: {
        configFile: 'vitest.config.ts',
    },

    // TypeScript validation
    checkers: ['typescript'],
    tsconfigFile: 'tsconfig.json',

    // Coverage analysis
    coverageAnalysis: 'perTest',

    // Reporters
    reporters: ['clear-text', 'progress', 'html', 'json'],
    htmlReporter: {
        fileName: 'reports/mutation/html/index.html',
    },
    jsonReporter: {
        fileName: 'reports/mutation/mutation.json',
    },

    // Performance
    concurrency: 4,
    timeoutMS: 10000,
    timeoutFactor: 2.5,

    // Incremental mode
    incremental: true,
    incrementalFile: 'reports/mutation/stryker-incremental.json',

    // Thresholds (advisory only)
    thresholds: {
        high: 80,
        low: 60,
        break: null,
    },

    // Cleanup
    tempDirName: '.stryker-tmp',
    cleanTempDir: true,
    ignoreStatic: true,
};
```

### 3. NPM Scripts

Add to `apps/server/workers/package.json`:

```json
{
    "scripts": {
        "mutate": "stryker run",
        "mutate:incremental": "stryker run --incremental",
        "mutate:dry-run": "stryker run --dryRunOnly",
        "mutate:report": "open reports/mutation/html/index.html"
    }
}
```

### 4. Gitignore Updates

Add to `apps/server/workers/.gitignore`:

```
# Stryker mutation testing
.stryker-tmp/
reports/mutation/
```

### 5. CI Workflow

Create `.github/workflows/mutation-testing.yml`:

```yaml
name: Mutation Testing

on:
    pull_request:
        paths:
            - 'apps/server/workers/src/**'
    workflow_dispatch:

concurrency:
    group: mutation-${{ github.ref }}
    cancel-in-progress: true

jobs:
    mutation-test:
        name: Mutation Testing (Workers)
        runs-on: ubuntu-latest
        timeout-minutes: 60
        defaults:
            run:
                working-directory: apps/server/workers

        steps:
            - uses: actions/checkout@v4

            - name: Setup Node.js
              uses: actions/setup-node@v4
              with:
                  node-version: '20'
                  cache: 'yarn'

            - name: Install dependencies
              run: yarn install --frozen-lockfile
              working-directory: .

            - name: Restore Stryker cache
              uses: actions/cache@v4
              with:
                  path: apps/server/workers/reports/mutation/stryker-incremental.json
                  key: stryker-${{ runner.os }}-${{ hashFiles('apps/server/workers/src/**/*.ts') }}
                  restore-keys: |
                      stryker-${{ runner.os }}-

            - name: Run mutation tests
              run: yarn mutate:incremental

            - name: Upload mutation report
              uses: actions/upload-artifact@v4
              if: always()
              with:
                  name: mutation-report
                  path: apps/server/workers/reports/mutation/html/
                  retention-days: 14
```

### 6. Documentation Updates

Add to `apps/server/workers/CLAUDE.md`:

```markdown
## Mutation Testing

This project uses Stryker Mutator for mutation testing to verify test quality.

### Commands

| Command | Purpose |
|---------|---------|
| `yarn mutate` | Full mutation test run |
| `yarn mutate:incremental` | Fast incremental run (recommended) |
| `yarn mutate:dry-run` | Verify setup without mutations |
| `yarn mutate:report` | Open HTML report |

### Reports

- HTML Report: `reports/mutation/html/index.html`
- JSON Report: `reports/mutation/mutation.json`

### Interpreting Results

- **Killed**: Test detected the mutation (good)
- **Survived**: Test missed the mutation (needs improvement)
- **No Coverage**: No test covers this code
- **Timeout**: Mutation caused infinite loop
- **Compile Error**: Mutation created invalid TypeScript

### Best Practices

1. Run `yarn mutate:incremental` before major commits
2. Focus on surviving mutants in critical business logic
3. Don't aim for 100% - some mutants are equivalent or low-value
4. Review HTML report during code review
```

## Output Structure

```
apps/server/workers/
├── stryker.config.mjs           # Stryker configuration
├── reports/
│   └── mutation/
│       ├── html/                # Interactive HTML report
│       │   └── index.html
│       ├── mutation.json        # Machine-readable results
│       └── stryker-incremental.json  # Incremental cache
└── .stryker-tmp/                # Temporary sandbox (gitignored)
```

## Follow-up Items

Create Linear issues for:

1. **Expand mutation testing to apps/cli** - After baseline established
2. **Establish mutation score thresholds** - Once baseline data collected
3. **Add mutation coverage to PR template** - Review checkbox
4. **Document mutation testing best practices** - Cross-project guide

## Expansion Priority

| Priority | Project | Rationale |
|----------|---------|-----------|
| 1 | `apps/cli` | Core business logic |
| 2 | `@happy/protocol` | Shared schemas |
| 3 | `@happy/errors` | Shared utilities |
| 4 | `apps/admin/api` | API layer |
| 5 | `apps/web/react` | UI testing |
