/**
 * HAP-1042: ACP Image Block Component
 *
 * Renders image content blocks from ACP with support for:
 * - Base64 data URIs and remote URLs
 * - Loading and error states
 * - Pinch-to-zoom on mobile via gesture handler
 * - Aspect ratio preservation
 */

import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Image } from 'expo-image';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import type { AcpImageContent } from '@magic-agent/protocol';
import { t } from '@/text';

interface AcpImageBlockProps {
    content: AcpImageContent;
}

export const AcpImageBlock = React.memo<AcpImageBlockProps>(({ content }) => {
    const { theme } = useUnistyles();
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(false);

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    // Build the image source: prefer uri, fall back to base64 data URI
    const imageUri = React.useMemo(() => {
        if (content.uri) return content.uri;
        return `data:${content.mimeType};base64,${content.data}`;
    }, [content.uri, content.mimeType, content.data]);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (savedScale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onStart(() => {
            if (savedScale.value > 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(2);
                savedScale.value = 2;
            }
        });

    const composedGesture = Gesture.Simultaneous(
        pinchGesture,
        panGesture,
        doubleTapGesture
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handleLoad = React.useCallback(() => {
        setLoading(false);
    }, []);

    const handleError = React.useCallback(() => {
        setLoading(false);
        setError(true);
    }, []);

    if (error) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                    {t('acp.content.imageLoadError')}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                </View>
            )}
            <GestureDetector gesture={composedGesture}>
                <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    <Image
                        source={{ uri: imageUri }}
                        style={{ width: '100%', aspectRatio: 16 / 9 }}
                        contentFit="contain"
                        onLoad={handleLoad}
                        onError={handleError}
                        transition={200}
                    />
                </Animated.View>
            </GestureDetector>
        </View>
    );
});

const styles = StyleSheet.create((theme) => ({
    container: {
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: theme.colors.backgroundSecondary,
        marginVertical: 4,
    },
    imageWrapper: {
        width: '100%',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    errorContainer: {
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: 10,
        padding: 16,
        marginVertical: 4,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
    },
}));
