/**
 * Unit tests for Button UI component
 *
 * Tests the Button component from shadcn-vue:
 * - Variant rendering
 * - Size variations
 * - Custom class merging
 * - Slot content rendering
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  describe('Default Rendering', () => {
    it('should render with default variant and size', () => {
      const wrapper = mount(Button, {
        slots: {
          default: 'Click me',
        },
      });

      expect(wrapper.text()).toBe('Click me');
      expect(wrapper.element.tagName).toBe('BUTTON');
    });

    it('should render as button by default', () => {
      const wrapper = mount(Button, {
        slots: { default: 'Button' },
      });

      expect(wrapper.element.tagName).toBe('BUTTON');
    });

    it('should have data-slot="button" attribute', () => {
      const wrapper = mount(Button, {
        slots: { default: 'Test' },
      });

      expect(wrapper.attributes('data-slot')).toBe('button');
    });
  });

  describe('Variants', () => {
    it('should apply default variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'default' },
        slots: { default: 'Default' },
      });

      // Default variant should have primary background
      expect(wrapper.classes().join(' ')).toMatch(/bg-primary/);
    });

    it('should apply destructive variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'destructive' },
        slots: { default: 'Delete' },
      });

      // Destructive variant should have destructive background
      expect(wrapper.classes().join(' ')).toMatch(/bg-destructive/);
    });

    it('should apply outline variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'outline' },
        slots: { default: 'Outline' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/border/);
    });

    it('should apply secondary variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'secondary' },
        slots: { default: 'Secondary' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/bg-secondary/);
    });

    it('should apply ghost variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'ghost' },
        slots: { default: 'Ghost' },
      });

      // Ghost buttons have hover effects but minimal base styling
      expect(wrapper.classes().join(' ')).toMatch(/hover:/);
    });

    it('should apply link variant classes', () => {
      const wrapper = mount(Button, {
        props: { variant: 'link' },
        slots: { default: 'Link' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/underline-offset/);
    });
  });

  describe('Sizes', () => {
    it('should apply default size', () => {
      const wrapper = mount(Button, {
        props: { size: 'default' },
        slots: { default: 'Default' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/h-9/);
    });

    it('should apply sm size', () => {
      const wrapper = mount(Button, {
        props: { size: 'sm' },
        slots: { default: 'Small' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/h-8/);
    });

    it('should apply lg size', () => {
      const wrapper = mount(Button, {
        props: { size: 'lg' },
        slots: { default: 'Large' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/h-10/);
    });

    it('should apply icon size', () => {
      const wrapper = mount(Button, {
        props: { size: 'icon' },
        slots: { default: 'X' },
      });

      expect(wrapper.classes().join(' ')).toMatch(/size-9/);
    });
  });

  describe('Custom Classes', () => {
    it('should merge custom classes', () => {
      const wrapper = mount(Button, {
        props: { class: 'my-custom-class' },
        slots: { default: 'Custom' },
      });

      expect(wrapper.classes()).toContain('my-custom-class');
    });

    it('should allow class overrides with tailwind-merge', () => {
      const wrapper = mount(Button, {
        props: { class: 'bg-red-500' },
        slots: { default: 'Red' },
      });

      // Custom background should be present
      expect(wrapper.classes()).toContain('bg-red-500');
    });
  });

  describe('Polymorphic Rendering', () => {
    it('should render as different element with "as" prop', () => {
      const wrapper = mount(Button, {
        props: { as: 'a' },
        slots: { default: 'Link' },
      });

      expect(wrapper.element.tagName).toBe('A');
    });

    it('should render as div when specified', () => {
      const wrapper = mount(Button, {
        props: { as: 'div' },
        slots: { default: 'Div Button' },
      });

      expect(wrapper.element.tagName).toBe('DIV');
    });
  });

  describe('Slot Content', () => {
    it('should render text content', () => {
      const wrapper = mount(Button, {
        slots: { default: 'Text content' },
      });

      expect(wrapper.text()).toBe('Text content');
    });

    it('should render HTML content', () => {
      const wrapper = mount(Button, {
        slots: {
          default: '<span class="icon">+</span> Add',
        },
      });

      expect(wrapper.find('.icon').exists()).toBe(true);
      expect(wrapper.text()).toContain('Add');
    });
  });
});
