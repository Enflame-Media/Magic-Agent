/**
 * HAP-1039: ACP Usage & Context Window Display Widget
 *
 * Displays real-time context window usage and optional cost information
 * for ACP sessions. Shows a progress bar with color transitions
 * (green -> yellow -> red) and formatted token counts.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/text';

interface AcpUsageWidgetProps {
    used: number;
    size: number;
    cost: { amount: number; currency: string } | null;
}

/**
 * Format a token count for compact display.
 * Examples: 1234 -> "1.2K", 150000 -> "150K", 1500000 -> "1.5M"
 */
function formatTokens(tokens: number): string {
    if (tokens >= 1_000_000) {
        return `${(tokens / 1_000_000).toFixed(1)}M`;
    }
    if (tokens >= 1_000) {
        return `${(tokens / 1_000).toFixed(1)}K`;
    }
    return tokens.toLocaleString();
}

/**
 * Format cost with currency symbol.
 * Uses Intl.NumberFormat for proper locale-aware currency formatting.
 */
function formatCost(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 4,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

/**
 * Get the progress bar color based on fill percentage.
 * Green (0-60%), Yellow (60-85%), Red (85-100%).
 */
function getBarColor(percentage: number, theme: any): string {
    if (percentage >= 0.85) {
        return theme.colors.warningCritical ?? '#FF3B30';
    }
    if (percentage >= 0.60) {
        return theme.colors.warning ?? '#FF9500';
    }
    return theme.colors.success ?? '#34C759';
}

export const AcpUsageWidget = React.memo<AcpUsageWidgetProps>(({ used, size, cost }) => {
    const { theme } = useUnistyles();

    const percentage = size > 0 ? Math.min(used / size, 1) : 0;
    const percentDisplay = Math.round(percentage * 100);
    const barColor = getBarColor(percentage, theme);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="speedometer-outline" size={14} style={styles.headerIcon} />
                <Text style={styles.headerText}>{t('acp.usage.title')}</Text>
                <Text style={[styles.percentage, { color: barColor }]}>
                    {percentDisplay}%
                </Text>
            </View>

            <View style={styles.barBackground}>
                <View
                    style={[
                        styles.barFill,
                        {
                            width: `${percentDisplay}%`,
                            backgroundColor: barColor,
                        },
                    ]}
                />
            </View>

            <View style={styles.details}>
                <Text style={styles.tokenText}>
                    {t('acp.usage.tokens', { used: formatTokens(used), total: formatTokens(size) })}
                </Text>
                {cost != null && (
                    <Text style={styles.costText}>
                        {formatCost(cost.amount, cost.currency)}
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        padding: 12,
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    headerIcon: {
        color: theme.colors.textSecondary,
        marginRight: 6,
    },
    headerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    percentage: {
        fontSize: 13,
        fontWeight: '700',
    },
    barBackground: {
        height: 6,
        borderRadius: 3,
        backgroundColor: theme.colors.surfaceHighest,
        overflow: 'hidden',
        marginBottom: 8,
    },
    barFill: {
        height: '100%',
        borderRadius: 3,
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tokenText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    costText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.typography,
    },
}));
