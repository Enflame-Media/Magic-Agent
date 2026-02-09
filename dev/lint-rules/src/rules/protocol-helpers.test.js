/**
 * @fileoverview Tests for the protocol-helpers rule.
 *
 * Tests that the rule correctly identifies direct .sid and .machineId
 * access on update body objects and recommends using @magic-agent/protocol helpers.
 *
 * @see HAP-658 for the original ESLint implementation
 * @see HAP-653 for the protocol accessor helper design
 * @see HAP-763 for test implementation
 */

import { describe, it } from 'vitest';
import { RuleTester } from 'eslint';
import rule from './protocol-helpers.js';

// Configure RuleTester for Vitest
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
    languageOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
    },
});

ruleTester.run('protocol-helpers', rule, {
    valid: [
        // Using the helper functions (recommended)
        {
            code: `
                import { getSessionId } from '@magic-agent/protocol';
                const sid = getSessionId(update.body);
            `,
        },
        {
            code: `
                import { getMachineId } from '@magic-agent/protocol';
                const machineId = getMachineId(update.body);
            `,
        },

        // Accessing other properties on body (not .sid or .machineId)
        {
            code: 'const status = update.body.status;',
        },
        {
            code: 'const type = message.body.type;',
        },
        {
            code: 'const data = response.body.data;',
        },

        // Accessing .sid on something that's not .body
        {
            code: 'const sid = session.sid;',
        },
        {
            code: 'const sid = config.sessionId.sid;',
        },

        // Accessing .machineId on something that's not .body
        {
            code: 'const id = machine.machineId;',
        },
        {
            code: 'const id = config.machine.machineId;',
        },

        // Nested object that happens to have body property but different structure
        {
            code: 'const sid = data.body;', // Just accessing body itself
        },

        // Test files should be excluded (rule returns empty visitor for test files)
        {
            code: 'const sid = update.body.sid;',
            filename: '/path/to/file.test.ts',
        },
        {
            code: 'const sid = update.body.sid;',
            filename: '/path/to/file.spec.ts',
        },
        {
            code: 'const sid = update.body.sid;',
            filename: '/path/to/__tests__/file.ts',
        },
        {
            code: 'const sid = update.body.sid;',
            filename: '/path/to/__mocks__/file.ts',
        },
    ],

    invalid: [
        // Direct .sid access on .body
        {
            code: 'const sid = update.body.sid;',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },
        {
            code: 'const sessionId = message.body.sid;',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },
        {
            code: 'const id = response.body.sid;',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },

        // Direct .machineId access on .body
        {
            code: 'const machineId = update.body.machineId;',
            errors: [
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },
        {
            code: 'const mid = message.body.machineId;',
            errors: [
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },
        {
            code: 'const id = response.body.machineId;',
            errors: [
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },

        // Used in function calls
        {
            code: 'processSession(update.body.sid);',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },
        {
            code: 'processMachine(update.body.machineId);',
            errors: [
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },

        // Used in conditionals
        {
            code: 'if (update.body.sid) { doSomething(); }',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },
        {
            code: 'if (update.body.machineId) { doSomething(); }',
            errors: [
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },

        // Used in template literals
        {
            code: 'const msg = `Session: ${update.body.sid}`;',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },

        // Used in object properties
        {
            code: 'const obj = { id: update.body.sid };',
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
            ],
        },

        // Both properties accessed in same code
        {
            code: `
                const sid = update.body.sid;
                const mid = update.body.machineId;
            `,
            errors: [
                {
                    messageId: 'avoidDirectSid',
                },
                {
                    messageId: 'avoidDirectMachineId',
                },
            ],
        },
    ],
});
