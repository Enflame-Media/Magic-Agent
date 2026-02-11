import * as React from 'react';
import { Text, View, Platform, Pressable, LayoutAnimation } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { t } from '@/text';

// Truncation thresholds for large code outputs
const LINE_THRESHOLD = 100;  // Truncate if code has more than this many lines
const INITIAL_LINES = 30;    // Show this many lines when truncated

interface CodeViewProps {
    code: string;
    language?: string;
    /** Enable truncation for large code blocks. Defaults to true. */
    enableTruncation?: boolean;
}

export const CodeView = React.memo<CodeViewProps>(({
    code,
    language: _language,
    enableTruncation = true
}) => {
    const [expanded, setExpanded] = React.useState(false);

    // Calculate truncation
    const { displayCode, needsTruncation, hiddenLines } = React.useMemo(() => {
        const lines = code.split('\n');
        const needsTruncation = enableTruncation && lines.length > LINE_THRESHOLD;

        if (needsTruncation && !expanded) {
            return {
                displayCode: lines.slice(0, INITIAL_LINES).join('\n'),
                needsTruncation: true,
                hiddenLines: lines.length - INITIAL_LINES
            };
        }
        return { displayCode: code, needsTruncation, hiddenLines: 0 };
    }, [code, expanded, enableTruncation]);

    const handleToggle = React.useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }, [expanded]);

    return (
        <View style={styles.codeBlock}>
            <Text style={styles.codeText}>{displayCode}</Text>
            {needsTruncation && (
                <Pressable
                    onPress={handleToggle}
                    style={styles.showMoreContainer}
                    accessibilityRole="button"
                    accessibilityLabel={expanded ? t('message.showLess') : t('message.showMore', { lines: hiddenLines })}
                    accessibilityState={{ expanded }}
                >
                    <Text style={styles.showMoreText}>
                        {expanded
                            ? t('message.showLess')
                            : t('message.showMore', { lines: hiddenLines })}
                    </Text>
                </Pressable>
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    codeBlock: {
        backgroundColor: theme.colors.surfaceHigh,
        borderRadius: 6,
        padding: 12,
    },
    codeText: {
        fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        fontSize: 12,
        color: theme.colors.text,
        lineHeight: 18,
    },
    showMoreContainer: {
        paddingTop: 8,
        alignItems: 'flex-start',
    },
    showMoreText: {
        color: theme.colors.textLink,
        fontSize: 14,
        fontWeight: '500',
    },
}));