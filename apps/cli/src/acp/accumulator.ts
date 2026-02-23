/**
 * ACP Message Accumulator
 *
 * Accumulates streamed content chunks into coherent messages during a prompt turn.
 * Chunks arrive as individual ContentBlock fragments and are stored in arrival order.
 * Supports extracting concatenated text from all text-type content blocks.
 *
 * @see https://agentclientprotocol.com/protocol/prompt-turn#3-agent-reports-output
 */

import type { AcpContentBlock } from '@magic-agent/protocol';

/**
 * Accumulates ACP content blocks from streaming chunks into coherent messages.
 *
 * Content blocks arrive as fragments during a prompt turn and must be stored
 * in order. This class provides methods to access accumulated content and
 * extract concatenated text.
 *
 * @example
 * ```typescript
 * const accumulator = new MessageAccumulator();
 *
 * // As chunks arrive from session/update notifications:
 * accumulator.addChunk({ type: 'text', text: 'Hello ' });
 * accumulator.addChunk({ type: 'text', text: 'world!' });
 *
 * console.log(accumulator.getFullText()); // "Hello world!"
 * console.log(accumulator.chunks.length); // 2
 *
 * accumulator.reset(); // Prepare for next turn
 * ```
 */
export class MessageAccumulator {
    private readonly contentBlocks: AcpContentBlock[] = [];

    /** Add a content block chunk in arrival order */
    addChunk(content: AcpContentBlock): void {
        this.contentBlocks.push(content);
    }

    /** Get all accumulated content blocks in arrival order */
    get chunks(): ReadonlyArray<AcpContentBlock> {
        return this.contentBlocks;
    }

    /** Number of accumulated chunks */
    get length(): number {
        return this.contentBlocks.length;
    }

    /**
     * Concatenate all text-type content blocks into a single string.
     *
     * Non-text content blocks (image, audio, resource_link, resource)
     * are skipped. Text blocks are joined without separator since
     * the agent sends continuous text fragments.
     */
    getFullText(): string {
        let text = '';
        for (const block of this.contentBlocks) {
            if (block.type === 'text') {
                text += block.text;
            }
        }
        return text;
    }

    /** Whether any chunks have been accumulated */
    get isEmpty(): boolean {
        return this.contentBlocks.length === 0;
    }

    /** Clear all accumulated chunks for the next turn */
    reset(): void {
        this.contentBlocks.length = 0;
    }
}
