import React, { useMemo, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/StyledText';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useSessionMessages } from '@/sync/storage';
import { Message, ToolCallMessage, AgentTextMessage } from '@/sync/typesMessage';
import { UsageData } from '@/sync/typesRaw';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/text';

/**
 * Maximum context size in tokens (190K tokens for Claude's context window).
 */
const MAX_CONTEXT_SIZE = 190000;

interface ContextBreakdownProps {
    sessionId: string;
}

interface MessageTokenInfo {
    id: string;
    type: 'user' | 'assistant' | 'tool';
    inputTokens: number;
    outputTokens: number;
    cacheCreation: number;
    cacheRead: number;
    totalTokens: number;
    timestamp: number;
    label: string;
}

interface CategoryTotals {
    assistantResponses: { input: number; output: number; total: number; count: number };
    toolCalls: { input: number; output: number; total: number; count: number };
    cacheUsage: { creation: number; read: number };
}

/**
 * Extracts token information from messages that have usage data.
 */
function extractTokenInfo(messages: Message[]): MessageTokenInfo[] {
    const result: MessageTokenInfo[] = [];

    for (const msg of messages) {
        let usage: UsageData | undefined;
        let type: 'user' | 'assistant' | 'tool' = 'assistant';
        let label = '';

        if (msg.kind === 'agent-text') {
            usage = (msg as AgentTextMessage).usage;
            type = 'assistant';
            label = msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '');
        } else if (msg.kind === 'tool-call') {
            usage = (msg as ToolCallMessage).usage;
            type = 'tool';
            label = msg.tool.name;
        }

        if (usage) {
            const inputTokens = usage.input_tokens || 0;
            const outputTokens = usage.output_tokens || 0;
            const cacheCreation = usage.cache_creation_input_tokens || 0;
            const cacheRead = usage.cache_read_input_tokens || 0;

            result.push({
                id: msg.id,
                type,
                inputTokens,
                outputTokens,
                cacheCreation,
                cacheRead,
                totalTokens: inputTokens + outputTokens,
                timestamp: msg.createdAt,
                label
            });
        }
    }

    // Sort by total tokens (highest first)
    result.sort((a, b) => b.totalTokens - a.totalTokens);

    return result;
}

/**
 * Calculates category totals from message token info.
 */
function calculateCategoryTotals(tokenInfo: MessageTokenInfo[]): CategoryTotals {
    const totals: CategoryTotals = {
        assistantResponses: { input: 0, output: 0, total: 0, count: 0 },
        toolCalls: { input: 0, output: 0, total: 0, count: 0 },
        cacheUsage: { creation: 0, read: 0 }
    };

    for (const info of tokenInfo) {
        if (info.type === 'assistant') {
            totals.assistantResponses.input += info.inputTokens;
            totals.assistantResponses.output += info.outputTokens;
            totals.assistantResponses.total += info.totalTokens;
            totals.assistantResponses.count++;
        } else if (info.type === 'tool') {
            totals.toolCalls.input += info.inputTokens;
            totals.toolCalls.output += info.outputTokens;
            totals.toolCalls.total += info.totalTokens;
            totals.toolCalls.count++;
        }

        totals.cacheUsage.creation += info.cacheCreation;
        totals.cacheUsage.read += info.cacheRead;
    }

    return totals;
}

/**
 * Formats token count with K suffix for thousands.
 */
