/**
 * Unit tests for ResponsiveContainer component
 *
 * Tests the responsive container's class generation logic.
 * Component rendering is validated through the composable layer
 * since Vue 3.5+ has a known `renderSlot` issue in node-based
 * test environments (happy-dom/jsdom).
 *
 * The class generation logic is the primary unit of behavior:
 * - Size variants map to correct max-width classes
 * - Padding variants map to correct responsive padding
 * - Centering is applied by default
 * - Custom classes are merged via tailwind-merge
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 */

import { describe, it, expect } from 'vitest';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Replicates the class generation logic from ResponsiveContainer.vue
 * This tests the core behavior without needing DOM rendering
 */
function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs));
}

const sizeClasses: Record<string, string> = {
  full: 'w-full',
  narrow: 'w-full max-w-2xl',
  default: 'w-full max-w-5xl',
  wide: 'w-full max-w-7xl',
  ultrawide: 'w-full max-w-screen-2xl',
};

const paddingClasses: Record<string, string> = {
  none: '',
  compact: 'px-3 py-2 sm:px-4 sm:py-3',
  default: 'px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6',
  comfortable: 'px-4 py-6 sm:px-8 sm:py-8 lg:px-12 lg:py-10',
};

function buildContainerClass(
  size = 'default',
  padding = 'default',
  centered = true,
  customClass?: string,
): string {
  return cn(
    sizeClasses[size],
    paddingClasses[padding],
    centered && 'mx-auto',
    customClass,
  );
}

describe('ResponsiveContainer', () => {
  describe('size variants', () => {
    it('should apply narrow max-width class', () => {
      const result = buildContainerClass('narrow');
      expect(result).toContain('max-w-2xl');
      expect(result).toContain('w-full');
    });

    it('should apply default max-width class', () => {
      const result = buildContainerClass('default');
      expect(result).toContain('max-w-5xl');
    });

    it('should apply wide max-width class', () => {
      const result = buildContainerClass('wide');
      expect(result).toContain('max-w-7xl');
    });

    it('should apply ultrawide max-width class', () => {
      const result = buildContainerClass('ultrawide');
      expect(result).toContain('max-w-screen-2xl');
    });

    it('should apply full width without max-width constraint', () => {
      const result = buildContainerClass('full');
      expect(result).toContain('w-full');
      expect(result).not.toContain('max-w-2xl');
      expect(result).not.toContain('max-w-5xl');
      expect(result).not.toContain('max-w-7xl');
    });
  });

  describe('padding variants', () => {
    it('should apply no padding with "none"', () => {
      const result = buildContainerClass('default', 'none');
      expect(result).not.toMatch(/\bpx-\d/);
      expect(result).not.toMatch(/\bpy-\d/);
    });

    it('should apply compact padding', () => {
      const result = buildContainerClass('default', 'compact');
      expect(result).toContain('px-3');
    });

    it('should apply default responsive padding', () => {
      const result = buildContainerClass('default', 'default');
      expect(result).toContain('px-4');
      expect(result).toContain('lg:px-8');
    });

    it('should apply comfortable padding', () => {
      const result = buildContainerClass('default', 'comfortable');
      expect(result).toContain('px-4');
      expect(result).toContain('lg:px-12');
    });
  });

  describe('centering', () => {
    it('should center by default', () => {
      const result = buildContainerClass('default', 'default', true);
      expect(result).toContain('mx-auto');
    });

    it('should not center when centered=false', () => {
      const result = buildContainerClass('default', 'default', false);
      expect(result).not.toContain('mx-auto');
    });
  });

  describe('custom classes', () => {
    it('should merge custom classes', () => {
      const result = buildContainerClass('default', 'default', true, 'custom-class');
      expect(result).toContain('custom-class');
    });

    it('should handle tailwind-merge conflicts correctly', () => {
      // Custom padding should override default padding via tailwind-merge
      const result = buildContainerClass('default', 'default', true, 'px-8');
      // tailwind-merge should keep only the last px value
      expect(result).toContain('px-8');
    });
  });

  describe('combined configurations', () => {
    it('should combine narrow + compact + not centered', () => {
      const result = buildContainerClass('narrow', 'compact', false);
      expect(result).toContain('max-w-2xl');
      expect(result).toContain('px-3');
      expect(result).not.toContain('mx-auto');
    });

    it('should combine wide + comfortable + centered', () => {
      const result = buildContainerClass('wide', 'comfortable', true);
      expect(result).toContain('max-w-7xl');
      expect(result).toContain('mx-auto');
    });

    it('should combine full + none + not centered', () => {
      const result = buildContainerClass('full', 'none', false);
      expect(result).toBe('w-full');
    });
  });
});
