/**
 * HAP-1045: ACP Agent Picker Component
 *
 * Panel showing registered ACP agents with name, status, and capabilities.
 * Allows switching agents via confirmation dialog with loading/success/failure states.
 */

import * as React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal } from '@/modal';
import { t } from '@/text';
import { useHappyAction } from '@/hooks/useHappyAction';
import { storage, useAcpAgentRegistry } from '@/sync/storage';
import type { AcpAgentStatus, AcpRegisteredAgent } from '@/sync/acpTypes';

interface AcpAgentPickerProps {
    sessionId: string;
    onSwitchAgent: (agentId: string) => Promise<void>;
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

function getStatusColor(status: AcpAgentStatus, theme: any): string {
    switch (status) {
        case 'connected':
            return theme.colors.success ?? '#34C759';
        case 'available':
            return theme.colors.primary;
        case 'unavailable':
            return theme.colors.textSecondary;
        case 'error':
            return theme.colors.error ?? '#FF3B30';
    }
}

function getStatusLabel(status: AcpAgentStatus): string {
    switch (status) {
        case 'connected':
            return t('acp.agentPicker.statusConnected');
        case 'available':
            return t('acp.agentPicker.statusAvailable');
        case 'unavailable':
            return t('acp.agentPicker.statusUnavailable');
        case 'error':
            return t('acp.agentPicker.statusError');
    }
}

const AgentRow = React.memo<{
    agent: AcpRegisteredAgent;
    isActive: boolean;
    isSwitching: boolean;
    onPress: () => void;
}>(({ agent, isActive, isSwitching, onPress }) => {
    const { theme } = useUnistyles();
    const statusColor = getStatusColor(agent.status, theme);
    const canSwitch = !isActive && agent.status === 'available' && !isSwitching;

    return (
        <Pressable
            style={[
                styles.agentRow,
                isActive && styles.agentRowActive,
            ]}
            onPress={canSwitch ? onPress : undefined}
            disabled={!canSwitch}
        >
            <View style={styles.agentIconContainer}>
                <Ionicons
                    name={getAgentIcon(agent.id)}
                    size={20}
                    style={styles.agentIcon}
                />
            </View>
            <View style={styles.agentInfo}>
                <View style={styles.agentNameRow}>
                    <Text style={styles.agentName} numberOfLines={1}>
                        {agent.name}
                    </Text>
                    {isActive && (
                        <View style={styles.activeBadge}>
                            <Text style={styles.activeBadgeText}>
                                {t('acp.agentPicker.active')}
                            </Text>
                        </View>
                    )}
                </View>
                <View style={styles.agentMeta}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={styles.statusText}>
                        {getStatusLabel(agent.status)}
                    </Text>
                    {agent.version && (
                        <Text style={styles.versionText}>
                            {' v'}{agent.version}
                        </Text>
                    )}
                </View>
                {agent.description && (
                    <Text style={styles.description} numberOfLines={1}>
                        {agent.description}
                    </Text>
                )}
            </View>
            {canSwitch && (
                <Ionicons
                    name="swap-horizontal-outline"
                    size={18}
                    style={styles.switchIcon}
                />
            )}
            {isSwitching && isActive && (
                <ActivityIndicator size="small" />
            )}
        </Pressable>
    );
});

export const AcpAgentPicker = React.memo<AcpAgentPickerProps>(({ sessionId, onSwitchAgent }) => {
    const registry = useAcpAgentRegistry(sessionId);

    const handleSwitch = React.useCallback(async (agent: AcpRegisteredAgent) => {
        const confirmed = await Modal.confirm(
            t('acp.agentPicker.switchTitle'),
            t('acp.agentPicker.switchMessage', { name: agent.name }),
            {
                confirmText: t('acp.agentPicker.switchConfirm'),
                cancelText: t('common.cancel'),
            }
        );
        if (!confirmed) return;

        storage.getState().setAgentSwitching(sessionId, true);
        try {
            await onSwitchAgent(agent.id);
            Modal.alert(
                t('common.success'),
                t('acp.agentPicker.switchSuccess', { name: agent.name })
            );
        } catch {
            storage.getState().setAgentSwitching(sessionId, false, 'switch_failed');
            Modal.alert(
                t('common.error'),
                t('acp.agentPicker.switchFailed', { name: agent.name })
            );
        }
    }, [sessionId, onSwitchAgent]);

    if (!registry || Object.keys(registry.agents).length === 0) {
        return null;
    }

    const agents = Object.values(registry.agents);
    // Sort: active first, then connected, then available, then rest
    const sorted = [...agents].sort((a, b) => {
        if (a.id === registry.activeAgentId) return -1;
        if (b.id === registry.activeAgentId) return 1;
        const order: Record<AcpAgentStatus, number> = {
            connected: 0,
            available: 1,
            unavailable: 2,
            error: 3,
        };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="swap-horizontal" size={16} style={styles.headerIcon} />
                <Text style={styles.headerText}>{t('acp.agentPicker.title')}</Text>
                <Text style={styles.countText}>
                    {t('acp.agentPicker.agentCount', { count: agents.length })}
                </Text>
            </View>
            {registry.switchError && (
                <View style={styles.errorBanner}>
                    <Ionicons name="alert-circle-outline" size={14} style={styles.errorIcon} />
                    <Text style={styles.errorText}>
                        {t('acp.agentPicker.rollbackNotice')}
                    </Text>
                </View>
            )}
            {sorted.map((agent) => (
                <AgentRow
                    key={agent.id}
                    agent={agent}
                    isActive={agent.id === registry.activeAgentId}
                    isSwitching={registry.switching}
                    onPress={() => handleSwitch(agent)}
                />
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
        flex: 1,
    },
    countText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: (theme.colors.error ?? '#FF3B30') + '15',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    errorIcon: {
        color: theme.colors.error ?? '#FF3B30',
        marginRight: 6,
    },
    errorText: {
        fontSize: 12,
        color: theme.colors.error ?? '#FF3B30',
        flex: 1,
    },
    agentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        padding: 10,
        marginVertical: 2,
    },
    agentRowActive: {
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
    },
    agentIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    agentIcon: {
        color: theme.colors.typography,
    },
    agentInfo: {
        flex: 1,
    },
    agentNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    agentName: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.typography,
        marginRight: 6,
    },
    activeBadge: {
        backgroundColor: theme.colors.primary + '20',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    activeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: theme.colors.primary,
        textTransform: 'uppercase',
    },
    agentMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    versionText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
    },
    description: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    switchIcon: {
        color: theme.colors.primary,
        marginLeft: 8,
    },
}));
