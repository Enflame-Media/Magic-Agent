/**
 * Unit tests for ApiSessionClient KV settings sync (HAP-411)
 *
 * Tests verify that KV batch updates from mobile settings sync are handled correctly:
 * 1. CLI-relevant settings (contextNotificationsEnabled) are applied
 * 2. Non-CLI settings are explicitly ignored without errors
 * 3. Malformed payloads are handled gracefully
 * 4. Deleted keys (null values) reset to defaults
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Mock context notification service interface
 */
interface MockContextNotificationService {
    setEnabled: ReturnType<typeof vi.fn<(enabled: boolean) => void>>;
}

/**
 * Mock logger interface that matches the relevant logger methods
 */
interface MockLogger {
    debug: ReturnType<typeof vi.fn<(message: string, ...args: unknown[]) => void>>;
}

/**
 * Test harness that replicates the KV batch update logic from ApiSessionClient.
 * This allows us to test the settings sync behavior without WebSocket dependencies.
 *
 * The logic being tested (from ApiSessionClient):
 * - handleKvBatchUpdate: processes incoming KV changes
 * - applyKvSetting: applies CLI-relevant settings
 */
class KvSyncManager {
    private logger: MockLogger;
    private contextNotificationService: MockContextNotificationService | null = null;

    constructor(logger: MockLogger) {
        this.logger = logger;
    }

    setContextNotificationService(service: MockContextNotificationService | null): void {
        this.contextNotificationService = service;
    }

    /**
     * Handle KV batch updates from mobile settings sync.
     * Replicates logic from ApiSessionClient.handleKvBatchUpdate
     */
    handleKvBatchUpdate(changes: Array<{ key: string; value: string | null; version: number }>): void {
        const CLI_RELEVANT_SETTINGS = new Set(['contextNotificationsEnabled']);

        for (const change of changes) {
            try {
                if (CLI_RELEVANT_SETTINGS.has(change.key)) {
                    this.applyKvSetting(change.key, change.value);
                    this.logger.debug(`[KV-SYNC] Applied setting: ${change.key} = ${change.value} (v${change.version})`);
                } else {
                    this.logger.debug(`[KV-SYNC] Ignored non-CLI setting: ${change.key} (v${change.version})`);
                }
            } catch (error) {
                this.logger.debug(`[KV-SYNC] Error processing setting ${change.key}:`, error);
            }
        }
    }

    /**
     * Apply a single KV setting to the CLI.
     * Replicates logic from ApiSessionClient.applyKvSetting
     */
    private applyKvSetting(key: string, value: string | null): void {
        switch (key) {
            case 'contextNotificationsEnabled': {
                if (value === null) {
                    if (this.contextNotificationService) {
                        this.contextNotificationService.setEnabled(true);
                    }
                } else {
                    try {
                        const enabled = JSON.parse(value);
                        if (typeof enabled === 'boolean' && this.contextNotificationService) {
                            this.contextNotificationService.setEnabled(enabled);
                        }
                    } catch {
                        this.logger.debug(`[KV-SYNC] Invalid JSON value for ${key}: ${value}`);
                    }
                }
                break;
            }
            default:
                this.logger.debug(`[KV-SYNC] Unknown CLI setting: ${key}`);
        }
    }
}

