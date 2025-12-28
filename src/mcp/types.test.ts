/**
 * Unit tests for MCP Types and Config Schemas
 *
 * Tests validate that:
 * - Zod schemas parse correctly for valid inputs
 * - Schemas reject invalid inputs appropriately
 * - Default values are applied correctly
 * - Backward compatibility with base McpServerConfig is maintained
 */

import { describe, it, expect } from 'vitest';
import {
    McpServerMetadataSchema,
    HappyMcpServerConfigSchema,
    AgentMcpOverrideSchema,
    HappyMcpConfigSchema,
    DEFAULT_MCP_CONFIG,
    type HappyMcpServerConfig,
    type McpValidationResult,
} from './types';

describe('McpServerMetadataSchema', () => {
    it('should parse valid metadata with all fields', () => {
        const input = {
            addedAt: '2024-12-28T00:30:00.000Z',
            lastValidated: '2024-12-28T00:35:00.000Z',
            toolCount: 5,
            description: 'GitHub integration server',
        };

        const result = McpServerMetadataSchema.parse(input);

        expect(result.addedAt).toBe('2024-12-28T00:30:00.000Z');
        expect(result.lastValidated).toBe('2024-12-28T00:35:00.000Z');
        expect(result.toolCount).toBe(5);
        expect(result.description).toBe('GitHub integration server');
    });

    it('should parse valid metadata with only required fields', () => {
        const input = {
            addedAt: '2024-12-28T00:30:00.000Z',
        };

        const result = McpServerMetadataSchema.parse(input);

        expect(result.addedAt).toBe('2024-12-28T00:30:00.000Z');
        expect(result.lastValidated).toBeUndefined();
        expect(result.toolCount).toBeUndefined();
        expect(result.description).toBeUndefined();
    });

    it('should reject invalid datetime format', () => {
        const input = {
            addedAt: 'not-a-datetime',
        };

        expect(() => McpServerMetadataSchema.parse(input)).toThrow(/Invalid ISO datetime/i);
    });

    it('should reject negative toolCount', () => {
        const input = {
            addedAt: '2024-12-28T00:30:00.000Z',
            toolCount: -1,
        };

        expect(() => McpServerMetadataSchema.parse(input)).toThrow(/Too small.*>=0/i);
    });
});

describe('HappyMcpServerConfigSchema', () => {
    it('should parse minimal config (backward compatible with McpServerConfig)', () => {
        // This tests backward compatibility with the base McpServerConfig interface
        const input = {
            command: 'node',
            args: ['server.js'],
            env: { API_KEY: 'secret' },
        };

        const result = HappyMcpServerConfigSchema.parse(input);

        expect(result.command).toBe('node');
        expect(result.args).toEqual(['server.js']);
        expect(result.env).toEqual({ API_KEY: 'secret' });
        // Defaults should be applied
        expect(result.disabled).toBe(false);
        expect(result.disabledTools).toEqual([]);
        expect(result.autoApprove).toEqual([]);
        expect(result.timeout).toBe(5000);
    });

    it('should parse full config with all management fields', () => {
        const input = {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-github'],
            env: { GITHUB_TOKEN: 'ghp_xxx' },
            disabled: true,
            disabledTools: ['dangerous_tool', 'risky_tool'],
            autoApprove: ['read_*', 'list_*'],
            timeout: 10000,
            metadata: {
                addedAt: '2024-12-28T00:30:00.000Z',
                description: 'GitHub MCP server',
            },
        };

        const result = HappyMcpServerConfigSchema.parse(input);

        expect(result.command).toBe('npx');
        expect(result.args).toEqual(['-y', '@modelcontextprotocol/server-github']);
        expect(result.disabled).toBe(true);
        expect(result.disabledTools).toEqual(['dangerous_tool', 'risky_tool']);
        expect(result.autoApprove).toEqual(['read_*', 'list_*']);
        expect(result.timeout).toBe(10000);
        expect(result.metadata?.addedAt).toBe('2024-12-28T00:30:00.000Z');
        expect(result.metadata?.description).toBe('GitHub MCP server');
    });

    it('should apply default values', () => {
        const input = {
            command: 'node',
        };

        const result = HappyMcpServerConfigSchema.parse(input);

        expect(result.disabled).toBe(false);
        expect(result.disabledTools).toEqual([]);
        expect(result.autoApprove).toEqual([]);
        expect(result.timeout).toBe(5000);
    });

    it('should reject missing command', () => {
        const input = {
            args: ['server.js'],
        };

        expect(() => HappyMcpServerConfigSchema.parse(input)).toThrow(/expected string, received undefined/i);
    });

    it('should reject invalid timeout (negative)', () => {
        const input = {
            command: 'node',
            timeout: -1000,
        };

        expect(() => HappyMcpServerConfigSchema.parse(input)).toThrow(/Too small.*>0/i);
    });

    it('should reject invalid timeout (zero)', () => {
        const input = {
            command: 'node',
            timeout: 0,
        };

        expect(() => HappyMcpServerConfigSchema.parse(input)).toThrow(/Too small.*>0/i);
    });
});

