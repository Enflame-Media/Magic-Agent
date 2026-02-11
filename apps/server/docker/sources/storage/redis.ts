import { Redis } from 'ioredis';

// Support OpenAPI spec generation without Redis connection
// When OPENAPI_SPEC_ONLY is set, export a typed placeholder that won't connect
const isSpecOnly = process.env.OPENAPI_SPEC_ONLY === 'true';

// Use lazy initialization to prevent Redis connection during spec generation
let _redis: Redis | null = null;

function getRedis(): Redis {
    if (isSpecOnly) {
        // Return a proxy that does nothing but maintains type safety
        return new Proxy({} as Redis, {
            get: () => () => Promise.resolve(null),
        });
    }
    if (!_redis) {
        _redis = new Redis(process.env.REDIS_URL!);
    }
    return _redis;
}

// Export as getter for lazy initialization
export const redis: Redis = new Proxy({} as Redis, {
    get: (_target, prop) => {
        return Reflect.get(getRedis(), prop);
    },
});