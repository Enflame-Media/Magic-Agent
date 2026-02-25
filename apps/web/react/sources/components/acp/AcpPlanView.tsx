/**
 * HAP-1036: ACP Plan Display Component
 *
 * Renders the current execution plan from ACP session updates.
 * Each plan entry shows its status (pending/in_progress/completed)
 * with appropriate visual indicators.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpPlanEntry, AcpPlanEntryStatus } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpPlanViewProps {
    entries: AcpPlanEntry[];
}

function getStatusIcon(status: AcpPlanEntryStatus, theme: any) {
    switch (status) {
        case 'completed':
            return <Ionicons name="checkmark-circle" size={16} color={theme.colors.success ?? '#34C759'} />;
        case 'in_progress':
            return <Ionicons name="ellipse" size={16} color={theme.colors.primary} />;
        case 'pending':
        default:
            return <Ionicons name="ellipse-outline" size={16} color={theme.colors.textSecondary} />;
    }
}

export const AcpPlanView = React.memo<AcpPlanViewProps>(({ entries }) => {
    const { theme } = useUnistyles();

    if (entries.length === 0) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="list-outline" size={16} style={styles.headerIcon} />
                <Text style={styles.headerText}>{t('acp.plan')}</Text>
            </View>
            {entries.map((entry, index) => (
                <View key={index} style={styles.entry}>
                    <View style={styles.statusIcon}>
                        {getStatusIcon(entry.status, theme)}
                    </View>
                    <Text
                        style={[
                            styles.entryText,
                            entry.status === 'completed' && styles.entryTextCompleted,
                        ]}
                        numberOfLines={2}
                    >
                        {entry.content}
                    </Text>
                </View>
            ))}
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
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    entry: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 4,
    },
    statusIcon: {
        marginRight: 8,
        marginTop: 1,
    },
    entryText: {
        flex: 1,
        fontSize: 14,
        color: theme.colors.typography,
        lineHeight: 20,
    },
    entryTextCompleted: {
        color: theme.colors.textSecondary,
        textDecorationLine: 'line-through',
    },
}));
