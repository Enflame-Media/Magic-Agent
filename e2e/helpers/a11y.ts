/**
 * Shared accessibility testing helper for Playwright E2E tests
 *
 * Provides a reusable `checkA11y()` function that integrates axe-core
 * with Playwright for automated WCAG 2.1 AA accessibility scanning.
 *
 * Uses AxeBuilder from @axe-core/playwright to run accessibility checks
 * against the real browser DOM during E2E test execution.
 *
 * @example
 * ```ts
 * import { test } from '@playwright/test';
 * import { checkA11y } from './helpers/a11y';
 *
 * test('page should be accessible', async ({ page }) => {
 *   await page.goto('/');
 *   const results = await checkA11y(page);
 * });
 * ```
 *
 * @see HAP-972 - Screen reader and axe-core accessibility testing
 * @see HAP-889 - Reference implementation in happy-admin
 */

import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { AxeResults } from 'axe-core';

/**
 * Configuration options for accessibility checks.
 */
export interface CheckA11yOptions {
  /**
   * WCAG tags to check against.
   * @default ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
   */
  tags?: string[];

  /**
   * Specific axe rules to disable for this check.
   * Use sparingly and document the reason.
   */
  disableRules?: string[];

  /**
   * CSS selector to scope the check to a specific part of the page.
   * Useful for testing specific components in isolation.
   */
  include?: string[];

  /**
   * CSS selectors to exclude from the check.
   * Useful for known third-party components that can't be fixed.
   */
  exclude?: string[];

  /**
   * If true, only log violations without failing the test.
   * Useful during initial adoption to discover issues without blocking CI.
   * @default false
   */
  softMode?: boolean;
}

/**
 * Default WCAG tags for accessibility compliance.
 * Covers WCAG 2.1 Level A and Level AA criteria.
 */
const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Run axe-core accessibility analysis on a Playwright page.
 *
 * Scans the current page state for WCAG 2.1 AA accessibility violations.
 * By default, fails the test if any violations are found (hard mode).
 * Set `softMode: true` to log violations without failing.
 *
 * @param page - Playwright page object
 * @param options - Configuration options for the accessibility check
 * @returns The full axe-core results for further analysis
 *
 * @example
 * ```ts
 * // Basic usage - fails on any violation
 * await checkA11y(page);
 *
 * // Soft mode - logs violations but doesn't fail
 * await checkA11y(page, { softMode: true });
 *
 * // Scoped to specific area
 * await checkA11y(page, { include: ['main'] });
 *
 * // Exclude known problematic areas
 * await checkA11y(page, { exclude: ['.third-party-widget'] });
 * ```
 */
export async function checkA11y(
  page: Page,
  options: CheckA11yOptions = {},
): Promise<AxeResults> {
  const {
    tags = DEFAULT_TAGS,
    disableRules = [],
    include = [],
    exclude = [],
    softMode = false,
  } = options;

  let builder = new AxeBuilder({ page }).withTags(tags);

  if (disableRules.length > 0) {
    builder = builder.disableRules(disableRules);
  }

  for (const selector of include) {
    builder = builder.include(selector);
  }

  for (const selector of exclude) {
    builder = builder.exclude(selector);
  }

  const results = await builder.analyze();

  if (softMode) {
    // Log violations without failing the test
    if (results.violations.length > 0) {
      console.warn(
        `[a11y] ${results.violations.length} accessibility violation(s) found:`,
      );
      for (const violation of results.violations) {
        console.warn(
          `  - [${violation.impact}] ${violation.id}: ${violation.description}`,
        );
        console.warn(`    Help: ${violation.helpUrl}`);
        console.warn(`    Nodes affected: ${violation.nodes.length}`);
      }
    }
  } else {
    // Hard mode - fail the test on any violation
    const violationMessages = results.violations.map((violation) => {
      const nodes = violation.nodes
        .map((node) => `    - ${node.html}`)
        .join('\n');
      return `[${violation.impact}] ${violation.id}: ${violation.description}\n  Help: ${violation.helpUrl}\n  Affected nodes:\n${nodes}`;
    });

    expect(
      results.violations,
      `Accessibility violations found:\n${violationMessages.join('\n\n')}`,
    ).toHaveLength(0);
  }

  return results;
}

/**
 * Format axe-core results into a human-readable summary.
 *
 * Useful for logging or reporting accessibility audit results.
 *
 * @param results - axe-core analysis results
 * @returns Formatted summary string
 */
export function formatA11yResults(results: AxeResults): string {
  const lines: string[] = [
    `Accessibility Audit Summary:`,
    `  Violations: ${results.violations.length}`,
    `  Passes: ${results.passes.length}`,
    `  Incomplete: ${results.incomplete.length}`,
    `  Inapplicable: ${results.inapplicable.length}`,
  ];

  if (results.violations.length > 0) {
    lines.push('', 'Violations:');
    for (const violation of results.violations) {
      lines.push(
        `  [${violation.impact}] ${violation.id}: ${violation.description}`,
      );
    }
  }

  return lines.join('\n');
}
