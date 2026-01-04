import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
    eslint.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
            globals: {
                // Cloudflare Workers global APIs
                console: 'readonly',
                crypto: 'readonly',
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                // Node.js globals for tests
                process: 'readonly',
                Buffer: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // Disable base rule - TypeScript handles this better
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            'no-undef': 'off', // TypeScript handles this

            // Enforce proper "GitHub" casing in PascalCase identifiers (HAP-502)
            // "Github" is incorrect; should be "GitHub" (capital H)
            // This only applies to typeLike (interfaces, types, classes, enums)
            // camelCase variables like "githubToken" are fine (they start lowercase)
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                    custom: {
                        // Fail if identifier contains "Github" (should be "GitHub")
                        regex: 'Github',
                        match: false,
                    },
                },
            ],

            // Enforce @happy/protocol ID accessor helper usage (HAP-658)
            // Detect direct .sid and .machineId access on update objects
            // Use getSessionId(), getMachineId() helpers instead
            'no-restricted-syntax': [
                'warn',
                {
                    // Detect .body.sid access on update objects
                    selector: 'MemberExpression[property.name="sid"][object.property.name="body"]',
                    message:
                        'Avoid direct .sid access on update body. Use getSessionId(update.body) from @happy/protocol. See HAP-653.',
                },
                {
                    // Detect .body.machineId access on update objects
                    selector: 'MemberExpression[property.name="machineId"][object.property.name="body"]',
                    message:
                        'Avoid direct .machineId access on update body. Use getMachineId(update.body) from @happy/protocol. See HAP-653.',
                },
            ],
        },
    },
    // Disable protocol helper rules for test files (they construct mock objects)
    {
        files: ['**/*.spec.ts', '**/*.test.ts', '**/__tests__/**/*.ts'],
        rules: {
            'no-restricted-syntax': 'off',
        },
    },
    // k6 load test files - JavaScript files with k6-specific globals
    {
        files: ['load-tests/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                // k6 runtime globals
                __ENV: 'readonly',
                // Web APIs available in k6 runtime
                btoa: 'readonly',
                atob: 'readonly',
                console: 'readonly',
                // k6 built-in objects (imported, but declaring for safety)
                JSON: 'readonly',
                Math: 'readonly',
            },
        },
        rules: {
            // Relaxed rules for load test scripts
            'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        },
    },
    {
        ignores: ['dist/', 'node_modules/', '.wrangler/', '*.config.ts'],
    },
];
