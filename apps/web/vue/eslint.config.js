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
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },

  // Baseline overrides to reduce existing lint noise
  {
    rules: {
      'no-undef': 'off',
    },
  },
  {
    files: [
      'apps/**/src/**/*.ts',
      'apps/**/src/**/*.tsx',
      'apps/**/src/**/*.vue',
      'packages/**/src/**/*.ts',
      'packages/**/src/**/*.tsx',
      'packages/**/src/**/*.vue',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/restrict-template-expressions': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unnecessary-type-parameters': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-enum-comparison': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/require-await': 'warn',
      '@typescript-eslint/no-base-to-string': 'warn',
      '@typescript-eslint/no-confusing-void-expression': 'warn',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-redundant-type-constituents': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,vue}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      'vue/require-default-prop': 'off',
      'vue/no-required-prop-with-default': 'off',
      'vue/no-template-shadow': 'off',
    },
  },

  // Prettier config must be last to disable conflicting rules
  eslintConfigPrettier
);