describe('AgentMcpOverrideSchema', () => {
    it('should parse agent override with custom servers', () => {
        const input = {
            mcpServers: {
                'custom-server': {
                    command: 'node',
                    args: ['custom-server.js'],
                },
            },
            disabled: ['github-server'],
        };

        const result = AgentMcpOverrideSchema.parse(input);

        expect(result.mcpServers?.['custom-server']?.command).toBe('node');
        expect(result.disabled).toEqual(['github-server']);
    });

    it('should parse empty override', () => {
        const input = {};

        const result = AgentMcpOverrideSchema.parse(input);

        expect(result.mcpServers).toBeUndefined();
        expect(result.disabled).toBeUndefined();
    });
});

describe('HappyMcpConfigSchema', () => {
    it('should parse full config file structure', () => {
        const input = {
            version: 1 as const,
            mcpServers: {
                github: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-github'],
                    metadata: {
                        addedAt: '2024-12-28T00:30:00.000Z',
                    },
                },
            },
            agentOverrides: {
                codex: {
                    disabled: ['github'],
                },
            },
        };

        const result = HappyMcpConfigSchema.parse(input);

        expect(result.version).toBe(1);
        expect(result.mcpServers['github']?.command).toBe('npx');
        expect(result.agentOverrides?.['codex']?.disabled).toEqual(['github']);
    });

    it('should parse minimal config with defaults', () => {
        const input = {
            version: 1 as const,
        };

        const result = HappyMcpConfigSchema.parse(input);

        expect(result.version).toBe(1);
        expect(result.mcpServers).toEqual({});
        expect(result.agentOverrides).toBeUndefined();
    });

    it('should reject invalid version', () => {
        const input = {
            version: 2,
        };

        expect(() => HappyMcpConfigSchema.parse(input)).toThrow(/expected 1/i);
    });

    it('should reject missing version', () => {
        const input = {
            mcpServers: {},
        };

        expect(() => HappyMcpConfigSchema.parse(input)).toThrow(/expected 1/i);
    });
});

describe('DEFAULT_MCP_CONFIG', () => {
    it('should be a valid HappyMcpConfig', () => {
        const result = HappyMcpConfigSchema.parse(DEFAULT_MCP_CONFIG);

        expect(result.version).toBe(1);
        expect(result.mcpServers).toEqual({});
    });
});

describe('Type compatibility', () => {
    it('should allow McpValidationResult with success', () => {
        const result: McpValidationResult = {
            success: true,
            serverName: 'test-server',
            toolCount: 3,
            tools: [
                { name: 'tool1', description: 'First tool' },
                { name: 'tool2' },
            ],
            validatedAt: '2024-12-28T00:30:00.000Z',
        };

        expect(result.success).toBe(true);
        expect(result.toolCount).toBe(3);
        expect(result.tools?.length).toBe(2);
    });

    it('should allow McpValidationResult with failure', () => {
        const result: McpValidationResult = {
            success: false,
            serverName: 'broken-server',
            error: 'Connection timeout',
            validatedAt: '2024-12-28T00:30:00.000Z',
        };

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection timeout');
    });

    it('should allow HappyMcpServerConfig to satisfy base McpServerConfig shape', () => {
        // This test ensures backward compatibility with the base interface
        const config: HappyMcpServerConfig = {
            command: 'node',
            args: ['server.js'],
            env: { KEY: 'value' },
            disabled: false,
            disabledTools: [],
            autoApprove: [],
            timeout: 5000,
        };

        // Verify the base McpServerConfig fields are accessible
        // The type should be compatible with { command: string; args?: string[]; env?: Record<string, string> }
        expect(config.command).toBe('node');
        expect(config.args).toEqual(['server.js']);
        expect(config.env).toEqual({ KEY: 'value' });

        // Type assertion test - HappyMcpServerConfig extends base McpServerConfig
        type BaseFields = Pick<HappyMcpServerConfig, 'command' | 'args' | 'env'>;
        const baseFields: BaseFields = {
            command: config.command,
            args: config.args,
            env: config.env,
        };
        expect(baseFields.command).toBe('node');
    });
});
