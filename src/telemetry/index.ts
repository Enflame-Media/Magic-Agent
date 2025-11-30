/**
 * Telemetry configuration module.
 *
 * Provides a privacy-first telemetry opt-out mechanism with support for:
 * - Environment variable configuration (HAPPY_TELEMETRY, HAPPY_TELEMETRY_ANONYMIZE)
 * - Settings file configuration (~/.happy/settings.json)
 * - Default disabled state (opt-in, not opt-out)
 *
 * @module telemetry
 *
 * @example
 * ```typescript
 * import { loadTelemetryConfig, isTelemetryDisabledByEnv } from '@/telemetry'
 *
 * // Quick sync check
 * if (isTelemetryDisabledByEnv()) {
 *   console.log('Telemetry disabled via environment')
 * }
 *
 * // Full async configuration load
 * const config = await loadTelemetryConfig()
 * if (config.enabled && config.categories.errors) {
 *   // Initialize error reporting
 * }
 * ```
 */

export { loadTelemetryConfig, isTelemetryDisabledByEnv } from './config'
export {
  DEFAULT_TELEMETRY_CONFIG,
  type TelemetryCategories,
  type TelemetryConfig,
} from './types'
