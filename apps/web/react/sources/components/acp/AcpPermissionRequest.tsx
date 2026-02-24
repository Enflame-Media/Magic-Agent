/**
 * HAP-1043: ACP Permission Request Component
 *
 * Displays an ACP tool call permission request with tool details,
 * affected file locations, and 4 action buttons for the user to
 * approve or deny the tool execution.
 *
 * Handles timeout countdown and expired state when the agent
 * specifies a timeout. Queues multiple requests and displays
 * the oldest pending one first.
 */

import * as React from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpPermissionOption, AcpPermissionOptionKind } from '@magic-agent/protocol';
import type { AcpPermissionRequestState } from '@/sync/acpTypes';
import { t } from '@/text';

// ─── Props ──────────────────────────────────────────────────────────────────

interface AcpPermissionRequestProps {
    /** The permission request to display */
    request: AcpPermissionRequestState;
    /** Total number of pending requests in the queue */
    queueCount: number;
    /** Called when the user selects a permission option */
    onSelectOption: (requestId: string, optionId: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getKindIcon(kind: string | undefined): keyof typeof Ionicons.glyphMap {
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

function getOptionIcon(kind: AcpPermissionOptionKind): keyof typeof Ionicons.glyphMap {
    switch (kind) {
        case 'allow_once':
            return 'checkmark-circle-outline';
        case 'allow_always':
            return 'checkmark-done-circle-outline';
        case 'reject_once':
            return 'close-circle-outline';
        case 'reject_always':
            return 'ban-outline';
    }
}

function isAllowOption(kind: AcpPermissionOptionKind): boolean {
    return kind === 'allow_once' || kind === 'allow_always';
}

function formatRawInput(rawInput: unknown): string | null {
    if (rawInput == null) return null;
    if (typeof rawInput === 'string') return rawInput;
    try {
        return JSON.stringify(rawInput, null, 2);
    } catch {
        return String(rawInput);
    }
}

// ─── Timeout Hook ───────────────────────────────────────────────────────────

/**
 * Countdown hook that returns seconds remaining until timeoutAt.
 * Returns null if no timeout is set.
 */
function useTimeoutCountdown(timeoutAt: number | null): number | null {
    const [secondsLeft, setSecondsLeft] = React.useState<number | null>(() => {
        if (timeoutAt == null) return null;
        return Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
    });

    React.useEffect(() => {
        if (timeoutAt == null) return;

        const update = () => {
            const remaining = Math.max(0, Math.ceil((timeoutAt - Date.now()) / 1000));
            setSecondsLeft(remaining);
        };

        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [timeoutAt]);

    return secondsLeft;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const AcpPermissionRequest = React.memo<AcpPermissionRequestProps>(
    ({ request, queueCount, onSelectOption }) => {
        const { theme } = useUnistyles();
        const secondsLeft = useTimeoutCountdown(request.timeoutAt);
        const [showRawInput, setShowRawInput] = React.useState(false);
        const isExpired = request.status === 'expired' || (secondsLeft !== null && secondsLeft <= 0);
        const rawInputText = formatRawInput(request.toolCall.rawInput);

        const handleSelect = React.useCallback(
            (optionId: string) => {
                if (isExpired) return;
                onSelectOption(request.requestId, optionId);
            },
            [request.requestId, onSelectOption, isExpired]
        );

        return (
            <View style={styles.container}>
                {/* Header with icon, title, and queue badge */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons
                            name="shield-checkmark-outline"
                            size={22}
                            color={theme.colors.primary}
                        />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>
                            {t('acp.permission.title')}
                        </Text>
                        {queueCount > 1 && (
                            <View style={styles.queueBadge}>
                                <Text style={styles.queueBadgeText}>
                                    {t('acp.permission.queueCount', { count: queueCount })}
                                </Text>
                            </View>
                        )}
                    </View>
                    {secondsLeft !== null && !isExpired && (
                        <View style={styles.timeoutBadge}>
                            <Ionicons
                                name="time-outline"
                                size={14}
                                color={secondsLeft <= 10 ? (theme.colors.error ?? '#FF3B30') : theme.colors.textSecondary}
                            />
                            <Text
                                style={[
                                    styles.timeoutText,
                                    secondsLeft <= 10 && { color: theme.colors.error ?? '#FF3B30' },
                                ]}
                            >
                                {secondsLeft}s
                            </Text>
                        </View>
                    )}
                </View>

                {/* Expired banner */}
                {isExpired && (
                    <View style={styles.expiredBanner}>
                        <Ionicons
                            name="time-outline"
                            size={16}
                            color={theme.colors.error ?? '#FF3B30'}
                        />
                        <Text style={styles.expiredText}>
                            {t('acp.permission.expired')}
                        </Text>
                    </View>
                )}

                {/* Tool details */}
                <View style={styles.toolSection}>
                    <View style={styles.toolHeader}>
                        <View style={styles.toolIcon}>
                            <Ionicons
                                name={getKindIcon(request.toolCall.kind)}
                                size={18}
                                style={styles.toolKindIcon}
                            />
                        </View>
                        <View style={styles.toolInfo}>
                            <Text style={styles.toolTitle} numberOfLines={2}>
                                {request.toolCall.title}
                            </Text>
                            {request.toolCall.kind && (
                                <Text style={styles.toolKind}>
                                    {request.toolCall.kind}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* File locations */}
                    {request.toolCall.locations && request.toolCall.locations.length > 0 && (
                        <View style={styles.locationsSection}>
                            {request.toolCall.locations.map((loc, index) => (
                                <View key={index} style={styles.locationRow}>
                                    <Ionicons
                                        name="document-outline"
                                        size={12}
                                        style={styles.locationIcon}
                                    />
                                    <Text style={styles.locationPath} numberOfLines={1}>
                                        {loc.path}
                                        {loc.line != null ? `:${loc.line}` : ''}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Raw input preview (collapsible) */}
                    {rawInputText && (
                        <Pressable
                            onPress={() => setShowRawInput(!showRawInput)}
                            style={styles.rawInputToggle}
                        >
                            <Ionicons
                                name={showRawInput ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                style={styles.rawInputToggleIcon}
                            />
                            <Text style={styles.rawInputToggleText}>
                                {t('acp.permission.rawInput')}
                            </Text>
                        </Pressable>
                    )}
                    {showRawInput && rawInputText && (
                        <ScrollView
                            style={styles.rawInputContainer}
                            horizontal={false}
                            nestedScrollEnabled
                        >
                            <Text style={styles.rawInputText}>
                                {rawInputText}
                            </Text>
                        </ScrollView>
                    )}
                </View>

                {/* Permission option buttons */}
                {!isExpired && (
                    <View style={styles.optionsSection}>
                        {/* Allow options first, then reject */}
                        {sortOptionsByKind(request.options).map((option) => (
                            <PermissionOptionButton
                                key={option.optionId}
                                option={option}
                                onPress={handleSelect}
                            />
                        ))}
                    </View>
                )}
            </View>
        );
    }
);

// ─── Option Button ──────────────────────────────────────────────────────────

interface PermissionOptionButtonProps {
    option: AcpPermissionOption;
    onPress: (optionId: string) => void;
}

const PermissionOptionButton = React.memo<PermissionOptionButtonProps>(
    ({ option, onPress }) => {
        const { theme } = useUnistyles();
        const isAllow = isAllowOption(option.kind);

        const handlePress = React.useCallback(() => {
            onPress(option.optionId);
        }, [option.optionId, onPress]);

        return (
            <Pressable
                onPress={handlePress}
                style={({ pressed }: { pressed: boolean }) => [
                    styles.optionButton,
                    isAllow ? styles.optionButtonAllow : styles.optionButtonReject,
                    pressed && styles.optionButtonPressed,
                ]}
            >
                <Ionicons
                    name={getOptionIcon(option.kind)}
                    size={18}
                    color={isAllow ? '#FFFFFF' : (theme.colors.error ?? '#FF3B30')}
                />
                <Text
                    style={[
                        styles.optionButtonText,
                        isAllow ? styles.optionButtonTextAllow : styles.optionButtonTextReject,
                    ]}
                >
                    {option.name}
                </Text>
            </Pressable>
        );
    }
);

/**
 * Sort options: allow_once, allow_always, reject_once, reject_always.
 */
function sortOptionsByKind(options: AcpPermissionOption[]): AcpPermissionOption[] {
    const order: Record<string, number> = {
        allow_once: 0,
        allow_always: 1,
        reject_once: 2,
        reject_always: 3,
    };
    return [...options].sort((a, b) => (order[a.kind] ?? 4) - (order[b.kind] ?? 4));
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 14,
        padding: 16,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: theme.colors.primary + '40',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.primary + '20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    headerText: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.typography,
    },
    queueBadge: {
        backgroundColor: theme.colors.primary + '20',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    queueBadgeText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors.primary,
    },
    timeoutBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    timeoutText: {
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        fontVariant: ['tabular-nums'],
    },
    expiredBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: (theme.colors.error ?? '#FF3B30') + '15',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    expiredText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.error ?? '#FF3B30',
    },
    toolSection: {
        backgroundColor: theme.colors.background,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
    },
    toolHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    toolIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.colors.backgroundSecondary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    toolKindIcon: {
        color: theme.colors.textSecondary,
    },
    toolInfo: {
        flex: 1,
    },
    toolTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.typography,
    },
    toolKind: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        marginTop: 2,
        textTransform: 'capitalize',
    },
    locationsSection: {
        marginTop: 10,
        gap: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationIcon: {
        color: theme.colors.textSecondary,
    },
    locationPath: {
        flex: 1,
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
    },
    rawInputToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 10,
        paddingVertical: 4,
    },
    rawInputToggleIcon: {
        color: theme.colors.textSecondary,
    },
    rawInputToggleText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    rawInputContainer: {
        maxHeight: 120,
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 6,
        padding: 8,
        marginTop: 6,
    },
    rawInputText: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
    },
    optionsSection: {
        gap: 8,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    optionButtonAllow: {
        backgroundColor: theme.colors.primary,
    },
    optionButtonReject: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: (theme.colors.error ?? '#FF3B30') + '40',
    },
    optionButtonPressed: {
        opacity: 0.7,
    },
    optionButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    optionButtonTextAllow: {
        color: '#FFFFFF',
    },
    optionButtonTextReject: {
        color: theme.colors.error ?? '#FF3B30',
    },
}));
