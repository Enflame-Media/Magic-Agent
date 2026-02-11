import { RoundButton } from "@/components/RoundButton";
import { useAuth } from "@/auth/AuthContext";
import { Text, View, Image, Platform } from "react-native";
import { logger } from "@/utils/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as React from 'react';
import { encodeBase64 } from "@/encryption/base64";
import { authGetToken } from "@/auth/authGetToken";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { getRandomBytesAsync } from "expo-crypto";
import { useIsLandscape } from "@/utils/responsive";
import { Typography } from "@/constants/Typography";
import { trackAccountCreated, trackAccountRestored } from '@/track';
import { HomeHeaderNotAuth } from "@/components/HomeHeader";
import { MainView } from "@/components/MainView";
import { t } from '@/text';
import { useLocalSetting } from "@/sync/storage";
import { sync } from "@/sync/sync";

function Home() {
    const auth = useAuth();
    if (!auth.isAuthenticated) {
        return <NotAuthenticated />;
    }
    return (
        <Authenticated />
    )
}

function Authenticated() {
    const router = useRouter();
    const hasSeenOnboarding = useLocalSetting('hasSeenOnboarding');
    const searchParams = useLocalSearchParams<{ github?: string }>();

    // Handle GitHub OAuth callback - refresh profile when redirected back from GitHub
    React.useEffect(() => {
        if (searchParams.github === 'connected') {
            // Refresh profile to get updated GitHub connection data
            sync.refreshProfile();
            // Clear URL params to avoid re-triggering on navigation
            router.setParams({ github: undefined });
        }
    }, [searchParams.github, router]);

    // Redirect to onboarding on first launch
    useFocusEffect(
        React.useCallback(() => {
            if (!hasSeenOnboarding) {
                router.replace('/onboarding');
            }
        }, [hasSeenOnboarding, router])
    );

    // Don't render main view until we confirm user has completed onboarding
    if (!hasSeenOnboarding) {
        return null;
    }

    return <MainView variant="phone" />;
}