function formatTokens(tokens: number): string {
    if (tokens >= 10000) {
        return `${(tokens / 1000).toFixed(1)}K`;
    }
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(2)}K`;
    }
    return tokens.toString();
}

/**
 * Context breakdown component that shows per-message token usage.
 * Displays tokens grouped by category (assistant responses, tool calls)
 * with the option to see individual message breakdown.
 */
export const ContextBreakdown = React.memo(({ sessionId }: ContextBreakdownProps) => {
    const { theme } = useUnistyles();
    const { messages, isLoaded } = useSessionMessages(sessionId);
    const [showDetails, setShowDetails] = useState(false);

    const { tokenInfo, categoryTotals, totalContextTokens, contextPercentage } = useMemo(() => {
        const info = extractTokenInfo(messages);
        const totals = calculateCategoryTotals(info);

        // Calculate total context tokens (input + cache)
        const totalInput = totals.assistantResponses.input + totals.toolCalls.input;
        const totalContext = totalInput + totals.cacheUsage.creation + totals.cacheUsage.read;
        const percentage = Math.min((totalContext / MAX_CONTEXT_SIZE) * 100, 100);

        return {
            tokenInfo: info,
            categoryTotals: totals,
            totalContextTokens: totalContext,
            contextPercentage: percentage
        };
    }, [messages]);

    if (!isLoaded) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                </View>
            </View>
        );
    }

    if (tokenInfo.length === 0) {
        return (
            <View style={styles.container}>
                <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                    {t('sessionInfo.contextBreakdown.noData')}
                </Text>
            </View>
        );
    }

    const topMessages = tokenInfo.slice(0, 5);

    return (
        <View style={styles.container}>
            {/* Summary Header */}
            <Pressable
                style={styles.header}
                onPress={() => setShowDetails(!showDetails)}
            >
                <View style={styles.headerLeft}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                        {t('sessionInfo.contextBreakdown.title')}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                        {formatTokens(totalContextTokens)} {t('sessionInfo.contextBreakdown.tokens')} ({contextPercentage.toFixed(1)}%)
                    </Text>
                </View>
                <Ionicons
                    name={showDetails ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={theme.colors.textSecondary}
                />
            </Pressable>

            {/* Category Summary */}
            <View style={styles.categorySection}>
                {categoryTotals.assistantResponses.count > 0 && (
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryLeft}>
                            <Ionicons name="chatbubble-outline" size={16} color={theme.colors.textLink} />
                            <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>
                                {t('sessionInfo.contextBreakdown.assistantResponses')}
                            </Text>
                            <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
                                ({categoryTotals.assistantResponses.count})
                            </Text>
                        </View>
                        <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                            {formatTokens(categoryTotals.assistantResponses.total)}
                        </Text>
                    </View>
                )}

                {categoryTotals.toolCalls.count > 0 && (
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryLeft}>
                            <Ionicons name="hammer-outline" size={16} color="#FF9500" />
                            <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>
                                {t('sessionInfo.contextBreakdown.toolCalls')}
                            </Text>
                            <Text style={[styles.categoryCount, { color: theme.colors.textSecondary }]}>
                                ({categoryTotals.toolCalls.count})
                            </Text>
                        </View>
                        <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                            {formatTokens(categoryTotals.toolCalls.total)}
                        </Text>
                    </View>
                )}

                {(categoryTotals.cacheUsage.creation > 0 || categoryTotals.cacheUsage.read > 0) && (
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryLeft}>
                            <Ionicons name="server-outline" size={16} color="#34C759" />
                            <Text style={[styles.categoryLabel, { color: theme.colors.text }]}>
                                {t('sessionInfo.contextBreakdown.cacheUsage')}
                            </Text>
                        </View>
                        <Text style={[styles.categoryValue, { color: theme.colors.text }]}>
                            {formatTokens(categoryTotals.cacheUsage.creation + categoryTotals.cacheUsage.read)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Detailed Breakdown */}
            {showDetails && topMessages.length > 0 && (
                <View style={styles.detailsSection}>
                    <Text style={[styles.detailsTitle, { color: theme.colors.textSecondary }]}>
                        {t('sessionInfo.contextBreakdown.topConsumers')}
                    </Text>

                    {topMessages.map((info, index) => (
                        <View key={info.id} style={styles.detailRow}>
                            <View style={styles.detailLeft}>
                                <View style={[
                                    styles.rankBadge,
                                    { backgroundColor: index === 0 ? theme.colors.textLink : theme.colors.surfaceHighest }
                                ]}>
                                    <Text style={[
                                        styles.rankText,
                                        { color: index === 0 ? '#fff' : theme.colors.textSecondary }
                                    ]}>
                                        {index + 1}
                                    </Text>
                                </View>
                                <View style={styles.detailInfo}>
                                    <Text style={[styles.detailLabel, { color: theme.colors.text }]} numberOfLines={1}>
                                        {info.type === 'tool' ? info.label : t('sessionInfo.contextBreakdown.response')}
                                    </Text>
                                    <Text style={[styles.detailMeta, { color: theme.colors.textSecondary }]}>
                                        {t('sessionInfo.contextBreakdown.inputOutput', {
                                            input: formatTokens(info.inputTokens),
                                            output: formatTokens(info.outputTokens)
                                        })}
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.detailValue, { color: theme.colors.text }]}>
                                {formatTokens(info.totalTokens)}
                            </Text>
                        </View>
                    ))}

                    {tokenInfo.length > 5 && (
                        <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                            {t('sessionInfo.contextBreakdown.andMore', { count: tokenInfo.length - 5 })}
                        </Text>
                    )}
                </View>
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
    },
    loadingContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    headerLeft: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    categorySection: {
        gap: 8,
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryLabel: {
        fontSize: 14,
    },
    categoryCount: {
        fontSize: 12,
    },
    categoryValue: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailsSection: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(128, 128, 128, 0.2)',
    },
    detailsTitle: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    detailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '600',
    },
    detailInfo: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailMeta: {
        fontSize: 11,
        marginTop: 1,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    moreText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
}));
