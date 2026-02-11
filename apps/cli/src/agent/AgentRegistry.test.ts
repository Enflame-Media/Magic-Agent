/**
 * Unit tests for AgentRegistry
 *
 * Tests AgentMcpServerConfig type compatibility and registry functionality.
 *
 * @module agent/AgentRegistry.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, type AgentMcpServerConfig, type AgentFactoryOptions } from './AgentRegistry';
import type { AgentBackend, AgentId } from './AgentBackend';

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('basic functionality', () => {
    it('should register and create agents', () => {
      const mockBackend: AgentBackend = {
        startSession: async () => ({ sessionId: 'test' }),
        sendPrompt: async () => {},
        cancel: async () => {},
        dispose: async () => {},
        onMessage: () => {},
        offMessage: () => {},
        respondToPermission: async () => {},
      };

      const factory = () => mockBackend;
      // Use a valid AgentId for testing
      registry.register('gemini', factory);

      expect(registry.has('gemini')).toBe(true);
      expect(registry.list()).toContain('gemini');

      const backend = registry.create('gemini', { cwd: '/test' });
      expect(backend).toBe(mockBackend);
    });

    it('should throw for unknown agent', () => {
      expect(() => {
        // Cast to AgentId to test the error path
        registry.create('unknown' as AgentId, { cwd: '/test' });
      }).toThrow(/Unknown agent: unknown/);
    });

    it('should list available agents', () => {
      const factory = () => ({} as AgentBackend);

      registry.register('claude', factory);
      registry.register('codex', factory);

      const list = registry.list();
      expect(list).toContain('claude');
      expect(list).toContain('codex');
      expect(list.length).toBe(2);
    });
  });

  describe('AgentMcpServerConfig type', () => {
    it('should accept disabledTools array', () => {
      const config: AgentMcpServerConfig = {
        command: 'test',
        args: ['arg1'],
        env: { KEY: 'value' },
        disabledTools: ['tool1', 'tool2'],
      };

      expect(config.disabledTools).toEqual(['tool1', 'tool2']);
      expect(config.command).toBe('test');
      expect(config.args).toEqual(['arg1']);
      expect(config.env).toEqual({ KEY: 'value' });
    });

    it('should be compatible with base McpServerConfig (disabledTools optional)', () => {
      const config: AgentMcpServerConfig = {
        command: 'test',
        // disabledTools is optional
      };

      expect(config.command).toBe('test');
      expect(config.disabledTools).toBeUndefined();
    });

    it('should allow empty disabledTools array', () => {
      const config: AgentMcpServerConfig = {
        command: 'test',
        disabledTools: [],
      };

      expect(config.disabledTools).toEqual([]);
    });

    it('should work in AgentFactoryOptions', () => {
      const opts: AgentFactoryOptions = {
        cwd: '/test',
        env: { NODE_ENV: 'test' },
        mcpServers: {
          'server-a': {
            command: 'npx',
            args: ['server-a'],
            disabledTools: ['dangerous_tool'],
          },
          'server-b': {
            command: 'python',
            args: ['server.py'],
            env: { PYTHON_PATH: '/usr/bin/python' },
            // No disabledTools - optional
          },
        },
      };

      expect(opts.mcpServers?.['server-a']?.disabledTools).toEqual(['dangerous_tool']);
      expect(opts.mcpServers?.['server-b']?.disabledTools).toBeUndefined();
    });
  });

  describe('factory invocation with MCP servers', () => {
    it('should pass mcpServers to factory function', () => {
      const receivedOptions: AgentFactoryOptions[] = [];

      const factory = (opts: AgentFactoryOptions) => {
        receivedOptions.push(opts);
        return {} as AgentBackend;
      };

      // Use a valid AgentId
      registry.register('gemini', factory);

      const mcpServers = {
        'test-server': {
          command: 'test',
          disabledTools: ['tool1'],
        },
      };

      registry.create('gemini', {
        cwd: '/test',
        mcpServers,
      });

      expect(receivedOptions.length).toBe(1);
      expect(receivedOptions[0].mcpServers).toEqual(mcpServers);
    });

    it('should pass undefined mcpServers when not provided', () => {
      let receivedOptions: AgentFactoryOptions | null = null;

      const factory = (opts: AgentFactoryOptions) => {
        receivedOptions = opts;
        return {} as AgentBackend;
      };

      // Use a valid AgentId
      registry.register('codex', factory);
      registry.create('codex', { cwd: '/test' });

      expect(receivedOptions).not.toBeNull();
      expect(receivedOptions!.mcpServers).toBeUndefined();
    });
  });
});

describe('AgentMcpServerConfig edge cases', () => {
  it('should handle complex server configurations', () => {
    const complexConfig: AgentMcpServerConfig = {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_TOKEN: 'ghp_xxxx',
        NODE_ENV: 'production',
      },
      disabledTools: [
        'dangerous_delete_repo',
        'dangerous_push_force',
        'admin_operations',
      ],
    };

    // Verify all fields are accessible and correctly typed
    expect(typeof complexConfig.command).toBe('string');
    expect(Array.isArray(complexConfig.args)).toBe(true);
    expect(typeof complexConfig.env).toBe('object');
    expect(Array.isArray(complexConfig.disabledTools)).toBe(true);
    expect(complexConfig.disabledTools?.length).toBe(3);
  });

  it('should handle minimal server configuration', () => {
    const minimalConfig: AgentMcpServerConfig = {
      command: 'simple-server',
    };

    expect(minimalConfig.command).toBe('simple-server');
    expect(minimalConfig.args).toBeUndefined();
    expect(minimalConfig.env).toBeUndefined();
    expect(minimalConfig.disabledTools).toBeUndefined();
  });
});
