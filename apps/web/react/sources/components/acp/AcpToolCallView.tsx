/**
 * HAP-1036: ACP Tool Call Display Component
 *
 * Renders a single ACP tool call with status indicator, title,
 * and optional file location. Supports all tool call statuses
 * (pending, in_progress, completed, failed) and tool kinds.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpToolCall, AcpToolCallStatus, AcpToolKind } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpToolCallViewProps {
    toolCall: AcpToolCall;
}

function getKindIcon(kind: AcpToolKind | undefined): keyof typeof Ionicons.glyphMap {
    switch (kind) {
        case 'read':
            return 'document-text-outline';
        case 'edit':
            return 'create-outline';
        case 'delete':
            return 'trash-outline';
        case 'move':
            return 'move-outline';
        case 'search':
            return 'search-outline';
        case 'execute':
            return 'terminal-outline';
        case 'think':
            return 'bulb-outline';
        case 'fetch':
            return 'cloud-download-outline';
        case 'switch_mode':
            return 'swap-horizontal-outline';
        default:
            return 'construct-outline';
    }
}

function getStatusColor(status: AcpToolCallStatus | undefined, theme: any): string {
    switch (status) {
        case 'completed':
            return theme.colors.success ?? '#34C759';
        case 'failed':
            return theme.colors.error ?? '#FF3B30';
        case 'in_progress':
            return theme.colors.primary;
        case 'pending':
        default:
            return theme.colors.textSecondary;
    }
}

function getStatusLabel(status: AcpToolCallStatus | undefined): string {
    switch (status) {
        case 'completed':
            return t('acp.toolCall.completed');
        case 'failed':
            return t('acp.toolCall.failed');
        case 'in_progress':
            return t('acp.toolCall.inProgress');
        case 'pending':
        default:
            return t('acp.toolCall.pending');
    }
}

export const AcpToolCallView = React.memo<AcpToolCallViewProps>(({ toolCall }) => {
    const { theme } = useUnistyles();
    const location = toolCall.locations?.[0];
    const statusColor = getStatusColor(toolCall.status, theme);

    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Ionicons
                    name={getKindIcon(toolCall.kind)}
                    size={16}
                    style={styles.kindIcon}
                />
            </View>
            <View style={styles.content}>
                <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>
                        {toolCall.title}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: statusColor }}>
                        {getStatusLabel(toolCall.status)}
                    </Text>
                </View>
                {location && (
                    <Text style={styles.location} numberOfLines={1}>
                        {location.path}
                        {location.line != null ? `:${location.line}` : ''}
                    </Text>
                )}
            </View>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        padding: 10,
        marginVertical: 2,
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 6,
        backgroundColor: theme.colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    kindIcon: {
        color: theme.colors.textSecondary,
    },
    content: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    title: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.typography,
        marginRight: 8,
    },
    location: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        fontFamily: 'monospace',
    },
}));
