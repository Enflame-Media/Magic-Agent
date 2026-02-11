import { PrismaClient } from "@prisma/client";

// Support OpenAPI spec generation without database connection
// When OPENAPI_SPEC_ONLY is set, export a typed placeholder that won't connect
const isSpecOnly = process.env.OPENAPI_SPEC_ONLY === 'true';

// Use lazy initialization to prevent Prisma client creation during spec generation
let _db: PrismaClient | null = null;

function getDb(): PrismaClient {
    if (isSpecOnly) {
        // Return a proxy that does nothing but maintains type safety
        return new Proxy({} as PrismaClient, {
            get: () => () => Promise.resolve(null),
        });
    }
    if (!_db) {
        _db = new PrismaClient();
    }
    return _db;
}

// Export as getter for lazy initialization
export const db: PrismaClient = new Proxy({} as PrismaClient, {
    get: (_target, prop) => {
        return Reflect.get(getDb(), prop);
    },
});