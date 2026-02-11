/**
 * Claude API Pricing Configuration and Cost Calculation
 *
 * This module provides pricing data for Anthropic Claude models and functions
 * to calculate costs based on token usage. Pricing is based on per-million-token
 * rates from Anthropic's official pricing.
 *
 * @see https://www.anthropic.com/pricing
 */

import { Usage } from './types'

/**
 * Pricing configuration for a single model variant.
 * All prices are in USD per million tokens.
 */
export interface ModelPricing {
    /** Price per million input tokens */
    inputPerMillion: number
    /** Price per million output tokens */
    outputPerMillion: number
    /**
     * Multiplier for cache write tokens (applied to input price).
     * Default is 1.25 for 5-minute cache duration.
     */
    cacheWriteMultiplier: number
    /**
     * Multiplier for cache read tokens (applied to input price).
     * Default is 0.1 (90% discount).
     */
    cacheReadMultiplier: number
}

/**
 * Complete pricing table for all Claude model variants.
 * Keys are model ID patterns that match the model field in API responses.
 */
const MODEL_PRICING: Record<string, ModelPricing> = {
    // Opus 4 (latest)
    'claude-opus-4': {
        inputPerMillion: 15,
        outputPerMillion: 75,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    // Opus 4.6
    'claude-opus-4-6': {
        inputPerMillion: 5,
        outputPerMillion: 25,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    // Sonnet 4.5, 4, 3.7, 3.5 - all same pricing
    'claude-sonnet-4-5': {
        inputPerMillion: 3,
        outputPerMillion: 15,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    'claude-sonnet-4': {
        inputPerMillion: 3,
        outputPerMillion: 15,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    'claude-3-7-sonnet': {
        inputPerMillion: 3,
        outputPerMillion: 15,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    'claude-3-5-sonnet': {
        inputPerMillion: 3,
        outputPerMillion: 15,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    // Haiku 3.5
    'claude-3-5-haiku': {
        inputPerMillion: 0.8,
        outputPerMillion: 4,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    },
    // Haiku 3 (original)
    'claude-3-haiku': {
        inputPerMillion: 0.25,
        outputPerMillion: 1.25,
        cacheWriteMultiplier: 1.25,
        cacheReadMultiplier: 0.1
    }
}

/**
 * Default pricing for unknown models (uses Sonnet pricing as a reasonable middle ground)
 */
const DEFAULT_PRICING: ModelPricing = {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheWriteMultiplier: 1.25,
    cacheReadMultiplier: 0.1
}

/**
 * Normalizes a model ID to a base pattern for pricing lookup.
 *
 * Model IDs come in various formats:
 * - "claude-opus-4-20250514" → "claude-opus-4"
 * - "claude-sonnet-4-5-20250929" → "claude-sonnet-4-5"
 * - "claude-3-5-sonnet-20241022" → "claude-3-5-sonnet"
 *
 * @param modelId - The full model ID from the API response
 * @returns The normalized base model pattern
 */
function normalizeModelId(modelId: string): string {
    // Remove date suffix (format: YYYYMMDD at the end)
    const withoutDate = modelId.replace(/-\d{8}$/, '')
    return withoutDate
}

/**
 * Gets the pricing configuration for a model.
 * Falls back to default pricing if the model is not recognized.
 *
 * @param modelId - The model ID from the API response (e.g., "claude-opus-4-20250514")
 * @returns The pricing configuration for the model
 */
export function getModelPricing(modelId: string | undefined): ModelPricing {
    if (!modelId) {
        return DEFAULT_PRICING
    }

    const normalized = normalizeModelId(modelId)

    // Try exact match first
    if (MODEL_PRICING[normalized]) {
        return MODEL_PRICING[normalized]
    }

    // Try prefix matching for model families
    for (const [pattern, pricing] of Object.entries(MODEL_PRICING)) {
        if (normalized.startsWith(pattern)) {
            return pricing
        }
    }

    return DEFAULT_PRICING
}

/**
 * Cost breakdown for a usage report.
 * All values are in USD.
 */
export interface CostBreakdown {
    /** Total cost (sum of all components) */
    total: number
    /** Cost for input tokens */
    input: number
    /** Cost for output tokens */
    output: number
    /** Cost for cache creation (write) tokens */
    cacheCreation: number
    /** Cost for cache read tokens */
    cacheRead: number
}

/**
 * Calculates the cost breakdown for a usage report.
 *
 * @param usage - The usage data from Claude API response
 * @param modelId - The model ID used for the request
 * @returns Cost breakdown in USD
 */
export function calculateCost(usage: Usage, modelId: string | undefined): CostBreakdown {
    const pricing = getModelPricing(modelId)

    // Calculate individual costs (tokens / 1,000,000 * price per million)
    const inputCost = (usage.input_tokens / 1_000_000) * pricing.inputPerMillion
    const outputCost = (usage.output_tokens / 1_000_000) * pricing.outputPerMillion

    // Cache costs are based on input price with multipliers
    const cacheCreationCost = ((usage.cache_creation_input_tokens || 0) / 1_000_000) *
        (pricing.inputPerMillion * pricing.cacheWriteMultiplier)
    const cacheReadCost = ((usage.cache_read_input_tokens || 0) / 1_000_000) *
        (pricing.inputPerMillion * pricing.cacheReadMultiplier)

    const total = inputCost + outputCost + cacheCreationCost + cacheReadCost

    return {
        total,
        input: inputCost,
        output: outputCost,
        cacheCreation: cacheCreationCost,
        cacheRead: cacheReadCost
    }
}
