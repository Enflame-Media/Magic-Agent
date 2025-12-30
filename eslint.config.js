// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores - must be first
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/*.d.ts',
      '**/platforms/**',
      '**/App_Resources/**',
    ],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // TypeScript recommended (non-type-checked) for all TS files
  ...tseslint.configs.recommended,

  // Vue recommended rules (flat config format)
  ...pluginVue.configs['flat/recommended'],

  // Type-checked rules ONLY for source files (not config files)
  // Note: Vue files are handled in a separate config block below
  {
    files: [
      'apps/**/src/**/*.ts',
      'apps/**/src/**/*.tsx',
      'packages/**/src/**/*.ts',
      'packages/**/src/**/*.tsx',
    ],
    extends: [...tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Allow void for fire-and-forget async calls
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],

      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-function-return-type': [
        'warn',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
    },
  },

  // Vue-specific rules with TypeScript type-checking
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Allow single-word component names (e.g., App.vue)
      'vue/multi-word-component-names': 'off',

      // Warn on v-html (XSS risk)
      'vue/no-v-html': 'warn',

      // Enforce consistent component naming
      'vue/component-name-in-template-casing': ['error', 'PascalCase'],

      // Enforce <script setup> before <template>
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },

  // Config files: no type-checking
  {
    files: ['**/*.config.{js,ts,mjs,cjs}', '**/vite.config.ts', '**/tsup.config.ts'],
    ...tseslint.configs.disableTypeChecked,
  },

  // JavaScript files: no type-checking
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  // Prettier config must be last to disable conflicting rules
  eslintConfigPrettier
);
