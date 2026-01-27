/**
 * URL Utilities - Cross-platform URL handling
 *
 * Provides utilities for opening external URLs with proper validation
 * and error handling. Designed to work on web and mobile platforms.
 */

/**
 * Result of an openUrl operation
 */
export interface OpenUrlResult {
  success: boolean;
  error?: string;
}

/**
 * Validates a URL string to ensure it's safe to open
 *
 * @param url - The URL to validate
 * @returns true if the URL is valid and uses a safe scheme
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http, https, and mailto schemes
    const allowedSchemes = ['http:', 'https:', 'mailto:'];
    return allowedSchemes.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Opens a URL in the system browser
 *
 * On web platforms, this opens the URL in a new tab.
 * Includes URL validation to prevent opening unsafe links.
 *
 * @param url - The URL to open
 * @returns A result object indicating success or failure
 *
 * @example
 * ```ts
 * const result = await openUrl('https://example.com');
 * if (!result.success) {
 *   console.error('Failed to open URL:', result.error);
 * }
 * ```
 */
export async function openUrl(url: string): Promise<OpenUrlResult> {
  // Validate URL before attempting to open
  if (!isValidUrl(url)) {
    return {
      success: false,
      error: 'Invalid or unsafe URL',
    };
  }

  try {
    // Use window.open for web platforms
    // The '_blank' target opens in a new tab
    // The 'noopener,noreferrer' options are security best practices
    const newWindow = globalThis.window?.open(url, '_blank', 'noopener,noreferrer');

    // Check if the popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      return {
        success: false,
        error: 'Popup blocked. Please allow popups for this site.',
      };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to open URL: ${message}`,
    };
  }
}
