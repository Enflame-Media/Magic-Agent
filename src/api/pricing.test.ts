import { describe, it, expect } from 'vitest'
import { calculateCost, getModelPricing } from './pricing'
import type { Usage } from './types'

describe('pricing', () => {
    describe('getModelPricing', () => {
        it('should return correct pricing for Opus 4', () => {
            const pricing = getModelPricing('claude-opus-4-20250514')
            expect(pricing.inputPerMillion).toBe(15)
            expect(pricing.outputPerMillion).toBe(75)
        })

        it('should return correct pricing for Opus 4.6', () => {
            const pricing = getModelPricing('claude-opus-4-6')
            expect(pricing.inputPerMillion).toBe(5)
            expect(pricing.outputPerMillion).toBe(25)
        })

        it('should return correct pricing for Sonnet 4', () => {
            const pricing = getModelPricing('claude-sonnet-4-20250514')
            expect(pricing.inputPerMillion).toBe(3)
            expect(pricing.outputPerMillion).toBe(15)
        })

        it('should return correct pricing for Sonnet 3.5', () => {
            const pricing = getModelPricing('claude-3-5-sonnet-20241022')
            expect(pricing.inputPerMillion).toBe(3)
            expect(pricing.outputPerMillion).toBe(15)
        })

        it('should return correct pricing for Haiku 3.5', () => {
            const pricing = getModelPricing('claude-3-5-haiku-20241022')
            expect(pricing.inputPerMillion).toBe(0.8)
            expect(pricing.outputPerMillion).toBe(4)
        })

        it('should return correct pricing for Haiku 3', () => {
            const pricing = getModelPricing('claude-3-haiku-20240307')
            expect(pricing.inputPerMillion).toBe(0.25)
            expect(pricing.outputPerMillion).toBe(1.25)
        })

        it('should return default pricing for unknown model', () => {
            const pricing = getModelPricing('unknown-model')
            expect(pricing.inputPerMillion).toBe(3)
            expect(pricing.outputPerMillion).toBe(15)
        })

        it('should return default pricing for undefined model', () => {
            const pricing = getModelPricing(undefined)
            expect(pricing.inputPerMillion).toBe(3)
            expect(pricing.outputPerMillion).toBe(15)
        })
    })

    describe('calculateCost', () => {
        it('should calculate costs correctly for basic usage', () => {
            const usage: Usage = {
                input_tokens: 1000,
                output_tokens: 500
            }
            const costs = calculateCost(usage, 'claude-sonnet-4-20250514')

            // Input: 1000 / 1,000,000 * 3 = 0.003
            expect(costs.input).toBeCloseTo(0.003, 10)
            // Output: 500 / 1,000,000 * 15 = 0.0075
            expect(costs.output).toBeCloseTo(0.0075, 10)
            expect(costs.cacheCreation).toBe(0)
            expect(costs.cacheRead).toBe(0)
            expect(costs.total).toBeCloseTo(0.0105, 10)
        })

        it('should calculate costs with cache tokens', () => {
            const usage: Usage = {
                input_tokens: 10000,
                output_tokens: 5000,
                cache_creation_input_tokens: 2000,
                cache_read_input_tokens: 8000
            }
            const costs = calculateCost(usage, 'claude-sonnet-4-20250514')

            // Input: 10000 / 1,000,000 * 3 = 0.03
            expect(costs.input).toBeCloseTo(0.03, 10)
            // Output: 5000 / 1,000,000 * 15 = 0.075
            expect(costs.output).toBeCloseTo(0.075, 10)
            // Cache creation: 2000 / 1,000,000 * (3 * 1.25) = 0.0075
            expect(costs.cacheCreation).toBeCloseTo(0.0075, 10)
            // Cache read: 8000 / 1,000,000 * (3 * 0.1) = 0.0024
            expect(costs.cacheRead).toBeCloseTo(0.0024, 10)
        })

        it('should calculate higher costs for Opus 4', () => {
            const usage: Usage = {
                input_tokens: 1000000, // 1M tokens
                output_tokens: 500000  // 0.5M tokens
            }
            const costs = calculateCost(usage, 'claude-opus-4-20250514')

            // Input: 1M / 1M * 15 = 15
            expect(costs.input).toBe(15)
            // Output: 0.5M / 1M * 75 = 37.5
            expect(costs.output).toBe(37.5)
            expect(costs.total).toBe(52.5)
        })

        it('should handle missing optional fields', () => {
            const usage: Usage = {
                input_tokens: 1000,
                output_tokens: 500
                // cache_creation_input_tokens and cache_read_input_tokens not provided
            }
            const costs = calculateCost(usage, 'claude-sonnet-4-20250514')

            expect(costs.cacheCreation).toBe(0)
            expect(costs.cacheRead).toBe(0)
        })
    })
})
