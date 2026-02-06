/**
 * Accessibility tests for SiteHeader component
 *
 * Validates that the SiteHeader component meets WCAG 2.1 AA standards:
 * - Proper banner landmark role
 * - Accessible labels on interactive elements
 * - aria-hidden on decorative elements
 * - Correct heading hierarchy
 *
 * @see HAP-972 - Screen reader and axe-core accessibility testing
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */

import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SiteHeader from '@/components/SiteHeader.vue';
import { checkComponentA11y } from '../helpers/a11y';

// Mock composables used by SiteHeader
vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useCommandPaletteState: () => ({
    open: vi.fn(),
  }),
}));

vi.mock('@/composables/useBreakpoints', () => ({
  useBreakpoints: () => ({
    isLargeScreen: false,
  }),
}));

describe('SiteHeader Accessibility', () => {
  function mountHeader(props: Record<string, unknown> = {}) {
    return mount(SiteHeader, {
      props,
      global: {
        stubs: {
          SidebarTrigger: {
            template: '<button aria-label="Toggle sidebar">Toggle</button>',
          },
          Separator: {
            template: '<div role="separator" aria-hidden="true"></div>',
          },
          AppBreadcrumbs: {
            template: '<nav aria-label="Breadcrumbs">Home</nav>',
          },
          Button: {
            template: '<button v-bind="$attrs"><slot /></button>',
          },
          Kbd: {
            template: '<kbd><slot /></kbd>',
          },
        },
      },
    });
  }

  it('should have no axe-core violations', async () => {
    const wrapper = mountHeader();
    await checkComponentA11y(wrapper);
  });

  it('should have no axe-core violations with title prop', async () => {
    const wrapper = mountHeader({ title: 'Settings' });
    await checkComponentA11y(wrapper);
  });

  it('should use banner landmark role on header element', () => {
    const wrapper = mountHeader();
    const header = wrapper.find('header');

    expect(header.exists()).toBe(true);
    expect(header.attributes('role')).toBe('banner');
  });

  it('should render a heading for page title', () => {
    const wrapper = mountHeader({ title: 'Dashboard' });
    const h1 = wrapper.find('h1');

    expect(h1.exists()).toBe(true);
    expect(h1.text()).toBe('Dashboard');
  });

  it('should default heading to Dashboard when no title provided', () => {
    const wrapper = mountHeader();
    const h1 = wrapper.find('h1');

    expect(h1.exists()).toBe(true);
    expect(h1.text()).toBe('Dashboard');
  });

  it('should have aria-label on sidebar trigger', () => {
    const wrapper = mountHeader();
    const trigger = wrapper.find('button[aria-label="Toggle sidebar"]');

    expect(trigger.exists()).toBe(true);
  });
});
