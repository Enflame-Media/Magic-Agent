/**
 * Unit tests for Gemini Backend MCP Integration
 *
 * Tests MCP config loading in registerGeminiAgent and the conversion from
 * HappyMcpServerConfig to AgentMcpServerConfig.
 *
 * @module agent/acp/gemini.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the MCP config module BEFORE importing the module under test
vi.mock('@/mcp/config', () => ({
  getEnabledMcpServers: vi.fn(),
  hasMcpConfig: vi.fn(),
}));

// Mock the AcpSdkBackend to avoid spawning real processes
// Use a class mock so it can be instantiated with 'new'
vi.mock('./AcpSdkBackend', () => {
  const MockAcpSdkBackend = vi.fn().mockImplementation(function (this: any, options: any) {
    this.options = options;
    this.startSession = vi.fn();
    this.sendPrompt = vi.fn();
    this.cancel = vi.fn();
    this.dispose = vi.fn();
    this.onMessage = vi.fn();
    this.offMessage = vi.fn();
  });
  return { AcpSdkBackend: MockAcpSdkBackend };
});

// Mock Gemini config utils
vi.mock('@/gemini/utils/config', () => ({
  readGeminiLocalConfig: vi.fn().mockReturnValue({}),
  determineGeminiModel: vi.fn().mockReturnValue('gemini-2.5-pro'),
  getGeminiModelSource: vi.fn().mockReturnValue('default'),
}));

// Mock logger to suppress output
vi.mock('@/ui/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { createGeminiBackend, registerGeminiAgent } from './gemini';
import { agentRegistry } from '../AgentRegistry';
import * as mcpConfig from '@/mcp/config';
import { AcpSdkBackend } from './AcpSdkBackend';
import type { HappyMcpServerConfig } from '@/mcp/types';

describe('Gemini Backend MCP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the registry before each test
    // We need to access the private factories map to clear it
    // Since we can't, we'll just re-register which will overwrite
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createGeminiBackend', () => {
    it('should pass mcpServers to AcpSdkBackend', () => {
      const mcpServers = {
        'test-server': {
          command: 'npx',
          args: ['test-mcp'],
          disabledTools: ['dangerous_tool'],
        },
      };

      createGeminiBackend({
        cwd: '/test',
        mcpServers,
      });

      expect(AcpSdkBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers,
        })
      );
    });

    it('should pass undefined mcpServers when none provided', () => {
      createGeminiBackend({
        cwd: '/test',
      });

      expect(AcpSdkBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: undefined,
        })
      );
    });
  });

  describe('registerGeminiAgent', () => {
    it('should load MCP servers when config exists and no mcpServers in options', () => {
      const mockEnabledServers: Record<string, HappyMcpServerConfig> = {
        'test-server': {
          command: 'npx',
          args: ['test-mcp'],
          disabled: false,
          disabledTools: ['dangerous_tool'],
          autoApprove: ['read_*'],
          timeout: 5000,
          metadata: {
            addedAt: '2024-12-28T00:00:00.000Z',
            description: 'Test server',
          },
        },
      };

      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue(mockEnabledServers);

      // Register the agent
      registerGeminiAgent();

      // Create an agent using the registry
      agentRegistry.create('gemini', { cwd: '/test' });

      // Verify getEnabledMcpServers was called with 'gemini'
      expect(mcpConfig.getEnabledMcpServers).toHaveBeenCalledWith('gemini');
    });

    it('should not load MCP config when mcpServers explicitly provided in options', () => {
      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue({});

      // Register the agent
      registerGeminiAgent();

      // Create with explicit mcpServers
      const explicitServers = {
        'explicit-server': {
          command: 'explicit',
          args: ['--explicit'],
        },
      };

      agentRegistry.create('gemini', {
        cwd: '/test',
        mcpServers: explicitServers,
      });

      // getEnabledMcpServers should NOT be called when mcpServers is provided
      expect(mcpConfig.getEnabledMcpServers).not.toHaveBeenCalled();
    });

    it('should not load MCP config when no config exists', () => {
      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(false);

      // Register the agent
      registerGeminiAgent();

      // Create without explicit mcpServers
      agentRegistry.create('gemini', { cwd: '/test' });

      // Should not call getEnabledMcpServers when hasMcpConfig returns false
      expect(mcpConfig.getEnabledMcpServers).not.toHaveBeenCalled();
    });

    it('should convert HappyMcpServerConfig to AgentMcpServerConfig', () => {
      const mockEnabledServers: Record<string, HappyMcpServerConfig> = {
        'full-config-server': {
          command: 'npx',
          args: ['-y', '@modelcontextprotocol/server-test'],
          env: { API_KEY: 'test-key' },
          disabled: false,
          disabledTools: ['tool1', 'tool2'],
          autoApprove: ['read_*', 'list_*'],
          timeout: 10000,
          metadata: {
            addedAt: '2024-12-28T00:00:00.000Z',
            description: 'Full config server',
            lastValidated: '2024-12-28T01:00:00.000Z',
            toolCount: 5,
          },
        },
      };

      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue(mockEnabledServers);

      // Register the agent
      registerGeminiAgent();

      // Create an agent
      agentRegistry.create('gemini', { cwd: '/test' });

      // Verify AcpSdkBackend was called with converted config
      expect(AcpSdkBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: {
            'full-config-server': {
              command: 'npx',
              args: ['-y', '@modelcontextprotocol/server-test'],
              env: { API_KEY: 'test-key' },
              disabledTools: ['tool1', 'tool2'],
              // These fields should be stripped:
              // - disabled
              // - autoApprove
              // - timeout
              // - metadata
            },
          },
        })
      );

      // Verify stripped fields are not present
      const calledWith = vi.mocked(AcpSdkBackend).mock.calls[0][0];
      const serverConfig = calledWith.mcpServers?.['full-config-server'];

      expect(serverConfig).toBeDefined();
      expect(serverConfig?.command).toBe('npx');
      expect(serverConfig?.args).toEqual(['-y', '@modelcontextprotocol/server-test']);
      expect(serverConfig?.env).toEqual({ API_KEY: 'test-key' });
      expect(serverConfig?.disabledTools).toEqual(['tool1', 'tool2']);

      // These should NOT be present (stripped during conversion)
      expect('disabled' in (serverConfig || {})).toBe(false);
      expect('autoApprove' in (serverConfig || {})).toBe(false);
      expect('timeout' in (serverConfig || {})).toBe(false);
      expect('metadata' in (serverConfig || {})).toBe(false);
    });

    it('should handle empty MCP servers from config', () => {
      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue({});

      // Register the agent
      registerGeminiAgent();

      // Create an agent
      agentRegistry.create('gemini', { cwd: '/test' });

      // Should call getEnabledMcpServers but not set mcpServers (empty object means no servers)
      expect(mcpConfig.getEnabledMcpServers).toHaveBeenCalledWith('gemini');

      // AcpSdkBackend should be called with undefined mcpServers (empty = no servers)
      expect(AcpSdkBackend).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: undefined,
        })
      );
    });

    it('should handle multiple MCP servers', () => {
      const mockEnabledServers: Record<string, HappyMcpServerConfig> = {
        'server-a': {
          command: 'node',
          args: ['a.js'],
          disabled: false,
          disabledTools: ['a_tool'],
          autoApprove: [],
          timeout: 5000,
        },
        'server-b': {
          command: 'python',
          args: ['b.py'],
          disabled: false,
          disabledTools: ['b_tool1', 'b_tool2'],
          autoApprove: [],
          timeout: 3000,
        },
      };

      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue(mockEnabledServers);

      // Register the agent
      registerGeminiAgent();

      // Create an agent
      agentRegistry.create('gemini', { cwd: '/test' });

      // Verify both servers are included
      const calledWith = vi.mocked(AcpSdkBackend).mock.calls[0][0];
      expect(Object.keys(calledWith.mcpServers || {})).toEqual(['server-a', 'server-b']);

      expect(calledWith.mcpServers?.['server-a']?.disabledTools).toEqual(['a_tool']);
      expect(calledWith.mcpServers?.['server-b']?.disabledTools).toEqual(['b_tool1', 'b_tool2']);
    });

    it('should handle servers with empty disabledTools', () => {
      const mockEnabledServers: Record<string, HappyMcpServerConfig> = {
        'no-disabled-tools': {
          command: 'test',
          disabled: false,
          disabledTools: [], // Empty array (no disabled tools)
          autoApprove: [],
          timeout: 5000,
        },
      };

      vi.mocked(mcpConfig.hasMcpConfig).mockReturnValue(true);
      vi.mocked(mcpConfig.getEnabledMcpServers).mockReturnValue(mockEnabledServers);

      // Register the agent
      registerGeminiAgent();

      // Create an agent - should not throw
      expect(() => {
        agentRegistry.create('gemini', { cwd: '/test' });
      }).not.toThrow();

      // Verify the conversion handles empty disabledTools
      const calledWith = vi.mocked(AcpSdkBackend).mock.calls[0][0];
      expect(calledWith.mcpServers?.['no-disabled-tools']?.disabledTools).toEqual([]);
    });
  });
});
