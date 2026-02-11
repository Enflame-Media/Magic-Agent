/**
 * Unit tests for utility functions
 *
 * Tests the cn() function (class name merging):
 * - Basic class merging
 * - Tailwind class conflict resolution
 * - Conditional classes
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  describe('Basic functionality', () => {
    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('');
    });

    it('should return single class unchanged', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('should merge multiple classes', () => {
      expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
    });

    it('should handle undefined values', () => {
      expect(cn('foo', undefined, 'bar')).toBe('foo bar');
    });

    it('should handle null values', () => {
      expect(cn('foo', null, 'bar')).toBe('foo bar');
    });

    it('should handle false values', () => {
      expect(cn('foo', false, 'bar')).toBe('foo bar');
    });
  });

  describe('Conditional classes', () => {
    it('should apply class when condition is true', () => {
      const isActive = true;
      expect(cn('base', isActive && 'active')).toBe('base active');
    });

    it('should not apply class when condition is false', () => {
      const isActive = false;
      expect(cn('base', isActive && 'active')).toBe('base');
    });

    it('should handle ternary expressions', () => {
      const variant = 'primary';
      expect(cn(variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500')).toBe('bg-blue-500');
    });
  });

  describe('Object syntax', () => {
    it('should handle object with boolean values', () => {
      expect(cn({
        foo: true,
        bar: false,
        baz: true,
      })).toBe('foo baz');
    });

    it('should combine string and object syntax', () => {
      expect(cn('base', { active: true, disabled: false })).toBe('base active');
    });
  });

  describe('Array syntax', () => {
    it('should handle array of classes', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle nested arrays', () => {
      expect(cn('base', ['foo', ['bar', 'baz']])).toBe('base foo bar baz');
    });
  });

  describe('Tailwind class merging', () => {
    it('should resolve conflicting padding classes', () => {
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });

    it('should resolve conflicting margin classes', () => {
      expect(cn('m-2', 'm-4')).toBe('m-4');
    });

    it('should resolve conflicting background colors', () => {
      expect(cn('bg-red-500', 'bg-blue-500')).toBe('bg-blue-500');
    });

    it('should resolve conflicting text colors', () => {
      expect(cn('text-white', 'text-black')).toBe('text-black');
    });

    it('should resolve conflicting border radius', () => {
      expect(cn('rounded-sm', 'rounded-lg')).toBe('rounded-lg');
    });

    it('should not merge non-conflicting classes', () => {
      expect(cn('p-4', 'm-4', 'bg-blue-500')).toBe('p-4 m-4 bg-blue-500');
    });

    it('should resolve display conflicts', () => {
      expect(cn('flex', 'block')).toBe('block');
    });

    it('should handle responsive prefixes separately', () => {
      expect(cn('p-4', 'md:p-8')).toBe('p-4 md:p-8');
    });

    it('should resolve same prefix conflicts', () => {
      expect(cn('md:p-4', 'md:p-8')).toBe('md:p-8');
    });

    it('should handle hover state prefixes', () => {
      expect(cn('hover:bg-blue-400', 'hover:bg-blue-600')).toBe('hover:bg-blue-600');
    });

    it('should not conflict different state prefixes', () => {
      expect(cn('hover:bg-blue-400', 'focus:bg-blue-600')).toBe('hover:bg-blue-400 focus:bg-blue-600');
    });
  });

  describe('Real-world usage patterns', () => {
    it('should handle button variant pattern', () => {
      const variant: string = 'primary';
      const size: string = 'lg';

      const result = cn(
        'inline-flex items-center justify-center rounded-md',
        {
          'bg-primary text-primary-foreground': variant === 'primary',
          'bg-secondary text-secondary-foreground': variant === 'secondary',
        },
        {
          'h-9 px-4': size === 'default',
          'h-11 px-8': size === 'lg',
        }
      );

      expect(result).toContain('bg-primary');
      expect(result).toContain('h-11');
      expect(result).not.toContain('bg-secondary');
      expect(result).not.toContain('h-9');
    });

    it('should handle component with custom className prop', () => {
      const baseClasses = 'flex items-center gap-2 p-4';
      const customClass = 'p-8 my-custom-class';

      const result = cn(baseClasses, customClass);

      // p-8 should override p-4
      expect(result).toContain('p-8');
      expect(result).not.toMatch(/p-4/);
      expect(result).toContain('my-custom-class');
    });

    it('should handle card component pattern', () => {
      const isSelected = true;
      const isDisabled = false;

      const result = cn(
        'rounded-lg border bg-card text-card-foreground shadow',
        isSelected && 'ring-2 ring-primary',
        isDisabled && 'opacity-50 cursor-not-allowed'
      );

      expect(result).toContain('ring-2');
      expect(result).not.toContain('opacity-50');
    });
  });
});
