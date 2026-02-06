/**
 * Accessibility tests for SkipLink component
 *
 * Validates that the SkipLink component meets WCAG 2.1 AA standards:
 * - Proper link semantics for skip navigation
 * - Correct href attribute pointing to target
 * - Visible label text for screen readers
 * - Focus management behavior
 *
 * @see HAP-972 - Screen reader and axe-core accessibility testing
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import SkipLink from '@/components/app/SkipLink.vue';
import { checkComponentA11y } from '../helpers/a11y';

describe('SkipLink Accessibility', () => {
  it('should have no axe-core violations with default props', async () => {
    const wrapper = mount(SkipLink);
    await checkComponentA11y(wrapper);
  });

  it('should have no axe-core violations with custom props', async () => {
    const wrapper = mount(SkipLink, {
      props: {
        targetId: 'content-area',
        label: 'Skip to content',
      },
    });
    await checkComponentA11y(wrapper);
  });

  it('should render as a link element', () => {
    const wrapper = mount(SkipLink);
    const link = wrapper.find('a');

    expect(link.exists()).toBe(true);
    expect(link.attributes('href')).toBe('#main-content');
  });

  it('should have accessible label text', () => {
    const wrapper = mount(SkipLink, {
      props: { label: 'Skip to main content' },
    });

    expect(wrapper.text()).toBe('Skip to main content');
  });

  it('should point to correct target with custom targetId', () => {
    const wrapper = mount(SkipLink, {
      props: { targetId: 'primary-content' },
    });

    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('#primary-content');
  });

  it('should use default label when none provided', () => {
    const wrapper = mount(SkipLink);
    expect(wrapper.text()).toBe('Skip to main content');
  });

  it('should use default targetId when none provided', () => {
    const wrapper = mount(SkipLink);
    const link = wrapper.find('a');
    expect(link.attributes('href')).toBe('#main-content');
  });
});
