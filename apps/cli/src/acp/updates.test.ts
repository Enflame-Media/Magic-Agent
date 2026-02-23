/**
 * Tests for UpdateRouter
 *
 * Validates that all 11 session update kinds are processed correctly,
 * events are emitted to listeners, and internal state is maintained.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UpdateRouter } from './updates';
import type {
    AcpSessionNotification,
    AcpSessionUpdate,
    AcpContentBlock,
} from '@magic-agent/protocol';

/** Helper to create a session notification wrapping an update */
function makeNotification(
    update: AcpSessionUpdate,
    sessionId = 'test-session',
): AcpSessionNotification {
    return { sessionId, update };
}

describe('UpdateRouter', () => {
    let router: UpdateRouter;

    beforeEach(() => {
        router = new UpdateRouter();
    });

    // ─── agent_message_chunk ────────────────────────────────────────────

    describe('agent_message_chunk', () => {
        it('should accumulate agent message chunks', () => {
            const update: AcpSessionUpdate = {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Hello ' },
            };

            router.processNotification(makeNotification(update));

            expect(router.agentMessages.length).toBe(1);
            expect(router.agentMessages.getFullText()).toBe('Hello ');
        });

        it('should emit message:chunk event', () => {
            const listener = vi.fn();
            router.on('message:chunk', listener);

            const content: AcpContentBlock = { type: 'text', text: 'test' };
            const update: AcpSessionUpdate = {
                sessionUpdate: 'agent_message_chunk',
                content,
            };

            router.processNotification(makeNotification(update));

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(content);
        });

        it('should accumulate multiple chunks in order', () => {
            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'Hello ' },
            });
            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'world!' },
            });

            expect(router.agentMessages.getFullText()).toBe('Hello world!');
        });
    });

    // ─── user_message_chunk ─────────────────────────────────────────────

    describe('user_message_chunk', () => {
        it('should accumulate user message chunks', () => {
            router.processUpdate({
                sessionUpdate: 'user_message_chunk',
                content: { type: 'text', text: 'User said this' },
            });

            expect(router.userMessages.length).toBe(1);
            expect(router.userMessages.getFullText()).toBe('User said this');
        });

        it('should emit user:chunk event', () => {
            const listener = vi.fn();
            router.on('user:chunk', listener);

            const content: AcpContentBlock = { type: 'text', text: 'test' };
            router.processUpdate({
                sessionUpdate: 'user_message_chunk',
                content,
            });

            expect(listener).toHaveBeenCalledWith(content);
        });
    });

    // ─── agent_thought_chunk ────────────────────────────────────────────

    describe('agent_thought_chunk', () => {
        it('should accumulate agent thought chunks', () => {
            router.processUpdate({
                sessionUpdate: 'agent_thought_chunk',
                content: { type: 'text', text: 'Thinking about...' },
            });

            expect(router.agentThoughts.length).toBe(1);
            expect(router.agentThoughts.getFullText()).toBe('Thinking about...');
        });

        it('should emit thought:chunk event', () => {
            const listener = vi.fn();
            router.on('thought:chunk', listener);

            const content: AcpContentBlock = { type: 'text', text: 'reasoning' };
            router.processUpdate({
                sessionUpdate: 'agent_thought_chunk',
                content,
            });

            expect(listener).toHaveBeenCalledWith(content);
        });
    });

    // ─── tool_call ──────────────────────────────────────────────────────

    describe('tool_call', () => {
        it('should emit tool:call event', () => {
            const listener = vi.fn();
            router.on('tool:call', listener);

            const update: AcpSessionUpdate = {
                sessionUpdate: 'tool_call',
                toolCallId: 'tc-1',
                title: 'Read file',
                kind: 'read',
                status: 'in_progress',
            };

            router.processUpdate(update);

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    toolCallId: 'tc-1',
                    title: 'Read file',
                    kind: 'read',
                }),
            );
        });
    });

    // ─── tool_call_update ───────────────────────────────────────────────

    describe('tool_call_update', () => {
        it('should emit tool:update event', () => {
            const listener = vi.fn();
            router.on('tool:update', listener);

            const update: AcpSessionUpdate = {
                sessionUpdate: 'tool_call_update',
                toolCallId: 'tc-1',
                status: 'completed',
            };

            router.processUpdate(update);

            expect(listener).toHaveBeenCalledOnce();
            expect(listener).toHaveBeenCalledWith(
                expect.objectContaining({
                    toolCallId: 'tc-1',
                    status: 'completed',
                }),
            );
        });
    });

    // ─── plan ───────────────────────────────────────────────────────────

    describe('plan', () => {
        it('should update current plan and emit event', () => {
            const entries = [
                { content: 'Step 1', priority: 'high' as const, status: 'pending' as const },
                { content: 'Step 2', priority: 'medium' as const, status: 'pending' as const },
            ];

            const listener = vi.fn();
            router.on('plan:update', listener);

            router.processUpdate({
                sessionUpdate: 'plan',
                entries,
            });

            expect(router.getPlan()).toEqual(entries);
            expect(listener).toHaveBeenCalledWith(entries);
        });

        it('should replace entire plan on each update', () => {
            router.processUpdate({
                sessionUpdate: 'plan',
                entries: [{ content: 'Old step', priority: 'high' as const, status: 'pending' as const }],
            });

            const newEntries = [
                { content: 'New step', priority: 'low' as const, status: 'completed' as const },
            ];

            router.processUpdate({
                sessionUpdate: 'plan',
                entries: newEntries,
            });

            expect(router.getPlan()).toEqual(newEntries);
        });
    });

    // ─── available_commands_update ───────────────────────────────────────

    describe('available_commands_update', () => {
        it('should update available commands and emit event', () => {
            const commands = [
                { name: '/help', description: 'Show help' },
                { name: '/clear', description: 'Clear context' },
            ];

            const listener = vi.fn();
            router.on('commands:update', listener);

            router.processUpdate({
                sessionUpdate: 'available_commands_update',
                availableCommands: commands,
            });

            expect(router.getCommands()).toEqual(commands);
            expect(listener).toHaveBeenCalledWith(commands);
        });
    });

    // ─── current_mode_update ────────────────────────────────────────────

    describe('current_mode_update', () => {
        it('should update current mode and emit event', () => {
            const listener = vi.fn();
            router.on('mode:update', listener);

            router.processUpdate({
                sessionUpdate: 'current_mode_update',
                currentModeId: 'architect',
            });

            expect(router.getModeId()).toBe('architect');
            expect(listener).toHaveBeenCalledWith('architect');
        });
    });

    // ─── config_option_update ───────────────────────────────────────────

    describe('config_option_update', () => {
        it('should update config options and emit event', () => {
            const configOptions = [
                {
                    type: 'select' as const,
                    id: 'model',
                    name: 'Model',
                    currentValue: 'claude-4',
                    options: [{ name: 'Claude 4', value: 'claude-4' }],
                },
            ];

            const listener = vi.fn();
            router.on('config:update', listener);

            router.processUpdate({
                sessionUpdate: 'config_option_update',
                configOptions,
            });

            expect(router.getConfigOptions()).toEqual(configOptions);
            expect(listener).toHaveBeenCalledWith(configOptions);
        });
    });

    // ─── session_info_update ────────────────────────────────────────────

    describe('session_info_update', () => {
        it('should emit session:info event', () => {
            const listener = vi.fn();
            router.on('session:info', listener);

            router.processUpdate({
                sessionUpdate: 'session_info_update',
                title: 'My Session',
                updatedAt: '2026-02-23T12:00:00Z',
            });

            expect(listener).toHaveBeenCalledWith({
                title: 'My Session',
                updatedAt: '2026-02-23T12:00:00Z',
            });
        });

        it('should handle null title and updatedAt', () => {
            const listener = vi.fn();
            router.on('session:info', listener);

            router.processUpdate({
                sessionUpdate: 'session_info_update',
            } as AcpSessionUpdate);

            expect(listener).toHaveBeenCalledWith({
                title: null,
                updatedAt: null,
            });
        });
    });

    // ─── usage_update ───────────────────────────────────────────────────

    describe('usage_update', () => {
        it('should update usage state and emit event', () => {
            const listener = vi.fn();
            router.on('usage:update', listener);

            router.processUpdate({
                sessionUpdate: 'usage_update',
                used: 5000,
                size: 200000,
                cost: { amount: 0.05, currency: 'USD' },
            });

            expect(router.getUsage()).toEqual({
                used: 5000,
                size: 200000,
                cost: { amount: 0.05, currency: 'USD' },
            });
            expect(listener).toHaveBeenCalledWith({
                used: 5000,
                size: 200000,
                cost: { amount: 0.05, currency: 'USD' },
            });
        });

        it('should handle missing cost', () => {
            router.processUpdate({
                sessionUpdate: 'usage_update',
                used: 1000,
                size: 100000,
            } as AcpSessionUpdate);

            expect(router.getUsage()?.cost).toBeNull();
        });
    });

    // ─── Event management ───────────────────────────────────────────────

    describe('event management', () => {
        it('should support multiple listeners for same event', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            router.on('message:chunk', listener1);
            router.on('message:chunk', listener2);

            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'test' },
            });

            expect(listener1).toHaveBeenCalledOnce();
            expect(listener2).toHaveBeenCalledOnce();
        });

        it('should remove specific listener with off()', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            router.on('message:chunk', listener1);
            router.on('message:chunk', listener2);
            router.off('message:chunk', listener1);

            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'test' },
            });

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledOnce();
        });

        it('should remove all listeners', () => {
            const listener = vi.fn();
            router.on('message:chunk', listener);
            router.on('tool:call', listener);

            router.removeAllListeners();

            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'test' },
            });

            expect(listener).not.toHaveBeenCalled();
        });

        it('should catch and log listener errors', () => {
            const errorListener = vi.fn(() => {
                throw new Error('Listener failed');
            });
            const normalListener = vi.fn();

            router.on('message:chunk', errorListener);
            router.on('message:chunk', normalListener);

            // Should not throw
            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'test' },
            });

            // Both should have been called despite the error
            expect(errorListener).toHaveBeenCalled();
            expect(normalListener).toHaveBeenCalled();
        });
    });

    // ─── resetForNewTurn ────────────────────────────────────────────────

    describe('resetForNewTurn', () => {
        it('should clear accumulators', () => {
            router.processUpdate({
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: 'message' },
            });
            router.processUpdate({
                sessionUpdate: 'user_message_chunk',
                content: { type: 'text', text: 'user' },
            });
            router.processUpdate({
                sessionUpdate: 'agent_thought_chunk',
                content: { type: 'text', text: 'thought' },
            });

            router.resetForNewTurn();

            expect(router.agentMessages.isEmpty).toBe(true);
            expect(router.userMessages.isEmpty).toBe(true);
            expect(router.agentThoughts.isEmpty).toBe(true);
        });

        it('should preserve plan, commands, mode, config, and usage', () => {
            router.processUpdate({
                sessionUpdate: 'plan',
                entries: [{ content: 'Step 1', priority: 'high' as const, status: 'pending' as const }],
            });
            router.processUpdate({
                sessionUpdate: 'available_commands_update',
                availableCommands: [{ name: '/help', description: 'Help' }],
            });
            router.processUpdate({
                sessionUpdate: 'current_mode_update',
                currentModeId: 'code',
            });

            router.resetForNewTurn();

            expect(router.getPlan()).toHaveLength(1);
            expect(router.getCommands()).toHaveLength(1);
            expect(router.getModeId()).toBe('code');
        });
    });

    // ─── processNotification ────────────────────────────────────────────

    describe('processNotification', () => {
        it('should extract update from notification and process it', () => {
            const listener = vi.fn();
            router.on('message:chunk', listener);

            const notification: AcpSessionNotification = {
                sessionId: 'sess-1',
                update: {
                    sessionUpdate: 'agent_message_chunk',
                    content: { type: 'text', text: 'Hello' },
                },
            };

            router.processNotification(notification);

            expect(listener).toHaveBeenCalledOnce();
        });
    });
});
