import * as privacyKit from "privacy-kit";
import { log } from "@/utils/log";
import { AppError, ErrorCodes } from "@/utils/errors";
import { LRUCache, type CacheStats } from "@/utils/lruCache";

/**
 * Token cache configuration constants.
 * These values prevent memory exhaustion from unbounded cache growth.
 */
const TOKEN_CACHE_MAX_SIZE = 10000; // Maximum cached tokens (10k * ~500 bytes = ~5MB max)
const TOKEN_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours - tokens expire for security

interface TokenCacheEntry {
    userId: string;
    extras?: any;
}

interface AuthTokens {
    generator: Awaited<ReturnType<typeof privacyKit.createPersistentTokenGenerator>>;
    verifier: Awaited<ReturnType<typeof privacyKit.createPersistentTokenVerifier>>;
    gitHubVerifier: Awaited<ReturnType<typeof privacyKit.createEphemeralTokenVerifier>>;
    gitHubGenerator: Awaited<ReturnType<typeof privacyKit.createEphemeralTokenGenerator>>;
}

class AuthModule {
    private tokenCache = new LRUCache<string, TokenCacheEntry>(
        TOKEN_CACHE_MAX_SIZE,
        TOKEN_CACHE_TTL_MS
    );
    private tokens: AuthTokens | null = null;
    
    async init(): Promise<void> {
        if (this.tokens) {
            return; // Already initialized
        }
        
        log({ module: 'auth' }, 'Initializing auth module...');
        
        const generator = await privacyKit.createPersistentTokenGenerator({
            service: 'handy',
            seed: process.env.HANDY_MASTER_SECRET!
        });

        
        const verifier = await privacyKit.createPersistentTokenVerifier({
            service: 'handy',
            publicKey: generator.publicKey
        });
        
        const gitHubGenerator = await privacyKit.createEphemeralTokenGenerator({
            service: 'github-happy',
            seed: process.env.HANDY_MASTER_SECRET!,
            ttl: 5 * 60 * 1000 // 5 minutes
        });

        const gitHubVerifier = await privacyKit.createEphemeralTokenVerifier({
            service: 'github-happy',
            publicKey: gitHubGenerator.publicKey,
        });


        this.tokens = { generator, verifier, gitHubVerifier, gitHubGenerator };
        
        log({ module: 'auth' }, 'Auth module initialized');
    }
    
    async createToken(userId: string, extras?: any): Promise<string> {
        if (!this.tokens) {
            throw new AppError(ErrorCodes.AUTH_NOT_INITIALIZED, 'Auth module not initialized');
        }

        const payload: any = { user: userId };
        if (extras) {
            payload.extras = extras;
        }
        
        const token = await this.tokens.generator.new(payload);
        
        // Cache the token (LRU cache handles TTL and eviction automatically)
        this.tokenCache.set(token, {
            userId,
            extras,
        });
        
        return token;
    }
    
    async verifyToken(token: string): Promise<{ userId: string; extras?: any } | null> {
        // Check cache first
        const cached = this.tokenCache.get(token);
        if (cached) {
            return {
                userId: cached.userId,
                extras: cached.extras
            };
        }
        
        // Cache miss - verify token
        if (!this.tokens) {
            throw new AppError(ErrorCodes.AUTH_NOT_INITIALIZED, 'Auth module not initialized');
        }
        
        try {
            const verified = await this.tokens.verifier.verify(token);
            if (!verified) {
                return null;
            }
            
            const userId = verified.user as string;
            const extras = verified.extras;
            
            // Cache the result (LRU cache handles TTL and eviction automatically)
            this.tokenCache.set(token, {
                userId,
                extras,
            });
            
            return { userId, extras };
            
        } catch (error) {
            log({ module: 'auth', level: 'error' }, `Token verification failed: ${error}`);
            return null;
        }
    }
    
    invalidateUserTokens(userId: string): void {
        // Remove all tokens for a specific user
        // This is expensive but rarely needed
        for (const [token, entry] of this.tokenCache.entries()) {
            if (entry.userId === userId) {
                this.tokenCache.delete(token);
            }
        }
        
        log({ module: 'auth' }, `Invalidated tokens for user: ${userId}`);
    }
    
    invalidateToken(token: string): void {
        this.tokenCache.delete(token);
    }
    
    /**
     * Returns comprehensive cache statistics for monitoring.
     *
     * Use this to track cache health, hit rates, and memory pressure.
     * Consider logging these stats periodically for observability.
     *
     * @returns CacheStats object with size, hits, misses, evictions, etc.
     */
    getCacheStats(): CacheStats {
        return this.tokenCache.getStats();
    }

    /**
     * Proactively evicts expired tokens from the cache.
     *
     * While expired tokens are automatically removed on access,
     * calling this method periodically ensures memory is reclaimed
     * even for tokens that are never accessed again.
     *
     * @returns Number of expired tokens removed
     */
    evictExpiredTokens(): number {
        const removed = this.tokenCache.evictExpired();
        if (removed > 0) {
            log({ module: 'auth' }, `Evicted ${removed} expired tokens from cache`);
        }
        return removed;
    }
    
    async createGitHubToken(userId: string): Promise<string> {
        if (!this.tokens) {
            throw new AppError(ErrorCodes.AUTH_NOT_INITIALIZED, 'Auth module not initialized');
        }

        const payload = { user: userId, purpose: 'github-oauth' };
        const token = await this.tokens.gitHubGenerator.new(payload);

        return token;
    }

    async verifyGitHubToken(token: string): Promise<{ userId: string } | null> {
        if (!this.tokens) {
            throw new AppError(ErrorCodes.AUTH_NOT_INITIALIZED, 'Auth module not initialized');
        }

        try {
            const verified = await this.tokens.gitHubVerifier.verify(token);
            if (!verified) {
                return null;
            }

            return { userId: verified.user as string };
        } catch (error) {
            log({ module: 'auth', level: 'error' }, `GitHub token verification failed: ${error}`);
            return null;
        }
    }

    /**
     * Performs cache maintenance: evicts expired tokens and logs statistics.
     *
     * Call this periodically (e.g., every hour) for optimal cache health.
     * The LRU cache automatically evicts based on size, but this ensures
     * expired tokens are proactively cleaned up for better memory usage.
     */
    cleanup(): void {
        const expired = this.evictExpiredTokens();
        const stats = this.getCacheStats();
        log(
            { module: 'auth' },
            `Token cache cleanup: ${expired} expired, ${stats.size}/${stats.maxSize} entries, ` +
            `${stats.hitRate}% hit rate, ${stats.evictions} evictions`
        );
    }
}

// Global instance
export const auth = new AuthModule();