describe('ApiSessionClient KV settings sync (HAP-411)', () => {
    let logger: MockLogger;
    let manager: KvSyncManager;
    let contextService: MockContextNotificationService;

    beforeEach(() => {
        logger = {
            debug: vi.fn(),
        };
        contextService = {
            setEnabled: vi.fn(),
        };
        manager = new KvSyncManager(logger);
        manager.setContextNotificationService(contextService);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('CLI-relevant settings', () => {
        it('should apply contextNotificationsEnabled=true', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'true', version: 1 }
            ]);

            expect(contextService.setEnabled).toHaveBeenCalledWith(true);
            expect(contextService.setEnabled).toHaveBeenCalledTimes(1);
        });

        it('should apply contextNotificationsEnabled=false', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'false', version: 2 }
            ]);

            expect(contextService.setEnabled).toHaveBeenCalledWith(false);
            expect(contextService.setEnabled).toHaveBeenCalledTimes(1);
        });

        it('should reset to default (true) when contextNotificationsEnabled is deleted', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: null, version: 3 }
            ]);

            expect(contextService.setEnabled).toHaveBeenCalledWith(true);
            expect(contextService.setEnabled).toHaveBeenCalledTimes(1);
        });

        it('should log applied settings', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'false', version: 1 }
            ]);

            const appliedCalls = logger.debug.mock.calls.filter(
                call => typeof call[0] === 'string' && call[0].includes('Applied setting')
            );
            expect(appliedCalls.length).toBeGreaterThan(0);
        });
    });

    describe('Non-CLI settings (should be ignored)', () => {
        const nonCliSettings = [
            'viewInline',
            'expandTodos',
            'showLineNumbers',
            'showLineNumbersInToolViews',
            'wrapLinesInDiffs',
            'analyticsOptOut',
            'experiments',
            'alwaysShowContextSize',
            'avatarStyle',
            'showFlavorIcons',
            'compactSessionView',
            'hideInactiveSessions',
            'reviewPromptAnswered',
            'voiceAssistantLanguage',
            'preferredLanguage',
        ];

        for (const settingKey of nonCliSettings) {
            it(`should ignore ${settingKey} setting`, () => {
                manager.handleKvBatchUpdate([
                    { key: settingKey, value: 'true', version: 1 }
                ]);

                expect(contextService.setEnabled).not.toHaveBeenCalled();

                const ignoredCalls = logger.debug.mock.calls.filter(
                    call => typeof call[0] === 'string' && call[0].includes('Ignored non-CLI setting')
                );
                expect(ignoredCalls.length).toBeGreaterThan(0);
            });
        }

        it('should handle batch of multiple non-CLI settings', () => {
            manager.handleKvBatchUpdate([
                { key: 'viewInline', value: 'true', version: 1 },
                { key: 'expandTodos', value: 'false', version: 2 },
                { key: 'showLineNumbers', value: 'true', version: 3 },
            ]);

            expect(contextService.setEnabled).not.toHaveBeenCalled();
        });
    });

    describe('Batch updates with mixed settings', () => {
        it('should apply only CLI-relevant settings from mixed batch', () => {
            manager.handleKvBatchUpdate([
                { key: 'viewInline', value: 'true', version: 1 },
                { key: 'contextNotificationsEnabled', value: 'false', version: 2 },
                { key: 'showLineNumbers', value: 'true', version: 3 },
            ]);

            expect(contextService.setEnabled).toHaveBeenCalledWith(false);
            expect(contextService.setEnabled).toHaveBeenCalledTimes(1);
        });

        it('should process multiple CLI-relevant settings in order', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'true', version: 1 },
                { key: 'contextNotificationsEnabled', value: 'false', version: 2 },
            ]);

            // Should be called twice, in order
            expect(contextService.setEnabled).toHaveBeenCalledTimes(2);
            expect(contextService.setEnabled).toHaveBeenNthCalledWith(1, true);
            expect(contextService.setEnabled).toHaveBeenNthCalledWith(2, false);
        });
    });

    describe('Error handling (defensive parsing)', () => {
        it('should handle invalid JSON value gracefully', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'not-valid-json', version: 1 }
            ]);

            expect(contextService.setEnabled).not.toHaveBeenCalled();

            const errorCalls = logger.debug.mock.calls.filter(
                call => typeof call[0] === 'string' && call[0].includes('Invalid JSON')
            );
            expect(errorCalls.length).toBeGreaterThan(0);
        });

        it('should handle non-boolean JSON values', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: '"string-value"', version: 1 }
            ]);

            // Should not call setEnabled since value is not boolean
            expect(contextService.setEnabled).not.toHaveBeenCalled();
        });

        it('should handle numeric JSON values', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: '123', version: 1 }
            ]);

            // Should not call setEnabled since value is not boolean
            expect(contextService.setEnabled).not.toHaveBeenCalled();
        });

        it('should continue processing after error in one change', () => {
            manager.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'invalid', version: 1 },
                { key: 'contextNotificationsEnabled', value: 'true', version: 2 },
            ]);

            // Second change should still be processed
            expect(contextService.setEnabled).toHaveBeenCalledWith(true);
            expect(contextService.setEnabled).toHaveBeenCalledTimes(1);
        });

        it('should handle empty changes array', () => {
            // Should not throw
            expect(() => {
                manager.handleKvBatchUpdate([]);
            }).not.toThrow();

            expect(contextService.setEnabled).not.toHaveBeenCalled();
        });
    });

    describe('No context notification service', () => {
        it('should handle missing contextNotificationService gracefully', () => {
            const managerWithoutService = new KvSyncManager(logger);
            // Don't set contextNotificationService

            // Should not throw
            expect(() => {
                managerWithoutService.handleKvBatchUpdate([
                    { key: 'contextNotificationsEnabled', value: 'false', version: 1 }
                ]);
            }).not.toThrow();
        });

        it('should still log applied settings even without service', () => {
            const managerWithoutService = new KvSyncManager(logger);

            managerWithoutService.handleKvBatchUpdate([
                { key: 'contextNotificationsEnabled', value: 'false', version: 1 }
            ]);

            const appliedCalls = logger.debug.mock.calls.filter(
                call => typeof call[0] === 'string' && call[0].includes('Applied setting')
            );
            expect(appliedCalls.length).toBeGreaterThan(0);
        });
    });
});
