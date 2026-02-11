import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ViewStyle, Pressable, LayoutAnimation } from 'react-native';
import { calculateUnifiedDiff, DiffToken } from '@/components/diff/calculateDiff';
import { Typography } from '@/constants/Typography';
import { useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

// Truncation thresholds for large diffs
const LINE_THRESHOLD = 100;  // Truncate if diff has more than this many lines
const INITIAL_LINES = 30;    // Show this many lines when truncated


interface DiffViewProps {
    oldText: string;
    newText: string;
    contextLines?: number;
    showLineNumbers?: boolean;
    showPlusMinusSymbols?: boolean;
    showDiffStats?: boolean;
    oldTitle?: string;
    newTitle?: string;
    style?: ViewStyle;
    maxHeight?: number;
    wrapLines?: boolean;
    fontScaleX?: number;
    /** Enable truncation for large diffs. Defaults to false for backwards compatibility. */
    enableTruncation?: boolean;
}

export const DiffView: React.FC<DiffViewProps> = ({
    oldText,
    newText,
    contextLines = 3,
    showLineNumbers = true,
    showPlusMinusSymbols = true,
    wrapLines = false,
    style,
    fontScaleX = 1,
    enableTruncation = false,
}) => {
    const [expanded, setExpanded] = useState(false);
    const { theme } = useUnistyles();
    const colors = theme.colors.diff;

    // Calculate diff with inline highlighting
    const { hunks } = useMemo(() => {
        return calculateUnifiedDiff(oldText, newText, contextLines);
    }, [oldText, newText, contextLines]);

    // Calculate total line count across all hunks
    const totalLineCount = useMemo(() => {
        return hunks.reduce((acc, hunk) => acc + hunk.lines.length, 0);
    }, [hunks]);

    // Determine if truncation is needed
    const needsTruncation = enableTruncation && totalLineCount > LINE_THRESHOLD;
    const hiddenLines = needsTruncation && !expanded ? totalLineCount - INITIAL_LINES : 0;

    // Toggle handler with animation
    const handleToggle = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded(!expanded);
    }, [expanded]);

    // Styles
    const containerStyle: ViewStyle = {
        backgroundColor: theme.colors.surface,
        borderWidth: 0,
        flex: 1,
        ...style,
    };


    // Helper function to format line content
    const formatLineContent = (content: string) => {
        // Just trim trailing spaces, we'll handle leading spaces in rendering
        return content.trimEnd();
    };

    // Helper function to render line content with styled leading space dots and inline highlighting
    const renderLineContent = (content: string, baseColor: string, tokens?: DiffToken[]) => {
        const formatted = formatLineContent(content);

        if (tokens && tokens.length > 0) {
            // Render with inline highlighting
            let processedLeadingSpaces = false;

            return tokens.map((token, idx) => {
                // Process leading spaces in the first token only
                if (!processedLeadingSpaces && token.value) {
                    const leadingMatch = token.value.match(/^( +)/);
                    if (leadingMatch) {
                        processedLeadingSpaces = true;
                        const leadingDots = '\u00b7'.repeat(leadingMatch[0].length);
                        const restOfToken = token.value.slice(leadingMatch[0].length);

                        if (token.added || token.removed) {
                            return (
                                <Text key={idx}>
                                    <Text style={{ color: colors.leadingSpaceDot }}>{leadingDots}</Text>
                                    <Text style={{
                                        backgroundColor: token.added ? colors.inlineAddedBg : colors.inlineRemovedBg,
                                        color: token.added ? colors.inlineAddedText : colors.inlineRemovedText,
                                    }}>
                                        {restOfToken}
                                    </Text>
                                </Text>
                            );
                        }
                        return (
                            <Text key={idx}>
                                <Text style={{ color: colors.leadingSpaceDot }}>{leadingDots}</Text>
                                <Text style={{ color: baseColor }}>{restOfToken}</Text>
                            </Text>
                        );
                    }
                    processedLeadingSpaces = true;
                }

                if (token.added || token.removed) {
                    return (
                        <Text
                            key={idx}
                            style={{
                                backgroundColor: token.added ? colors.inlineAddedBg : colors.inlineRemovedBg,
                                color: token.added ? colors.inlineAddedText : colors.inlineRemovedText,
                            }}
                        >
                            {token.value}
                        </Text>
                    );
                }
                return <Text key={idx} style={{ color: baseColor }}>{token.value}</Text>;
            });
        }

        // Regular rendering without tokens
        const leadingSpaces = formatted.match(/^( +)/);
        const leadingDots = leadingSpaces ? '\u00b7'.repeat(leadingSpaces[0].length) : '';
        const mainContent = leadingSpaces ? formatted.slice(leadingSpaces[0].length) : formatted;

        return (
            <>
                {leadingDots && <Text style={{ color: colors.leadingSpaceDot }}>{leadingDots}</Text>}
                <Text style={{ color: baseColor }}>{mainContent}</Text>
            </>
        );
    };

    // Render diff content as separate lines to prevent wrapping
    const renderDiffContent = () => {
        const lines: React.ReactNode[] = [];
        let linesRendered = 0;
        const maxLines = needsTruncation && !expanded ? INITIAL_LINES : Infinity;

        outer: for (let hunkIndex = 0; hunkIndex < hunks.length; hunkIndex++) {
            const hunk = hunks[hunkIndex];

            // Add hunk header for non-first hunks (only if we haven't hit the limit)
            if (hunkIndex > 0 && linesRendered < maxLines) {
                lines.push(
                    <Text
                        key={`hunk-header-${hunkIndex}`}
                        numberOfLines={wrapLines ? undefined : 1}
                        style={{
                            ...Typography.mono(),
                            fontSize: 12,
                            color: colors.hunkHeaderText,
                            backgroundColor: colors.hunkHeaderBg,
                            paddingVertical: 8,
                            paddingHorizontal: 16,
                            transform: [{ scaleX: fontScaleX }],
                        }}
                    >
                        {`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`}
                    </Text>
                );
            }

            for (let lineIndex = 0; lineIndex < hunk.lines.length; lineIndex++) {
                if (linesRendered >= maxLines) {
                    break outer;
                }

                const line = hunk.lines[lineIndex];
                const isAdded = line.type === 'add';
                const isRemoved = line.type === 'remove';
                const textColor = isAdded ? colors.addedText : isRemoved ? colors.removedText : colors.contextText;
                const bgColor = isAdded ? colors.addedBg : isRemoved ? colors.removedBg : colors.contextBg;

                // Render complete line in a single Text element
                lines.push(
                    <Text
                        key={`line-${hunkIndex}-${lineIndex}`}
                        numberOfLines={wrapLines ? undefined : 1}
                        style={{
                            ...Typography.mono(),
                            fontSize: 13,
                            lineHeight: 20,
                            backgroundColor: bgColor,
                            transform: [{ scaleX: fontScaleX }],
                            paddingLeft: 8,
                            paddingRight: 8,
                        }}
                    >
                        {showLineNumbers && (
                            <Text style={{
                                color: colors.lineNumberText,
                                backgroundColor: colors.lineNumberBg,
                            }}>
                                {String(line.type === 'remove' ? line.oldLineNumber :
                                       line.type === 'add' ? line.newLineNumber :
                                       line.oldLineNumber).padStart(3, ' ')}
                            </Text>
                        )}
                        {showPlusMinusSymbols && (
                            <Text style={{ color: textColor }}>
                                {` ${isAdded ? '+' : isRemoved ? '-' : ' '} `}
                            </Text>
                        )}
                        {renderLineContent(line.content, textColor, line.tokens)}
                    </Text>
                );
                linesRendered++;
            }
        }

        return lines;
    };

    return (
        <View style={[containerStyle, { overflow: 'hidden' }]}>
            {renderDiffContent()}
            {needsTruncation && (
                <Pressable onPress={handleToggle} style={showMoreStyles.container}>
                    <Text style={[showMoreStyles.text, { color: theme.colors.textLink }]}>
                        {expanded
                            ? t('message.showLess')
                            : t('message.showMore', { lines: hiddenLines })}
                    </Text>
                </Pressable>
            )}
        </View>
    );

    // return (
    //     <View style={containerStyle}>
    //         {/* Header */}
    //         <View style={headerStyle}>
    //             <Text style={titleStyle}>
    //                 {`${oldTitle} → ${newTitle}`}
    //             </Text>

    //             {showDiffStats && (
    //                 <View style={{ flexDirection: 'row', gap: 8 }}>
    //                     <Text style={[statsStyle, { color: colors.success }]}>
    //                         +{stats.additions}
    //                     </Text>
    //                     <Text style={[statsStyle, { color: colors.error }]}>
    //                         -{stats.deletions}
    //                     </Text>
    //                 </View>
    //             )}
    //         </View>

    //         {/* Diff content */}
    //         <ScrollView
    //             style={{ flex: 1 }}
    //             nestedScrollEnabled
    //             showsVerticalScrollIndicator={true}
    //         >
    //             <ScrollView
    //                 ref={scrollRef}
    //                 horizontal={!wrapLines}
    //                 showsHorizontalScrollIndicator={!wrapLines}
    //                 contentContainerStyle={{ flexGrow: 1 }}
    //             >
    //                 {content}
    //             </ScrollView>
    //         </ScrollView>
    //     </View>
    // );
};

// Styles for the show more/less button
const showMoreStyles = {
    container: {
        paddingVertical: 8,
        paddingHorizontal: 8,
        alignItems: 'flex-start' as const,
    },
    text: {
        fontSize: 14,
        fontWeight: '500' as const,
    },
};

