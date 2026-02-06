import { describe, expect, it } from 'vitest';
import { deterministicStringify, hashObject, deepEqual, objectKey } from './deterministicJson';

describe('deterministicStringify', () => {
    it('should produce consistent output for objects with different key orders', () => {
        const obj1 = { b: 2, a: 1, c: 3 };
        const obj2 = { a: 1, c: 3, b: 2 };
        const obj3 = { c: 3, b: 2, a: 1 };

        const result1 = deterministicStringify(obj1);
        const result2 = deterministicStringify(obj2);
        const result3 = deterministicStringify(obj3);

        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
        expect(result1).toBe('{"a":1,"b":2,"c":3}');
    });

    it('should handle nested objects consistently', () => {
        const obj1 = {
            outer: { z: 26, y: 25 },
            inner: { b: 2, a: 1 }
        };
        const obj2 = {
            inner: { a: 1, b: 2 },
            outer: { y: 25, z: 26 }
        };

        expect(deterministicStringify(obj1)).toBe(deterministicStringify(obj2));
    });

    it('should handle arrays without sorting by default', () => {
        const obj = { arr: [3, 1, 2] };
        expect(deterministicStringify(obj)).toBe('{"arr":[3,1,2]}');
    });

    it('should sort arrays when sortArrays is true', () => {
        const obj = { arr: [3, 1, 2] };
        const result = deterministicStringify(obj, { sortArrays: true });
        expect(result).toBe('{"arr":[1,2,3]}');
    });

    it('should handle undefined values according to options', () => {
        const obj = { a: 1, b: undefined, c: 3 };

        // Default: omit
        expect(deterministicStringify(obj)).toBe('{"a":1,"c":3}');

        // null behavior
        expect(deterministicStringify(obj, { undefinedBehavior: 'null' }))
            .toBe('{"a":1,"b":null,"c":3}');

        // throw behavior
        expect(() => deterministicStringify(obj, { undefinedBehavior: 'throw' }))
            .toThrow('Undefined value at key: b');
    });

    it('should handle special types', () => {
        const date = new Date('2024-01-01T00:00:00.000Z');
        const obj = {
            date,
            regex: /test/gi,
            bigint: BigInt(123),
            func: () => {},
            symbol: Symbol('test')
        };

        const result = deterministicStringify(obj);
        expect(result).toBe('{"bigint":"123n","date":"2024-01-01T00:00:00.000Z","regex":"/test/gi"}');
    });

    it('should detect circular references', () => {
        const obj: any = { a: 1 };
        obj.circular = obj;

        expect(() => deterministicStringify(obj)).toThrow('Circular reference detected');
    });

    it('should handle complex nested structures', () => {
        const obj = {
            users: [
                { id: 2, name: 'Bob', tags: ['admin', 'user'] },
                { id: 1, name: 'Alice', tags: ['user'] }
            ],
            metadata: {
                version: '1.0',
                counts: { total: 2, active: 2 }
            }
        };

        const str1 = deterministicStringify(obj);
        const str2 = deterministicStringify(obj);
        expect(str1).toBe(str2);
    });

    it('should handle deeply nested arrays with sortArrays enabled without stack overflow', () => {
        // Create a deeply nested array structure that would cause stack overflow
        // if sortArrays re-processed already-processed items
        const createDeeplyNested = (depth: number): any => {
            if (depth === 0) return { value: 'leaf' };
            return [createDeeplyNested(depth - 1), createDeeplyNested(depth - 1)];
        };

        // Depth of 15 creates 2^15 = 32768 nodes - enough to cause stack overflow
        // if items were re-processed during sort
        const deeplyNested = createDeeplyNested(15);

        // This should not throw a stack overflow error
        expect(() => {
            deterministicStringify(deeplyNested, { sortArrays: true });
        }).not.toThrow();
    });

    it('should correctly sort deeply nested arrays', () => {
        // Verify sorting works correctly with nested structures
        const obj = {
            arr: [
                [3, 2, 1],
                [1, 2, 3],
                [2, 1, 3]
            ]
        };

        const result = deterministicStringify(obj, { sortArrays: true });
        // Inner arrays should be sorted, then outer array sorted by stringified content
        expect(result).toBe('{"arr":[[1,2,3],[1,2,3],[1,2,3]]}');
    });
});

