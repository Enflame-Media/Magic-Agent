/**
 * Unit tests for SessionCard component
 *
 * Tests cover:
 * - Session name parsing from metadata
 * - Project path display
 * - Status indicator (active/archived)
 * - Last activity time formatting
 * - Navigation on click
 * - Keyboard accessibility
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import SessionCard from '../app/SessionCard.vue';
import type { Session } from '@/stores/sessions';

// Mock vue-router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('SessionCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mockPush.mockClear();
  });

  // Helper to create a session object
  function createSession(overrides: Partial<Session> = {}): Session {
    return {
      id: 'test-session-123',
      machineId: 'machine-1',
      metadata: JSON.stringify({ name: 'Test Session', path: '/home/user/project' }),
      active: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: new Date().toISOString(),
      ...overrides,
    };
  }

  describe('rendering', () => {
    it('should render the component', () => {
      const wrapper = mount(SessionCard, {
        props: { session: createSession() },
      });
      expect(wrapper.exists()).toBe(true);
    });

    it('should display session name from metadata', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'My Project' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('My Project');
    });

    it('should display session title from metadata as fallback', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ title: 'Project Title' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('Project Title');
    });

    it('should display truncated ID when metadata is not parseable', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            id: 'abcd1234-5678-9abc-def0-123456789abc',
            metadata: 'invalid-json',
          }),
        },
      });
      expect(wrapper.text()).toContain('Session abcd1234');
    });

    it('should display truncated ID when metadata has no name or title', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            id: 'xyz12345-5678-9abc-def0-123456789abc',
            metadata: JSON.stringify({ other: 'data' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('Session xyz12345');
    });

    it('should display project path when present in metadata', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'Test', path: '/home/user/my-project' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('/home/user/my-project');
    });

    it('should display projectPath from metadata', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'Test', projectPath: '/var/www/app' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('/var/www/app');
    });

    it('should not display path when not in metadata', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'Test' }),
          }),
        },
      });
      // Path paragraph should not exist
      const pathElement = wrapper.find('p.truncate');
      expect(pathElement.exists()).toBe(false);
    });
  });

  describe('status indicator', () => {
    it('should show green dot for active sessions', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ active: true }),
        },
      });
      // Find the status dot (small w-2 h-2 dot, not the avatar)
      const statusDot = wrapper.find('span.w-2.h-2.rounded-full');
      expect(statusDot.classes()).toContain('bg-green-500');
    });

    it('should show "Active" text for active sessions', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ active: true }),
        },
      });
      expect(wrapper.text()).toContain('Active');
    });

    it('should show gray dot for inactive sessions', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ active: false }),
        },
      });
      // Find the status dot (small w-2 h-2 dot, not the avatar)
      const statusDot = wrapper.find('span.w-2.h-2.rounded-full');
      expect(statusDot.classes()).toContain('bg-gray-400');
    });

    it('should show "Archived" text for inactive sessions', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ active: false }),
        },
      });
      expect(wrapper.text()).toContain('Archived');
    });
  });

  describe('last activity formatting', () => {
    it('should show "Just now" for very recent activity', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            updatedAt: new Date().toISOString(),
          }),
        },
      });
      expect(wrapper.text()).toContain('Just now');
    });

    it('should show minutes for recent activity', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ updatedAt: fiveMinutesAgo }),
        },
      });
      expect(wrapper.text()).toContain('5m ago');
    });

    it('should show hours for activity within a day', () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ updatedAt: threeHoursAgo }),
        },
      });
      expect(wrapper.text()).toContain('3h ago');
    });

    it('should show days for activity within a week', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ updatedAt: twoDaysAgo }),
        },
      });
      expect(wrapper.text()).toContain('2d ago');
    });

    it('should show date for activity over a week ago', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ updatedAt: twoWeeksAgo.toISOString() }),
        },
      });
      // Should show formatted date (exact format depends on locale)
      expect(wrapper.text()).toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    });
  });

  describe('avatar', () => {
    it('should show first two characters of session name as initials', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'My Project' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('MY');
    });

    it('should show uppercase initials for short names', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'ab' }),
          }),
        },
      });
      expect(wrapper.text()).toContain('AB');
    });
  });

  describe('navigation', () => {
    it('should navigate to session detail on click', async () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ id: 'nav-test-id' }),
        },
      });

      await wrapper.find('[role="button"]').trigger('click');

      expect(mockPush).toHaveBeenCalledWith('/session/nav-test-id');
    });

    it('should navigate on Enter key press', async () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({ id: 'keyboard-test-id' }),
        },
      });

      await wrapper.find('[role="button"]').trigger('keydown.enter');

      expect(mockPush).toHaveBeenCalledWith('/session/keyboard-test-id');
    });

    it('should have tabindex for keyboard accessibility', () => {
      const wrapper = mount(SessionCard, {
        props: { session: createSession() },
      });

      const card = wrapper.find('[role="button"]');
      expect(card.attributes('tabindex')).toBe('0');
    });

    it('should have role="button" for accessibility', () => {
      const wrapper = mount(SessionCard, {
        props: { session: createSession() },
      });

      const card = wrapper.find('[role="button"]');
      expect(card.exists()).toBe(true);
    });
  });

  describe('styling', () => {
    it('should have cursor-pointer class', () => {
      const wrapper = mount(SessionCard, {
        props: { session: createSession() },
      });

      const card = wrapper.find('[role="button"]');
      expect(card.classes()).toContain('cursor-pointer');
    });

    it('should have hover styles', () => {
      const wrapper = mount(SessionCard, {
        props: { session: createSession() },
      });

      const card = wrapper.find('[role="button"]');
      expect(card.classes()).toContain('hover:bg-accent');
    });
  });

  describe('edge cases', () => {
    it('should handle empty metadata string', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            id: 'empty-meta-id-1234',
            metadata: '',
          }),
        },
      });
      expect(wrapper.text()).toContain('Session empty-me');
    });

    it('should handle null-like values in metadata', () => {
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            id: 'null-test-1234567',
            metadata: JSON.stringify({ name: null }),
          }),
        },
      });
      expect(wrapper.text()).toContain('Session null-tes');
    });

    it('should handle very long session names', () => {
      const longName = 'A'.repeat(100);
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: longName }),
          }),
        },
      });
      expect(wrapper.text()).toContain('AA'); // Avatar initials
    });

    it('should handle very long project paths', () => {
      const longPath = '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z';
      const wrapper = mount(SessionCard, {
        props: {
          session: createSession({
            metadata: JSON.stringify({ name: 'Test', path: longPath }),
          }),
        },
      });
      // The path should be displayed (truncation is CSS-based)
      expect(wrapper.text()).toContain(longPath);
    });
  });
});
