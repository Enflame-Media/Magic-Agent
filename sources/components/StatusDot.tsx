import * as React from 'react';
import { ViewStyle, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

export interface StatusDotProps {
    color: string;
    isPulsing?: boolean;
    /** Size of the dot in pixels. Default is 10 for enhanced visibility. */
    size?: number;
    style?: ViewStyle;
    /** Show glow effect around the dot for active states. Auto-enabled when isPulsing is true. */
    showGlow?: boolean;
}

/**
 * Enhanced status indicator dot with improved visibility.
 * Features:
 * - Larger default size (10px) for better recognition at a glance
 * - Animated pulse effect for active states
 * - Subtle glow/shadow effect for thinking/permission states
 */
export const StatusDot = React.memo(({ color, isPulsing, size = 10, style, showGlow }: StatusDotProps) => {
    const opacity = useSharedValue(1);
    const scale = useSharedValue(1);

    // Determine if glow should be shown (explicit prop or auto-enabled with pulsing)
    const shouldShowGlow = showGlow ?? isPulsing;

    React.useEffect(() => {
        if (isPulsing) {
            // Smooth pulse animation with opacity and subtle scale
            opacity.value = withRepeat(
                withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                -1, // infinite
                true // reverse
            );
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.15, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
                    withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
                ),
                -1, // infinite
                false
            );
        } else {
            opacity.value = withTiming(1, { duration: 200 });
            scale.value = withTiming(1, { duration: 200 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- opacity and scale are Reanimated shared values, stable across renders
    }, [isPulsing]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ scale: scale.value }],
        };
    });

    const baseStyle: ViewStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
    };

    // Glow effect using shadow (works on iOS and Android, fallback for web)
    const glowStyle: ViewStyle | undefined = shouldShowGlow ? {
        ...Platform.select({
            ios: {
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: size * 0.6,
            },
            android: {
                // Android doesn't support colored shadows well, use elevation
                elevation: 4,
            },
            web: {
                // Web uses CSS box-shadow via style
                boxShadow: `0 0 ${size * 0.8}px ${color}`,
            } as ViewStyle,
        }),
    } : undefined;

    return (
        <Animated.View
            style={[
                baseStyle,
                glowStyle,
                animatedStyle,
                style
            ]}
        />
    );
});