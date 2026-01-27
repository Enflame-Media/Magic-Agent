import { wsService } from './WebSocketService';
import { encryptSessionMessage } from '@/services/encryption/sessionDecryption';
import type { Session } from '@/stores/sessions';

type UserMessagePayload = {
  role: 'user';
  content: {
    type: 'text';
    text: string;
  };
  meta?: {
    sentFrom?: string;
    permissionMode?: string;
    displayText?: string;
  };
};

export async function sendSessionMessage(
  session: Session,
  text: string,
  permissionMode: string = 'default'
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'Message is empty' };
  }

  const payload: UserMessagePayload = {
    role: 'user',
    content: {
      type: 'text',
      text: trimmed,
    },
    meta: {
      sentFrom: 'web',
      permissionMode,
    },
  };

  const encryptedMessage = await encryptSessionMessage(session, payload);
  if (!encryptedMessage) {
    return { ok: false, error: 'Failed to encrypt message' };
  }

  const localId = crypto.randomUUID();
  const sent = wsService.send('message', {
    sid: session.id,
    message: encryptedMessage,
    localId,
    sentFrom: 'web',
    permissionMode,
  });

  if (!sent) {
    return { ok: false, error: 'WebSocket not connected' };
  }

  return { ok: true };
}
