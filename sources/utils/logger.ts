/**
 * Production-safe logger utility
 *
 * This logger ensures that debug/info logs are stripped from production builds
 * while keeping error and warning logs for debugging production issues.
 *
 * Usage:
 *   import { logger } from '@/utils/logger';
 *   logger.debug('[Component] Debug info', data);
 *   logger.info('[Feature] Informational message');
 *   logger.warn('[Feature] Warning condition');
 *   logger.error('[Feature] Error occurred', error);
 *
 * NEVER log:
 * - Tokens, secrets, or credentials
 * - Personally identifiable information (PII)
 * - Full stack traces with user data
 */

/* oxlint-disable no-console */
/* eslint-disable no-console */

/**
 * Logger interface for type safety and documentation
 */
interface Logger {
  /** Development-only debug logging - stripped in production */
  debug: (...args: unknown[]) => void;
  /** Development-only info logging - stripped in production */
  info: (...args: unknown[]) => void;
  /** Warning logging - visible in production */
  warn: (...args: unknown[]) => void;
  /** Error logging - visible in production, consider error tracking integration */
  error: (...args: unknown[]) => void;
}

/**
 * No-op function for production
 */
const noop = () => {};

/**
 * Production-safe logger
 *
 * - debug/info: Only logged in development (__DEV__ = true)
 * - warn/error: Always logged (needed for production debugging)
 *
 * The __DEV__ check allows bundlers to tree-shake debug logs in production.
 */
export const logger: Logger = {
  debug: __DEV__
    ? (...args: unknown[]) => console.log('[DEBUG]', ...args)
    : noop,

  info: __DEV__
    ? (...args: unknown[]) => console.log('[INFO]', ...args)
    : noop,

  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),

  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
    // Future: Integrate with error tracking service (Sentry, etc.)
  },
};

/**
 * Type guard to check if logging is enabled
 * Use for expensive log preparation:
 *
 * @example
 * if (isDevMode()) {
 *   const expensiveData = JSON.stringify(largeObject);
 *   logger.debug('Data:', expensiveData);
 * }
 */
export const isDevMode = (): boolean => __DEV__;
