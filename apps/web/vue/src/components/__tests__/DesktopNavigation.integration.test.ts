/**
 * Integration tests for DesktopNavigation component
 *
 * These tests use Vue Test Utils `mount()` to verify actual component rendering,
 * complementing the existing unit tests (DesktopNavigation.test.ts) that test
 * class and style computation via pure functions.
 *
 * ## Vue 3.5+ renderSlot Workaround
 *
 * Vue 3.5+ introduced an optimized `renderSlot` implementation that can cause
 * issues in node-based test environments (happy-dom/jsdom) when slots contain
 * complex component trees. The workaround used here:
 *
 * 1. **Simple HTML slot content**: Using plain HTML strings instead of complex
 *    component trees avoids the renderSlot optimization path that triggers the issue.
 * 2. **Mocked composables**: The `useBreakpoints` composable is mocked with
 *    reactive refs, allowing breakpoint state to be controlled without relying
 *    on `window.matchMedia` (which is not available in happy-dom by default).
 * 3. **Direct ref mutation**: Changing mock ref values and awaiting `nextTick()`
 *    allows testing reactive `v-if` visibility without DOM media query events.
 *
 * This approach successfully tests:
 * - Component mounts without errors
 * - `v-if="isDesktop"` toggles rendering based on breakpoint state
 * - Slot content passes through and renders
 * - ARIA attributes (`role`, `aria-label`) are present
 * - Props trigger reactive style and class updates
 * - Collapsed state changes width and alignment
 *
 * @see HAP-983 - Integration tests for responsive components
 * @see HAP-962 - Responsive Mobile-First Design System
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref, nextTick } from 'vue';

// Mock useBreakpoints before importing the component
const mockIsMobile = ref(false);
const mockIsDesktop = ref(true);
const mockIsTablet = ref(true);
const mockIsLargeScreen = ref(false);
const mockCurrent = ref<string>('lg');
const mockGreaterOrEqual = vi.fn(() => ref(true));

vi.mock('@/composables/useBreakpoints', () => ({
  useBreakpoints: () => ({
    isMobile: mockIsMobile,
    isDesktop: mockIsDesktop,
    isTablet: mockIsTablet,
    isLargeScreen: mockIsLargeScreen,
    current: mockCurrent,
    greaterOrEqual: mockGreaterOrEqual,
    greater: vi.fn(() => ref(true)),
    smallerOrEqual: vi.fn(() => ref(false)),
    smaller: vi.fn(() => ref(false)),
    between: vi.fn(() => ref(false)),
  }),
}));

import DesktopNavigation from '../app/DesktopNavigation.vue';

describe('DesktopNavigation (integration)', () => {
  beforeEach(() => {
    // Reset to desktop defaults (component is visible)
    mockIsMobile.value = false;
    mockIsDesktop.value = true;
    mockIsTablet.value = true;
    mockIsLargeScreen.value = false;
    mockCurrent.value = 'lg';
  });

  describe('component mounting', () => {
    it('should mount without errors on desktop', () => {
      const wrapper = mount(DesktopNavigation);
      expect(wrapper.exists()).toBe(true);
    });

    it('should render a nav element as root on desktop', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      expect(nav.exists()).toBe(true);
      expect(nav.element.tagName).toBe('NAV');
    });
  });

  describe('v-if visibility toggling', () => {
    it('should render nav element when isDesktop is true', () => {
      mockIsDesktop.value = true;

      const wrapper = mount(DesktopNavigation);
      expect(wrapper.find('nav').exists()).toBe(true);
    });

    it('should not render nav element when isDesktop is false', () => {
      mockIsDesktop.value = false;

      const wrapper = mount(DesktopNavigation);
      expect(wrapper.find('nav').exists()).toBe(false);
    });

    it('should hide nav when viewport changes from desktop to mobile', async () => {
      mockIsDesktop.value = true;

      const wrapper = mount(DesktopNavigation);
      expect(wrapper.find('nav').exists()).toBe(true);

      // Simulate viewport change to mobile
      mockIsDesktop.value = false;
      await nextTick();

      expect(wrapper.find('nav').exists()).toBe(false);
    });

    it('should show nav when viewport changes from mobile to desktop', async () => {
      mockIsDesktop.value = false;

      const wrapper = mount(DesktopNavigation);
      expect(wrapper.find('nav').exists()).toBe(false);

      // Simulate viewport change to desktop
      mockIsDesktop.value = true;
      await nextTick();

      expect(wrapper.find('nav').exists()).toBe(true);
    });

    it('should toggle visibility multiple times reactively', async () => {
      mockIsDesktop.value = true;

      const wrapper = mount(DesktopNavigation);
      expect(wrapper.find('nav').exists()).toBe(true);

      // Desktop -> Mobile
      mockIsDesktop.value = false;
      await nextTick();
      expect(wrapper.find('nav').exists()).toBe(false);

      // Mobile -> Desktop
      mockIsDesktop.value = true;
      await nextTick();
      expect(wrapper.find('nav').exists()).toBe(true);

      // Desktop -> Mobile again
      mockIsDesktop.value = false;
      await nextTick();
      expect(wrapper.find('nav').exists()).toBe(false);
    });
  });

  describe('ARIA attributes', () => {
    it('should have role="navigation"', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      expect(nav.attributes('role')).toBe('navigation');
    });

    it('should have aria-label="Desktop navigation"', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      expect(nav.attributes('aria-label')).toBe('Desktop navigation');
    });

    it('should preserve ARIA attributes after prop changes', async () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: false },
      });

      const nav = wrapper.find('nav');
      expect(nav.attributes('role')).toBe('navigation');
      expect(nav.attributes('aria-label')).toBe('Desktop navigation');

      // Change collapsed state
      await wrapper.setProps({ collapsed: true });
      const navAfter = wrapper.find('nav');
      expect(navAfter.attributes('role')).toBe('navigation');
      expect(navAfter.attributes('aria-label')).toBe('Desktop navigation');
    });
  });

  describe('slot rendering', () => {
    it('should render default slot content', () => {
      const wrapper = mount(DesktopNavigation, {
        slots: {
          default: '<ul class="nav-items"><li>Home</li><li>Settings</li></ul>',
        },
      });

      const navItems = wrapper.find('.nav-items');
      expect(navItems.exists()).toBe(true);
      expect(navItems.findAll('li')).toHaveLength(2);
    });

    it('should render complex slot content', () => {
      const wrapper = mount(DesktopNavigation, {
        slots: {
          default: '<div class="sidebar-header">Header</div><div class="sidebar-body">Body</div><div class="sidebar-footer">Footer</div>',
        },
      });

      expect(wrapper.find('.sidebar-header').exists()).toBe(true);
      expect(wrapper.find('.sidebar-body').exists()).toBe(true);
      expect(wrapper.find('.sidebar-footer').exists()).toBe(true);
    });

    it('should render empty when no slot content provided', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      expect(nav.element.innerHTML).toBe('');
    });

    it('should not render slot content when isDesktop is false', () => {
      mockIsDesktop.value = false;

      const wrapper = mount(DesktopNavigation, {
        slots: {
          default: '<div class="should-not-render">Hidden</div>',
        },
      });

      expect(wrapper.find('.should-not-render').exists()).toBe(false);
    });
  });

  describe('prop-driven class updates', () => {
    it('should apply base navigation classes', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      const classes = nav.classes().join(' ');

      expect(classes).toContain('flex-col');
      expect(classes).toContain('h-full');
      expect(classes).toContain('border-r');
    });

    it('should include transition classes for width animation', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      const classes = nav.classes().join(' ');

      expect(classes).toContain('transition-[width]');
      expect(classes).toContain('duration-200');
      expect(classes).toContain('ease-in-out');
    });

    it('should add items-center when collapsed', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: true },
      });
      const nav = wrapper.find('nav');
      expect(nav.classes()).toContain('items-center');
    });

    it('should not add items-center when not collapsed', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: false },
      });
      const nav = wrapper.find('nav');
      expect(nav.classes()).not.toContain('items-center');
    });

    it('should merge custom classes via class prop', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { class: 'custom-nav-class' },
      });
      const nav = wrapper.find('nav');
      expect(nav.classes()).toContain('custom-nav-class');
    });
  });

  describe('prop-driven style updates', () => {
    it('should set default width to 256px', () => {
      const wrapper = mount(DesktopNavigation);
      const nav = wrapper.find('nav');
      expect(nav.attributes('style')).toContain('width: 256px');
    });

    it('should set collapsed width to 48px', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: true },
      });
      const nav = wrapper.find('nav');
      expect(nav.attributes('style')).toContain('width: 48px');
    });

    it('should set custom width', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { width: 320 },
      });
      const nav = wrapper.find('nav');
      expect(nav.attributes('style')).toContain('width: 320px');
    });

    it('should ignore custom width when collapsed', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: true, width: 320 },
      });
      const nav = wrapper.find('nav');
      expect(nav.attributes('style')).toContain('width: 48px');
    });
  });

  describe('reactive prop changes', () => {
    it('should update width style when collapsed prop changes', async () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: false, width: 256 },
      });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 256px');

      await wrapper.setProps({ collapsed: true });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 48px');
    });

    it('should update width style when width prop changes', async () => {
      const wrapper = mount(DesktopNavigation, {
        props: { width: 256 },
      });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 256px');

      await wrapper.setProps({ width: 400 });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 400px');
    });

    it('should toggle items-center class when collapsed prop changes', async () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: false },
      });
      expect(wrapper.find('nav').classes()).not.toContain('items-center');

      await wrapper.setProps({ collapsed: true });
      expect(wrapper.find('nav').classes()).toContain('items-center');

      await wrapper.setProps({ collapsed: false });
      expect(wrapper.find('nav').classes()).not.toContain('items-center');
    });
  });

  describe('combined scenarios', () => {
    it('should render collapsed nav with slot content on desktop', () => {
      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: true },
        slots: {
          default: '<div class="icon-menu">Icons</div>',
        },
      });

      const nav = wrapper.find('nav');
      expect(nav.exists()).toBe(true);
      expect(nav.classes()).toContain('items-center');
      expect(nav.attributes('style')).toContain('width: 48px');
      expect(nav.attributes('role')).toBe('navigation');
      expect(wrapper.find('.icon-menu').exists()).toBe(true);
    });

    it('should handle full lifecycle: mount -> expand -> collapse -> hide', async () => {
      mockIsDesktop.value = true;

      const wrapper = mount(DesktopNavigation, {
        props: { collapsed: false, width: 256 },
        slots: {
          default: '<div class="nav-content">Navigation</div>',
        },
      });

      // Initial: expanded desktop nav
      expect(wrapper.find('nav').exists()).toBe(true);
      expect(wrapper.find('nav').attributes('style')).toContain('width: 256px');
      expect(wrapper.find('.nav-content').exists()).toBe(true);

      // Collapse
      await wrapper.setProps({ collapsed: true });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 48px');
      expect(wrapper.find('nav').classes()).toContain('items-center');

      // Expand with new width
      await wrapper.setProps({ collapsed: false, width: 320 });
      expect(wrapper.find('nav').attributes('style')).toContain('width: 320px');
      expect(wrapper.find('nav').classes()).not.toContain('items-center');

      // Hide by switching to mobile
      mockIsDesktop.value = false;
      await nextTick();
      expect(wrapper.find('nav').exists()).toBe(false);
      expect(wrapper.find('.nav-content').exists()).toBe(false);
    });
  });
});
