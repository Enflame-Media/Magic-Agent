import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/auth/AuthContext';
import { OAuthView } from '@/components/OAuthView';
import { Modal } from '@/modal';
import { connectService } from '@/sync/apiServices';
import { sync } from '@/sync/sync';
import { t } from '@/text';
import { buildAuthorizationUrl, exchangeCodeForTokens, ClaudeAuthTokens } from '@/utils/oauth';

function ClaudeOAuth() {
    const router = useRouter();
    const auth = useAuth();

    const handleSuccess = React.useCallback(async (tokens: ClaudeAuthTokens) => {
        try {
            // Send tokens to server which will update profile.connectedServices
            // Pass the raw token response to the server
            await connectService(auth.credentials!, 'anthropic', tokens);
            await sync.refreshProfile();

            // The server will handle updating the profile's connectedServices array
            // and it will sync back to the client automatically
            Modal.alert(
                t('common.success'),
                t('settings.claudeAuthSuccess'),
                [
                    {
                        text: t('common.ok'),
                        onPress: () => router.back(),
                    }
                ]
            );
        } catch (error) {
            console.error('Failed to connect Claude account:', error);
            Modal.alert(
                t('common.error'),
                t('errors.connectServiceFailed', { service: 'Claude' })
            );
        }
    }, [auth.credentials, router]);

    return (
        <OAuthView
            name="Claude"
            command="happy connect claude"
            backgroundColor={'#1F1E1C'}
            foregroundColor={'#FFFFFF'}
            config={{
                authUrl: (pkce, state, _redirectUri) =>
                    buildAuthorizationUrl(pkce.challenge, state),
                tokenExchange: exchangeCodeForTokens,
                onSuccess: handleSuccess,
            }}
        />
    );
}

export default React.memo(ClaudeOAuth);
