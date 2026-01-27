import type { ApiMessage } from '@happy/protocol';
import type { EncryptedContent } from '@happy/protocol';
import { getApiBaseUrl } from './apiBase';

const API_ENDPOINT = getApiBaseUrl();

interface PaginatedMessagesResponse {
  messages: ApiMessage[];
  nextCursor: string | null;
}

interface ListMessagesResponse {
  messages: ApiMessage[];
}

export type ArchiveSessionResult =
  | {
      success: true;
      sessionId: string;
      archivedAt: string;
    }
  | {
      success: true;
      sessionId: string;
      deleted: true;
    };

function normalizeMessageContent(content: unknown): EncryptedContent {
  if (typeof content === 'string') {
    try {
      return JSON.parse(content) as EncryptedContent;
    } catch {
      return content as unknown as EncryptedContent;
    }
  }

  return content as EncryptedContent;
}

function normalizeMessages(messages: ApiMessage[]): ApiMessage[] {
  return messages.map((message) => ({
    ...message,
    content: normalizeMessageContent(message.content),
  }));
}

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

export async function fetchSessionMessages(
  sessionId: string,
  token: string
): Promise<ApiMessage[]> {
  const messages: ApiMessage[] = [];
  let cursor: string | null = null;

  while (true) {
    const query = new URLSearchParams();
    query.set('limit', '200');
    if (cursor) {
      query.set('cursor', cursor);
    }

    const result = await fetchJson<PaginatedMessagesResponse>(
      `/v2/sessions/${sessionId}/messages?${query.toString()}`,
      token
    );

    messages.push(...normalizeMessages(result.messages));

    if (!result.nextCursor) {
      break;
    }

    cursor = result.nextCursor;
  }

  if (messages.length > 0) {
    return messages;
  }

  const legacy = await fetchJson<ListMessagesResponse>(
    `/v1/sessions/${sessionId}/messages`,
    token
  );

  return normalizeMessages(legacy.messages);
}

export async function deleteSession(sessionId: string, token: string): Promise<void> {
  const response = await fetch(`${API_ENDPOINT}/v1/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to delete session');
  }
}

export async function archiveSession(
  sessionId: string,
  token: string,
  reason: 'revival_failed' | 'user_requested' | 'timeout' = 'user_requested'
): Promise<ArchiveSessionResult> {
  const response = await fetch(`${API_ENDPOINT}/v1/sessions/${sessionId}/archive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Failed to archive session');
  }

  return response.json() as Promise<ArchiveSessionResult>;
}
