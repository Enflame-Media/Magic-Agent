/**
 * HAP-1044: ACP Session Browser Component
 *
 * Displays a list of available ACP sessions with load, resume, and fork actions.
 * Actions are gated by agent capabilities. The active session is visually distinguished.
 * Supports pull-to-refresh and shows an empty state when no sessions are available.
 */

import * as React from 'react';
import { Text, View, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/text';
import { Modal } from '@/modal';
import type { AcpSessionBrowserCapabilities, AcpBrowserSession } from '@/sync/acpTypes';

interface AcpSessionBrowserProps {
    sessions: AcpBrowserSession[];
    capabilities: AcpSessionBrowserCapabilities;
    activeSessionId: string | null;
    onRefresh: () => void;
    onLoad: (sessionId: string) => void;
    onResume: (sessionId: string) => void;
    onFork: (sessionId: string) => void;
    refreshing: boolean;
    /** HAP-1071: Error message from a failed session list operation */
    error?: string | null;
}

function formatSessionDate(dateStr: string | null): string {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return t('time.justNow');
        if (diffMins < 60) return t('time.minutesAgo', { count: diffMins });
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return t('time.hoursAgo', { count: diffHours });
        const diffDays = Math.floor(diffHours / 24);
        return t('time.daysAgo', { count: diffDays });
    } catch {
        return '';
    }
}

/**
 * Confirm before switching away from the active session.
 * Returns true if user confirms or there's no active session conflict.
 */
async function confirmSessionSwitch(activeSessionId: string | null, targetSessionId: string): Promise<boolean> {
    if (!activeSessionId || activeSessionId === targetSessionId) return true;
    return Modal.confirm(
        t('acp.sessionBrowser.switchSessionTitle'),
        t('acp.sessionBrowser.switchSessionMessage'),
        {
            confirmText: t('common.continue'),
            cancelText: t('common.cancel'),
        }
    );
}

const EmptyState = React.memo(() => {
    return (
        <View style={styles.emptyContainer}>
            <Ionicons name="albums-outline" size={48} style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>{t('acp.sessionBrowser.emptyTitle')}</Text>
            <Text style={styles.emptyDescription}>{t('acp.sessionBrowser.emptyDescription')}</Text>
        </View>
    );
});

interface SessionItemProps {
    session: AcpBrowserSession;
    capabilities: AcpSessionBrowserCapabilities;
    activeSessionId: string | null;
    onLoad: (sessionId: string) => void;
    onResume: (sessionId: string) => void;
    onFork: (sessionId: string) => void;
}

const SessionItem = React.memo<SessionItemProps>(({
    session,
    capabilities,
    activeSessionId,
    onLoad,
    onResume,
    onFork,
}) => {
    const { theme } = useUnistyles();

    const handleLoad = React.useCallback(async () => {
        if (await confirmSessionSwitch(activeSessionId, session.sessionId)) {
            onLoad(session.sessionId);
        }
    }, [activeSessionId, session.sessionId, onLoad]);

    const handleResume = React.useCallback(async () => {
        if (await confirmSessionSwitch(activeSessionId, session.sessionId)) {
            onResume(session.sessionId);
        }
    }, [activeSessionId, session.sessionId, onResume]);

    const handleFork = React.useCallback(async () => {
        onFork(session.sessionId);
    }, [session.sessionId, onFork]);

    const hasActions = capabilities.canLoadSession || capabilities.canResumeSession || capabilities.canForkSession;

    return (
        <View style={[styles.sessionItem, session.isActive && styles.sessionItemActive]}>
            <View style={styles.sessionHeader}>
                <View style={styles.sessionTitleRow}>
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                        {session.title}
                    </Text>
                    {session.isActive && (
                        <View style={styles.activeBadge}>
                            <View style={[styles.activeDot, { backgroundColor: theme.colors.success ?? '#34C759' }]} />
                            <Text style={[styles.activeBadgeText, { color: theme.colors.success ?? '#34C759' }]}>
                                {t('acp.sessionBrowser.active')}
                            </Text>
                        </View>
                    )}
                </View>
                <Text style={styles.sessionCwd} numberOfLines={1}>{session.cwd}</Text>
                {session.updatedAt && (
                    <Text style={styles.sessionDate}>{formatSessionDate(session.updatedAt)}</Text>
                )}
            </View>
            {hasActions && !session.isActive && (
                <View style={styles.actionRow}>
                    {capabilities.canLoadSession && (
                        <Pressable style={styles.actionButton} onPress={handleLoad}>
                            <Ionicons name="open-outline" size={14} style={styles.actionIcon} />
                            <Text style={styles.actionText}>{t('acp.sessionBrowser.load')}</Text>
                        </Pressable>
                    )}
                    {capabilities.canResumeSession && (
                        <Pressable style={styles.actionButton} onPress={handleResume}>
                            <Ionicons name="play-outline" size={14} style={styles.actionIcon} />
                            <Text style={styles.actionText}>{t('acp.sessionBrowser.resume')}</Text>
                        </Pressable>
                    )}
                    {capabilities.canForkSession && (
                        <Pressable style={styles.actionButton} onPress={handleFork}>
                            <Ionicons name="git-branch-outline" size={14} style={styles.actionIcon} />
                            <Text style={styles.actionText}>{t('acp.sessionBrowser.fork')}</Text>
                        </Pressable>
                    )}
                </View>
            )}
        </View>
    );
});

