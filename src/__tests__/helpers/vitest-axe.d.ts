/**
 * Type augmentation for vitest-axe with vitest v4
 *
 * The vitest-axe package (v0.1.0) augments the old `Vi` namespace which
 * doesn't exist in vitest v4. This declaration extends the correct
 * vitest v4 `Assertion` interface.
 *
 * @see HAP-972 - Screen reader and axe-core accessibility testing
 */

import type { AxeResults } from 'axe-core';

interface AxeMatchers {
  toHaveNoViolations(): void;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
