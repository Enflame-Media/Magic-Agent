import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, ActivityIndicator, LayoutAnimation, Platform } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/text';
import { sessionGetAllowedCommands, AllowedCommands } from '@/sync/ops';

interface AllowedCommandsInfoProps {
    sessionId: string;
}

/**
 * Groups commands by category for better organization.
 * Categories are based on the command's primary use case.
 */
function categorizeCommands(commands: AllowedCommands): Record<string, string[]> {
    const categories: Record<string, string[]> = {
        git: [],
        build: [],
        files: [],
        search: [],
        runtime: [],
        docker: [],
        other: [],
    };

    for (const cmd of Object.keys(commands)) {
        if (cmd === 'git') {
            categories.git.push(cmd);
        } else if (['npm', 'npx', 'yarn', 'pnpm', 'bun', 'make', 'cmake', 'cargo', 'go', 'pip', 'pip3', 'tsc'].includes(cmd)) {
            categories.build.push(cmd);
        } else if (['ls', 'cat', 'head', 'tail', 'pwd', 'which', 'wc', 'file', 'find', 'tree'].includes(cmd)) {
            categories.files.push(cmd);
        } else if (['grep', 'rg', 'ag', 'awk', 'sed', 'sort', 'uniq', 'diff', 'jq', 'yq'].includes(cmd)) {
            categories.search.push(cmd);
        } else if (['node', 'deno', 'python', 'python3'].includes(cmd)) {
            categories.runtime.push(cmd);
        } else if (cmd === 'docker') {
            categories.docker.push(cmd);
        } else if (['eslint', 'prettier', 'biome', 'oxlint', 'rustfmt', 'gofmt', 'black', 'ruff'].includes(cmd)) {
            categories.build.push(cmd); // Linters go with build tools
        } else {
            categories.other.push(cmd);
        }
    }

    // Remove empty categories
    return Object.fromEntries(
        Object.entries(categories).filter(([, cmds]) => cmds.length > 0)
    );
}

/**
 * Category display info for the UI.
 */
const CATEGORY_INFO: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    git: { icon: 'git-branch-outline', label: 'Git' },
    build: { icon: 'hammer-outline', label: 'Build & Lint' },
    files: { icon: 'folder-outline', label: 'File Operations' },
    search: { icon: 'search-outline', label: 'Search & Text' },
    runtime: { icon: 'code-outline', label: 'Runtimes' },
    docker: { icon: 'cube-outline', label: 'Docker' },
    other: { icon: 'terminal-outline', label: 'Other' },
};

/**
 * Renders a single command with its allowed subcommands.
 */
function CommandItem({ name, subcommands, theme }: {
    name: string;
    subcommands: readonly string[];
    theme: ReturnType<typeof useUnistyles>['theme'];
}) {
    const hasRestrictions = subcommands.length > 0;

    return (
        <View style={styles.commandItem}>
            <View style={styles.commandHeader}>
                <Text style={[styles.commandName, { color: theme.colors.terminal.command }]}>
                    {name}
                </Text>
                {hasRestrictions ? (
                    <Text style={[styles.restrictedBadge, { backgroundColor: theme.colors.warning + '20', color: theme.colors.warning }]}>
                        {t('allowedCommands.restricted')}
                    </Text>
                ) : (
                    <Text style={[styles.allowedBadge, { backgroundColor: theme.colors.success + '20', color: theme.colors.success }]}>
                        {t('allowedCommands.allArgs')}
                    </Text>
                )}
            </View>
            {hasRestrictions && (
                <Text style={[styles.subcommands, { color: theme.colors.textSecondary }]}>
                    {subcommands.join(', ')}
                </Text>
            )}
        </View>
    );
}

/**
 * Renders a category of commands with collapsible content.
 */
