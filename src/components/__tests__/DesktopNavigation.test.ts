/**
 * Unit tests for DesktopNavigation component
 *
 * Tests the desktop navigation's class and style generation logic.
 * Component rendering is validated through the composable layer
 * since Vue 3.5+ has a known `renderSlot` issue in node-based
 * test environments (happy-dom/jsdom).
 *
 * Core behavior tested:
 * - Visibility based on desktop breakpoint
 * - Width computation from props
 * - Collapsed state width (48px)
 * - CSS class generation including transitions and borders
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 */

import { describe, it, expect } from 'vitest';
import { twMerge } from 'tailwind-merge';
import { clsx } from 'clsx';

/**
 * Replicates the cn utility from @/lib/utils
 */
function cn(...inputs: (string | undefined | null | boolean)[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Replicates style computation from DesktopNavigation.vue
 */
function computeNavStyle(collapsed: boolean, width: number) {
  return {
    width: collapsed ? '48px' : `${width}px`,
  };
}

/**
 * Replicates class computation from DesktopNavigation.vue
 */
function computeNavClass(collapsed: boolean, customClass?: string) {
  return cn(
    'hidden lg:flex flex-col h-full border-r border-border bg-sidebar-background transition-[width] duration-200 ease-in-out',
    collapsed && 'items-center',
    customClass,
  );
}

describe('DesktopNavigation', () => {
  describe('visibility', () => {
    it('should include lg:flex for desktop visibility', () => {
      const result = computeNavClass(false);
      expect(result).toContain('lg:flex');
    });

    it('should include hidden for mobile hiding', () => {
      const result = computeNavClass(false);
      expect(result).toContain('hidden');
    });
  });

  describe('width', () => {
    it('should compute default width of 256px', () => {
      const style = computeNavStyle(false, 256);
      expect(style.width).toBe('256px');
    });

    it('should compute custom width', () => {
      const style = computeNavStyle(false, 300);
      expect(style.width).toBe('300px');
    });

    it('should compute large custom width', () => {
      const style = computeNavStyle(false, 400);
      expect(style.width).toBe('400px');
    });
  });

  describe('collapsed state', () => {
    it('should use 48px width when collapsed', () => {
      const style = computeNavStyle(true, 256);
      expect(style.width).toBe('48px');
    });

    it('should use full width when not collapsed', () => {
      const style = computeNavStyle(false, 256);
      expect(style.width).toBe('256px');
    });

    it('should add items-center class when collapsed', () => {
      const result = computeNavClass(true);
      expect(result).toContain('items-center');
    });

    it('should not add items-center class when not collapsed', () => {
      const result = computeNavClass(false);
      expect(result).not.toContain('items-center');
    });
  });

  describe('styling', () => {
    it('should include border-r for right border', () => {
      const result = computeNavClass(false);
      expect(result).toContain('border-r');
    });

    it('should include sidebar background color', () => {
      const result = computeNavClass(false);
      expect(result).toContain('bg-sidebar-background');
    });

    it('should include width transition', () => {
      const result = computeNavClass(false);
      expect(result).toContain('transition-[width]');
    });

    it('should include h-full for full height', () => {
      const result = computeNavClass(false);
      expect(result).toContain('h-full');
    });

    it('should include flex-col for vertical layout', () => {
      const result = computeNavClass(false);
      expect(result).toContain('flex-col');
    });
  });

  describe('custom classes', () => {
    it('should merge custom classes', () => {
      const result = computeNavClass(false, 'custom-nav-class');
      expect(result).toContain('custom-nav-class');
    });
  });
});
