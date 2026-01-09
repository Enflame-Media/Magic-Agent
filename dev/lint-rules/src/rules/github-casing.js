/**
 * @fileoverview Enforces proper "GitHub" casing in PascalCase identifiers.
 *
 * This rule ensures that type-like identifiers (interfaces, types, classes, enums)
 * use "GitHub" (capital H) instead of "Github" (lowercase h).
 *
 * Examples:
 *   - Bad: interface GithubUser {}
 *   - Good: interface GitHubUser {}
 *   - OK: const githubToken = "..." (camelCase variables are fine)
 *
 * @see HAP-502 for the original ESLint implementation
 */

// @ts-check

/**
 * Rule metadata
 */
const meta = {
    type: 'suggestion',
    docs: {
        description: 'Enforce proper "GitHub" casing in PascalCase identifiers',
        category: 'Stylistic Issues',
        recommended: false,
    },
    fixable: 'code',
    schema: [],
    messages: {
        incorrectCasing:
            'Use "GitHub" (capital H) instead of "Github" in identifier "{{name}}". See HAP-502.',
    },
};

/**
 * Check if a name contains "Github" (incorrect casing)
 * @param {string} name - The identifier name to check
 * @returns {boolean} True if the name contains incorrect casing
 */
function hasIncorrectGithubCasing(name) {
    // Match "Github" but not "GitHub" (case-sensitive)
    // This regex finds "Github" where it's NOT followed by "ub" being part of "GitHub"
    return /Github(?!ub)/i.test(name) && name.includes('Github') && !name.includes('GitHub');
}

/**
 * Fix the casing by replacing "Github" with "GitHub"
 * @param {string} name - The identifier name to fix
 * @returns {string} The fixed name
 */
function fixGithubCasing(name) {
    return name.replace(/Github/g, 'GitHub');
}

/**
 * Check if a node represents a type-like declaration (PascalCase context)
 * @param {object} node - The AST node
 * @returns {boolean} True if the node is a type-like declaration
 */
function isTypeLikeDeclaration(node) {
    const typeLikeTypes = [
        'TSTypeAliasDeclaration',
        'TSInterfaceDeclaration',
        'ClassDeclaration',
        'TSEnumDeclaration',
    ];
    return typeLikeTypes.includes(node.type);
}

/**
 * Create the rule
 * @param {object} context - The rule context
 * @returns {object} The visitor object
 */
function create(context) {
    /**
     * Report an identifier with incorrect GitHub casing
     * @param {object} node - The identifier node
     */
    function reportIncorrectCasing(node) {
        const name = node.name;

        if (hasIncorrectGithubCasing(name)) {
            context.report({
                node,
                messageId: 'incorrectCasing',
                data: { name },
                fix(fixer) {
                    return fixer.replaceText(node, fixGithubCasing(name));
                },
            });
        }
    }

    return {
        // TypeScript type alias: type GithubUser = {...}
        TSTypeAliasDeclaration(node) {
            if (node.id) {
                reportIncorrectCasing(node.id);
            }
        },

        // TypeScript interface: interface GithubUser {...}
        TSInterfaceDeclaration(node) {
            if (node.id) {
                reportIncorrectCasing(node.id);
            }
        },

        // Class declaration: class GithubService {...}
        ClassDeclaration(node) {
            if (node.id) {
                reportIncorrectCasing(node.id);
            }
        },

        // TypeScript enum: enum GithubStatus {...}
        TSEnumDeclaration(node) {
            if (node.id) {
                reportIncorrectCasing(node.id);
            }
        },
    };
}

/**
 * Export the rule in ESLint plugin format
 */
export const rule = {
    meta,
    create,
};

export default rule;
