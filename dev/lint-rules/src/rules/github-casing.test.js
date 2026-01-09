/**
 * @fileoverview Tests for the github-casing rule.
 *
 * Tests that the rule correctly identifies and fixes incorrect "Github"
 * casing in PascalCase identifiers (should be "GitHub").
 *
 * @see HAP-502 for the original ESLint implementation
 * @see HAP-763 for test implementation
 */

import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from './github-casing.js';

// Configure RuleTester for Vitest
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
});

ruleTester.run('github-casing', rule, {
    valid: [
        // Correct casing in interfaces
        {
            code: 'interface GitHubUser {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'interface GitHubProfile extends BaseProfile {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },

        // Correct casing in type aliases
        {
            code: 'type GitHubToken = string;',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'type GitHubResponse<T> = Promise<T>;',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },

        // Correct casing in classes
        {
            code: 'class GitHubService {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'class GitHubApiClient extends BaseClient {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },

        // Correct casing in enums
        {
            code: 'enum GitHubStatus { Active, Inactive }',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },

        // camelCase variables are allowed (lowercase 'g')
        {
            code: 'const githubToken = "token";',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'const myGithubConfig = {};',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'function connectToGithub() {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },

        // Names without GitHub at all
        {
            code: 'interface User {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'type Profile = {};',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
        {
            code: 'class Service {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
        },
    ],

    invalid: [
        // Incorrect casing in interfaces
        {
            code: 'interface GithubUser {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubUser' },
                },
            ],
            output: 'interface GitHubUser {}',
        },
        {
            code: 'interface GithubProfile extends BaseProfile {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubProfile' },
                },
            ],
            output: 'interface GitHubProfile extends BaseProfile {}',
        },

        // Incorrect casing in type aliases
        {
            code: 'type GithubToken = string;',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubToken' },
                },
            ],
            output: 'type GitHubToken = string;',
        },
        {
            code: 'type GithubResponse<T> = Promise<T>;',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubResponse' },
                },
            ],
            output: 'type GitHubResponse<T> = Promise<T>;',
        },

        // Incorrect casing in classes
        {
            code: 'class GithubService {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubService' },
                },
            ],
            output: 'class GitHubService {}',
        },
        {
            code: 'class GithubApiClient extends BaseClient {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubApiClient' },
                },
            ],
            output: 'class GitHubApiClient extends BaseClient {}',
        },

        // Incorrect casing in enums
        {
            code: 'enum GithubStatus { Active, Inactive }',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubStatus' },
                },
            ],
            output: 'enum GitHubStatus { Active, Inactive }',
        },

        // Multiple occurrences in name
        {
            code: 'interface GithubToGithubSync {}',
            languageOptions: {
                parser: require('@typescript-eslint/parser'),
            },
            errors: [
                {
                    messageId: 'incorrectCasing',
                    data: { name: 'GithubToGithubSync' },
                },
            ],
            output: 'interface GitHubToGitHubSync {}',
        },
    ],
});
