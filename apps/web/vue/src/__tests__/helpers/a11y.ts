/**
 * Accessibility test helpers for Vitest component tests
 *
 * Provides utilities for running axe-core accessibility checks on
 * Vue components rendered with @vue/test-utils.
 *
 * Uses vitest-axe under the hood for WCAG 2.1 AA compliance checking.
 *
 * @example
 * ```ts
 * import { mount } from '@vue/test-utils';
 * import { checkComponentA11y, getComponentHtml } from '../helpers/a11y';
 *
 * it('should have no accessibility violations', async () => {
 *   const wrapper = mount(MyComponent);
 *   await checkComponentA11y(wrapper);
 * });
 * ```
 *
 * @see HAP-972 - Screen reader and axe-core accessibility testing
 * @see HAP-889 - Reference implementation in happy-admin
 */

import { configureAxe } from 'vitest-axe';
import type { VueWrapper } from '@vue/test-utils';
import type { AxeResults, RunOptions } from 'axe-core';

/**
 * Default axe-core configuration for WCAG 2.1 AA compliance.
 *
 * Runs checks against both WCAG 2.1 Level A and Level AA criteria.
 * This matches the configuration used in E2E tests for consistency.
 */
const defaultAxeOptions: RunOptions = {
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
  },
};

/**
 * Configured axe instance with WCAG 2.1 AA defaults.
 */
const axeWithDefaults = configureAxe(defaultAxeOptions);

/**
 * Extract the rendered HTML from a Vue Test Utils wrapper,
 * wrapped in a proper HTML document structure for axe-core analysis.
 *
 * axe-core needs a valid document structure to run checks properly.
 * This wraps the component HTML in html/head/body/main tags with
 * appropriate lang attribute.
 */
export function getComponentHtml(wrapper: VueWrapper): string {
  return `
    <html lang="en">
      <head><title>Test</title></head>
      <body>
        <main>
          ${wrapper.html()}
        </main>
      </body>
    </html>
  `;
}

/**
 * Run axe-core accessibility checks on a mounted Vue component.
 *
 * This is the primary helper for component-level accessibility testing.
 * It extracts the component's HTML, runs axe-core analysis, and asserts
 * that no WCAG 2.1 AA violations are found.
 *
 * @param wrapper - A mounted Vue Test Utils wrapper
 * @param options - Optional additional axe-core run options to merge
 * @returns The axe results for further inspection if needed
 *
 * @throws AssertionError if accessibility violations are found
 *
 * @example
 * ```ts
 * const wrapper = mount(Button, { slots: { default: 'Click me' } });
 * await checkComponentA11y(wrapper);
 * ```
 */
export async function checkComponentA11y(
  wrapper: VueWrapper,
  options?: RunOptions,
): Promise<AxeResults> {
  const html = getComponentHtml(wrapper);
  const results = await axeWithDefaults(html, options);
  expect(results).toHaveNoViolations();
  return results;
}

/**
 * Run axe-core on raw HTML string for testing non-component markup.
 *
 * Useful for testing HTML fragments or template output directly.
 *
 * @param html - HTML string to test
 * @param options - Optional additional axe-core run options
 * @returns The axe results
 */
export async function checkHtmlA11y(
  html: string,
  options?: RunOptions,
): Promise<AxeResults> {
  const results = await axeWithDefaults(html, options);
  expect(results).toHaveNoViolations();
  return results;
}
