/**
 * Usage limits schemas for plan and rate limiting data
 *
 * These schemas define the structure for usage limit information
 * returned by the API to help users understand their plan constraints.
 *
 * @example
 * ```typescript
 * import { PlanLimitsResponseSchema, type PlanLimitsResponse } from '@happy/protocol';
 *
 * const result = PlanLimitsResponseSchema.safeParse(data);
 * if (result.success) {
 *     const limits: PlanLimitsResponse = result.data;
 *     console.log('Session limit:', limits.sessionLimit?.percentageUsed);
 * }
 * ```
 */

import { z } from 'zod';
import { STRING_LIMITS } from './constraints';

/**
 * Single usage limit entry
 *
 * Represents one limit category (e.g., tokens, requests, sessions)
 * with percentage used and reset information.
 *
 * @example
 * ```typescript
 * const limit = UsageLimitSchema.parse({
 *     id: 'opus_tokens',
 *     label: 'Opus Tokens',
 *     percentageUsed: 75.5,
 *     resetsAt: 1735689600000,
 *     resetDisplayType: 'countdown',
 *     description: 'Monthly Opus token limit',
 * });
 * ```
 */
export const UsageLimitSchema = z.object({
    /** Unique identifier for this limit type */
    id: z.string().min(1).max(STRING_LIMITS.ID_MAX),

    /** Human-readable label for display */
    label: z.string().min(1).max(STRING_LIMITS.LABEL_MAX),

    /** Percentage of limit used (0-100) */
    percentageUsed: z.number().min(0).max(100),

    /** Unix timestamp (ms) when this limit resets, null if no reset */
    resetsAt: z.number().nullable(),

    /** How to display the reset time in UI */
    resetDisplayType: z.enum(['countdown', 'datetime']),

    /** Optional description for additional context */
    description: z.string().max(STRING_LIMITS.DESCRIPTION_MAX).optional(),
});

export type UsageLimit = z.infer<typeof UsageLimitSchema>;

/**
 * Full plan limits response from API
 *
 * Contains session limit (if applicable), weekly limits array,
 * and metadata about availability.
 *
 * @example
 * ```typescript
 * const response = PlanLimitsResponseSchema.parse({
 *     sessionLimit: {
 *         id: 'session',
 *         label: 'Session Limit',
 *         percentageUsed: 50,
 *         resetsAt: null,
 *         resetDisplayType: 'datetime',
 *     },
 *     weeklyLimits: [
 *         {
 *             id: 'opus_tokens',
 *             label: 'Opus Tokens',
 *             percentageUsed: 25,
 *             resetsAt: 1735689600000,
 *             resetDisplayType: 'countdown',
 *         },
 *     ],
 *     lastUpdatedAt: Date.now(),
 *     limitsAvailable: true,
 *     provider: 'anthropic',
 * });
 * ```
 */
export const PlanLimitsResponseSchema = z.object({
    /** Session limit if applicable (e.g., concurrent session count) */
    sessionLimit: UsageLimitSchema.optional(),

    /** Weekly/rolling limits (tokens, requests, etc.) */
    weeklyLimits: z.array(UsageLimitSchema),

    /** Unix timestamp (ms) when limits were last fetched/updated */
    lastUpdatedAt: z.number(),

    /** Whether limit information is available from the provider */
    limitsAvailable: z.boolean(),

    /** Optional provider identifier (e.g., 'anthropic', 'openai') */
    provider: z.string().max(STRING_LIMITS.LABEL_MAX).optional(),
});

export type PlanLimitsResponse = z.infer<typeof PlanLimitsResponseSchema>;
