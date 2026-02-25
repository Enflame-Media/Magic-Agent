/**
 * HAP-1042: ACP Terminal Output Component
 *
 * Renders terminal content blocks with:
 * - Monospace font styling
 * - Basic ANSI escape code color support
 * - Copy-to-clipboard via toolbar button
 * - Scrollable container for long output
 *
 * Note: The ACP terminal content type only provides a terminalId.
 * This component renders a placeholder referencing the terminal,
 * and renders inline text content when embedded via tool call content.
 */

import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { Modal } from '@/modal';
import { t } from '@/text';

interface AcpTerminalOutputProps {
    /** Terminal ID from ACP terminal content block */
    terminalId: string;
    /** Optional terminal output text to display (if available from context) */
    text?: string;
}

/** ANSI color code to React Native color mapping */
const ANSI_COLORS: Record<number, string> = {
    30: '#1a1a1a', // black
    31: '#FF3B30', // red
    32: '#34C759', // green
    33: '#FFCC00', // yellow
    34: '#007AFF', // blue
    35: '#AF52DE', // magenta
    36: '#5AC8FA', // cyan
    37: '#F2F2F7', // white
    90: '#8E8E93', // bright black (gray)
    91: '#FF6961', // bright red
    92: '#77DD77', // bright green
    93: '#FDFD96', // bright yellow
    94: '#89CFF0', // bright blue
    95: '#C3B1E1', // bright magenta
    96: '#A7D8DE', // bright cyan
    97: '#FFFFFF', // bright white
};

interface TextSpan {
    text: string;
    color?: string;
    bold?: boolean;
}

/**
 * Parse text containing basic ANSI escape codes into styled spans.
 * Supports SGR codes for foreground colors (30-37, 90-97), bold (1), and reset (0).
 */
function parseAnsi(input: string): TextSpan[] {
    const spans: TextSpan[] = [];
    // Match ANSI escape sequences: ESC[ ... m
    const parts = input.split(/\x1b\[([0-9;]*)m/);

    let currentColor: string | undefined;
    let currentBold = false;

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            // Text content
            if (parts[i].length > 0) {
                spans.push({ text: parts[i], color: currentColor, bold: currentBold });
            }
        } else {
            // ANSI code
            const codes = parts[i].split(';').map(Number);
            for (const code of codes) {
                if (code === 0) {
                    currentColor = undefined;
                    currentBold = false;
                } else if (code === 1) {
                    currentBold = true;
                } else if (ANSI_COLORS[code]) {
                    currentColor = ANSI_COLORS[code];
                }
            }
        }
    }

    return spans;
}

const MAX_DISPLAY_HEIGHT = 300;

export const AcpTerminalOutput = React.memo<AcpTerminalOutputProps>(({ terminalId, text }) => {
    const handleCopy = React.useCallback(async () => {
        const copyText = text ?? terminalId;
        await Clipboard.setStringAsync(copyText);
        Modal.alert(t('common.success'), t('acp.content.terminalCopied'));
    }, [text, terminalId]);

    const spans = React.useMemo(() => (text ? parseAnsi(text) : []), [text]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="terminal-outline" size={14} style={styles.headerIcon} />
                <Text style={styles.headerText}>
                    {t('acp.content.terminal')}
                </Text>
                <Pressable
                    onPress={handleCopy}
                    style={styles.copyButton}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.copy')}
                >
                    <Ionicons name="copy-outline" size={14} style={styles.copyIcon} />
                </Pressable>
            </View>
            <ScrollView
                style={[styles.outputScroll, { maxHeight: MAX_DISPLAY_HEIGHT }]}
                horizontal={false}
                showsVerticalScrollIndicator
            >
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.outputContent}
                >
                    {text ? (
                        <Text style={styles.outputText}>
                            {spans.map((span, i) => (
                                <Text
                                    key={i}
                                    style={[
                                        span.color ? { color: span.color } : undefined,
                                        span.bold ? { fontWeight: '700' } : undefined,
                                    ]}
                                >
                                    {span.text}
                                </Text>
                            ))}
                        </Text>
                    ) : (
                        <Text style={styles.terminalIdText}>
                            {t('acp.content.terminalRef', { id: terminalId })}
                        </Text>
                    )}
                </ScrollView>
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: '#1C1C1E',
        borderRadius: 10,
        overflow: 'hidden',
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerIcon: {
        color: '#8E8E93',
        marginRight: 6,
    },
    headerText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#8E8E93',
    },
    copyButton: {
        padding: 4,
    },
    copyIcon: {
        color: '#8E8E93',
    },
    outputScroll: {
        padding: 10,
    },
    outputContent: {
        flexGrow: 1,
    },
    outputText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#F2F2F7',
        lineHeight: 18,
    },
    terminalIdText: {
        fontSize: 12,
        fontFamily: 'monospace',
        color: '#8E8E93',
        fontStyle: 'italic',
    },
}));
