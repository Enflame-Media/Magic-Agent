import { AuthCredentials } from '@/auth/tokenStorage';
import { backoff } from '@/utils/time';
import { getServerUrl } from './serverConfig';
import { AppError, ErrorCodes } from '@/utils/errors';
import { authenticatedFetch } from './apiHelper';

export async function registerPushToken(credentials: AuthCredentials, token: string): Promise<void> {
    const API_ENDPOINT = getServerUrl();
    await backoff(async () => {
        // HAP-529: Use authenticatedFetch for automatic 401 retry after token refresh
        const response = await authenticatedFetch(
            `${API_ENDPOINT}/v1/push-tokens`,
            credentials,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            },
            'registering push token'
        );

        if (!response.ok) {
            throw new AppError(ErrorCodes.API_ERROR, `Failed to register push token: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success) {
            throw new AppError(ErrorCodes.API_ERROR, 'Failed to register push token');
        }
    });
}