/**
 * @fileoverview Enforces use of @happy/protocol ID accessor helpers.
 *
 * This rule detects direct access to .sid and .machineId on update body objects
 * and recommends using getSessionId() and getMachineId() helpers instead.
 *
 * Examples:
 *   - Bad: update.body.sid
 *   - Good: getSessionId(update.body)
 *   - Bad: update.body.machineId
 *   - Good: getMachineId(update.body)
 *
 * Test files are excluded (they construct mock objects).
 *
 * @see HAP-658 for the original ESLint implementation
 * @see HAP-653 for the protocol accessor helper design
 */

// @ts-check

/**
 * Rule metadata
 */
const meta = {
    type: 'suggestion',
    docs: {
        description: 'Enforce @happy/protocol ID accessor helper usage',
        category: 'Best Practices',
        recommended: true,
    },
    fixable: null, // Cannot auto-fix as it requires import changes
    schema: [],
    messages: {
        avoidDirectSid:
            'Avoid direct .sid access on update body. Use getSessionId(update.body) from @happy/protocol. See HAP-653.',
        avoidDirectMachineId:
            'Avoid direct .machineId access on update body. Use getMachineId(update.body) from @happy/protocol. See HAP-653.',
    },
};

/**
 * Check if a file is a test file (should be excluded from this rule)
 * @param {string} filename - The file path
 * @returns {boolean} True if this is a test file
 */
function isTestFile(filename) {
    if (!filename) return false;
    return (
        filename.includes('.spec.') ||
        filename.includes('.test.') ||
        filename.includes('__tests__') ||
        filename.includes('__mocks__')
    );
}

/**
 * Check if a MemberExpression matches the pattern: *.body.propertyName
 *
 * This detects patterns like:
 *   - update.body.sid
 *   - message.body.machineId
 *   - response.body.sid
 *
 * @param {object} node - The MemberExpression node
 * @param {string} propertyName - The property name to check for
 * @returns {boolean} True if the pattern matches
 */
function matchesBodyPropertyPattern(node, propertyName) {
    // Check: node.property.name === propertyName
    if (!node.property || node.property.name !== propertyName) {
        return false;
    }

    // Check: node.object is also a MemberExpression with property "body"
    const objectNode = node.object;
    if (!objectNode || objectNode.type !== 'MemberExpression') {
        return false;
    }

    // Check: objectNode.property.name === 'body'
    if (!objectNode.property || objectNode.property.name !== 'body') {
        return false;
    }

    return true;
}

/**
 * Create the rule
 * @param {object} context - The rule context
 * @returns {object} The visitor object
 */
function create(context) {
    // Skip test files
    const filename = context.getFilename ? context.getFilename() : context.filename;
    if (isTestFile(filename)) {
        return {};
    }

    return {
        MemberExpression(node) {
            // Check for .body.sid pattern
            if (matchesBodyPropertyPattern(node, 'sid')) {
                context.report({
                    node,
                    messageId: 'avoidDirectSid',
                });
                return;
            }

            // Check for .body.machineId pattern
            if (matchesBodyPropertyPattern(node, 'machineId')) {
                context.report({
                    node,
                    messageId: 'avoidDirectMachineId',
                });
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
