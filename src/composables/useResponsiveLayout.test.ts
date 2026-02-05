/**
 * Unit tests for useResponsiveLayout composable
 *
 * Tests cover:
 * - Layout mode detection based on viewport
 * - Panel visibility in single/dual/triple modes
 * - Active panel management for mobile navigation
 * - Container class generation
 * - Custom panel configurations
 *
 * @see HAP-962 - Responsive Mobile-First Design System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';

// Mock useBreakpoints before importing the composable
const mockIsMobile = ref(false);
const mockIsDesktop = ref(true);
const mockIsLargeScreen = ref(false);
const mockGreaterOrEqual = vi.fn();

vi.mock('@/composables/useBreakpoints', () => ({
  useBreakpoints: () => ({
    isMobile: mockIsMobile,
    isDesktop: mockIsDesktop,
    isLargeScreen: mockIsLargeScreen,
    greaterOrEqual: mockGreaterOrEqual,
  }),
}));

import { useResponsiveLayout, DEFAULT_PANELS } from './useResponsiveLayout';

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    // Reset to desktop defaults
    mockIsMobile.value = false;
    mockIsDesktop.value = true;
    mockIsLargeScreen.value = false;

    // Default: greaterOrEqual returns true for all breakpoints on desktop
    mockGreaterOrEqual.mockImplementation(() => ref(true));
  });

  describe('layout mode detection', () => {
    it('should return "single" mode on mobile', () => {
      mockIsMobile.value = true;
      mockIsDesktop.value = false;
      mockIsLargeScreen.value = false;

      const { layoutMode, isSinglePanel } = useResponsiveLayout();
      expect(layoutMode.value).toBe('single');
      expect(isSinglePanel.value).toBe(true);
    });

    it('should return "dual" mode on desktop (not large)', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;
      mockIsLargeScreen.value = false;

      const { layoutMode, isDualPanel } = useResponsiveLayout();
      expect(layoutMode.value).toBe('dual');
      expect(isDualPanel.value).toBe(true);
    });

    it('should return "triple" mode on large screens', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;
      mockIsLargeScreen.value = true;

      const { layoutMode, isTriplePanel } = useResponsiveLayout();
      expect(layoutMode.value).toBe('triple');
      expect(isTriplePanel.value).toBe(true);
    });
  });

  describe('active panel management', () => {
    it('should default to "main" as active panel', () => {
      const { activePanel } = useResponsiveLayout();
      expect(activePanel.value).toBe('main');
    });

    it('should accept custom default panel', () => {
      const { activePanel } = useResponsiveLayout(DEFAULT_PANELS, 'sidebar');
      expect(activePanel.value).toBe('sidebar');
    });

    it('should update active panel via setActivePanel', () => {
      const { activePanel, setActivePanel } = useResponsiveLayout();
      setActivePanel('detail');
      expect(activePanel.value).toBe('detail');
    });

    it('should not update active panel for unknown panel id', () => {
      const { activePanel, setActivePanel } = useResponsiveLayout();
      setActivePanel('nonexistent');
      expect(activePanel.value).toBe('main');
    });
  });

  describe('panel visibility', () => {
    it('should show only active panel on mobile', () => {
      mockIsMobile.value = true;
      mockIsDesktop.value = false;
      mockIsLargeScreen.value = false;

      const { isPanelVisible } = useResponsiveLayout();
      expect(isPanelVisible('main')).toBe(true);
      expect(isPanelVisible('sidebar')).toBe(false);
      expect(isPanelVisible('detail')).toBe(false);
    });

    it('should show multiple panels on desktop based on breakpoint', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;

      const { isPanelVisible } = useResponsiveLayout();
      // All panels should be visible since greaterOrEqual returns true
      expect(isPanelVisible('main')).toBe(true);
      expect(isPanelVisible('sidebar')).toBe(true);
    });

    it('should return false for unknown panel id', () => {
      const { isPanelVisible } = useResponsiveLayout();
      expect(isPanelVisible('nonexistent')).toBe(false);
    });
  });

  describe('container class generation', () => {
    it('should return single column class on mobile', () => {
      mockIsMobile.value = true;
      mockIsDesktop.value = false;
      mockIsLargeScreen.value = false;

      const { containerClass } = useResponsiveLayout();
      expect(containerClass.value).toBe('flex flex-col h-full');
    });

    it('should return dual column class on desktop', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;
      mockIsLargeScreen.value = false;

      const { containerClass } = useResponsiveLayout();
      expect(containerClass.value).toContain('grid');
      expect(containerClass.value).toContain('grid-cols-');
    });

    it('should return triple column class on large screens', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;
      mockIsLargeScreen.value = true;

      const { containerClass } = useResponsiveLayout();
      expect(containerClass.value).toContain('grid');
    });
  });

  describe('custom panel configurations', () => {
    it('should accept custom panels', () => {
      const customPanels = [
        { id: 'left', minBreakpoint: 'md' as const, defaultWidth: 30, collapsible: true },
        { id: 'center', minBreakpoint: 'sm' as const, defaultWidth: 40, collapsible: false },
        { id: 'right', minBreakpoint: 'xl' as const, defaultWidth: 30, collapsible: true },
      ];

      const { activePanel, setActivePanel } = useResponsiveLayout(customPanels, 'center');
      expect(activePanel.value).toBe('center');

      setActivePanel('left');
      expect(activePanel.value).toBe('left');
    });
  });

  describe('visible panel count', () => {
    it('should count visible panels based on breakpoint', () => {
      mockGreaterOrEqual.mockImplementation(() => ref(true));

      const { visiblePanelCount } = useResponsiveLayout();
      expect(visiblePanelCount.value).toBe(3);
    });
  });
});
