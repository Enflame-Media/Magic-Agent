/**
 * HAP-1040: ACP Command Palette Component
 *
 * Displays available slash commands from ACP agents in a searchable list.
 * Commands refresh in real-time as available_commands_update events arrive.
 * Parent component handles bottom sheet / modal presentation.
 */

import * as React from 'react';
import { FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpAvailableCommand } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpCommandPaletteProps {
    commands: AcpAvailableCommand[];
    onInvokeCommand: (command: AcpAvailableCommand) => void;
}

function CommandRow({ command, onPress }: { command: AcpAvailableCommand; onPress: () => void }) {
    return (
        <TouchableOpacity style={styles.commandRow} onPress={onPress} activeOpacity={0.6}>
            <View style={styles.commandIconContainer}>
                <Ionicons name="terminal-outline" size={16} style={styles.commandIcon} />
            </View>
            <View style={styles.commandContent}>
                <Text style={styles.commandName} numberOfLines={1}>
                    /{command.name}
                </Text>
                {command.description ? (
                    <Text style={styles.commandDescription} numberOfLines={2}>
                        {command.description}
                    </Text>
                ) : null}
            </View>
            <Ionicons name="chevron-forward" size={16} style={styles.chevron} />
        </TouchableOpacity>
    );
}

const MemoCommandRow = React.memo(CommandRow);

export const AcpCommandPalette = React.memo<AcpCommandPaletteProps>(({ commands, onInvokeCommand }) => {
    const [search, setSearch] = React.useState('');

    const filteredCommands = React.useMemo(() => {
        if (!search.trim()) return commands;
        const query = search.toLowerCase().trim();
        return commands.filter(
            (cmd) =>
                cmd.name.toLowerCase().includes(query) ||
                (cmd.description && cmd.description.toLowerCase().includes(query)),
        );
    }, [commands, search]);

    const renderItem = React.useCallback(
        ({ item }: { item: AcpAvailableCommand }) => (
            <MemoCommandRow command={item} onPress={() => onInvokeCommand(item)} />
        ),
        [onInvokeCommand],
    );

    const keyExtractor = React.useCallback((item: AcpAvailableCommand) => item.name, []);

    if (commands.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.emptyState}>
                    <Ionicons name="code-slash-outline" size={32} style={styles.emptyIcon} />
                    <Text style={styles.emptyTitle}>{t('acp.commandPalette.emptyTitle')}</Text>
                    <Text style={styles.emptyDescription}>{t('acp.commandPalette.emptyDescription')}</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="code-slash-outline" size={16} style={styles.headerIcon} />
                <Text style={styles.headerText}>{t('acp.commandPalette.title')}</Text>
                <Text style={styles.headerCount}>
                    {t('acp.commandPalette.commandCount', { count: commands.length })}
                </Text>
            </View>
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={16} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder={t('acp.commandPalette.searchPlaceholder')}
                    placeholderTextColor={styles.searchPlaceholder.color as string}
                    value={search}
                    onChangeText={setSearch}
                    autoCapitalize="none"
                    autoCorrect={false}
                    clearButtonMode="while-editing"
                />
            </View>
            <FlatList
                data={filteredCommands}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                style={styles.list}
                keyboardShouldPersistTaps="handled"
                ListEmptyComponent={
                    <Text style={styles.noResults}>{t('acp.commandPalette.noResults')}</Text>
                }
            />
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    headerIcon: {
        color: theme.colors.textSecondary,
        marginRight: 6,
    },
    headerText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.typography,
        flex: 1,
    },
    headerCount: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 10,
    },
    searchIcon: {
        color: theme.colors.textSecondary,
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.typography,
        paddingVertical: 10,
    },
    searchPlaceholder: {
        color: theme.colors.textSecondary,
    },
    list: {
        flex: 1,
    },
    commandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.backgroundSecondary,
    },
    commandIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    commandIcon: {
        color: theme.colors.primary,
    },
    commandContent: {
        flex: 1,
        marginRight: 8,
    },
    commandName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.typography,
        fontFamily: 'monospace',
    },
    commandDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginTop: 2,
        lineHeight: 18,
    },
    chevron: {
        color: theme.colors.textSecondary,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
        paddingHorizontal: 32,
    },
    emptyIcon: {
        color: theme.colors.textSecondary,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.typography,
        marginBottom: 4,
    },
    emptyDescription: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    noResults: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        paddingVertical: 24,
    },
}));
