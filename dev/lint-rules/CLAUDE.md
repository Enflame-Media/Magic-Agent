# @happy/lint-rules - Development Guidelines

> **📍 Part of the Happy monorepo** — See root [`CLAUDE.md`](../../CLAUDE.md) for overall architecture and cross-project guidelines.

---

Custom oxlint/ESLint rules for the Happy monorepo.

## Overview

This package provides shared linting rules that can be used with both oxlint (via JS plugins) and ESLint. It centralizes custom rules that enforce Happy-specific conventions across all projects.

## Rules

### happy/github-casing

Enforces proper "GitHub" casing (capital H) in PascalCase identifiers.

**Bad:**
```typescript
interface GithubUser {}  // ❌ Should be "GitHub"
type GithubProfile = {}  // ❌ Should be "GitHub"
class GithubService {}   // ❌ Should be "GitHub"
```

**Good:**
```typescript
interface GitHubUser {}  // ✅
type GitHubProfile = {}  // ✅
class GitHubService {}   // ✅
const githubToken = ""   // ✅ (camelCase is fine)
```

**Fixable:** Yes (auto-fix available)

**See:** HAP-502

### happy/protocol-helpers

Enforces use of `@happy/protocol` ID accessor helpers instead of direct property access.

**Bad:**
```typescript
const sid = update.body.sid;           // ❌ Direct access
const machineId = update.body.machineId; // ❌ Direct access
```

**Good:**
```typescript
import { getSessionId, getMachineId } from '@happy/protocol';

const sid = getSessionId(update.body);      // ✅
const machineId = getMachineId(update.body); // ✅
```

**Fixable:** No (requires import changes)

**Note:** Test files (`*.spec.ts`, `*.test.ts`, `__tests__/*`) are excluded.

**See:** HAP-658, HAP-653

## Usage

### With oxlint

Add to your `.oxlintrc.json`:

```json
{
    "jsPlugins": ["@happy/lint-rules"],
    "rules": {
        "happy/github-casing": "warn",
        "happy/protocol-helpers": "warn"
    }
}
```

### With ESLint

Add to your `eslint.config.js`:

```javascript
import happyPlugin from '@happy/lint-rules';

export default [
    {
        plugins: { happy: happyPlugin },
        rules: {
            'happy/github-casing': 'warn',
            'happy/protocol-helpers': 'warn'
        }
    }
];
```

Or use the recommended config:

```javascript
import { configs } from '@happy/lint-rules';

export default [
    configs.recommended,
    // ... other configs
];
```

## Development

### Package Structure

```
dev/lint-rules/
├── src/
│   ├── index.js                   # Plugin entry point
│   └── rules/
│       ├── github-casing.js       # GitHub casing rule
│       ├── github-casing.test.js  # Tests for github-casing rule
│       ├── protocol-helpers.js    # Protocol helper rule
│       └── protocol-helpers.test.js # Tests for protocol-helpers rule
├── vitest.config.js               # Vitest configuration
├── package.json
└── CLAUDE.md                      # This file
```

### Adding New Rules

1. Create a new file in `src/rules/` following the pattern:
   ```javascript
   const meta = { /* rule metadata */ };
   function create(context) { /* rule implementation */ }
   export const rule = { meta, create };
   export default rule;
   ```

2. Add the rule to `src/index.js`:
   ```javascript
   import newRule from './rules/new-rule.js';

   const plugin = {
       rules: {
           // ...existing rules
           'new-rule': newRule,
       },
   };
   ```

3. Document the rule in this file.

### Testing

Rules are tested using Vitest with ESLint's `RuleTester`:

```bash
# Run tests
yarn workspace @happy/lint-rules test

# Run tests in watch mode
yarn workspace @happy/lint-rules test:watch
```

Each rule has a corresponding `.test.js` file that tests:
- Valid code patterns (should not trigger warnings)
- Invalid code patterns (should trigger warnings with correct message IDs)
- Auto-fix behavior (for fixable rules like `github-casing`)
- Edge cases (test file exclusions, various access patterns)

**Test counts:**
- `github-casing`: 21 tests (14 valid + 7 invalid patterns)
- `protocol-helpers`: 27 tests (14 valid + 13 invalid patterns)

**See:** HAP-763 for test implementation

## Related Issues

- HAP-758: Adopt oxlint type-aware linting and JS plugins
- HAP-763: Add unit tests for @happy/lint-rules oxlint plugin
- HAP-502: ESLint naming convention rule for GitHub casing
- HAP-658: ESLint rule to enforce @happy/protocol ID accessor helper usage
- HAP-653: Protocol ID accessor helper design

## Compatibility

- **oxlint:** 1.36.0+ (with JS plugins support)
- **ESLint:** 9.x (flat config)
- **Node.js:** 18+
