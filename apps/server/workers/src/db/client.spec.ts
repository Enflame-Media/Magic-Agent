/**
 * Tests for Database Client
 *
 * Tests the getDb function that creates a typed Drizzle ORM client from D1.
 *
 * @module db/client.spec
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi } from 'vitest';

// Mock drizzle-orm before importing the client
vi.mock('drizzle-orm/d1', () => ({
    drizzle: vi.fn((d1, options) => ({
        _d1Instance: d1,
        _schema: options?.schema,
        query: {},
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    })),
}));

import { getDb, type DbClient } from './client';

describe('Database Client', () => {
    describe('getDb', () => {
        it('should create a Drizzle client from D1 instance', () => {
            const mockD1 = {
                prepare: vi.fn(),
                batch: vi.fn(),
                exec: vi.fn(),
                dump: vi.fn(),
            } as unknown as D1Database;

            const db = getDb(mockD1);

            expect(db).toBeDefined();
            expect((db as any)._d1Instance).toBe(mockD1);
        });

        it('should pass schema to Drizzle', () => {
            const mockD1 = {} as D1Database;

            const db = getDb(mockD1);

            expect((db as any)._schema).toBeDefined();
        });

        it('should return typed client with query methods', () => {
            const mockD1 = {} as D1Database;

            const db = getDb(mockD1);

            expect(db.query).toBeDefined();
            expect(db.select).toBeDefined();
            expect(db.insert).toBeDefined();
            expect(db.update).toBeDefined();
            expect(db.delete).toBeDefined();
        });
    });

    describe('DbClient type', () => {
        it('should be the return type of getDb', () => {
            const mockD1 = {} as D1Database;
            const db: DbClient = getDb(mockD1);

            // Type check - DbClient should match the return type
            expect(db).toBeDefined();
        });
    });
});
