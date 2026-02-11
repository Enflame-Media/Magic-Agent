/**
 * Telemetry configuration types for privacy-first data collection.
 *
 * This module defines the telemetry opt-out mechanism, allowing users to control
 * what data (if any) is collected. By default, telemetry is disabled.
 *
 * ## Configuration Priority
 * 1. Environment variables (highest priority)
 * 2. Settings file (~/.happy/settings.json)
 * 3. Default configuration (telemetry disabled)
 *
 * ## Environment Variables
 * - `HAPPY_TELEMETRY`: Set to 'false', '0', or 'no' to disable all telemetry
 * - `HAPPY_TELEMETRY_ANONYMIZE`: Set to 'true', '1', or 'yes' to anonymize data
 *
 * ## GDPR Compliance
 * - Telemetry is disabled by default (opt-in, not opt-out)
 * - Users can disable at any time via env var or config
 * - Data minimization: only specified categories are collected when enabled
 */

/**
 * Categories of telemetry data that can be collected.
 * Each category can be individually enabled or disabled.
 */
export interface TelemetryCategories {
  /** Error and crash reporting */
  errors: boolean
  /** Feature usage statistics */
  usage: boolean
  /** Performance metrics and timing data */
  performance: boolean
}

/**
 * Complete telemetry configuration.
 *
 * @example
 * ```typescript
 * // Fully disabled (default)
 * const config: TelemetryConfig = {
 *   enabled: false,
 *   anonymize: true,
 *   categories: { errors: false, usage: false, performance: false }
 * }
 *
 * // Minimal collection (errors only, anonymized)
 * const config: TelemetryConfig = {
 *   enabled: true,
 *   anonymize: true,
 *   categories: { errors: true, usage: false, performance: false }
 * }
 * ```
 */
export interface TelemetryConfig {
  /**
   * Master switch for telemetry collection.
   * When false, no data is collected regardless of category settings.
   * Default: false (privacy-first)
   */
  enabled: boolean

  /**
   * Whether to anonymize collected data.
   * When true, no personally identifiable information is included.
   * Default: true
   */
  anonymize: boolean

  /**
   * Individual category toggles for data collection.
   * Only applies when `enabled` is true.
   */
  categories: TelemetryCategories
}

/**
 * Default telemetry configuration.
 * Privacy-first: all collection disabled by default.
 */
export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  enabled: false,
  anonymize: true,
  categories: {
    errors: false,
    usage: false,
    performance: false,
  },
}
