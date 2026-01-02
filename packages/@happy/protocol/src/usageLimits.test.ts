import { describe, it, expect } from 'vitest';
import { UsageLimitSchema, PlanLimitsResponseSchema } from './usageLimits';
import { STRING_LIMITS } from './constraints';

describe('UsageLimitSchema', () => {
    describe('valid data', () => {
        it('validates complete usage limit entry', () => {
            const limit = {
                id: 'opus_tokens',
                label: 'Opus Tokens',
                percentageUsed: 75.5,
                resetsAt: 1735689600000,
                resetDisplayType: 'countdown' as const,
                description: 'Monthly Opus token limit',
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.id).toBe('opus_tokens');
                expect(result.data.percentageUsed).toBe(75.5);
            }
        });

        it('validates limit without optional description', () => {
            const limit = {
                id: 'session_limit',
                label: 'Sessions',
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'datetime' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.description).toBeUndefined();
            }
        });

        it('accepts null resetsAt for limits without reset', () => {
            const limit = {
                id: 'lifetime_cap',
                label: 'Lifetime Usage',
                percentageUsed: 10,
                resetsAt: null,
                resetDisplayType: 'datetime' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.resetsAt).toBeNull();
            }
        });

        it('accepts 0% usage', () => {
            const limit = {
                id: 'new_user',
                label: 'Token Usage',
                percentageUsed: 0,
                resetsAt: Date.now() + 86400000,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
        });

        it('accepts 100% usage', () => {
            const limit = {
                id: 'exhausted',
                label: 'Token Usage',
                percentageUsed: 100,
                resetsAt: Date.now() + 3600000,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
        });
    });

    describe('resetDisplayType enum', () => {
        it('accepts countdown display type', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: 50,
                resetsAt: Date.now(),
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
        });

        it('accepts datetime display type', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: 50,
                resetsAt: Date.now(),
                resetDisplayType: 'datetime' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
        });

        it('rejects invalid display type', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: 50,
                resetsAt: Date.now(),
                resetDisplayType: 'invalid',
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });
    });

    describe('invalid data', () => {
        it('rejects empty id', () => {
            const limit = {
                id: '',
                label: 'Test',
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects empty label', () => {
            const limit = {
                id: 'test',
                label: '',
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects percentage below 0', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: -1,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects percentage above 100', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: 101,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects missing required fields', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                // missing percentageUsed, resetsAt, resetDisplayType
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects id exceeding ID_MAX', () => {
            const limit = {
                id: 'x'.repeat(STRING_LIMITS.ID_MAX + 1),
                label: 'Test',
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects label exceeding LABEL_MAX', () => {
            const limit = {
                id: 'test',
                label: 'x'.repeat(STRING_LIMITS.LABEL_MAX + 1),
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('rejects description exceeding DESCRIPTION_MAX', () => {
            const limit = {
                id: 'test',
                label: 'Test',
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
                description: 'x'.repeat(STRING_LIMITS.DESCRIPTION_MAX + 1),
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(false);
        });

        it('accepts values at exactly the limit', () => {
            const limit = {
                id: 'x'.repeat(STRING_LIMITS.ID_MAX),
                label: 'y'.repeat(STRING_LIMITS.LABEL_MAX),
                percentageUsed: 50,
                resetsAt: null,
                resetDisplayType: 'countdown' as const,
                description: 'z'.repeat(STRING_LIMITS.DESCRIPTION_MAX),
            };
            const result = UsageLimitSchema.safeParse(limit);
            expect(result.success).toBe(true);
        });
    });
});

describe('PlanLimitsResponseSchema', () => {
    describe('valid data', () => {
        it('validates complete response with session limit', () => {
            const response = {
                sessionLimit: {
                    id: 'session',
                    label: 'Session Limit',
                    percentageUsed: 50,
                    resetsAt: null,
                    resetDisplayType: 'datetime' as const,
                },
                weeklyLimits: [
                    {
                        id: 'opus_tokens',
                        label: 'Opus Tokens',
                        percentageUsed: 25,
                        resetsAt: 1735689600000,
                        resetDisplayType: 'countdown' as const,
                    },
                ],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
                provider: 'anthropic',
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionLimit?.id).toBe('session');
                expect(result.data.weeklyLimits).toHaveLength(1);
                expect(result.data.provider).toBe('anthropic');
            }
        });

        it('validates response without session limit', () => {
            const response = {
                weeklyLimits: [
                    {
                        id: 'tokens',
                        label: 'Tokens',
                        percentageUsed: 75,
                        resetsAt: Date.now() + 604800000,
                        resetDisplayType: 'countdown' as const,
                    },
                ],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.sessionLimit).toBeUndefined();
            }
        });

        it('validates response with empty weekly limits array', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: false,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.weeklyLimits).toHaveLength(0);
                expect(result.data.limitsAvailable).toBe(false);
            }
        });

        it('validates response with multiple weekly limits', () => {
            const response = {
                weeklyLimits: [
                    {
                        id: 'opus',
                        label: 'Opus Tokens',
                        percentageUsed: 30,
                        resetsAt: Date.now() + 86400000,
                        resetDisplayType: 'countdown' as const,
                    },
                    {
                        id: 'sonnet',
                        label: 'Sonnet Tokens',
                        percentageUsed: 15,
                        resetsAt: Date.now() + 86400000,
                        resetDisplayType: 'countdown' as const,
                    },
                    {
                        id: 'haiku',
                        label: 'Haiku Tokens',
                        percentageUsed: 5,
                        resetsAt: Date.now() + 86400000,
                        resetDisplayType: 'countdown' as const,
                    },
                ],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
                provider: 'anthropic',
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.weeklyLimits).toHaveLength(3);
            }
        });

        it('validates response without optional provider', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: false,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.provider).toBeUndefined();
            }
        });
    });

    describe('invalid data', () => {
        it('rejects missing weeklyLimits', () => {
            const response = {
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it('rejects missing lastUpdatedAt', () => {
            const response = {
                weeklyLimits: [],
                limitsAvailable: true,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it('rejects missing limitsAvailable', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it('rejects invalid session limit structure', () => {
            const response = {
                sessionLimit: {
                    id: 'session',
                    // missing required fields
                },
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it('rejects invalid weekly limit in array', () => {
            const response = {
                weeklyLimits: [
                    {
                        id: 'valid',
                        label: 'Valid',
                        percentageUsed: 50,
                        resetsAt: null,
                        resetDisplayType: 'countdown' as const,
                    },
                    {
                        id: '', // invalid - empty id
                        label: 'Invalid',
                        percentageUsed: 50,
                        resetsAt: null,
                        resetDisplayType: 'countdown' as const,
                    },
                ],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });
    });

    describe('length limits', () => {
        it('rejects provider exceeding LABEL_MAX', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
                provider: 'x'.repeat(STRING_LIMITS.LABEL_MAX + 1),
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(false);
        });

        it('accepts provider at exactly the limit', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: true,
                provider: 'x'.repeat(STRING_LIMITS.LABEL_MAX),
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });
    });

    describe('real-world scenarios', () => {
        it('validates typical Anthropic API response', () => {
            const response = {
                sessionLimit: {
                    id: 'concurrent_sessions',
                    label: 'Active Sessions',
                    percentageUsed: 20,
                    resetsAt: null,
                    resetDisplayType: 'datetime' as const,
                    description: 'Maximum concurrent coding sessions',
                },
                weeklyLimits: [
                    {
                        id: 'opus_4_5_tokens',
                        label: 'Opus 4.5 Tokens',
                        percentageUsed: 45.7,
                        resetsAt: 1735689600000,
                        resetDisplayType: 'countdown' as const,
                    },
                    {
                        id: 'sonnet_4_tokens',
                        label: 'Sonnet 4 Tokens',
                        percentageUsed: 12.3,
                        resetsAt: 1735689600000,
                        resetDisplayType: 'countdown' as const,
                    },
                ],
                lastUpdatedAt: 1735603200000,
                limitsAvailable: true,
                provider: 'anthropic',
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
        });

        it('validates limits unavailable response', () => {
            const response = {
                weeklyLimits: [],
                lastUpdatedAt: Date.now(),
                limitsAvailable: false,
            };
            const result = PlanLimitsResponseSchema.safeParse(response);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.limitsAvailable).toBe(false);
                expect(result.data.weeklyLimits).toHaveLength(0);
            }
        });
    });
});
