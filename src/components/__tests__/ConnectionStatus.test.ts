/**
 * Unit tests for ConnectionStatus component
 *
 * Tests cover:
 * - Status indicator colors for all sync states
 * - Status message display
 * - Pulse animation for connecting states
 * - Reactivity to store changes
 *
 * @see HAP-720 - NativeScript Mobile Testing Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import ConnectionStatus from '../app/ConnectionStatus.vue';
import { useSyncStore } from '@/stores/sync';

describe('ConnectionStatus', () => {
  beforeEach(() => {
    // Create a fresh Pinia instance for each test
    setActivePinia(createPinia());
  });

  it('should render the component', () => {
    const wrapper = mount(ConnectionStatus);
    expect(wrapper.exists()).toBe(true);
  });

  describe('status colors', () => {
    it('should show green dot when connected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connected');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-green-500');
    });

    it('should show yellow dot when connecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connecting');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-yellow-500');
    });

    it('should show yellow dot when authenticating', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('authenticating');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-yellow-500');
    });

    it('should show yellow dot when reconnecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('reconnecting');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-yellow-500');
    });

    it('should show red dot when error', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setError('Connection failed');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-red-500');
    });

    it('should show gray dot when disconnected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('disconnected');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-gray-400');
    });
  });

  describe('status messages', () => {
    it('should display "Disconnected" when disconnected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('disconnected');
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Disconnected');
    });

    it('should display "Connecting..." when connecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connecting');
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Connecting...');
    });

    it('should display "Authenticating..." when authenticating', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('authenticating');
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Authenticating...');
    });

    it('should display "Connected" when connected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connected');
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Connected');
    });

    it('should display reconnect attempts when reconnecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.incrementReconnectAttempts();
      syncStore.incrementReconnectAttempts();
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Reconnecting');
      expect(wrapper.text()).toContain('2');
    });

    it('should display error message when error', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setError('Custom error message');
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain('Custom error message');
    });
  });

  describe('pulse animation', () => {
    it('should pulse when connecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connecting');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('animate-pulse');
    });

    it('should pulse when authenticating', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('authenticating');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('animate-pulse');
    });

    it('should pulse when reconnecting', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('reconnecting');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('animate-pulse');
    });

    it('should not pulse when connected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connected');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).not.toContain('animate-pulse');
    });

    it('should not pulse when disconnected', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('disconnected');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).not.toContain('animate-pulse');
    });

    it('should not pulse when error', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setError('Connection failed');
      await wrapper.vm.$nextTick();

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).not.toContain('animate-pulse');
    });
  });

  describe('reactivity', () => {
    it('should update when status changes', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      // Start disconnected
      syncStore.setStatus('disconnected');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Disconnected');

      // Transition to connecting
      syncStore.setStatus('connecting');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Connecting...');

      // Transition to connected
      syncStore.setStatus('connected');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Connected');
    });

    it('should react to error being set', async () => {
      const wrapper = mount(ConnectionStatus);
      const syncStore = useSyncStore();

      syncStore.setStatus('connected');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Connected');

      syncStore.setError('Network timeout');
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain('Network timeout');

      const dot = wrapper.find('span.rounded-full');
      expect(dot.classes()).toContain('bg-red-500');
    });
  });

  describe('structure', () => {
    it('should have correct DOM structure', () => {
      const wrapper = mount(ConnectionStatus);

      // Container
      const container = wrapper.find('div');
      expect(container.exists()).toBe(true);
      expect(container.classes()).toContain('flex');
      expect(container.classes()).toContain('items-center');

      // Status dot
      const dot = wrapper.find('span.rounded-full');
      expect(dot.exists()).toBe(true);
      expect(dot.classes()).toContain('w-2');
      expect(dot.classes()).toContain('h-2');

      // Status text
      const textSpan = wrapper.findAll('span').filter(s => s.classes().includes('text-sm'))[0];
      expect(textSpan).toBeDefined();
    });
  });
});
