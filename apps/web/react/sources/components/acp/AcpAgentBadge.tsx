/**
 * HAP-1045: ACP Agent Badge Component
 *
 * Compact indicator showing the currently active agent name and icon.
 * Designed for session headers to show at-a-glance which agent is running.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAcpAgentRegistry } from '@/sync/storage';

interface AcpAgentBadgeProps {
    sessionId: string;
}

function getAgentIcon(agentId: string): keyof typeof Ionicons.glyphMap {
    const id = agentId.toLowerCase();
    if (id.includes('claude')) return 'chatbubble-outline';
    if (id.includes('gemini')) return 'diamond-outline';
    if (id.includes('codex')) return 'code-outline';
    if (id.includes('goose')) return 'leaf-outline';
    if (id.includes('kiro')) return 'flash-outline';
    if (id.includes('qwen')) return 'globe-outline';
    if (id.includes('stack')) return 'layers-outline';
    return 'hardware-chip-outline';
}

export const AcpAgentBadge = React.memo<AcpAgentBadgeProps>(({ sessionId }) => {
    const registry = useAcpAgentRegistry(sessionId);

    if (!registry?.activeAgentId) return null;

    const activeAgent = registry.agents[registry.activeAgentId];
    if (!activeAgent) return null;

    return (
        <View style={styles.container}>
            <Ionicons
                name={getAgentIcon(activeAgent.id)}
                size={12}
                style={styles.icon}
            />
            <Text style={styles.label} numberOfLines={1}>
                {activeAgent.name}
            </Text>
            {registry.switching && (
                <Ionicons
                    name="sync-outline"
                    size={10}
                    style={styles.switchingIcon}
                />
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        maxWidth: 140,
    },
    icon: {
        color: theme.colors.primary,
        marginRight: 4,
    },
    label: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    switchingIcon: {
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
}));
