# Mutation Testing Best Practices

This guide covers mutation testing for the Happy project using [Stryker Mutator](https://stryker-mutator.io/). It provides best practices for interpreting results, fixing surviving mutants, and understanding when mutation testing is valuable.

> **See also**: Per-project CLAUDE.md files for project-specific commands and configuration.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Interpreting Results](#interpreting-results)
- [Common Mutant Types](#common-mutant-types)
- [When to Fix vs. Ignore](#when-to-fix-vs-ignore)
- [Equivalent Mutants](#equivalent-mutants)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

### What is Mutation Testing?

Mutation testing validates test quality by introducing small changes (mutations) to production code and verifying that tests detect these changes. Each mutation creates a "mutant" - a version of the code with a single change.

**The premise**: If your tests are effective, they should fail when the code is modified. A mutant that survives (tests still pass) indicates a potential gap in test coverage.

### Why We Use It

| Benefit | Description |
|---------|-------------|
| **Test Quality** | Reveals tests that pass without actually verifying behavior |
| **Coverage Gaps** | Finds code paths that aren't properly tested |
| **Edge Cases** | Exposes missing boundary condition tests |
| **Confidence** | Provides deeper confidence than line/branch coverage |

### Mutation Testing vs. Code Coverage

| Metric | What It Measures | Limitation |
|--------|------------------|------------|
| **Line Coverage** | Code executed during tests | Doesn't verify assertions |
| **Branch Coverage** | Decision paths taken | Doesn't verify correct behavior |
| **Mutation Score** | Tests that detect code changes | Computationally expensive |

A file with 100% code coverage can still have a low mutation score if tests execute code without verifying its behavior.

---

## Quick Start

### Currently Enabled Projects

| Project | Directory | Configuration |
|---------|-----------|---------------|
| **happy-server-workers** | `apps/server/workers/` | `stryker.config.mjs` |

### Commands

Navigate to the project directory and run:

```bash
# Full mutation test run with HTML report
yarn mutate

# Fast incremental run (recommended for local development)
yarn mutate:incremental

# Verify setup without running mutations
yarn mutate:dry-run

# Open HTML report in browser
yarn mutate:report
```

### Report Locations

After running mutation tests:

- **HTML Report**: `reports/mutation/html/index.html` - Interactive visual report
- **JSON Report**: `reports/mutation/mutation.json` - Machine-readable results
- **Incremental Cache**: `reports/mutation/stryker-incremental.json` - Speeds up subsequent runs

---

## Interpreting Results

### Mutant Statuses

| Status | Icon | Meaning | Action |
|--------|------|---------|--------|
| **Killed** | :heavy_check_mark: | Test detected the mutation | Good - test is effective |
| **Survived** | :x: | Test missed the mutation | Review - may need improvement |
| **No Coverage** | :warning: | No test covers this code | Consider adding tests |
| **Timeout** | :hourglass: | Mutation caused infinite loop | Good - test detected infinite behavior |
| **Compile Error** | :stop_sign: | Mutation created invalid TypeScript | Good - type system caught it |
| **Runtime Error** | :boom: | Mutation caused runtime error | Good - code is validated |
| **Ignored** | :dash: | Mutation excluded by configuration | N/A |

### Understanding the Mutation Score

```
Mutation Score = (Killed + Timeout + Error) / (Total - Ignored - No Coverage)
```

**Target Thresholds** (advisory, not enforced):

| Score | Rating | Interpretation |
|-------|--------|----------------|
| >= 80% | High | Excellent test quality |
| 60-79% | Medium | Good, room for improvement |
| < 60% | Low | Consider adding more tests |

### Reading the HTML Report

The interactive HTML report shows:

1. **Summary**: Overall mutation score and counts by status
2. **Files**: Expandable tree view of mutated files
3. **Mutants**: Clickable mutants showing:
   - Original code
   - Mutated code
   - Which tests were run
   - Why it survived (if applicable)

---

## Common Mutant Types

Stryker applies various mutation operators. Understanding them helps write better tests.

### Conditional Boundary Mutations

Changes relational operators at boundaries.

```typescript
// Original
if (count > 0) { ... }

// Mutant: Changes > to >=
if (count >= 0) { ... }
```

**Fix**: Test boundary values (0, 1, -1).

### Boolean Substitutions

Flips boolean values and operators.

```typescript
// Original
if (isEnabled && hasPermission) { ... }

// Mutant: Changes && to ||
if (isEnabled || hasPermission) { ... }
```

**Fix**: Test all boolean combinations.

### Arithmetic Mutations

Replaces arithmetic operators.

```typescript
// Original
const total = price * quantity;

// Mutant: Changes * to /
const total = price / quantity;
```

**Fix**: Verify calculations with specific values.

### Block Statement Removal

Removes entire code blocks.

```typescript
// Original
if (error) {
    logError(error);
}

// Mutant: Removes the block
if (error) {
    // (removed)
}
```

**Fix**: Assert side effects occur.

### String Mutations

Replaces string literals.

```typescript
// Original
throw new Error('Invalid input');

// Mutant: Changes string
throw new Error('Stryker was here!');
```

**Fix**: Assert error messages when meaningful.

### Array/Object Mutations

Modifies array operations.

```typescript
// Original
const first = items[0];

// Mutant: Changes index
const first = items[1];
```

**Fix**: Test with arrays of various lengths.

---

## When to Fix vs. Ignore

Not every surviving mutant requires a new test. Use this decision framework:

### Fix When

| Situation | Priority | Example |
|-----------|----------|---------|
| Business logic mutation survives | High | Price calculation changed |
| Security-related code survives | High | Auth check flipped |
| Data validation survives | High | Input sanitization removed |
| Error handling survives | Medium | Error path not tested |
| State management survives | Medium | State transition changed |

### Acceptable to Ignore When

| Situation | Reason | Example |
|-----------|--------|---------|
| **Logging mutations** | Side-effect only, not business critical | `console.log` message changed |
| **Equivalent mutants** | Different code, same behavior | See [Equivalent Mutants](#equivalent-mutants) |
| **Feature flag code** | Configuration, not logic | `if (featureEnabled)` flipped |
| **Dead code** | Should be removed anyway | Unreachable branch |
| **Performance optimizations** | Correctness unchanged | Cache check removed |
| **Error messages** | Not functionally significant | String literal in error |

### Decision Matrix

| Mutant Type | Business Logic | Infrastructure Code | Test Utilities |
|-------------|---------------|---------------------|----------------|
| Boundary mutation | Fix | Review | Ignore |
| Boolean flip | Fix | Fix | Ignore |
| Arithmetic change | Fix | Review | Ignore |
| String change | Review | Ignore | Ignore |
| Block removal | Fix | Fix | Review |

---

## Equivalent Mutants

Equivalent mutants are mutations that produce the same behavior as the original code. They cannot be killed because there's no observable difference.

### Common Patterns

#### Post-increment vs. Pre-increment

```typescript
// Original
return arr[i++];

// Mutant (equivalent in this context)
return arr[i]; i++;
```

Both return the same value and increment `i`.

#### Boundary Equivalence

```typescript
// Original
return items.length > 0;

// Mutant (equivalent)
return items.length >= 1;

// Also equivalent
return items.length !== 0;
```

All three test "array is not empty."

#### Boolean Short-circuit

```typescript
// Original
if (obj && obj.prop) { ... }

// Mutant (may be equivalent)
if (obj && obj.prop !== undefined) { ... }
```

If `obj.prop` is always truthy/falsy, these behave identically.

#### String Concatenation

```typescript
// Original
const msg = prefix + ' ' + suffix;

// Mutant (equivalent if only logged)
const msg = prefix + '' + suffix;
```

If the result is only used for logging, the difference may not matter.

### How to Handle Equivalent Mutants

1. **Verify equivalence**: Ensure the mutant truly behaves identically
2. **Document if needed**: Comment explaining why the test isn't needed
3. **Consider refactoring**: Clearer code may eliminate equivalent mutants
4. **Accept in score**: Some equivalent mutants are unavoidable

### Stryker Exclusion Options

For persistent equivalent mutants, you can exclude them:

```javascript
// In stryker.config.mjs
export default {
    // Exclude specific mutation operators
    excludedMutations: ['StringLiteral'],

    // Exclude files or patterns
    mutate: [
        'src/**/*.ts',
        '!src/**/logging.ts',
    ],
};
```

---

## Best Practices

### 1. Run Incrementally During Development

```bash
# After making changes, run incremental mutation testing
yarn mutate:incremental
```

The incremental mode only tests mutants in changed files, making it practical for regular use.

### 2. Focus on Critical Code Paths

Prioritize mutation testing for:
- Authentication and authorization
- Payment processing
- Data validation
- Security-sensitive operations
- Core business logic

### 3. Review Surviving Mutants Before Commits

Include mutation score review in your PR checklist:
- [ ] Reviewed surviving mutants in changed files
- [ ] Added tests for meaningful surviving mutants
- [ ] Documented any intentionally ignored mutants

### 4. Don't Chase 100% Mutation Score

A 100% mutation score is not the goal:
- Some mutants are equivalent (impossible to kill)
- Some code is low-risk (logging, formatting)
- Diminishing returns after 80-85%

### 5. Use CI Integration

Upload mutation reports as CI artifacts:
- Review reports during code review
- Track mutation score trends over time
- Identify regression in test quality

### 6. Interpret Score in Context

Consider what each surviving mutant means:

| File Type | Surviving Mutant Concern |
|-----------|-------------------------|
| Route handlers | Likely needs attention |
| Database queries | High concern - verify data integrity |
| Utility functions | Medium concern - depends on usage |
| Type definitions | Low concern - mostly types |
| Configuration | Low concern - often static |

### 7. Write Mutation-Resistant Tests

Tests that are more likely to catch mutants:

```typescript
// Weak: Only checks truthy
expect(result).toBeTruthy();

// Strong: Checks exact value
expect(result).toBe(42);

// Weak: Only checks existence
expect(response.body).toBeDefined();

// Strong: Checks structure and values
expect(response.body).toEqual({
    success: true,
    data: { id: '123', name: 'Test' }
});
```

---

## Troubleshooting

### Mutation Tests Are Slow

**Solutions**:
- Use `yarn mutate:incremental` for faster subsequent runs
- Reduce concurrency if memory-constrained
- Exclude slow test files from mutation runs
- Use `coverageAnalysis: 'perTest'` for targeted test execution

### Too Many Surviving Mutants

**Approach**:
1. Sort by file importance (business logic first)
2. Focus on killed rate per file, not overall
3. Set realistic incremental improvement goals
4. Consider excluding non-critical files initially

### TypeScript Errors During Mutation

**Cause**: Mutant creates invalid TypeScript.

**Solution**: This is good! The TypeScript checker filters these out automatically when configured:

```javascript
// stryker.config.mjs
export default {
    checkers: ['typescript'],
    tsconfigFile: 'tsconfig.json',
};
```

### Tests Timeout During Mutation

**Cause**: Mutation creates infinite loop or extremely slow code.

**Solution**: This is a killed mutant. If legitimate timeouts occur:

```javascript
// Increase timeout in stryker.config.mjs
export default {
    timeoutMS: 30000,       // Default: 5000
    timeoutFactor: 3,       // Multiplier for slow tests
};
```

### Stryker Crashes with Out of Memory

**Solutions**:
```javascript
// stryker.config.mjs
export default {
    concurrency: 2,         // Reduce parallelism
    maxTestRunnerReuse: 20, // Restart test runner more often
};
```

Or increase Node.js memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" yarn mutate
```

### False Positives in Coverage

**Cause**: `coverageAnalysis: 'all'` runs all tests for every mutant.

**Solution**: Use per-test coverage analysis:
```javascript
// stryker.config.mjs
export default {
    coverageAnalysis: 'perTest', // More accurate, faster
};
```

---

## Further Reading

- [Stryker Mutator Documentation](https://stryker-mutator.io/docs/)
- [Mutation Testing Theory](https://stryker-mutator.io/docs/General/mutant-states-and-metrics/)
- [Stryker TypeScript Configuration](https://stryker-mutator.io/docs/stryker-js/guides/nodejs)

---

*Document created for HAP-907. Generated with Claude Code.*
