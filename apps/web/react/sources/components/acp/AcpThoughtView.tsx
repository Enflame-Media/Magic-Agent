/**
 * HAP-1036: ACP Thought Display Component
 *
 * Renders agent thinking text in a collapsible section.
 * Collapsed by default, shows a preview of the thought content.
 */

import * as React from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';
import { t } from '@/text';

interface AcpThoughtViewProps {
    thought: string;
}

export const AcpThoughtView = React.memo<AcpThoughtViewProps>(({ thought }) => {
    const [expanded, setExpanded] = React.useState(false);

    const handleToggle = React.useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpanded((prev) => !prev);
    }, []);

    if (!thought) return null;

    return (
        <View style={styles.container}>
            <Pressable
                onPress={handleToggle}
                style={styles.header}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={t('acp.thought.title')}
            >
                <Ionicons name="bulb-outline" size={14} style={styles.headerIcon} />
                <Text style={styles.headerText}>{t('acp.thought.title')}</Text>
                <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    style={styles.chevron}
                />
            </Pressable>
            {expanded && (
                <Text style={styles.thoughtText}>{thought}</Text>
            )}
            {!expanded && (
                <Text style={styles.preview} numberOfLines={1}>
                    {thought}
                </Text>
            )}
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 12,
        padding: 12,
        marginVertical: 4,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        color: theme.colors.textSecondary,
        marginRight: 6,
    },
    headerText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
        color: theme.colors.textSecondary,
    },
    chevron: {
        color: theme.colors.textSecondary,
    },
    thoughtText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginTop: 8,
    },
    preview: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        lineHeight: 18,
        marginTop: 4,
        opacity: 0.7,
    },
}));