function NotAuthenticated() {
    const { theme } = useUnistyles();
    const auth = useAuth();
    const router = useRouter();
    const isLandscape = useIsLandscape();
    const insets = useSafeAreaInsets();

    const createAccount = async () => {
        logger.debug('[createAccount] Starting...');
        try {
            logger.debug('[createAccount] Generating random secret...');
            const secret = await getRandomBytesAsync(32);
            logger.debug('[createAccount] Secret generated, getting token...');
            const token = await authGetToken(secret);
            logger.debug('[createAccount] Token received:', token ? 'yes' : 'no');
            if (token && secret) {
                logger.debug('[createAccount] Calling auth.login...');
                await auth.login(token, encodeBase64(secret, 'base64url'));
                logger.debug('[createAccount] auth.login completed, tracking...');
                trackAccountCreated();
                logger.debug('[createAccount] Done!');
            } else {
                logger.debug('[createAccount] Missing token or secret, not logging in');
            }
        } catch (error) {
            console.error('[createAccount] Error:', error);
        }
    }

    const portraitLayout = (
        <View style={styles.portraitContainer}>
            <Image
                source={theme.dark ? require('@/assets/images/logotype-light.png') : require('@/assets/images/logotype-dark.png')}
                resizeMode="contain"
                style={styles.logo}
            />
            <Text style={styles.title}>
                {t('welcome.title')}
            </Text>
            <Text style={styles.subtitle}>
                {t('welcome.subtitle')}
            </Text>
            {Platform.OS !== 'android' && Platform.OS !== 'ios' ? (
                <>
                    <View style={styles.buttonContainer}>
                        <RoundButton
                            title={t('welcome.loginWithMobileApp')}
                            onPress={() => {
                                trackAccountRestored();
                                router.push('/restore');
                            }}
                        />
                    </View>
                    <View style={styles.buttonContainerSecondary}>
                        <RoundButton
                            size="normal"
                            title={t('welcome.createAccount')}
                            action={createAccount}
                            display="inverted"
                        />
                    </View>
                </>
            ) : (
                <>
                    <View style={styles.buttonContainer}>
                        <RoundButton
                            title={t('welcome.createAccount')}
                            action={createAccount}
                        />
                    </View>
                    <View style={styles.buttonContainerSecondary}>
                        <RoundButton
                            size="normal"
                            title={t('welcome.linkOrRestoreAccount')}
                            onPress={() => {
                                trackAccountRestored();
                                router.push('/restore');
                            }}
                            display="inverted"
                        />
                    </View>
                </>
            )}
        </View>
    );

    const landscapeLayout = (
        <View style={[styles.landscapeContainer, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.landscapeInner}>
                <View style={styles.landscapeLogoSection}>
                    <Image
                        source={theme.dark ? require('@/assets/images/logotype-light.png') : require('@/assets/images/logotype-dark.png')}
                        resizeMode="contain"
                        style={styles.logo}
                    />
                </View>
                <View style={styles.landscapeContentSection}>
                    <Text style={styles.landscapeTitle}>
                        {t('welcome.title')}
                    </Text>
                    <Text style={styles.landscapeSubtitle}>
                        {t('welcome.subtitle')}
                    </Text>
                    {Platform.OS !== 'android' && Platform.OS !== 'ios'
                        ? (<>
                            <View style={styles.landscapeButtonContainer}>
                                <RoundButton
                                    title={t('welcome.loginWithMobileApp')}
                                    onPress={() => {
                                        trackAccountRestored();
                                        router.push('/restore');
                                    }}
                                />
                            </View>
                            <View style={styles.landscapeButtonContainerSecondary}>
                                <RoundButton
                                    size="normal"
                                    title={t('welcome.createAccount')}
                                    action={createAccount}
                                    display="inverted"
                                />
                            </View>
                        </>)
                        : (<>
                            <View style={styles.landscapeButtonContainer}>
                                <RoundButton
                                    title={t('welcome.createAccount')}
                                    action={createAccount}
                                />
                            </View>
                            <View style={styles.landscapeButtonContainerSecondary}>
                                <RoundButton
                                    size="normal"
                                    title={t('welcome.linkOrRestoreAccount')}
                                    onPress={() => {
                                        trackAccountRestored();
                                        router.push('/restore');
                                    }}
                                    display="inverted"
                                />
                            </View>
                        </>)
                    }
                </View>
            </View>
        </View>
    );

    return (
        <>
            <HomeHeaderNotAuth />
            {isLandscape ? landscapeLayout : portraitLayout}
        </>
    )
}

const styles = StyleSheet.create((theme) => ({
    // NotAuthenticated styles
    portraitContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logo: {
        width: 300,
        height: 90,
    },
    title: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 24,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
    },
    subtitle: {
        ...Typography.default(),
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
        marginHorizontal: 24,
        marginBottom: 64,
    },
    buttonContainer: {
        maxWidth: 280,
        width: '100%',
        marginBottom: 16,
    },
    buttonContainerSecondary: {
    },
    // Landscape styles
    landscapeContainer: {
        flexBasis: 0,
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 48,
    },
    landscapeInner: {
        flexGrow: 1,
        flexBasis: 0,
        maxWidth: 800,
        flexDirection: 'row',
    },
    landscapeLogoSection: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingRight: 24,
    },
    landscapeContentSection: {
        flexBasis: 0,
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: 24,
    },
    landscapeTitle: {
        textAlign: 'center',
        fontSize: 24,
        ...Typography.default('semiBold'),
        color: theme.colors.text,
    },
    landscapeSubtitle: {
        ...Typography.default(),
        fontSize: 18,
        color: theme.colors.textSecondary,
        marginTop: 16,
        textAlign: 'center',
        marginBottom: 32,
        paddingHorizontal: 16,
    },
    landscapeButtonContainer: {
        width: 280,
        marginBottom: 16,
    },
    landscapeButtonContainerSecondary: {
        width: 280,
    },
}));

export default React.memo(Home);