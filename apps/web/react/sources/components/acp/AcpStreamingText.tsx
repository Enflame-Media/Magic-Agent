/**
 * HAP-1036: ACP Streaming Text Component
 *
 * Renders streaming agent message text using the existing MarkdownView
 * component. Wraps the streaming text with proper layout handling.
 */

import * as React from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { MarkdownView } from '@/components/markdown/MarkdownView';

interface AcpStreamingTextProps {
    text: string;
}

export const AcpStreamingText = React.memo<AcpStreamingTextProps>(({ text }) => {
    if (!text) return null;

    return (
        <View style={styles.container}>
            <MarkdownView markdown={text} />
        </View>
    );
});

const styles = StyleSheet.create(() => ({
    container: {
        marginVertical: 4,
    },
}));
