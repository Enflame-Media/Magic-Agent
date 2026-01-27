/**
 * Unit tests for SessionCard component
 *
 * Tests rendering and interaction for:
 * - Session display (name, path, status)
 * - Click navigation
 * - Accessibility features
 * - Time formatting
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, VueWrapper } from '@vue/test-utils';
import { createRouter, createWebHistory } from 'vue-router';
import SessionCard from '@/components/app/SessionCard.vue';
import type { Session } from '@/stores/sessions';

// Mock router
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div>Home</div>' } },
    { path: '/session/:id', component: { template: '<div>Session</div>' } },
  ],
});

// Mock session factory
function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'test-session-id',
    seq: 0,
    metadata: JSON.stringify({ name: 'Test Session', path: '/test/project/path' }),
    metadataVersion: 1,
    agentState: null,
    agentStateVersion: 0,
    dataEncryptionKey: null,
    active: true,
    activeAt: Date.now(),
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('SessionCard Component', () => {
  beforeEach(async () => {
    await router.push('/');
    await router.isReady();
  });

  function mountComponent(session: Session): VueWrapper {
    return mount(SessionCard, {
      props: { session },
      global: {
        plugins: [router],
        stubs: {
          Card: { template: '<div class="card" v-bind="$attrs"><slot /></div>' },
          CardHeader: { template: '<div class="card-header"><slot /></div>' },
          CardTitle: { template: '<h3 class="card-title"><slot /></h3>' },
          CardContent: { template: '<div class="card-content"><slot /></div>' },
          Avatar: { template: '<div class="avatar"><slot /></div>' },
          AvatarFallback: { template: '<div class="avatar-fallback"><slot /></div>' },
        },
      },
    });
  }

  describe('Rendering', () => {
    it('should render session name from metadata', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ name: 'My Test Session' }),
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('My Test Session');
    });

    it('should fall back to session ID if metadata is invalid', () => {
      const session = createMockSession({
        id: 'abc12345-6789',
        metadata: 'invalid json',
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('Session abc12345');
    });

    it('should display project path when available', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ name: 'Test', path: '/users/developer/project' }),
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('/users/developer/project');
    });

    it('should show active status for active sessions', () => {
      const session = createMockSession({ active: true });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('Active');
      expect(wrapper.find('.bg-green-500').exists()).toBe(true);
    });

    it('should show archived status for inactive sessions', () => {
      const session = createMockSession({ active: false });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('Archived');
      expect(wrapper.find('.bg-gray-400').exists()).toBe(true);
    });

    it('should display avatar with initials', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ name: 'Project Alpha' }),
      });
      const wrapper = mountComponent(session);

      expect(wrapper.find('.avatar-fallback').text()).toBe('PR');
    });
  });

  describe('Time Formatting', () => {
    it('should show "Just now" for very recent updates', () => {
      const session = createMockSession({
        updatedAt: Date.now() - 30000, // 30 seconds ago
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('Just now');
    });

    it('should show minutes for updates within an hour', () => {
      const session = createMockSession({
        updatedAt: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('15m ago');
    });

    it('should show hours for updates within a day', () => {
      const session = createMockSession({
        updatedAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('5h ago');
    });

    it('should show days for updates within a week', () => {
      const session = createMockSession({
        updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('3d ago');
    });

    it('should show formatted date for older updates', () => {
      const session = createMockSession({
        updatedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      });
      const wrapper = mountComponent(session);

      // Should show a date format (varies by locale)
      expect(wrapper.text()).not.toContain('d ago');
    });
  });

  describe('Navigation', () => {
    it('should navigate to session detail on click', async () => {
      const routerPush = vi.spyOn(router, 'push');
      const session = createMockSession({ id: 'nav-test-id' });
      const wrapper = mountComponent(session);

      await wrapper.find('.card').trigger('click');

      expect(routerPush).toHaveBeenCalledWith('/session/nav-test-id');
    });

    it('should navigate on Enter key press', async () => {
      const routerPush = vi.spyOn(router, 'push');
      const session = createMockSession({ id: 'keyboard-test-id' });
      const wrapper = mountComponent(session);

      await wrapper.find('.card').trigger('keydown.enter');

      expect(routerPush).toHaveBeenCalledWith('/session/keyboard-test-id');
    });
  });

  describe('Accessibility', () => {
    it('should have role="button" attribute', () => {
      const session = createMockSession();
      const wrapper = mountComponent(session);

      expect(wrapper.find('.card').attributes('role')).toBe('button');
    });

    it('should have tabindex="0" for keyboard focus', () => {
      const session = createMockSession();
      const wrapper = mountComponent(session);

      expect(wrapper.find('.card').attributes('tabindex')).toBe('0');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata gracefully', () => {
      const session = createMockSession({ metadata: '{}' });
      const wrapper = mountComponent(session);

      // Should fall back to session ID
      expect(wrapper.text()).toContain('Session');
    });

    it('should handle null project path', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ name: 'No Path Session' }),
      });
      const wrapper = mountComponent(session);

      // Path element should not be rendered
      expect(wrapper.find('p.text-muted-foreground').exists()).toBe(false);
    });

    it('should handle title in metadata', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ title: 'Title Based Session' }),
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('Title Based Session');
    });

    it('should handle projectPath as alternate path field', () => {
      const session = createMockSession({
        metadata: JSON.stringify({ name: 'Test', projectPath: '/alt/path' }),
      });
      const wrapper = mountComponent(session);

      expect(wrapper.text()).toContain('/alt/path');
    });
  });
});
