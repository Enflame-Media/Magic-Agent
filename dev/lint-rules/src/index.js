/**
 * @fileoverview Custom oxlint/ESLint plugin for the Happy monorepo.
 *
 * This plugin provides custom linting rules that are used across multiple
 * Happy projects. It is designed to work with both ESLint and oxlint.
 *
 * Rules:
 *   - happy/github-casing: Enforce proper "GitHub" casing in PascalCase identifiers
 *   - happy/protocol-helpers: Enforce @happy/protocol ID accessor helper usage
 *
 * Usage with oxlint (.oxlintrc.json):
 *   {
 *     "jsPlugins": ["@happy/lint-rules"],
 *     "rules": {
 *       "happy/github-casing": "warn",
 *       "happy/protocol-helpers": "warn"
 *     }
 *   }
 *
 * Usage with ESLint (eslint.config.js):
 *   import happyPlugin from '@happy/lint-rules';
 *   export default [
 *     {
 *       plugins: { happy: happyPlugin },
 *       rules: {
 *         'happy/github-casing': 'warn',
 *         'happy/protocol-helpers': 'warn'
 *       }
 *     }
 *   ];
 *
 * @see HAP-758 for the oxlint migration epic
 * @see HAP-502 for GitHub casing rule
 * @see HAP-658 for protocol helper rule
 */

import githubCasing from './rules/github-casing.js';
import protocolHelpers from './rules/protocol-helpers.js';

/**
 * Plugin definition compatible with both ESLint and oxlint
 */
const plugin = {
    meta: {
        name: 'happy',
        version: '0.0.1',
    },
    rules: {
        'github-casing': githubCasing,
        'protocol-helpers': protocolHelpers,
    },
};

export default plugin;

// Named exports for individual rules
export { githubCasing, protocolHelpers };

// ESLint flat config helper
export const configs = {
    recommended: {
        plugins: {
            happy: plugin,
        },
        rules: {
            'happy/github-casing': 'warn',
            'happy/protocol-helpers': 'warn',
        },
    },
};
