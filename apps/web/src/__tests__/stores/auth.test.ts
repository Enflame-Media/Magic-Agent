/**
 * Unit tests for the Auth store
 *
 * Tests Pinia store functionality for:
 * - Authentication state management
 * - Credentials handling
 * - Account information
 * - Display name and initials computation
 *
 * @see HAP-877 - Increase test coverage to 80%
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore, type AccountInfo } from '@/stores/auth';

// Mock the auth service
vi.mock('@/services/auth', () => ({
  logout: vi.fn(),
  loadCredentials: vi.fn(),
}));

// Mock account factory
function createMockAccount(overrides: Partial<AccountInfo> = {}): AccountInfo {
  return {
    id: 'account-123',
    firstName: 'John',
    lastName: 'Doe',
    avatar: null,
    github: null,
    ...overrides,
  };
}

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null values initially', () => {
      const store = useAuthStore();

      expect(store.token).toBeNull();
      expect(store.secret).toBeNull();
      expect(store.accountId).toBeNull();
      expect(store.account).toBeNull();
      expect(store.isHydrated).toBe(false);
    });

    it('should not be authenticated initially', () => {
      const store = useAuthStore();

      expect(store.isAuthenticated).toBe(false);
    });

    it('should not be able to approve connections initially', () => {
      const store = useAuthStore();

      expect(store.canApproveConnections).toBe(false);
    });
  });

  describe('setCredentials', () => {
    it('should set token and accountId', () => {
      const store = useAuthStore();

      store.setCredentials('test-token', 'account-123');

      expect(store.token).toBe('test-token');
      expect(store.accountId).toBe('account-123');
    });

    it('should mark as authenticated after setting credentials', () => {
      const store = useAuthStore();

      expect(store.isAuthenticated).toBe(false);
      store.setCredentials('test-token', 'account-123');
      expect(store.isAuthenticated).toBe(true);
    });
  });

  describe('setSecret', () => {
    it('should set the secret', () => {
      const store = useAuthStore();

      store.setSecret('base64-secret');

      expect(store.secret).toBe('base64-secret');
    });

    it('should allow clearing the secret', () => {
      const store = useAuthStore();

      store.setSecret('base64-secret');
      store.setSecret(null);

      expect(store.secret).toBeNull();
    });
  });

  describe('canApproveConnections', () => {
    it('should be false with only token', () => {
      const store = useAuthStore();

      store.setCredentials('test-token', 'account-123');

      expect(store.canApproveConnections).toBe(false);
    });

    it('should be false with only secret', () => {
      const store = useAuthStore();

      store.setSecret('base64-secret');

      expect(store.canApproveConnections).toBe(false);
    });

    it('should be true with both token and secret', () => {
      const store = useAuthStore();

      store.setCredentials('test-token', 'account-123');
      store.setSecret('base64-secret');

      expect(store.canApproveConnections).toBe(true);
    });
  });

  describe('setAccount', () => {
    it('should set account information', () => {
      const store = useAuthStore();
      const account = createMockAccount();

      store.setAccount(account);

      expect(store.account).toEqual(account);
    });

    it('should replace existing account', () => {
      const store = useAuthStore();
      const account1 = createMockAccount({ firstName: 'John' });
      const account2 = createMockAccount({ firstName: 'Jane' });

      store.setAccount(account1);
      store.setAccount(account2);

      expect(store.account?.firstName).toBe('Jane');
    });
  });

  describe('updateAccount', () => {
    it('should partially update existing account', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'John', lastName: 'Doe' }));

      store.updateAccount({ firstName: 'Jane' });

      expect(store.account?.firstName).toBe('Jane');
      expect(store.account?.lastName).toBe('Doe'); // Unchanged
    });

    it('should initialize account if none exists and id is provided', () => {
      const store = useAuthStore();

      store.updateAccount({ id: 'new-account', firstName: 'New' });

      expect(store.account).toBeDefined();
      expect(store.account?.id).toBe('new-account');
      expect(store.account?.firstName).toBe('New');
      expect(store.account?.lastName).toBeNull();
    });

    it('should not initialize account if no id provided', () => {
      const store = useAuthStore();

      store.updateAccount({ firstName: 'New' });

      expect(store.account).toBeNull();
    });

    it('should update github profile', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount());

      const githubProfile = { id: 123, username: 'johndoe' };
      store.updateAccount({ github: githubProfile as any });

      expect(store.account?.github).toEqual(githubProfile);
    });
  });

  describe('displayName', () => {
    it('should return null when no account', () => {
      const store = useAuthStore();

      expect(store.displayName).toBeNull();
    });

    it('should return full name when both first and last', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'John', lastName: 'Doe' }));

      expect(store.displayName).toBe('John Doe');
    });

    it('should return first name only when no last name', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'John', lastName: null }));

      expect(store.displayName).toBe('John');
    });

    it('should return last name only when no first name', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: null, lastName: 'Doe' }));

      expect(store.displayName).toBe('Doe');
    });

    it('should return null when neither first nor last name', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: null, lastName: null }));

      expect(store.displayName).toBeNull();
    });
  });

  describe('initials', () => {
    it('should return null when no account', () => {
      const store = useAuthStore();

      expect(store.initials).toBeNull();
    });

    it('should return both initials when both names present', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'John', lastName: 'Doe' }));

      expect(store.initials).toBe('JD');
    });

    it('should return first initial only when no last name', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'John', lastName: null }));

      expect(store.initials).toBe('J');
    });

    it('should return last initial only when no first name', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: null, lastName: 'Doe' }));

      expect(store.initials).toBe('D');
    });

    it('should return null when neither name present', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: null, lastName: null }));

      expect(store.initials).toBeNull();
    });

    it('should uppercase initials', () => {
      const store = useAuthStore();
      store.setAccount(createMockAccount({ firstName: 'john', lastName: 'doe' }));

      expect(store.initials).toBe('JD');
    });
  });

  describe('logout', () => {
    it('should clear all authentication state', async () => {
      const { logout: clearStoredCredentials } = await import('@/services/auth');
      const store = useAuthStore();

      store.setCredentials('test-token', 'account-123');
      store.setSecret('base64-secret');
      store.setAccount(createMockAccount());

      store.logout();

      expect(store.token).toBeNull();
      expect(store.secret).toBeNull();
      expect(store.accountId).toBeNull();
      expect(store.account).toBeNull();
      expect(clearStoredCredentials).toHaveBeenCalled();
    });
  });

  describe('initialize', () => {
    it('should load credentials from storage', async () => {
      const { loadCredentials } = await import('@/services/auth');
      vi.mocked(loadCredentials).mockResolvedValue({
        token: 'stored-token',
        secret: 'stored-secret',
      });

      const store = useAuthStore();
      const result = await store.initialize();

      expect(result).toBe(true);
      expect(store.token).toBe('stored-token');
      expect(store.secret).toBe('stored-secret');
      expect(store.isHydrated).toBe(true);
    });

    it('should return false when no stored credentials', async () => {
      const { loadCredentials } = await import('@/services/auth');
      vi.mocked(loadCredentials).mockResolvedValue(null);

      const store = useAuthStore();
      const result = await store.initialize();

      expect(result).toBe(false);
      expect(store.token).toBeNull();
      expect(store.isHydrated).toBe(true);
    });
  });

  describe('$reset', () => {
    it('should reset store to initial state', async () => {
      const store = useAuthStore();

      store.setCredentials('test-token', 'account-123');
      store.setSecret('base64-secret');
      store.setAccount(createMockAccount());

      store.$reset();

      expect(store.token).toBeNull();
      expect(store.secret).toBeNull();
      expect(store.accountId).toBeNull();
      expect(store.account).toBeNull();
    });
  });
});
