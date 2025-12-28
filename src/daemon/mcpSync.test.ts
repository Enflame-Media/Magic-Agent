/**
 * Unit tests for MCP Config Sync during daemon heartbeat
 *
 * Tests the hash computation function used for change detection
 * during periodic MCP config synchronization.
 *
 * @module daemon/mcpSync.test
 * @see HAP-610
 */

import { describe, it, expect } from 'vitest';
import { computeMcpConfigHash } from './run';

// Type alias for the MCP sync state structure
type McpSyncState = {
    servers: Record<string, {
        disabled: boolean;
        toolCount?: number;
        lastValidated?: string;
        disabledTools?: string[];
    }>;
};

describe('computeMcpConfigHash', () => {
    describe('null/undefined handling', () => {
        it('should return null for undefined config', () => {
            expect(computeMcpConfigHash(undefined)).toBeNull();
        });
    });

    describe('hash consistency', () => {
        it('should return consistent hash for same config', () => {
            const config: McpSyncState = {
                servers: {
                    'test-server': { disabled: false }
                }
            };

            const hash1 = computeMcpConfigHash(config);
            const hash2 = computeMcpConfigHash(config);

            expect(hash1).toBe(hash2);
            expect(hash1).not.toBeNull();
        });

        it('should return different hash for different configs', () => {
            const config1: McpSyncState = {
                servers: {
                    'test-server': { disabled: false }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'test-server': { disabled: true }
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).not.toBe(hash2);
        });

        it('should produce stable hash regardless of key order', () => {
            // Create configs with different insertion orders
            const config1: McpSyncState = {
                servers: {
                    'server-a': { disabled: false },
                    'server-b': { disabled: true }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'server-b': { disabled: true },
                    'server-a': { disabled: false }
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).toBe(hash2);
        });
    });

    describe('edge cases', () => {
        it('should handle empty servers object', () => {
            const config: McpSyncState = { servers: {} };

            const hash = computeMcpConfigHash(config);

            expect(hash).not.toBeNull();
            expect(typeof hash).toBe('string');
        });

        it('should detect changes in nested properties', () => {
            const config1: McpSyncState = {
                servers: {
                    'server': {
                        disabled: false,
                        toolCount: 5
                    }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'server': {
                        disabled: false,
                        toolCount: 6 // Changed
                    }
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).not.toBe(hash2);
        });

        it('should detect changes in disabledTools array', () => {
            const config1: McpSyncState = {
                servers: {
                    'server': {
                        disabled: false,
                        disabledTools: ['tool1']
                    }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'server': {
                        disabled: false,
                        disabledTools: ['tool1', 'tool2'] // Added tool
                    }
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).not.toBe(hash2);
        });

        it('should detect added servers', () => {
            const config1: McpSyncState = {
                servers: {
                    'server-a': { disabled: false }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'server-a': { disabled: false },
                    'server-b': { disabled: false } // Added
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).not.toBe(hash2);
        });

        it('should detect removed servers', () => {
            const config1: McpSyncState = {
                servers: {
                    'server-a': { disabled: false },
                    'server-b': { disabled: false }
                }
            };

            const config2: McpSyncState = {
                servers: {
                    'server-a': { disabled: false }
                    // server-b removed
                }
            };

            const hash1 = computeMcpConfigHash(config1);
            const hash2 = computeMcpConfigHash(config2);

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('hash format', () => {
        it('should return hex string format', () => {
            const config: McpSyncState = {
                servers: { 'test': { disabled: false } }
            };

            const hash = computeMcpConfigHash(config);

            expect(hash).toMatch(/^[0-9a-f]+$/);
        });
    });
});