function CategorySection({ category, commands, allCommands, theme }: {
    category: string;
    commands: string[];
    allCommands: AllowedCommands;
    theme: ReturnType<typeof useUnistyles>['theme'];
}) {
    const [expanded, setExpanded] = useState(false);
    const info = CATEGORY_INFO[category] || CATEGORY_INFO.other;

    const toggleExpanded = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }, [expanded]);

    return (
        <View style={[styles.categorySection, { borderColor: theme.colors.divider }]}>
            <Pressable
                onPress={toggleExpanded}
                style={styles.categoryHeader}
                accessibilityRole="button"
                accessibilityLabel={`${info.label}: ${commands.length} commands`}
                accessibilityState={{ expanded }}
            >
                <View style={styles.categoryLeft}>
                    <Ionicons name={info.icon} size={18} color={theme.colors.textSecondary} />
                    <Text style={[styles.categoryTitle, { color: theme.colors.text }]}>
                        {info.label}
                    </Text>
                    <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
                        ({commands.length})
                    </Text>
                </View>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={theme.colors.textSecondary}
                />
            </Pressable>
            {expanded && (
                <View style={styles.categoryContent}>
                    {commands.sort().map(cmd => (
                        <CommandItem
                            key={cmd}
                            name={cmd}
                            subcommands={allCommands[cmd]}
                            theme={theme}
                        />
                    ))}
                </View>
            )}
        </View>
    );
}

/**
 * Displays the list of allowed bash commands from the CLI.
 * HAP-635: Shows users which commands are available for remote execution.
 */
export function AllowedCommandsInfo({ sessionId }: AllowedCommandsInfoProps) {
    const { theme } = useUnistyles();
    const [commands, setCommands] = useState<AllowedCommands | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        async function fetchCommands() {
            setLoading(true);
            setError(null);

            const result = await sessionGetAllowedCommands(sessionId);

            if (!mounted) return;

            if (result.success && result.commands) {
                setCommands(result.commands);
            } else {
                setError(result.error || t('allowedCommands.fetchError'));
            }
            setLoading(false);
        }

        fetchCommands();

        return () => {
            mounted = false;
        };
    }, [sessionId]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.textSecondary} />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="warning-outline" size={20} color={theme.colors.warning} />
                <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>
                    {error}
                </Text>
            </View>
        );
    }

    if (!commands || Object.keys(commands).length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t('allowedCommands.noCommands')}
                </Text>
            </View>
        );
    }

    const categorized = categorizeCommands(commands);
    const totalCommands = Object.keys(commands).length;

    return (
        <View style={styles.container}>
            {/* Summary */}
            <View style={[styles.summary, { backgroundColor: theme.colors.surface }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.success} />
                <Text style={[styles.summaryText, { color: theme.colors.text }]}>
                    {t('allowedCommands.summary', { count: totalCommands })}
                </Text>
            </View>

            {/* Categories */}
            {Object.entries(categorized).map(([category, cmds]) => (
                <CategorySection
                    key={category}
                    category={category}
                    commands={cmds}
                    allCommands={commands}
                    theme={theme}
                />
            ))}

            {/* Footer note */}
            <Text style={[styles.footerNote, { color: theme.colors.textSecondary }]}>
                {t('allowedCommands.securityNote')}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
    },
    errorText: {
        fontSize: 14,
        flex: 1,
    },
    emptyContainer: {
        padding: 16,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontStyle: 'italic',
    },
    summary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 12,
        borderRadius: 8,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    categorySection: {
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryTitle: {
        fontSize: 14,
        fontWeight: '500',
    },
    categoryCount: {
        fontSize: 13,
    },
    categoryContent: {
        paddingHorizontal: 12,
        paddingBottom: 12,
        gap: 8,
    },
    commandItem: {
        gap: 4,
    },
    commandHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    commandName: {
        fontSize: 14,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        fontWeight: '600',
    },
    restrictedBadge: {
        fontSize: 10,
        fontWeight: '600',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    allowedBadge: {
        fontSize: 10,
        fontWeight: '600',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    subcommands: {
        fontSize: 12,
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
        marginLeft: 4,
    },
    footerNote: {
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 4,
    },
});
