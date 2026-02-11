import * as React from 'react';
import { View, Pressable, Text } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import { useSetting, useAllMachines } from '@/sync/storage';
import { layout } from './layout';

/**
 * QuickStartCard displays a "Quick Start" button that allows users to create
 * a new session using their most recently used machine and path combination.
 *
 * This component is shown above the sessions list when the user has recent
 * machine-path history. It shows the path and machine name for context.
 *
 * When tapped, navigates to the new session screen with machine/path pre-filled.
 */
export const QuickStartCard = React.memo(function QuickStartCard() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const router = useRouter();

    // Get recent machine paths from settings
    const recentMachinePaths = useSetting('recentMachinePaths');
    const machines = useAllMachines();

    // Get the most recent machine-path combination where the machine is currently available
    const quickStartData = React.useMemo(() => {
        if (!recentMachinePaths || recentMachinePaths.length === 0) {
            return null;
        }

        // Find the first recent path where the machine is currently available
        for (const recent of recentMachinePaths) {
            const machine = machines.find(m => m.id === recent.machineId);
            if (machine) {
                // Format path for display (shorten home directories)
                let displayPath = recent.path;
                if (displayPath.startsWith('/Users/')) {
                    displayPath = displayPath.replace(/^\/Users\/[^/]+/, '~');
                } else if (displayPath.startsWith('/home/')) {
                    displayPath = displayPath.replace(/^\/home\/[^/]+/, '~');
                }

                return {
                    machineId: recent.machineId,
                    path: recent.path,
                    displayPath,
                    machineName: machine.metadata?.displayName || machine.metadata?.host || machine.id
                };
            }
        }

        return null;
    }, [recentMachinePaths, machines]);

    // Don't render if no quick start data available
    if (!quickStartData) {
        return null;
    }

    const handlePress = React.useCallback(() => {
        // Navigate to new session with machine and path pre-filled
        const params = new URLSearchParams();
        params.set('selectedMachineId', quickStartData.machineId);
        params.set('selectedPath', encodeURIComponent(quickStartData.path));
        router.push(`/new?${params.toString()}`);
    }, [router, quickStartData]);

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                <Pressable
                    onPress={handlePress}
                    style={(p) => [
                        styles.card,
                        p.pressed && styles.cardPressed
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('sessions.quickStart')}, ${quickStartData.displayPath} ${t('common.on')} ${quickStartData.machineName}`}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons
                            name="flash"
                            size={20}
                            color={theme.colors.button.primary.tint}
                        />
                    </View>
                    <View style={styles.textContainer}>
                        <Text style={styles.title}>
                            {t('sessions.quickStart')}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {quickStartData.displayPath} {t('common.on')} {quickStartData.machineName}
                        </Text>
                    </View>
                    <View style={styles.chevronContainer}>
                        <Ionicons
                            name="chevron-forward"
                            size={18}
                            color={theme.colors.textSecondary}
                        />
                    </View>
                </Pressable>
            </View>
        </View>
    );
});

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    contentWrapper: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    card: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
    },
    cardPressed: {
        opacity: 0.7,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.button.primary.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 2,
        ...Typography.default('semiBold'),
    },
    subtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    chevronContainer: {
        marginLeft: 8,
    },
}));
