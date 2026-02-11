import * as React from 'react';
import { Text, View, StyleSheet, Platform, Pressable, LayoutAnimation } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

// Truncation thresholds for large command outputs
const LINE_THRESHOLD = 100;  // Truncate if output has more than this many lines
const INITIAL_LINES = 30;    // Show this many lines when truncated

// Helper to truncate text content
function truncateContent(content: string | null | undefined, expanded: boolean, enableTruncation: boolean): { text: string | null; needsTruncation: boolean; hiddenLines: number } {
    if (!content || !content.trim()) {
        return { text: null, needsTruncation: false, hiddenLines: 0 };
    }

    const lines = content.split('\n');
    const needsTruncation = enableTruncation && lines.length > LINE_THRESHOLD;

    if (needsTruncation && !expanded) {
        return {
            text: lines.slice(0, INITIAL_LINES).join('\n'),
            needsTruncation: true,
            hiddenLines: lines.length - INITIAL_LINES
        };
    }
    return { text: content, needsTruncation, hiddenLines: 0 };
}

interface CommandViewProps {
    command: string;
    prompt?: string;
    stdout?: string | null;
    stderr?: string | null;
    error?: string | null;
    // Legacy prop for backward compatibility
    output?: string | null;
    maxHeight?: number;
    fullWidth?: boolean;
    hideEmptyOutput?: boolean;
    /** Enable truncation for large outputs. Defaults to true. */
    enableTruncation?: boolean;
}

export const CommandView = React.memo<CommandViewProps>(({
    command,
    prompt = '$',
    stdout,
    stderr,
    error,
    output,
    maxHeight,
    fullWidth,
    hideEmptyOutput,
    enableTruncation = true,
}) => {
    const [expanded, setExpanded] = React.useState(false);
    const { theme } = useUnistyles();
    // Use legacy output if new props aren't provided
    const hasNewProps = stdout !== undefined || stderr !== undefined || error !== undefined;

    // Calculate truncation for each output type
    const stdoutResult = React.useMemo(() => truncateContent(stdout, expanded, enableTruncation), [stdout, expanded, enableTruncation]);
    const stderrResult = React.useMemo(() => truncateContent(stderr, expanded, enableTruncation), [stderr, expanded, enableTruncation]);
    const legacyResult = React.useMemo(() => truncateContent(output, expanded, enableTruncation), [output, expanded, enableTruncation]);

    // Calculate total hidden lines
    const needsTruncation = stdoutResult.needsTruncation || stderrResult.needsTruncation || legacyResult.needsTruncation;
    const totalHiddenLines = stdoutResult.hiddenLines + stderrResult.hiddenLines + legacyResult.hiddenLines;

    const handleToggle = React.useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }, [expanded]);

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.colors.terminal.background,
            borderRadius: 8,
            overflow: 'hidden',
            padding: 16,
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
        },
        line: {
            alignItems: 'baseline',
            flexDirection: 'row',
            flexWrap: 'wrap',
        },
        promptText: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 14,
            lineHeight: 20,
            color: theme.colors.terminal.prompt,
            fontWeight: '600',
        },
        commandText: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 14,
            color: theme.colors.terminal.command,
            lineHeight: 20,
            flex: 1,
        },
        stdout: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 13,
            color: theme.colors.terminal.stdout,
            lineHeight: 18,
            marginTop: 8,
        },
        stderr: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 13,
            color: theme.colors.terminal.stderr,
            lineHeight: 18,
            marginTop: 8,
        },
        error: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 13,
            color: theme.colors.terminal.error,
            lineHeight: 18,
            marginTop: 8,
        },
        emptyOutput: {
            fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
            fontSize: 13,
            color: theme.colors.terminal.emptyOutput,
            lineHeight: 18,
            marginTop: 8,
            fontStyle: 'italic',
        },
        showMoreContainer: {
            paddingTop: 8,
            alignItems: 'flex-start' as const,
        },
        showMoreText: {
            color: theme.colors.textLink,
            fontSize: 14,
            fontWeight: '500' as const,
        },
    });

    return (
        <View style={[
            styles.container, 
            maxHeight ? { maxHeight } : undefined,
            fullWidth ? { width: '100%' } : undefined
        ]}>
            {/* Command Line */}
            <View style={styles.line}>
                <Text style={styles.promptText}>{prompt} </Text>
                <Text style={styles.commandText}>{command}</Text>
            </View>

            {hasNewProps ? (
                <>
                    {/* Standard Output */}
                    {stdoutResult.text && (
                        <Text style={styles.stdout}>{stdoutResult.text}</Text>
                    )}

                    {/* Standard Error */}
                    {stderrResult.text && (
                        <Text style={styles.stderr}>{stderrResult.text}</Text>
                    )}

                    {/* Error Message */}
                    {error && (
                        <Text style={styles.error}>{error}</Text>
                    )}

                    {/* Empty output indicator */}
                    {!stdout && !stderr && !error && !hideEmptyOutput && (
                        <Text style={styles.emptyOutput}>[Command completed with no output]</Text>
                    )}
                </>
            ) : (
                /* Legacy output format */
                legacyResult.text && (
                    <Text style={styles.commandText}>{'\n---\n' + legacyResult.text}</Text>
                )
            )}

            {/* Show more/less button */}
            {needsTruncation && (
                <Pressable
                    onPress={handleToggle}
                    style={styles.showMoreContainer}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? t('message.showLess') : t('message.showMore', { lines: totalHiddenLines })}
                    accessibilityState={{ expanded }}
                >
                    <Text style={styles.showMoreText}>
                        {expanded
                            ? t('message.showLess')
                            : t('message.showMore', { lines: totalHiddenLines })}
                    </Text>
                </Pressable>
            )}
        </View>
    );
});

