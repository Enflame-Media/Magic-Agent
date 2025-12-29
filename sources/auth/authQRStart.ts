import { getRandomBytes } from 'expo-crypto';
import sodium from '@/encryption/libsodium.lib';
import axios from 'axios';
import { encodeBase64 } from '../encryption/base64';
import { getServerUrl } from '@/sync/serverConfig';
import { logger } from '@/utils/logger';

export interface QRAuthKeyPair {
    publicKey: Uint8Array;
    secretKey: Uint8Array;
}

export function generateAuthKeyPair(): QRAuthKeyPair {
    const secret = getRandomBytes(32);
    const keypair = sodium.crypto_box_seed_keypair(secret);
    return {
        publicKey: keypair.publicKey,
        secretKey: keypair.privateKey,
    };
}

export async function authQRStart(keypair: QRAuthKeyPair): Promise<boolean> {
    try {
        const serverUrl = getServerUrl();
        logger.debug('[authQRStart] Sending auth request to:', serverUrl);

        await axios.post(`${serverUrl}/v1/auth/account/request`, {
            publicKey: encodeBase64(keypair.publicKey),
        });

        logger.debug('[authQRStart] Auth request sent successfully');
        return true;
    } catch (error) {
        logger.error('[authQRStart] Failed to send auth request:', error);
        return false;
    }
}