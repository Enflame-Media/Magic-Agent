/**
 * Unit tests for ACP Session State Types
 *
 * Tests cover:
 * - createAcpSessionState() factory defaults
 * - extractTextFromContentBlock() for text and non-text blocks
 * - applyAcpSessionUpdate() for all 11 update kinds
 *
 * @see HAP-1046 - Build Vue ACP foundation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AcpSessionUpdate } from '@magic-agent/protocol';
import {
  createAcpSessionState,
  extractTextFromContentBlock,
  applyAcpSessionUpdate,
  type AcpSessionState,
} from './acpTypes';

describe('ACP Session State Types', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-23T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // createAcpSessionState
  // ─────────────────────────────────────────────────────────────────────────

  describe('createAcpSessionState', () => {
    it('should return fresh default state', () => {
      const state = createAcpSessionState();
      expect(state).toEqual({
        agentMessage: '',
        userMessage: '',
        agentThought: '',
        toolCalls: {},
        plan: [],
        availableCommands: [],
        currentModeId: null,
        configOptions: [],
        sessionTitle: null,
        usage: null,
        permissionRequests: {},
        permissionHistory: [],
        lastUpdateAt: 0,
      });
    });

    it('should return independent objects', () => {
      const a = createAcpSessionState();
      const b = createAcpSessionState();
      a.agentMessage = 'modified';
      expect(b.agentMessage).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // extractTextFromContentBlock
  // ─────────────────────────────────────────────────────────────────────────

  describe('extractTextFromContentBlock', () => {
    it('should extract text from text block', () => {
      const block = { type: 'text' as const, text: 'Hello world' };
      expect(extractTextFromContentBlock(block)).toBe('Hello world');
    });

    it('should return empty string for image block', () => {
      const block = { type: 'image' as const, data: 'base64data', mimeType: 'image/png' };
      expect(extractTextFromContentBlock(block)).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // applyAcpSessionUpdate - All 11 update kinds
  // ─────────────────────────────────────────────────────────────────────────

  describe('applyAcpSessionUpdate', () => {
    let state: AcpSessionState;

    beforeEach(() => {
      state = createAcpSessionState();
    });

    // 1. agent_message_chunk
    it('should accumulate agent message chunks', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'Hello ' },
      };
      let result = applyAcpSessionUpdate(state, update);
      expect(result.agentMessage).toBe('Hello ');

      const update2: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'world' },
      };
      result = applyAcpSessionUpdate(result, update2);
      expect(result.agentMessage).toBe('Hello world');
      expect(result.lastUpdateAt).toBe(Date.now());
    });

    // 2. user_message_chunk
    it('should accumulate user message chunks', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'user_message_chunk',
        content: { type: 'text', text: 'User says ' },
      };
      let result = applyAcpSessionUpdate(state, update);

      const update2: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'user_message_chunk',
        content: { type: 'text', text: 'something' },
      };
      result = applyAcpSessionUpdate(result, update2);
      expect(result.userMessage).toBe('User says something');
    });

    // 3. agent_thought_chunk
    it('should accumulate agent thought chunks', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_thought_chunk',
        content: { type: 'text', text: 'Thinking about ' },
      };
      let result = applyAcpSessionUpdate(state, update);

      const update2: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_thought_chunk',
        content: { type: 'text', text: 'the problem' },
      };
      result = applyAcpSessionUpdate(result, update2);
      expect(result.agentThought).toBe('Thinking about the problem');
    });

    // 4. tool_call
    it('should add new tool call', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read File',
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.toolCalls['tc-1']).toBeDefined();
      expect(result.toolCalls['tc-1']!.title).toBe('Read File');
      expect(result.toolCalls['tc-1']!.toolCallId).toBe('tc-1');
    });

    // 5. tool_call_update - existing tool call
    it('should merge tool_call_update into existing tool call', () => {
      // First add a tool call
      const toolCall: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read File',
      };
      let result = applyAcpSessionUpdate(state, toolCall);

      // Then update it
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tc-1',
        title: 'Read File (updated)',
        status: 'completed',
      };
      result = applyAcpSessionUpdate(result, update);
      expect(result.toolCalls['tc-1']!.title).toBe('Read File (updated)');
      expect(result.toolCalls['tc-1']!.status).toBe('completed');
    });

    // 5b. tool_call_update - unknown tool call
    it('should create minimal entry for unknown tool_call_update', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tc-unknown',
        title: 'Unknown Tool Action',
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.toolCalls['tc-unknown']).toBeDefined();
      expect(result.toolCalls['tc-unknown']!.title).toBe('Unknown Tool Action');
    });

    // 5c. tool_call_update - null/undefined fields should not override existing
    it('should not override existing fields with null in tool_call_update', () => {
      const toolCall: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call',
        toolCallId: 'tc-1',
        title: 'Read File',
        kind: 'read',
      };
      let result = applyAcpSessionUpdate(state, toolCall);

      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'tool_call_update',
        toolCallId: 'tc-1',
        status: 'in_progress',
      };
      result = applyAcpSessionUpdate(result, update);
      expect(result.toolCalls['tc-1']!.title).toBe('Read File');
      expect(result.toolCalls['tc-1']!.kind).toBe('read');
      expect(result.toolCalls['tc-1']!.status).toBe('in_progress');
    });

    // 6. plan
    it('should replace entire plan', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'plan',
        entries: [
          { _meta: {}, content: 'Step 1', priority: 'high', status: 'in_progress' },
          { _meta: {}, content: 'Step 2', priority: 'medium', status: 'pending' },
        ],
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.plan).toHaveLength(2);
      expect(result.plan[0]!.content).toBe('Step 1');
      expect(result.plan[1]!.status).toBe('pending');
    });

    it('should replace previous plan entries entirely', () => {
      const plan1: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'plan',
        entries: [
          { _meta: {}, content: 'Old step', priority: 'low', status: 'completed' },
        ],
      };
      let result = applyAcpSessionUpdate(state, plan1);
      expect(result.plan).toHaveLength(1);

      const plan2: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'plan',
        entries: [
          { _meta: {}, content: 'New step A', priority: 'high', status: 'pending' },
          { _meta: {}, content: 'New step B', priority: 'high', status: 'pending' },
        ],
      };
      result = applyAcpSessionUpdate(result, plan2);
      expect(result.plan).toHaveLength(2);
      expect(result.plan[0]!.content).toBe('New step A');
    });

    // 7. available_commands_update
    it('should set available commands', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'available_commands_update',
        availableCommands: [
          { _meta: {}, name: '/help', description: 'Show help' },
          { _meta: {}, name: '/clear', description: 'Clear context' },
        ],
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.availableCommands).toHaveLength(2);
      expect(result.availableCommands[0]!.name).toBe('/help');
    });

    // 8. current_mode_update
    it('should update current mode', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'architect',
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.currentModeId).toBe('architect');
    });

    // 9. config_option_update
    it('should update config options', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'config_option_update',
        configOptions: [
          {
            _meta: {},
            id: 'model',
            name: 'Model',
            type: 'select',
            currentValue: 'opus',
            options: [
              { _meta: {}, value: 'opus', name: 'Claude Opus' },
              { _meta: {}, value: 'sonnet', name: 'Claude Sonnet' },
            ],
          },
        ],
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.configOptions).toHaveLength(1);
      expect(result.configOptions[0]!.id).toBe('model');
    });

    // 10. session_info_update
    it('should update session title', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'session_info_update',
        title: 'My Session',
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.sessionTitle).toBe('My Session');
    });

    it('should preserve existing title when update title is null', () => {
      state.sessionTitle = 'Existing Title';
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'session_info_update',
        title: null,
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.sessionTitle).toBe('Existing Title');
    });

    // 11. usage_update
    it('should update usage', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'usage_update',
        used: 50000,
        size: 200000,
        cost: { amount: 0.15, currency: 'USD' },
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.usage).toEqual({
        used: 50000,
        size: 200000,
        cost: { amount: 0.15, currency: 'USD' },
      });
    });

    it('should handle usage_update without cost', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'usage_update',
        used: 30000,
        size: 200000,
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.usage).toEqual({
        used: 30000,
        size: 200000,
        cost: null,
      });
    });

    // Immutability
    it('should return a new state object (immutable)', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: 'test' },
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result).not.toBe(state);
      expect(state.agentMessage).toBe('');
    });

    // Unknown update type
    it('should return same state for unknown update type', () => {
      const unknownUpdate = {
        _meta: {},
        sessionUpdate: 'unknown_type',
      } as unknown as AcpSessionUpdate;
      const result = applyAcpSessionUpdate(state, unknownUpdate);
      expect(result).toBe(state);
    });

    // Timestamp tracking
    it('should update lastUpdateAt on every update', () => {
      const update: AcpSessionUpdate = {
        _meta: {},
        sessionUpdate: 'current_mode_update',
        currentModeId: 'code',
      };
      const result = applyAcpSessionUpdate(state, update);
      expect(result.lastUpdateAt).toBe(Date.now());
    });
  });
});
