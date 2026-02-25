/**
 * HAP-1036: ACP Mode Indicator Component
 *
 * Displays the current ACP session mode as a compact badge.
 * Shows mode ID (e.g., "code", "ask", "architect") with a visual indicator.
 */

import * as React from 'react';
import { Text, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import Ionicons from '@expo/vector-icons/Ionicons';

interface AcpModeIndicatorProps {
    modeId: string;
}

function getModeIcon(modeId: string): keyof typeof Ionicons.glyphMap {
    switch (modeId) {
        case 'code':
            return 'code-slash-outline';
        case 'ask':
            return 'chatbubble-ellipses-outline';
        case 'architect':
            return 'construct-outline';
        case 'plan':
            return 'list-outline';
        default:
            return 'radio-button-on-outline';
    }
}

export const AcpModeIndicator = React.memo<AcpModeIndicatorProps>(({ modeId }) => {
    return (
        <View style={styles.container}>
            <Ionicons name={getModeIcon(modeId)} size={12} style={styles.icon} />
            <Text style={styles.label}>{modeId}</Text>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    icon: {
        color: theme.colors.primary,
        marginRight: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.primary,
        textTransform: 'capitalize',
    },
}));