const keyExtractor = (item: AcpBrowserSession) => item.sessionId;

/** HAP-1071: Error banner displayed when session list operations fail */
const ErrorBanner = React.memo<{ message: string; onRetry: () => void }>(({ message, onRetry }) => {
    return (
        <Pressable style={styles.errorBanner} onPress={onRetry}>
            <Ionicons name="alert-circle" size={16} style={styles.errorIcon} />
            <Text style={styles.errorText} numberOfLines={2}>{message}</Text>
            <Ionicons name="refresh" size={16} style={styles.errorRetryIcon} />
        </Pressable>
    );
});

export const AcpSessionBrowser = React.memo<AcpSessionBrowserProps>(({
    sessions,
    capabilities,
    activeSessionId,
    onRefresh,
    onLoad,
    onResume,
    onFork,
    refreshing,
    error,
}) => {
    const { theme } = useUnistyles();

    const renderItem = React.useCallback(({ item }: { item: AcpBrowserSession }) => (
        <SessionItem
            session={item}
            capabilities={capabilities}
            activeSessionId={activeSessionId}
            onLoad={onLoad}
            onResume={onResume}
            onFork={onFork}
        />
    ), [capabilities, activeSessionId, onLoad, onResume, onFork]);

    return (
        <View style={styles.container}>
            <Text style={styles.headerTitle}>{t('acp.sessionBrowser.title')}</Text>
            {/* HAP-1071: Display error banner when session list operations fail */}
            {error && !refreshing && (
                <ErrorBanner message={error} onRetry={onRefresh} />
            )}
            <FlatList
                data={sessions}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={sessions.length === 0 ? styles.emptyListContent : styles.listContent}
                ListEmptyComponent={refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    </View>
                ) : (
                    <EmptyState />
                )}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.colors.primary}
                    />
                }
            />
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: theme.colors.typography,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    emptyListContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
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
    },
    sessionItem: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        padding: 14,
        marginBottom: 8,
    },
    sessionItemActive: {
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    sessionHeader: {
        gap: 2,
    },
    sessionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sessionTitle: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.typography,
        marginRight: 8,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    sessionCwd: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
    },
    sessionDate: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        marginTop: 2,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    actionIcon: {
        color: theme.colors.primary,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.primary,
    },
    // HAP-1071: Error banner styles
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.error ? `${String(theme.colors.error)}15` : '#FF3B3015',
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    errorIcon: {
        color: theme.colors.error ?? '#FF3B30',
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: theme.colors.error ?? '#FF3B30',
    },
    errorRetryIcon: {
        color: theme.colors.textSecondary,
    },
}));
