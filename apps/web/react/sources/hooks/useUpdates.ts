import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Updates from 'expo-updates';

export function useUpdates() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    const checkForUpdates = useCallback(async () => {
        if (__DEV__) {
            // Don't check for updates in development
            return;
        }

        if (isChecking) {
            return;
        }

        setIsChecking(true);

        try {
            const update = await Updates.checkForUpdateAsync();
            if (update.isAvailable) {
                await Updates.fetchUpdateAsync();
                setUpdateAvailable(true);
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
        } finally {
            setIsChecking(false);
        }
    }, [isChecking]);

    const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            checkForUpdates();
        }
    }, [checkForUpdates]);

    useEffect(() => {
        // Check for updates when app becomes active
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Initial check
        checkForUpdates();

        return () => {
            subscription.remove();
        };
    }, [handleAppStateChange, checkForUpdates]);

    const reloadApp = useCallback(async () => {
        if (Platform.OS === 'web') {
            window.location.reload();
        } else {
            try {
                await Updates.reloadAsync();
            } catch (error) {
                console.error('Error reloading app:', error);
            }
        }
    }, []);

    return {
        updateAvailable,
        isChecking,
        checkForUpdates,
        reloadApp,
    };
}