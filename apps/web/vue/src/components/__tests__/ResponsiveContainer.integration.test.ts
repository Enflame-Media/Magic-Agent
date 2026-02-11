/**
 * Integration tests for ResponsiveContainer component
 *
 * These tests use Vue Test Utils `mount()` to verify actual component rendering,
 * complementing the existing unit tests (ResponsiveContainer.test.ts) that test
 * class generation logic via pure functions.
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
 *    allows testing reactive behavior without DOM media query events.
 *
 * This approach successfully tests:
 * - Component mounts without errors
 * - Slot content passes through and renders
 * - Props trigger reactive class updates
 * - The `data-mobile` attribute reflects breakpoint state
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

import ResponsiveContainer from '../app/ResponsiveContainer.vue';

describe('ResponsiveContainer (integration)', () => {
  beforeEach(() => {
    // Reset to desktop defaults
    mockIsMobile.value = false;
    mockIsDesktop.value = true;
    mockIsTablet.value = true;
    mockIsLargeScreen.value = false;
    mockCurrent.value = 'lg';
  });

  describe('component mounting', () => {
    it('should mount without errors', () => {
      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.exists()).toBe(true);
    });

    it('should render a div element as root', () => {
      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.element.tagName).toBe('DIV');
    });
  });

  describe('slot rendering', () => {
    it('should render default slot content', () => {
      const wrapper = mount(ResponsiveContainer, {
        slots: {
          default: '<p class="test-content">Hello World</p>',
        },
      });

      const content = wrapper.find('.test-content');
      expect(content.exists()).toBe(true);
      expect(content.text()).toBe('Hello World');
    });

    it('should render multiple slot children', () => {
      const wrapper = mount(ResponsiveContainer, {
        slots: {
          default: '<div class="child-1">First</div><div class="child-2">Second</div>',
        },
      });

      expect(wrapper.find('.child-1').exists()).toBe(true);
      expect(wrapper.find('.child-2').exists()).toBe(true);
      expect(wrapper.find('.child-1').text()).toBe('First');
      expect(wrapper.find('.child-2').text()).toBe('Second');
    });

    it('should render empty when no slot content provided', () => {
      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.element.innerHTML).toBe('');
    });
  });

  describe('prop-driven class updates', () => {
    it('should apply default size and padding classes', () => {
      const wrapper = mount(ResponsiveContainer);
      const classes = wrapper.classes().join(' ');

      // Default size: max-w-5xl
      expect(classes).toContain('max-w-5xl');
      // Default padding: px-4
      expect(classes).toContain('px-4');
      // Default centered: mx-auto
      expect(classes).toContain('mx-auto');
    });

    it('should apply narrow size class', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { size: 'narrow' },
      });
      expect(wrapper.classes().join(' ')).toContain('max-w-2xl');
    });

    it('should apply wide size class', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { size: 'wide' },
      });
      expect(wrapper.classes().join(' ')).toContain('max-w-7xl');
    });

    it('should apply ultrawide size class', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { size: 'ultrawide' },
      });
      expect(wrapper.classes().join(' ')).toContain('max-w-screen-2xl');
    });

    it('should apply full size without max-width constraint', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { size: 'full' },
      });
      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('w-full');
      expect(classes).not.toContain('max-w-');
    });

    it('should apply compact padding', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { padding: 'compact' },
      });
      expect(wrapper.classes().join(' ')).toContain('px-3');
    });

    it('should apply comfortable padding', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { padding: 'comfortable' },
      });
      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('px-4');
      expect(classes).toContain('lg:px-12');
    });

    it('should apply no padding with "none"', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { padding: 'none' },
      });
      const classes = wrapper.classes().join(' ');
      expect(classes).not.toMatch(/\bpx-\d/);
      expect(classes).not.toMatch(/\bpy-\d/);
    });

    it('should remove centering when centered=false', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { centered: false },
      });
      expect(wrapper.classes()).not.toContain('mx-auto');
    });

    it('should apply centering by default', () => {
      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.classes()).toContain('mx-auto');
    });
  });

  describe('reactive prop changes', () => {
    it('should re-render with correct classes when size prop changes', async () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { size: 'narrow' },
      });
      expect(wrapper.classes().join(' ')).toContain('max-w-2xl');

      await wrapper.setProps({ size: 'wide' });
      expect(wrapper.classes().join(' ')).toContain('max-w-7xl');
      expect(wrapper.classes().join(' ')).not.toContain('max-w-2xl');
    });

    it('should re-render with correct classes when padding prop changes', async () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { padding: 'compact' },
      });
      expect(wrapper.classes().join(' ')).toContain('px-3');

      await wrapper.setProps({ padding: 'comfortable' });
      expect(wrapper.classes().join(' ')).toContain('lg:px-12');
    });

    it('should toggle centering when centered prop changes', async () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { centered: true },
      });
      expect(wrapper.classes()).toContain('mx-auto');

      await wrapper.setProps({ centered: false });
      expect(wrapper.classes()).not.toContain('mx-auto');
    });
  });

  describe('data-mobile attribute', () => {
    it('should set data-mobile="true" when on mobile viewport', () => {
      mockIsMobile.value = true;
      mockIsDesktop.value = false;

      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.attributes('data-mobile')).toBe('true');
    });

    it('should not have data-mobile attribute on desktop viewport', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;

      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.attributes('data-mobile')).toBeUndefined();
    });

    it('should reactively update data-mobile when breakpoint changes', async () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;

      const wrapper = mount(ResponsiveContainer);
      expect(wrapper.attributes('data-mobile')).toBeUndefined();

      // Simulate viewport change to mobile
      mockIsMobile.value = true;
      mockIsDesktop.value = false;
      await nextTick();

      expect(wrapper.attributes('data-mobile')).toBe('true');
    });
  });

  describe('custom class merging', () => {
    it('should merge custom classes via class prop', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { class: 'custom-container-class' },
      });
      expect(wrapper.classes()).toContain('custom-container-class');
    });

    it('should allow tailwind-merge to resolve conflicts', () => {
      const wrapper = mount(ResponsiveContainer, {
        props: { class: 'px-8' },
      });
      // tailwind-merge should resolve the padding conflict
      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('px-8');
    });
  });

  describe('combined prop configurations', () => {
    it('should render narrow + compact + not centered on mobile', () => {
      mockIsMobile.value = true;
      mockIsDesktop.value = false;

      const wrapper = mount(ResponsiveContainer, {
        props: {
          size: 'narrow',
          padding: 'compact',
          centered: false,
        },
        slots: {
          default: '<span>Mobile content</span>',
        },
      });

      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('max-w-2xl');
      expect(classes).toContain('px-3');
      expect(classes).not.toContain('mx-auto');
      expect(wrapper.attributes('data-mobile')).toBe('true');
      expect(wrapper.text()).toBe('Mobile content');
    });

    it('should render wide + comfortable + centered on desktop', () => {
      mockIsMobile.value = false;
      mockIsDesktop.value = true;

      const wrapper = mount(ResponsiveContainer, {
        props: {
          size: 'wide',
          padding: 'comfortable',
          centered: true,
        },
        slots: {
          default: '<span>Desktop content</span>',
        },
      });

      const classes = wrapper.classes().join(' ');
      expect(classes).toContain('max-w-7xl');
      expect(classes).toContain('mx-auto');
      expect(wrapper.attributes('data-mobile')).toBeUndefined();
      expect(wrapper.text()).toBe('Desktop content');
    });
  });
});
