/**
 * HAP-1042: ACP Content Block Renderer (Dispatcher)
 *
 * Selects and renders the appropriate component for each ACP content
 * block type. Handles both direct content blocks (text, image,
 * resource_link, resource) and tool call content blocks (content, diff,
 * terminal).
 *
 * Unknown content types are rendered with a graceful fallback showing
 * raw text representation.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import type {
    AcpContentBlock,
    AcpToolCallContent,
} from '@magic-agent/protocol';
import { AcpStreamingText } from './AcpStreamingText';
import { AcpImageBlock } from './AcpImageBlock';
import { AcpResourceLinkBlock, AcpEmbeddedResourceBlock } from './AcpResourceBlock';
import { AcpDiffView } from './AcpDiffView';
import { AcpTerminalOutput } from './AcpTerminalOutput';
import { t } from '@/text';

// ─── Content Block Renderer ─────────────────────────────────────────────────

interface AcpContentBlockRendererProps {
    content: AcpContentBlock;
}

/**
 * Dispatches rendering of an ACP content block to the appropriate
 * specialized component based on the `type` discriminator.
 */
export const AcpContentBlockRenderer = React.memo<AcpContentBlockRendererProps>(({ content }) => {
    switch (content.type) {
        case 'text':
            return <AcpStreamingText text={content.text} />;

        case 'image':
            return <AcpImageBlock content={content} />;

        case 'resource_link':
            return <AcpResourceLinkBlock content={content} />;

        case 'resource':
            return <AcpEmbeddedResourceBlock content={content} />;

        case 'audio':
            // Audio is out of scope (HAP-1042)
            return (
                <View style={styles.fallbackContainer}>
                    <Text style={styles.fallbackText}>
                        {t('acp.content.audioUnsupported')}
                    </Text>
                </View>
            );

        default:
            return (
                <View style={styles.fallbackContainer}>
                    <Text style={styles.fallbackText}>
                        {t('acp.content.unknownType', { type: (content as any).type ?? 'unknown' })}
                    </Text>
                </View>
            );
    }
});

// ─── Tool Call Content Renderer ─────────────────────────────────────────────

interface AcpToolCallContentRendererProps {
    content: AcpToolCallContent;
}

/**
 * Dispatches rendering of an ACP tool call content block to the appropriate
 * specialized component based on the `type` discriminator.
 */
export const AcpToolCallContentRenderer = React.memo<AcpToolCallContentRendererProps>(({ content }) => {
    switch (content.type) {
        case 'content':
            return <AcpContentBlockRenderer content={content.content} />;

        case 'diff':
            return <AcpDiffView content={content} />;

        case 'terminal':
            return <AcpTerminalOutput terminalId={content.terminalId} />;

        default:
            return (
                <View style={styles.fallbackContainer}>
                    <Text style={styles.fallbackText}>
                        {t('acp.content.unknownType', { type: (content as any).type ?? 'unknown' })}
                    </Text>
                </View>
            );
    }
});

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
    fallbackContainer: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        padding: 12,
        marginVertical: 2,
    },
    fallbackText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
    },
}));
