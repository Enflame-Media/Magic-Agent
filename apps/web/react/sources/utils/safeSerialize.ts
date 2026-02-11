/**
 * Safe serialization utility for handling circular references and complex objects.
 *
 * This module provides functions to safely serialize JavaScript objects that may
 * contain circular references, which would cause JSON.stringify to throw.
 *
 * Key features:
 * - Handles circular references by replacing them with a placeholder string
 * - Limits serialization depth to prevent excessive output
 * - Provides both pretty-printed and compact output options
 * - Never throws - returns a fallback representation on any error
 *
 * @module utils/safeSerialize
 * @see HAP-848 Handle circular objects in remoteLogger serialization
 */

/**
 * Default maximum depth for serialization.
 * Deeper nested objects will be replaced with a placeholder.
 */
const DEFAULT_MAX_DEPTH = 10;

/**
 * Placeholder string for circular references
 */
const CIRCULAR_REF_PLACEHOLDER = '[Circular]';

/**
 * Placeholder string for max depth exceeded
 */
const MAX_DEPTH_PLACEHOLDER = '[MaxDepth]';

/**
 * Options for safe serialization
 */
interface SafeSerializeOptions {
    /**
     * Maximum depth to serialize nested objects.
     * Objects nested deeper than this will be replaced with [MaxDepth].
     * Default: 10
     */
    maxDepth?: number;

    /**
     * Number of spaces for indentation in pretty-print mode.
     * Set to 0 or undefined for compact output.
     */
    indent?: number;
}

/**
 * Creates a replacer function for JSON.stringify that handles circular references.
 * Tracks seen objects using a WeakSet and replaces circular refs with a placeholder.
 *
 * @param maxDepth Maximum nesting depth to serialize
 * @returns A replacer function compatible with JSON.stringify
 */
function createCircularReplacer(maxDepth: number): (this: unknown, key: string, value: unknown) => unknown {
    const seen = new WeakSet<object>();
    const ancestors: unknown[] = [];

    return function (this: unknown, key: string, value: unknown): unknown {
        // Root object case - key is empty string
        if (key === '' && typeof value === 'object' && value !== null) {
            seen.add(value);
            ancestors.push(value);
            return value;
        }

        // Non-object primitives pass through
        if (typeof value !== 'object' || value === null) {
            return value;
        }

        // Pop ancestors that are no longer in our path
        // The JSON.stringify context 'this' is the parent object
        while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
            const removed = ancestors.pop();
            if (removed && typeof removed === 'object') {
                seen.delete(removed);
            }
        }

        // Check depth
        if (ancestors.length >= maxDepth) {
            return MAX_DEPTH_PLACEHOLDER;
        }

        // Check for circular reference
        if (seen.has(value)) {
            return CIRCULAR_REF_PLACEHOLDER;
        }

        // Track this object
        seen.add(value);
        ancestors.push(value);

        return value;
    };
}

/**
 * Safely serializes a value to JSON string, handling circular references.
 *
 * Unlike JSON.stringify, this function:
 * - Never throws for circular references (replaces with [Circular])
 * - Limits depth to prevent huge output (replaces deep objects with [MaxDepth])
 * - Returns a safe fallback string on any unexpected error
 *
 * @param value The value to serialize
 * @param options Serialization options
 * @returns JSON string representation, or fallback on error
 *
 * @example
 * // Handle circular references
 * const obj = { name: 'test' };
 * obj.self = obj;
 * safeStringify(obj);
 * // Returns: '{"name":"test","self":"[Circular]"}'
 *
 * @example
 * // With pretty printing
 * safeStringify({ foo: 'bar' }, { indent: 2 });
 * // Returns: '{\n  "foo": "bar"\n}'
 */
export function safeStringify(value: unknown, options: SafeSerializeOptions = {}): string {
    const { maxDepth = DEFAULT_MAX_DEPTH, indent } = options;

    try {
        // Handle primitives directly - they can't be circular
        if (value === null || value === undefined) {
            return String(value);
        }

        if (typeof value !== 'object' && typeof value !== 'function') {
            return JSON.stringify(value);
        }

        // Handle function type
        if (typeof value === 'function') {
            return `[Function: ${value.name || 'anonymous'}]`;
        }

        // Handle Error objects specially for better output
        if (value instanceof Error) {
            return JSON.stringify({
                name: value.name,
                message: value.message,
                stack: value.stack,
            }, null, indent);
        }

        // Use circular replacer for objects
        const replacer = createCircularReplacer(maxDepth);
        return JSON.stringify(value, replacer, indent);
    } catch {
        // Final fallback - should rarely happen, but ensures we never throw
        try {
            // Try to get some useful info
            if (value && typeof value === 'object') {
                const constructor = (value as object).constructor?.name || 'Object';
                return `[${constructor}: serialization failed]`;
            }
            return '[Serialization failed]';
        } catch {
            return '[Serialization failed]';
        }
    }
}

/**
 * Safely serializes a value for inclusion in a larger JSON payload.
 * Returns the actual value if safe to serialize, or a placeholder string if not.
 *
 * This is useful when you need to include a potentially circular object
 * as part of a larger JSON structure that will be stringified later.
 *
 * @param value The value to make safe for JSON
 * @param maxDepth Maximum depth to serialize
 * @returns A JSON-safe version of the value
 *
 * @example
 * const circularObj = { name: 'test' };
 * circularObj.self = circularObj;
 *
 * const payload = {
 *     message: 'Log entry',
 *     data: safeSerializeValue(circularObj)
 * };
 *
 * JSON.stringify(payload); // Works without throwing
 */
export function safeSerializeValue(value: unknown, maxDepth: number = DEFAULT_MAX_DEPTH): unknown {
    // Primitives are always safe
    if (value === null || value === undefined) {
        return value;
    }

    if (typeof value !== 'object' && typeof value !== 'function') {
        return value;
    }

    if (typeof value === 'function') {
        return `[Function: ${value.name || 'anonymous'}]`;
    }

    // For objects, we need to create a safe copy
    try {
        // Parse the safe stringified version to get a circular-free object
        const safeString = safeStringify(value, { maxDepth });
        return JSON.parse(safeString);
    } catch {
        return '[Serialization failed]';
    }
}

/**
 * Safely serializes an array of arguments for logging.
 * Each argument is processed independently so one bad argument
 * doesn't prevent others from being serialized.
 *
 * @param args Array of values to serialize
 * @param maxDepth Maximum depth for each value
 * @returns Array of JSON-safe values
 *
 * @example
 * const circular = { name: 'test' };
 * circular.self = circular;
 *
 * safeSerializeArgs(['message', circular, 42]);
 * // Returns: ['message', { name: 'test', self: '[Circular]' }, 42]
 */
export function safeSerializeArgs(args: unknown[], maxDepth: number = DEFAULT_MAX_DEPTH): unknown[] {
    return args.map((arg) => {
        try {
            return safeSerializeValue(arg, maxDepth);
        } catch {
            // Individual arg serialization failed - use placeholder
            return '[Serialization failed]';
        }
    });
}
