import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';

export default [
    eslint.configs.recommended,
    // TypeScript files
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: parser,
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module',
            },
            globals: {
                // Browser globals
                console: 'readonly',
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                document: 'readonly',
                window: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                // Cloudflare Workers globals
                crypto: 'readonly',
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
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'typeLike',
                    format: ['PascalCase'],
                    custom: {
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
    {
        ignores: ['dist/', 'node_modules/', '.wrangler/', '*.config.ts', '*.config.js', '**/*.vue'],
    },
];