describe('hashObject', () => {
    it('should produce consistent hashes for equivalent objects', () => {
        const obj1 = { b: 2, a: 1 };
        const obj2 = { a: 1, b: 2 };

        const hash1 = hashObject(obj1);
        const hash2 = hashObject(obj2);

        expect(hash1).toBe(hash2);
        expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('should produce different hashes for different objects', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 2 };

        expect(hashObject(obj1)).not.toBe(hashObject(obj2));
    });

    it('should support different encodings', () => {
        const obj = { a: 1 };

        const hex = hashObject(obj, undefined, 'hex');
        const base64 = hashObject(obj, undefined, 'base64');
        const base64url = hashObject(obj, undefined, 'base64url');

        expect(hex).toMatch(/^[a-f0-9]{64}$/);
        expect(base64).toMatch(/^[A-Za-z0-9+/]+=*$/);
        expect(base64url).toMatch(/^[A-Za-z0-9_-]+$/);
    });
});

describe('deepEqual', () => {
    it('should return true for deeply equal objects', () => {
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { b: { c: 2 }, a: 1 };

        expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should return false for different objects', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 2 };

        expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle arrays', () => {
        expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
        expect(deepEqual([1, 2, 3], [3, 2, 1])).toBe(false);
        expect(deepEqual([1, 2, 3], [3, 2, 1], { sortArrays: true })).toBe(true);
    });
});

describe('objectKey', () => {
    it('should produce stable keys for objects', () => {
        const obj1 = { b: 2, a: 1 };
        const obj2 = { a: 1, b: 2 };

        const key1 = objectKey(obj1);
        const key2 = objectKey(obj2);

        expect(key1).toBe(key2);
        expect(key1).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
    });

    it('should be suitable for Map keys', () => {
        const map = new Map<string, any>();

        const obj1 = { data: 'test', id: 1 };
        const obj2 = { id: 1, data: 'test' };

        map.set(objectKey(obj1), 'value1');
        expect(map.get(objectKey(obj2))).toBe('value1');
    });

    it('should produce different keys for different objects', () => {
        const obj1 = { a: 1 };
        const obj2 = { a: 2 };

        expect(objectKey(obj1)).not.toBe(objectKey(obj2));
    });
});

