/**
 * HAP-1041: ACP Session Configuration Options Panel
 *
 * Renders configurable session options from ACP agents. Supports type-aware
 * editors: select dropdowns (flat and grouped), with unknown types shown
 * as read-only. Sends session/set_config_option requests through the relay
 * when values change, with debouncing and loading state.
 */

import * as React from 'react';
import { Text, View, Pressable, ActivityIndicator } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type {
    AcpSessionConfigOption,
    AcpSessionConfigSelectOption,
    AcpSessionConfigSelectGroup,
} from '@magic-agent/protocol';
import { t } from '@/text';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AcpConfigPanelProps {
    configOptions: AcpSessionConfigOption[];
    /** Called when user changes a config option value */
    onConfigChange?: (configId: string, value: string) => void;
}

interface ConfigOptionRowProps {
    option: AcpSessionConfigOption;
    pendingId: string | null;
    onValueChange: (configId: string, value: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Flatten grouped options into a single list of select options.
 * If options are already flat, returns them as-is.
 */
function flattenOptions(
    options: AcpSessionConfigOption['options']
): AcpSessionConfigSelectOption[] {
    if (options.length === 0) return [];

    // Check if first element has 'group' field (it's a grouped array)
    const first = options[0];
    if ('group' in first) {
        // Grouped options - flatten all groups
        return (options as AcpSessionConfigSelectGroup[]).flatMap(g => g.options);
    }

    // Flat options
    return options as AcpSessionConfigSelectOption[];
}

/**
 * Check if options are grouped (have group field)
 */
function isGrouped(
    options: AcpSessionConfigOption['options']
): options is AcpSessionConfigSelectGroup[] {
    return options.length > 0 && 'group' in options[0];
}

/**
 * Find the display name for a value in the options list.
 */
function getOptionName(
    options: AcpSessionConfigOption['options'],
    value: string
): string | null {
    const flat = flattenOptions(options);
    const found = flat.find(o => o.value === value);
    return found?.name ?? null;
}

/**
 * Group config options by category. Options without a category go into a
 * default group keyed by empty string.
 */
function groupByCategory(
    options: AcpSessionConfigOption[]
): Map<string, AcpSessionConfigOption[]> {
    const groups = new Map<string, AcpSessionConfigOption[]>();
    for (const opt of options) {
        const key = opt.category ?? '';
        const existing = groups.get(key);
        if (existing) {
            existing.push(opt);
        } else {
            groups.set(key, [opt]);
        }
    }
    return groups;
}

// ─── Select Picker Component ────────────────────────────────────────────────

/**
 * Inline select picker that cycles through options on press.
 * For small option sets this is more mobile-friendly than a dropdown.
 * For grouped options, renders all options in a flat cycle.
 */
const SelectPicker = React.memo<{
    option: AcpSessionConfigOption;
    isPending: boolean;
    onValueChange: (configId: string, value: string) => void;
}>(({ option, isPending, onValueChange }) => {
    const { theme } = useUnistyles();
    const flat = flattenOptions(option.options);
    const currentName = getOptionName(option.options, option.currentValue);

    const handlePress = React.useCallback(() => {
        if (isPending || flat.length <= 1) return;
        const currentIndex = flat.findIndex(o => o.value === option.currentValue);
        const nextIndex = (currentIndex + 1) % flat.length;
        onValueChange(option.id, flat[nextIndex].value);
    }, [isPending, flat, option.currentValue, option.id, onValueChange]);

    return (
        <Pressable
            onPress={handlePress}
            style={styles.selectButton}
            disabled={isPending || flat.length <= 1}
        >
            {isPending ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
                <>
                    <Text style={styles.selectValue} numberOfLines={1}>
                        {currentName ?? option.currentValue}
                    </Text>
                    {flat.length > 1 && (
                        <Ionicons
                            name="chevron-expand-outline"
                            size={14}
                            style={styles.selectChevron}
                        />
                    )}
                </>
            )}
        </Pressable>
    );
});

// ─── Config Option Row ──────────────────────────────────────────────────────

const ConfigOptionRow = React.memo<ConfigOptionRowProps>(({ option, pendingId, onValueChange }) => {
    const isPending = pendingId === option.id;
    const isUnknownType = option.type !== 'select';

    return (
        <View style={styles.optionRow}>
            <View style={styles.optionInfo}>
                <Text style={styles.optionName} numberOfLines={1}>
                    {option.name}
                </Text>
                {option.description != null && (
                    <Text style={styles.optionDescription} numberOfLines={2}>
                        {option.description}
                    </Text>
                )}
            </View>
            <View style={styles.optionControl}>
                {isUnknownType ? (
                    <Text style={styles.readOnlyValue} numberOfLines={1}>
                        {option.currentValue}
                    </Text>
                ) : (
                    <SelectPicker
                        option={option}
                        isPending={isPending}
                        onValueChange={onValueChange}
                    />
                )}
            </View>
        </View>
    );
});

// ─── Main Component ─────────────────────────────────────────────────────────

export const AcpConfigPanel = React.memo<AcpConfigPanelProps>(({
    configOptions,
    onConfigChange,
}) => {
    const [pendingId, setPendingId] = React.useState<string | null>(null);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Clear pending state when config options change (agent confirmed the change)
    React.useEffect(() => {
        setPendingId(null);
    }, [configOptions]);

    // Cleanup debounce timer on unmount
    React.useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleValueChange = React.useCallback((configId: string, value: string) => {
        if (!onConfigChange) return;

        // Set pending state immediately for visual feedback
        setPendingId(configId);

        // Debounce the actual relay call (300ms)
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            onConfigChange(configId, value);
        }, 300);
    }, [onConfigChange]);

    if (configOptions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons
                    name="settings-outline"
                    size={32}
                    style={styles.emptyIcon}
                />
                <Text style={styles.emptyTitle}>
                    {t('acp.config.emptyTitle')}
                </Text>
                <Text style={styles.emptyDescription}>
                    {t('acp.config.emptyDescription')}
                </Text>
            </View>
        );
    }

    // Group options by category
    const grouped = groupByCategory(configOptions);
    const categoryEntries = Array.from(grouped.entries());

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons
                    name="settings-outline"
                    size={16}
                    style={styles.headerIcon}
                />
                <Text style={styles.headerTitle}>
                    {t('acp.config.title')}
                </Text>
            </View>
            {categoryEntries.map(([category, options]) => (
                <View key={category || '__default'}>
                    {category !== '' && (
                        <Text style={styles.categoryLabel}>
                            {category}
                        </Text>
                    )}
                    {options.map(option => (
                        <ConfigOptionRow
                            key={option.id}
                            option={option}
                            pendingId={pendingId}
                            onValueChange={handleValueChange}
                        />
                    ))}
                </View>
            ))}
        </View>
    );
});

// ─── Styles ─────────────────────────────────────────────────────────────────

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
    headerTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    categoryLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        marginTop: 8,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: theme.colors.border ?? theme.colors.backgroundSecondary,
    },
    optionInfo: {
        flex: 1,
        marginRight: 12,
    },
    optionName: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.typography,
    },
    optionDescription: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    optionControl: {
        flexShrink: 0,
        alignItems: 'flex-end',
    },
    selectButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 80,
        justifyContent: 'center',
    },
    selectValue: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.primary,
        maxWidth: 120,
    },
    selectChevron: {
        color: theme.colors.textSecondary,
        marginLeft: 4,
    },
    readOnlyValue: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        maxWidth: 120,
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 16,
    },
    emptyIcon: {
        color: theme.colors.textSecondary,
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.typography,
        marginBottom: 4,
    },
    emptyDescription: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
    },
}));
