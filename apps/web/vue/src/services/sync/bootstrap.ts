import { getApiBaseUrl } from '@/services/apiBase';
import { useSessionsStore, type Session } from '@/stores/sessions';
import { useMachinesStore, type Machine } from '@/stores/machines';
import { useAuthStore } from '@/stores/auth';
import type { ImageRef, GitHubProfile } from '@magic-agent/protocol';

interface ApiSession {
  id?: string;
  sid?: string;
  seq: number;
  metadata: string;
  metadataVersion: number;
  agentState: string | null;
  agentStateVersion: number;
  dataEncryptionKey: string | null;
  active: boolean;
  activeAt: number;
  createdAt: number;
  updatedAt: number;
}

interface ApiMachine {
  id?: string;
  machineId?: string;
  seq: number;
  metadata: string;
  metadataVersion: number;
  daemonState?: string | null;
  daemonStateVersion?: number;
  dataEncryptionKey?: string | null;
  active: boolean;
  activeAt: number;
  createdAt: number;
  updatedAt: number;
}

interface AccountProfile {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: ImageRef | null;
  github?: GitHubProfile | null;
}

const API_ENDPOINT = getApiBaseUrl();

async function fetchJson<T>(path: string, token: string): Promise<T> {
  const response = await fetch(`${API_ENDPOINT}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${String(response.status)}`);
  }

  return response.json() as Promise<T>;
}

function toSession(apiSession: ApiSession): Session | null {
  const id = apiSession.id ?? apiSession.sid;
  if (!id) return null;

  return {
    id,
    seq: apiSession.seq,
    metadata: apiSession.metadata,
    metadataVersion: apiSession.metadataVersion,
    agentState: apiSession.agentState,
    agentStateVersion: apiSession.agentStateVersion,
    dataEncryptionKey: apiSession.dataEncryptionKey ?? null,
    active: apiSession.active,
    activeAt: apiSession.activeAt,
    createdAt: apiSession.createdAt,
    updatedAt: apiSession.updatedAt,
  };
}

function toMachine(apiMachine: ApiMachine): Machine | null {
  const id = apiMachine.id ?? apiMachine.machineId;
  if (!id) return null;

  return {
    id,
    seq: apiMachine.seq,
    metadata: apiMachine.metadata,
    metadataVersion: apiMachine.metadataVersion,
    daemonState: apiMachine.daemonState ?? null,
    daemonStateVersion: apiMachine.daemonStateVersion ?? 0,
    dataEncryptionKey: apiMachine.dataEncryptionKey ?? null,
    active: apiMachine.active,
    activeAt: apiMachine.activeAt,
    createdAt: apiMachine.createdAt,
    updatedAt: apiMachine.updatedAt,
  };
}

export async function bootstrapSyncData(token: string): Promise<void> {
  const sessionsStore = useSessionsStore();
  const machinesStore = useMachinesStore();
  const authStore = useAuthStore();

  try {
    const [sessionsResult, machinesResult, profileResult] = await Promise.allSettled([
      fetchJson<{ sessions: ApiSession[] }>('/v1/sessions', token),
      fetchJson<{ machines: ApiMachine[] }>('/v1/machines', token),
      fetchJson<AccountProfile>('/v1/account/profile', token),
    ]);

    const sessions =
      sessionsResult.status === 'fulfilled' ? sessionsResult.value.sessions : [];
    const machines =
      machinesResult.status === 'fulfilled' ? machinesResult.value.machines : [];
    const profile =
      profileResult.status === 'fulfilled' ? profileResult.value : null;

    const mappedSessions = sessions
      .map(toSession)
      .filter((session): session is Session => !!session);
    const mappedMachines = machines
      .map(toMachine)
      .filter((machine): machine is Machine => !!machine);

    sessionsStore.setSessions(mappedSessions);
    machinesStore.setMachines(mappedMachines);

    if (profile?.id) {
      authStore.setCredentials(token, profile.id);
      authStore.setAccount({
        id: profile.id,
        firstName: profile.firstName ?? null,
        lastName: profile.lastName ?? null,
        avatar: profile.avatar ?? null,
        github: profile.github ?? null,
      });
    }
  } catch (error) {
    console.error('[sync] Bootstrap failed:', error);
  }
}