describe('deterministicStringify edge cases', () => {
    it('should handle null at top level', () => {
        expect(deterministicStringify(null)).toBe('null');
    });

    it('should handle primitives at top level', () => {
        expect(deterministicStringify(42)).toBe('42');
        expect(deterministicStringify('hello')).toBe('"hello"');
        expect(deterministicStringify(true)).toBe('true');
        expect(deterministicStringify(false)).toBe('false');
    });

    it('should handle empty array', () => {
        expect(deterministicStringify([])).toBe('[]');
    });

    it('should handle empty object', () => {
        expect(deterministicStringify({})).toBe('{}');
    });

    it('should handle array with undefined elements', () => {
        const result = deterministicStringify([1, undefined, 3]);
        expect(result).toBe('[1,3]');
    });

    it('should include undefined in array when null behavior is set', () => {
        const result = deterministicStringify([1, undefined, 3], { undefinedBehavior: 'null' });
        expect(result).toBe('[1,null,3]');
    });

    it('should handle object with function property', () => {
        const obj = { a: 1, fn: () => {}, b: 2 };
        const result = deterministicStringify(obj);
        expect(result).toBe('{"a":1,"b":2}');
    });

    it('should handle object with symbol property', () => {
        const obj = { a: 1, sym: Symbol('test'), b: 2 };
        const result = deterministicStringify(obj);
        expect(result).toBe('{"a":1,"b":2}');
    });

    it('should include symbol when includeSymbols is true', () => {
        const obj = { a: 1, sym: Symbol('test') };
        const result = deterministicStringify(obj, { includeSymbols: true });
        expect(result).toBe('{"a":1,"sym":"Symbol(test)"}');
    });

    it('should handle nested undefined with throw option', () => {
        const obj = { level1: { level2: undefined } };
        expect(() => deterministicStringify(obj, { undefinedBehavior: 'throw' }))
            .toThrow('Undefined value at key: level2');
    });

    it('should use replacer function on values', () => {
        const obj = { a: 1, b: 2 };
        const result = deterministicStringify(obj, {
            replacer: (key, value) => typeof value === 'number' ? value * 2 : value
        });
        expect(result).toBe('{"a":2,"b":4}');
    });

    it('should handle objects without constructor', () => {
        const obj = Object.create(null);
        obj.a = 1;
        obj.b = 2;
        const result = deterministicStringify(obj);
        expect(result).toBe('{"a":1,"b":2}');
    });

    it('should handle class instances by converting to plain object', () => {
        class MyClass {
            constructor(public value: number) {}
        }
        const instance = new MyClass(42);
        const result = deterministicStringify(instance);
        expect(result).toContain('42');
    });

    it('should sort array elements when sortArrays is enabled', () => {
        const arr = ['c', 'a', 'b'];
        const result = deterministicStringify(arr, { sortArrays: true });
        expect(result).toBe('["a","b","c"]');
    });

    it('should sort nested arrays when sortArrays is enabled', () => {
        const obj = { items: ['z', 'a', 'm'] };
        const result = deterministicStringify(obj, { sortArrays: true });
        expect(result).toBe('{"items":["a","m","z"]}');
    });

    it('should handle BigInt values', () => {
        const obj = { big: BigInt(12345678901234567890n) };
        const result = deterministicStringify(obj);
        expect(result).toContain('n');
    });

    it('should throw on circular reference in array', () => {
        const arr: any[] = [1, 2];
        arr.push(arr);
        expect(() => deterministicStringify(arr)).toThrow('Circular reference detected');
    });

    it('should throw on deeply nested circular reference', () => {
        const obj: any = { a: { b: { c: {} } } };
        obj.a.b.c.circular = obj;
        expect(() => deterministicStringify(obj)).toThrow('Circular reference detected');
    });
});

describe('deepEqual edge cases', () => {
    it('should return true for identical primitives', () => {
        expect(deepEqual(42, 42)).toBe(true);
        expect(deepEqual('test', 'test')).toBe(true);
        expect(deepEqual(null, null)).toBe(true);
    });

    it('should return false for different types', () => {
        expect(deepEqual(42, '42')).toBe(false);
        expect(deepEqual(null, undefined)).toBe(false);
    });

    it('should return false for circular references (caught as error)', () => {
        const obj1: any = { a: 1 };
        obj1.self = obj1;
        const obj2 = { a: 1, self: {} };
        expect(deepEqual(obj1, obj2)).toBe(false);
    });

    it('should handle deeply nested equality', () => {
        const obj1 = { a: { b: { c: { d: 1 } } } };
        const obj2 = { a: { b: { c: { d: 1 } } } };
        expect(deepEqual(obj1, obj2)).toBe(true);
    });

    it('should detect difference in deeply nested value', () => {
        const obj1 = { a: { b: { c: { d: 1 } } } };
        const obj2 = { a: { b: { c: { d: 2 } } } };
        expect(deepEqual(obj1, obj2)).toBe(false);
    });
});

describe('hashObject edge cases', () => {
    it('should handle empty object', () => {
        const hash = hashObject({});
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should handle null', () => {
        const hash = hashObject(null);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce different hashes for arrays with different order', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [3, 2, 1];
        expect(hashObject(arr1)).not.toBe(hashObject(arr2));
    });

    it('should produce same hash for arrays with sortArrays option', () => {
        const arr1 = [1, 2, 3];
        const arr2 = [3, 2, 1];
        expect(hashObject(arr1, { sortArrays: true })).toBe(hashObject(arr2, { sortArrays: true }));
    });

    it('should handle complex nested structures', () => {
        const obj = {
            users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
            metadata: { count: 2, date: new Date('2024-01-01') }
        };
        const hash = hashObject(obj);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
        expect(hash.length).toBe(64);
    });
});