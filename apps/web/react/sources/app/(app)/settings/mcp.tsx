import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from '@/components/StyledText';
import { useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAllMachines } from '@/sync/storage';
import { isMachineOnline } from '@/utils/machineUtils';
import { McpServerCard, McpServerConfig } from '@/components/mcp/McpServerCard';
import { t } from '@/text';

/**
 * MCP state structure expected from CLI daemon sync
 * This is the shape of machine.daemonState.mcpConfig once CLI starts syncing it
 */
interface McpState {
    servers: Record<string, McpServerConfig>;
}

/**
 * MCP Settings Screen (Read-Only - Phase 1)
 *
 * Displays MCP server configuration from connected CLI machines.
 * This is a read-only view that shows:
 * - List of configured MCP servers
 * - Enabled/disabled status for each
 * - Tool count and last validation timestamp
 *
 * Handles edge cases:
 * - No machines connected
 * - Machine connected but no MCP configuration synced yet
 * - Multiple machines with different MCP configs
 */
function McpSettingsScreen() {
    const { theme } = useUnistyles();
    const allMachines = useAllMachines();

    // Filter to online machines only for MCP display
    const onlineMachines = allMachines.filter(isMachineOnline);

    // No machines connected at all
    if (allMachines.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                    name="desktop-outline"
                    size={64}
                    color={theme.colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    {t('settingsMcp.noMachines')}
                </Text>
                <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
                    {t('settingsMcp.noMachinesDescription')}
                </Text>
            </View>
        );
    }

    // Machines exist but none are online
    if (onlineMachines.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                    name="cloud-offline-outline"
                    size={64}
                    color={theme.colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    {t('settingsMcp.noOnlineMachines')}
                </Text>
                <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
                    {t('settingsMcp.noOnlineMachinesDescription')}
                </Text>
            </View>
        );
    }

    // Collect MCP configs from all online machines
    const machinesWithMcp: Array<{
        machineId: string;
        machineName: string;
        mcpState: McpState;
    }> = [];

    for (const machine of onlineMachines) {
        // Look for MCP config in daemonState
        // The CLI will sync this once the Protocol Schema is updated
        const mcpState = machine.daemonState?.mcpConfig as McpState | undefined;

        if (mcpState && mcpState.servers && Object.keys(mcpState.servers).length > 0) {
            machinesWithMcp.push({
                machineId: machine.id,
                machineName: machine.metadata?.displayName || machine.metadata?.host || 'Unknown',
                mcpState,
            });
        }
    }

    // Online machines exist but no MCP configuration synced
    if (machinesWithMcp.length === 0) {
        return (
            <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.surface }]}>
                <Ionicons
                    name="server-outline"
                    size={64}
                    color={theme.colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                    {t('settingsMcp.noServers')}
                </Text>
                <Text style={[styles.emptyMessage, { color: theme.colors.textSecondary }]}>
                    {t('settingsMcp.noServersDescription')}
                </Text>
                <View style={[styles.hintBox, { backgroundColor: theme.colors.surface }]}>
                    <Text style={[styles.hintCode, { color: theme.colors.text }]}>
                        happy mcp add
                    </Text>
                    <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
                        {t('settingsMcp.addServerHint')}
                    </Text>
                </View>
            </View>
        );
    }

    // Display MCP servers from connected machines
    return (
        <ScrollView
            style={[styles.container, { backgroundColor: theme.colors.surface }]}
            contentContainerStyle={styles.scrollContent}
        >
            <View style={styles.header}>
                <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                    {t('settingsMcp.viewingFromCli')}
                </Text>
            </View>

            {machinesWithMcp.map(({ machineId, machineName, mcpState }) => (
                <View key={machineId} style={styles.machineSection}>
                    {/* Show machine name if multiple machines have MCP config */}
                    {machinesWithMcp.length > 1 && (
                        <View style={styles.machineHeader}>
                            <Ionicons
                                name="desktop-outline"
                                size={16}
                                color={theme.colors.textSecondary}
                            />
                            <Text style={[styles.machineName, { color: theme.colors.textSecondary }]}>
                                {machineName}
                            </Text>
                        </View>
                    )}

                    {Object.entries(mcpState.servers).map(([serverName, config]) => (
                        <McpServerCard
                            key={`${machineId}-${serverName}`}
                            name={serverName}
                            config={config}
                            readOnly={true}
                        />
                    ))}
                </View>
            ))}

            <View style={styles.footer}>
                <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
                    {t('settingsMcp.readOnlyNote')}
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    scrollContent: {
        paddingTop: 16,
        paddingBottom: 32,
    },
    header: {
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyMessage: {
        fontSize: 14,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 20,
    },
    hintBox: {
        marginTop: 24,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    hintCode: {
        fontSize: 16,
        fontFamily: 'monospace',
        fontWeight: '600',
        marginBottom: 8,
    },
    hintText: {
        fontSize: 13,
        textAlign: 'center',
    },
    machineSection: {
        marginBottom: 16,
    },
    machineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    machineName: {
        fontSize: 13,
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 32,
        paddingTop: 16,
    },
    footerText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default React.memo(McpSettingsScreen);
