import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { t } from '@/text';

const TAB_BAR_HEIGHT = 49; // paddingTop(8) + icon(24) + marginTop(3) + label(~10) + paddingBottom(4)
const FAB_SIZE = 56;
const FAB_MARGIN = 16;

const stylesheet = StyleSheet.create((theme) => ({
    fab: {
        position: 'absolute',
        right: FAB_MARGIN,
        width: FAB_SIZE,
        height: FAB_SIZE,
        borderRadius: FAB_SIZE / 2,
        backgroundColor: theme.colors.fab.background,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            ios: {
                shadowColor: theme.colors.shadow.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
            default: {
                shadowColor: theme.colors.shadow.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
            },
        }),
    },
    fabPressed: {
        backgroundColor: theme.colors.fab.backgroundPressed,
    },
}));

interface FABProps {
    onPress?: () => void;
}

export const FAB = React.memo(({ onPress }: FABProps) => {
    const router = useRouter();
    const { theme } = useUnistyles();
    const styles = stylesheet;
    const safeArea = useSafeAreaInsets();

    const handlePress = React.useCallback(() => {
        if (onPress) {
            onPress();
        } else {
            router.push('/new');
        }
    }, [onPress, router]);

    // Position FAB above the tab bar with proper spacing
    const bottomPosition = TAB_BAR_HEIGHT + safeArea.bottom + FAB_MARGIN;

    return (
        <Pressable
            style={({ pressed }) => [
                styles.fab,
                { bottom: bottomPosition },
                pressed && styles.fabPressed,
            ]}
            onPress={handlePress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('newSession.fabAccessibilityLabel')}
        >
            <Ionicons name="add" size={28} color={theme.colors.fab.icon} />
        </Pressable>
    );
});
