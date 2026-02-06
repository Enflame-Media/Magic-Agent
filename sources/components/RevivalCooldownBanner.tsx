/**
 * RevivalCooldownBanner - HAP-867
 *
 * Displays a banner when session revival is temporarily paused due to
 * circuit breaker cooldown. Shows a countdown timer indicating when
 * revival will be available again.
 *
 * This banner is shown when the CLI emits a 'session-revival-paused' event,
 * indicating that too many revival failures have occurred and the system
 * is in a cooldown period to prevent cascading failures.
 */
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';
import { layout } from '@/components/layout';

interface RevivalCooldownBannerProps {
    /** Remaining seconds until cooldown expires */
    remainingSeconds: number;
    /** Called when user dismisses the banner */
    onDismiss?: () => void;
}

export const RevivalCooldownBanner = React.memo(({ remainingSeconds, onDismiss }: RevivalCooldownBannerProps) => {
    const { theme } = useUnistyles();

    // Use amber color for cooldown/warning state
    // Note: theme.colors.status doesn't include 'warning', so we use a hardcoded amber
    const accentColor = '#f59e0b';

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surfaceHigh }]}>
            <View style={styles.content}>
                <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
                    <Ionicons
                        name="pause-circle-outline"
                        size={20}
                        color={accentColor}
                    />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t('session.revival.cooldownTitle')}
                    </Text>
                    <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
                        {t('session.revival.cooldownDescription', { seconds: remainingSeconds })}
                    </Text>
                </View>
                {onDismiss && (
                    <Pressable onPress={onDismiss} hitSlop={12} style={styles.dismissButton}>
                        <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    description: {
        fontSize: 13,
        fontWeight: '400',
        opacity: 0.9,
    },
    dismissButton: {
        marginLeft: 8,
        padding: 4,
    },
});
