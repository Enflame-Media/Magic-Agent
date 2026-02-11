/**
 * Unit tests for safeSerialize.ts
 *
 * Tests cover:
 * - Circular reference handling
 * - Maximum depth limiting
 * - Error handling and fallbacks
 * - Pretty printing options
 * - Array and primitive handling
 *
 * @see HAP-848 Handle circular objects in remoteLogger serialization
 */
import { describe, it, expect } from 'vitest';
import { safeStringify, safeSerializeValue, safeSerializeArgs } from '../safeSerialize';

describe('safeSerialize', () => {
    describe('safeStringify', () => {
        it('handles primitive values', () => {
            expect(safeStringify('hello')).toBe('"hello"');
            expect(safeStringify(42)).toBe('42');
            expect(safeStringify(true)).toBe('true');
            expect(safeStringify(null)).toBe('null');
            expect(safeStringify(undefined)).toBe('undefined');
        });

        it('handles simple objects', () => {
            const obj = { name: 'test', value: 123 };
            const result = safeStringify(obj);
            expect(JSON.parse(result)).toEqual(obj);
        });

        it('handles arrays', () => {
            const arr = [1, 2, { nested: 'value' }];
            const result = safeStringify(arr);
            expect(JSON.parse(result)).toEqual(arr);
        });

        it('handles circular references without throwing', () => {
            const obj: Record<string, unknown> = { name: 'circular' };
            obj.self = obj;

            expect(() => safeStringify(obj)).not.toThrow();

            const result = safeStringify(obj);
            expect(result).toContain('[Circular]');
            expect(result).toContain('"name":"circular"');
        });

        it('handles nested circular references', () => {
            const parent: Record<string, unknown> = { name: 'parent' };
            const child: Record<string, unknown> = { name: 'child', parent };
            parent.child = child;

            expect(() => safeStringify(parent)).not.toThrow();

            const result = safeStringify(parent);
            expect(result).toContain('[Circular]');
        });

        it('handles deeply nested circular references', () => {
            const root: Record<string, unknown> = { level: 0 };
            let current = root;
            for (let i = 1; i <= 5; i++) {
                const next: Record<string, unknown> = { level: i };
                current.child = next;
                current = next;
            }
            // Create circular reference back to root
            current.backToRoot = root;

            expect(() => safeStringify(root)).not.toThrow();

            const result = safeStringify(root);
            expect(result).toContain('[Circular]');
        });

        it('respects maxDepth option', () => {
            const deep = {
                level1: {
                    level2: {
                        level3: {
                            level4: {
                                value: 'deep',
                            },
                        },
                    },
                },
            };

            const result = safeStringify(deep, { maxDepth: 2 });
            expect(result).toContain('[MaxDepth]');
        });

        it('supports indent option for pretty printing', () => {
            const obj = { name: 'test' };
            const pretty = safeStringify(obj, { indent: 2 });
            expect(pretty).toContain('\n');
            expect(pretty).toContain('  ');
        });

        it('handles functions by converting to string', () => {
            function myFunc() { return 42; }
            const result = safeStringify(myFunc);
            expect(result).toContain('[Function');
            expect(result).toContain('myFunc');
        });

        it('handles anonymous functions', () => {
            const result = safeStringify(() => {});
            expect(result).toContain('[Function');
        });

        it('handles Error objects', () => {
            const error = new Error('Test error');
            const result = safeStringify(error);
            expect(result).toContain('Test error');
            expect(result).toContain('Error');
        });

        it('handles objects with multiple circular references', () => {
            const obj: Record<string, unknown> = { name: 'multi' };
            obj.ref1 = obj;
            obj.ref2 = obj;
            obj.nested = { ref3: obj };

            expect(() => safeStringify(obj)).not.toThrow();

            const result = safeStringify(obj);
            // Should have circular markers
            expect(result).toContain('[Circular]');
        });
    });

    describe('safeSerializeValue', () => {
        it('passes through primitives unchanged', () => {
            expect(safeSerializeValue('hello')).toBe('hello');
            expect(safeSerializeValue(42)).toBe(42);
            expect(safeSerializeValue(true)).toBe(true);
            expect(safeSerializeValue(null)).toBe(null);
            expect(safeSerializeValue(undefined)).toBe(undefined);
        });

        it('converts circular objects to safe objects', () => {
            const obj: Record<string, unknown> = { name: 'circular' };
            obj.self = obj;

            const result = safeSerializeValue(obj) as Record<string, unknown>;

            expect(result.name).toBe('circular');
            expect(result.self).toBe('[Circular]');
        });

        it('handles deeply nested objects', () => {
            const deep = {
                level1: {
                    level2: {
                        value: 'nested',
                    },
                },
            };

            const result = safeSerializeValue(deep) as Record<string, unknown>;
            expect((result.level1 as Record<string, unknown>).level2).toEqual({ value: 'nested' });
        });

        it('converts functions to descriptive strings', () => {
            function namedFunc() { return 1; }
            const result = safeSerializeValue(namedFunc);
            expect(result).toContain('[Function');
        });
    });

    describe('safeSerializeArgs', () => {
        it('handles array of mixed types', () => {
            const args = ['message', 42, { key: 'value' }, true];
            const result = safeSerializeArgs(args);

            expect(result[0]).toBe('message');
            expect(result[1]).toBe(42);
            expect(result[2]).toEqual({ key: 'value' });
            expect(result[3]).toBe(true);
        });

        it('handles array with circular objects', () => {
            const circular: Record<string, unknown> = { name: 'test' };
            circular.self = circular;

            const args = ['prefix', circular, 'suffix'];
            const result = safeSerializeArgs(args);

            expect(result[0]).toBe('prefix');
            expect((result[1] as Record<string, unknown>).self).toBe('[Circular]');
            expect(result[2]).toBe('suffix');
        });

        it('isolates failures to individual args', () => {
            // Create objects that would be processed
            const good = { name: 'good' };
            const circular: Record<string, unknown> = { name: 'circular' };
            circular.self = circular;

            const args = [good, circular, 'string'];
            const result = safeSerializeArgs(args);

            // All should be processed without throwing
            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({ name: 'good' });
            expect((result[1] as Record<string, unknown>).self).toBe('[Circular]');
            expect(result[2]).toBe('string');
        });

        it('handles empty array', () => {
            const result = safeSerializeArgs([]);
            expect(result).toEqual([]);
        });

        it('handles nested arrays', () => {
            const args = [[1, 2, [3, 4]], { arr: [5, 6] }];
            const result = safeSerializeArgs(args);

            expect(result[0]).toEqual([1, 2, [3, 4]]);
            expect((result[1] as Record<string, unknown>).arr).toEqual([5, 6]);
        });
    });

    describe('edge cases', () => {
        it('handles Date objects', () => {
            const date = new Date('2024-01-15T10:30:00Z');
            const result = safeStringify(date);
            expect(result).toContain('2024-01-15');
        });

        it('handles RegExp objects', () => {
            const regex = /test/gi;
            const result = safeStringify(regex);
            // RegExp serializes to empty object in JSON
            expect(result).toBe('{}');
        });

        it('handles Map and Set (serializes to object)', () => {
            const map = new Map([['key', 'value']]);
            const set = new Set([1, 2, 3]);

            // Maps and Sets serialize to empty objects in JSON
            expect(safeStringify(map)).toBe('{}');
            expect(safeStringify(set)).toBe('{}');
        });

        it('handles objects with null prototype', () => {
            const obj = Object.create(null);
            obj.key = 'value';

            const result = safeStringify(obj);
            expect(result).toContain('"key":"value"');
        });

        it('handles objects with toJSON method', () => {
            const obj = {
                value: 42,
                toJSON() {
                    return { serialized: this.value };
                },
            };

            const result = safeStringify(obj);
            expect(JSON.parse(result)).toEqual({ serialized: 42 });
        });

        it('handles BigInt by falling back gracefully', () => {
            // BigInt cannot be serialized with JSON.stringify
            // Our safeStringify should handle this gracefully
            const obj = { big: BigInt(9007199254740991) };

            // This would normally throw with JSON.stringify
            expect(() => safeStringify(obj)).not.toThrow();
        });

        it('handles Symbol properties (they are skipped)', () => {
            const sym = Symbol('test');
            const obj = { [sym]: 'hidden', visible: 'shown' };

            const result = safeStringify(obj);
            expect(result).toContain('visible');
            expect(result).not.toContain('hidden');
        });
    });
});
