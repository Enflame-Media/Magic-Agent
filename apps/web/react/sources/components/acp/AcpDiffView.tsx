/**
 * HAP-1042: ACP Diff View Component
 *
 * Renders unified diffs with:
 * - Line numbers for old and new files
 * - Green/red coloring for added/removed lines
 * - File path header
 * - Collapsible sections for large diffs
 * - Monospace font rendering
 */

import * as React from 'react';
import { FlatList, LayoutAnimation, Pressable, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { AcpToolCallContentDiff } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpDiffViewProps {
    content: AcpToolCallContentDiff;
}

interface DiffLine {
    type: 'add' | 'remove' | 'context';
    oldLineNum: number | null;
    newLineNum: number | null;
    text: string;
}

/**
 * Compute a simple line-based diff between old and new text.
 * Produces a list of DiffLine entries with line numbers.
 */
function computeDiff(oldText: string | null | undefined, newText: string): DiffLine[] {
    const oldLines = (oldText ?? '').split('\n');
    const newLines = newText.split('\n');
    const result: DiffLine[] = [];

    // Simple LCS-based diff for reasonable performance
    const m = oldLines.length;
    const n = newLines.length;

    // For very large files, use a simplified approach
    if (m + n > 2000) {
        return computeSimpleDiff(oldLines, newLines);
    }

    // Build LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (oldLines[i - 1] === newLines[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to produce diff
    const lines: DiffLine[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
            lines.push({ type: 'context', oldLineNum: i, newLineNum: j, text: oldLines[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            lines.push({ type: 'add', oldLineNum: null, newLineNum: j, text: newLines[j - 1] });
            j--;
        } else if (i > 0) {
            lines.push({ type: 'remove', oldLineNum: i, newLineNum: null, text: oldLines[i - 1] });
            i--;
        }
    }

    lines.reverse();
    return lines;
}

/** Simplified diff for very large files - show all old as removed, all new as added */
function computeSimpleDiff(oldLines: string[], newLines: string[]): DiffLine[] {
    const result: DiffLine[] = [];
    for (let i = 0; i < oldLines.length; i++) {
        result.push({ type: 'remove', oldLineNum: i + 1, newLineNum: null, text: oldLines[i] });
    }
    for (let i = 0; i < newLines.length; i++) {
        result.push({ type: 'add', oldLineNum: null, newLineNum: i + 1, text: newLines[i] });
    }
    return result;
}

const COLLAPSED_LINE_LIMIT = 50;

const DiffLineRow = React.memo<{ line: DiffLine }>(({ line }) => {
    return (
        <View style={[
            styles.lineRow,
            line.type === 'add' && styles.lineRowAdd,
            line.type === 'remove' && styles.lineRowRemove,
        ]}>
            <Text style={[styles.lineNumber, line.type === 'add' && styles.lineNumberAdd, line.type === 'remove' && styles.lineNumberRemove]}>
                {line.oldLineNum ?? ' '}
            </Text>
            <Text style={[styles.lineNumber, line.type === 'add' && styles.lineNumberAdd, line.type === 'remove' && styles.lineNumberRemove]}>
                {line.newLineNum ?? ' '}
            </Text>
            <Text style={[
                styles.linePrefix,
                line.type === 'add' && styles.linePrefixAdd,
                line.type === 'remove' && styles.linePrefixRemove,
            ]}>
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
            </Text>
            <Text style={[
                styles.lineText,
                line.type === 'add' && styles.lineTextAdd,
                line.type === 'remove' && styles.lineTextRemove,
            ]} numberOfLines={1}>
                {line.text}
            </Text>
        </View>
    );
});

export const AcpDiffView = React.memo<AcpDiffViewProps>(({ content }) => {
    const [expanded, setExpanded] = React.useState(false);
    const diffLines = React.useMemo(
        () => computeDiff(content.oldText, content.newText),
        [content.oldText, content.newText]
    );

    const isLarge = diffLines.length > COLLAPSED_LINE_LIMIT;
    const displayLines = expanded || !isLarge
        ? diffLines
        : diffLines.slice(0, COLLAPSED_LINE_LIMIT);

    const addCount = diffLines.filter((l) => l.type === 'add').length;
    const removeCount = diffLines.filter((l) => l.type === 'remove').length;

    const handleToggle = React.useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => !prev);
    }, []);

    const fileName = content.path.split('/').pop() ?? content.path;

    const renderItem = React.useCallback(
        ({ item }: { item: DiffLine }) => <DiffLineRow line={item} />,
        []
    );

    const keyExtractor = React.useCallback(
        (_: DiffLine, index: number) => String(index),
        []
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="git-compare-outline" size={14} style={styles.headerIcon} />
                <Text style={styles.filePath} numberOfLines={1}>
                    {fileName}
                </Text>
                <View style={styles.stats}>
                    {addCount > 0 && (
                        <Text style={styles.statAdd}>+{addCount}</Text>
                    )}
                    {removeCount > 0 && (
                        <Text style={styles.statRemove}>-{removeCount}</Text>
                    )}
                </View>
            </View>
            <Text style={styles.fullPath} numberOfLines={1}>
                {content.path}
            </Text>
            <View style={styles.diffContent}>
                <FlatList
                    data={displayLines}
                    renderItem={renderItem}
                    keyExtractor={keyExtractor}
                    scrollEnabled={false}
                    initialNumToRender={COLLAPSED_LINE_LIMIT}
                />
            </View>
            {isLarge && (
                <Pressable onPress={handleToggle} style={styles.expandButton}>
                    <Text style={styles.expandText}>
                        {expanded
                            ? t('acp.content.diffCollapse')
                            : t('acp.content.diffExpand', { count: diffLines.length - COLLAPSED_LINE_LIMIT })}
                    </Text>
                    <Ionicons
                        name={expanded ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        style={styles.expandIcon}
                    />
                </Pressable>
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        overflow: 'hidden',
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        paddingBottom: 0,
    },
    headerIcon: {
        color: theme.colors.textSecondary,
        marginRight: 6,
    },
    filePath: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.typography,
        fontFamily: 'monospace',
    },
    fullPath: {
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
        paddingHorizontal: 10,
        paddingTop: 2,
        paddingBottom: 8,
    },
    stats: {
        flexDirection: 'row',
        gap: 6,
    },
    statAdd: {
        fontSize: 12,
        fontWeight: '600',
        color: '#34C759',
    },
    statRemove: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF3B30',
    },
    diffContent: {
        borderTopWidth: 1,
        borderTopColor: theme.colors.background,
    },
    lineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
        minHeight: 22,
    },
    lineRowAdd: {
        backgroundColor: 'rgba(52, 199, 89, 0.12)',
    },
    lineRowRemove: {
        backgroundColor: 'rgba(255, 59, 48, 0.12)',
    },
    lineNumber: {
        width: 36,
        fontSize: 11,
        color: theme.colors.textSecondary,
        fontFamily: 'monospace',
        textAlign: 'right',
        paddingRight: 4,
        opacity: 0.6,
    },
    lineNumberAdd: {
        color: '#34C759',
    },
    lineNumberRemove: {
        color: '#FF3B30',
    },
    linePrefix: {
        width: 16,
        fontSize: 12,
        fontFamily: 'monospace',
        textAlign: 'center',
        color: theme.colors.textSecondary,
    },
    linePrefixAdd: {
        color: '#34C759',
        fontWeight: '700',
    },
    linePrefixRemove: {
        color: '#FF3B30',
        fontWeight: '700',
    },
    lineText: {
        flex: 1,
        fontSize: 12,
        fontFamily: 'monospace',
        color: theme.colors.typography,
        lineHeight: 18,
    },
    lineTextAdd: {
        color: '#34C759',
    },
    lineTextRemove: {
        color: '#FF3B30',
    },
    expandButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: theme.colors.background,
    },
    expandText: {
        fontSize: 12,
        color: theme.colors.primary,
        marginRight: 4,
    },
    expandIcon: {
        color: theme.colors.primary,
    },
}));
