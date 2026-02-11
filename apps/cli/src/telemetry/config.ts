/**
 * Telemetry configuration loader with environment variable priority.
 *
 * @module telemetry/config
 */

import { readSettings } from '@/persistence'
import { DEFAULT_TELEMETRY_CONFIG, TelemetryConfig } from './types'

/**
 * Parses a boolean-like environment variable value.
 * Recognizes 'true', '1', 'yes' as truthy (case-insensitive).
 * Recognizes 'false', '0', 'no' as falsy (case-insensitive).
 *
 * @param value - The environment variable value
 * @returns true, false, or undefined if the value is not recognized
 */
function parseEnvBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined
  const normalized = value.toLowerCase().trim()
  if (['true', '1', 'yes'].includes(normalized)) return true
  if (['false', '0', 'no'].includes(normalized)) return false
  return undefined
}

/**
 * Loads the telemetry configuration with the following priority:
 * 1. Environment variables (HAPPY_TELEMETRY, HAPPY_TELEMETRY_ANONYMIZE)
 * 2. Settings file (~/.happy/settings.json → telemetry property)
 * 3. Default configuration (telemetry disabled)
 *
 * ## Environment Variable Behavior
 * - `HAPPY_TELEMETRY=false` → Completely disables telemetry (overrides all settings)
 * - `HAPPY_TELEMETRY=true` → Enables telemetry (still respects category settings from file)
 * - `HAPPY_TELEMETRY_ANONYMIZE=true|false` → Overrides anonymization setting
 *
 * @returns The resolved telemetry configuration
 *
 * @example
 * ```typescript
 * const config = await loadTelemetryConfig()
 * if (config.enabled && config.categories.errors) {
 *   // Send error telemetry
 * }
 * ```
 */
export async function loadTelemetryConfig(): Promise<TelemetryConfig> {
  // Check environment variable first (highest priority)
  const envTelemetry = parseEnvBoolean(process.env.HAPPY_TELEMETRY)
  const envAnonymize = parseEnvBoolean(process.env.HAPPY_TELEMETRY_ANONYMIZE)

  // If HAPPY_TELEMETRY is explicitly set to false, return fully disabled config
  if (envTelemetry === false) {
    return {
      enabled: false,
      anonymize: true,
      categories: {
        errors: false,
        usage: false,
        performance: false,
      },
    }
  }

  // Read settings file for base configuration
  const settings = await readSettings()
  const fileConfig = settings.telemetry

  // Build configuration with priority: env > file > default
  const baseConfig = fileConfig ?? DEFAULT_TELEMETRY_CONFIG

  return {
    // Env var takes priority over file, then default
    enabled: envTelemetry ?? baseConfig.enabled,
    // Env var takes priority, default to true for privacy
    anonymize: envAnonymize ?? baseConfig.anonymize ?? true,
    // Categories come from file or default
    categories: baseConfig.categories ?? DEFAULT_TELEMETRY_CONFIG.categories,
  }
}

/**
 * Synchronously checks if telemetry is disabled via environment variable.
 * Useful for early checks before async operations are available.
 *
 * @returns true if telemetry is explicitly disabled via HAPPY_TELEMETRY env var
 */
export function isTelemetryDisabledByEnv(): boolean {
  return parseEnvBoolean(process.env.HAPPY_TELEMETRY) === false
}
