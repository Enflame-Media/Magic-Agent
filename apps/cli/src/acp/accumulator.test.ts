/**
 * Tests for MessageAccumulator
 *
 * Validates content block accumulation, text extraction, and reset behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MessageAccumulator } from './accumulator';
import type { AcpContentBlock } from '@magic-agent/protocol';

describe('MessageAccumulator', () => {
    let accumulator: MessageAccumulator;

    beforeEach(() => {
        accumulator = new MessageAccumulator();
    });

    describe('initial state', () => {
        it('should start empty', () => {
            expect(accumulator.isEmpty).toBe(true);
            expect(accumulator.length).toBe(0);
            expect(accumulator.chunks).toEqual([]);
            expect(accumulator.getFullText()).toBe('');
        });
    });

    describe('addChunk', () => {
        it('should accumulate text chunks in order', () => {
            const chunk1: AcpContentBlock = { type: 'text', text: 'Hello ' };
            const chunk2: AcpContentBlock = { type: 'text', text: 'world!' };

            accumulator.addChunk(chunk1);
            accumulator.addChunk(chunk2);

            expect(accumulator.length).toBe(2);
            expect(accumulator.isEmpty).toBe(false);
            expect(accumulator.chunks[0]).toBe(chunk1);
            expect(accumulator.chunks[1]).toBe(chunk2);
        });

        it('should accumulate mixed content types', () => {
            const textChunk: AcpContentBlock = { type: 'text', text: 'Look at this:' };
            const imageChunk: AcpContentBlock = {
                type: 'image',
                data: 'base64data',
                mimeType: 'image/png',
            };
            const resourceLink: AcpContentBlock = {
                type: 'resource_link',
                uri: 'file:///path/to/file.ts',
                name: 'file.ts',
            };

            accumulator.addChunk(textChunk);
            accumulator.addChunk(imageChunk);
            accumulator.addChunk(resourceLink);

            expect(accumulator.length).toBe(3);
        });
    });

    describe('getFullText', () => {
        it('should concatenate text blocks without separator', () => {
            accumulator.addChunk({ type: 'text', text: 'Hello ' });
            accumulator.addChunk({ type: 'text', text: 'world' });
            accumulator.addChunk({ type: 'text', text: '!' });

            expect(accumulator.getFullText()).toBe('Hello world!');
        });

        it('should skip non-text content blocks', () => {
            accumulator.addChunk({ type: 'text', text: 'Before ' });
            accumulator.addChunk({
                type: 'image',
                data: 'base64',
                mimeType: 'image/png',
            });
            accumulator.addChunk({ type: 'text', text: 'after' });

            expect(accumulator.getFullText()).toBe('Before after');
        });

        it('should return empty string when no text blocks exist', () => {
            accumulator.addChunk({
                type: 'image',
                data: 'base64',
                mimeType: 'image/png',
            });

            expect(accumulator.getFullText()).toBe('');
        });
    });

    describe('reset', () => {
        it('should clear all accumulated chunks', () => {
            accumulator.addChunk({ type: 'text', text: 'Hello' });
            accumulator.addChunk({ type: 'text', text: ' world' });

            expect(accumulator.length).toBe(2);

            accumulator.reset();

            expect(accumulator.isEmpty).toBe(true);
            expect(accumulator.length).toBe(0);
            expect(accumulator.getFullText()).toBe('');
        });

        it('should allow reuse after reset', () => {
            accumulator.addChunk({ type: 'text', text: 'First turn' });
            accumulator.reset();
            accumulator.addChunk({ type: 'text', text: 'Second turn' });

            expect(accumulator.getFullText()).toBe('Second turn');
            expect(accumulator.length).toBe(1);
        });
    });

    describe('chunks (readonly)', () => {
        it('should return chunks as a readonly array', () => {
            const chunk: AcpContentBlock = { type: 'text', text: 'test' };
            accumulator.addChunk(chunk);

            const chunks = accumulator.chunks;
            expect(chunks).toHaveLength(1);
            expect(chunks[0]).toBe(chunk);
        });
    });
});
