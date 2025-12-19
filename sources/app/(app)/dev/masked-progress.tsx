import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { ItemGroup } from '@/components/ItemGroup';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
    interpolate,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

/**
 * MaskedProgressBar - A linear progress bar with gradient fill using MaskedView
 */
interface MaskedProgressBarProps {
    progress: number; // 0 to 1
    height?: number;
    gradientColors?: readonly [string, string, ...string[]];
    backgroundColor?: string;
    animated?: boolean;
}

const MaskedProgressBar: React.FC<MaskedProgressBarProps> = ({
    progress,
    height = 12,
    gradientColors = ['#8B5CF6', '#EC4899', '#F59E0B'],
    backgroundColor = '#E5E5EA',
    animated = true,
}) => {
    const animatedProgress = useSharedValue(0);

    useEffect(() => {
        if (animated) {
            animatedProgress.value = withTiming(progress, {
                duration: 500,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            });
        } else {
            animatedProgress.value = progress;
        }
    }, [progress, animated, animatedProgress]);

    const maskStyle = useAnimatedStyle(() => ({
        width: `${animatedProgress.value * 100}%`,
        height: '100%',
        backgroundColor: 'black',
        borderRadius: height / 2,
    }));

    return (
        <View style={[styles.progressBarContainer, { height, backgroundColor, borderRadius: height / 2 }]}>
            <MaskedView
                style={StyleSheet.absoluteFillObject}
                maskElement={
                    <Animated.View style={maskStyle} />
                }
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </MaskedView>
        </View>
    );
};

/**
 * AnimatedGradientProgress - Progress bar with animated gradient shimmer
 */
interface AnimatedGradientProgressProps {
    progress: number;
    height?: number;
}

const AnimatedGradientProgress: React.FC<AnimatedGradientProgressProps> = ({
    progress,
    height = 16,
}) => {
    const shimmerTranslate = useSharedValue(0);

    useEffect(() => {
        shimmerTranslate.value = withRepeat(
            withTiming(1, { duration: 1500, easing: Easing.linear }),
            -1,
            false
        );
    }, [shimmerTranslate]);

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(shimmerTranslate.value, [0, 1], [-100, 300]);
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View style={[styles.progressBarContainer, { height, backgroundColor: '#E5E5EA', borderRadius: height / 2 }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, borderRadius: height / 2 }]}>
                <MaskedView
                    style={StyleSheet.absoluteFillObject}
                    maskElement={
                        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'black', borderRadius: height / 2 }]} />
                    }
                >
                    {/* Base gradient */}
                    <LinearGradient
                        colors={['#3B82F6', '#8B5CF6', '#EC4899']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {/* Shimmer overlay */}
                    <AnimatedLinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[StyleSheet.absoluteFillObject, { width: 100 }, shimmerStyle]}
                    />
                </MaskedView>
            </View>
        </View>
    );
};

/**
 * GradientPercentage - Large percentage text with gradient fill
 */
interface GradientPercentageProps {
    value: number;
    gradientColors?: readonly [string, string, ...string[]];
}

const GradientPercentage: React.FC<GradientPercentageProps> = ({
    value,
    gradientColors = ['#10B981', '#3B82F6', '#8B5CF6'],
}) => {
    return (
        <MaskedView
            maskElement={
                <Text style={styles.percentageText}>{Math.round(value * 100)}%</Text>
            }
        >
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 200, height: 80 }}
            />
        </MaskedView>
    );
};

/**
 * CircularGradientProgress - Circular progress indicator with gradient stroke
 */
interface CircularGradientProgressProps {
    progress: number;
    size?: number;
    strokeWidth?: number;
    gradientColors?: readonly [string, string, ...string[]];
}

const CircularGradientProgress: React.FC<CircularGradientProgressProps> = ({
    progress,
    size = 100,
    strokeWidth = 10,
    gradientColors = ['#F59E0B', '#EC4899', '#8B5CF6'],
}) => {
    const radius = (size - strokeWidth) / 2;
    // Note: circumference and strokeDashoffset would be used for SVG-based circular progress,
    // but this implementation uses a border-based approach instead
    void radius; // Suppress unused warning - kept for documentation

    return (
        <View style={{ width: size, height: size }}>
            <MaskedView
                style={StyleSheet.absoluteFillObject}
                maskElement={
                    <View style={StyleSheet.absoluteFillObject}>
                        {/* Background circle */}
                        <View
                            style={[
                                styles.circleBase,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: strokeWidth,
                                    borderColor: 'rgba(0,0,0,0.15)',
                                },
                            ]}
                        />
                        {/* Progress arc - using a simple rotation approach */}
                        <View
                            style={[
                                styles.circleProgress,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size / 2,
                                    borderWidth: strokeWidth,
                                    borderColor: 'black',
                                    borderRightColor: 'transparent',
                                    borderBottomColor: progress > 0.25 ? 'black' : 'transparent',
                                    borderLeftColor: progress > 0.5 ? 'black' : 'transparent',
                                    borderTopColor: progress > 0.75 ? 'black' : 'transparent',
                                    transform: [{ rotate: '-90deg' }],
                                },
                            ]}
                        />
                    </View>
                }
            >
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                />
            </MaskedView>
            {/* Center percentage */}
            <View style={styles.circleCenter}>
                <Text style={styles.circlePercentage}>{Math.round(progress * 100)}%</Text>
            </View>
        </View>
    );
};

/**
 * PulsingGradientIndicator - Pulsing loading indicator with gradient
 */
const PulsingGradientIndicator: React.FC = () => {
    const pulseValue = useSharedValue(0);

    useEffect(() => {
        pulseValue.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            false
        );
    }, [pulseValue]);

    const pulseStyle = useAnimatedStyle(() => ({
        opacity: interpolate(pulseValue.value, [0, 1], [0.5, 1]),
        transform: [{ scale: interpolate(pulseValue.value, [0, 1], [0.95, 1.05]) }],
    }));

    return (
        <Animated.View style={pulseStyle}>
            <MaskedView
                maskElement={
                    <View style={styles.pulseCircle} />
                }
            >
                <LinearGradient
                    colors={['#10B981', '#3B82F6', '#8B5CF6', '#EC4899']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ width: 80, height: 80 }}
                />
            </MaskedView>
        </Animated.View>
    );
};

function MaskedProgressScreen() {
    const [progress, setProgress] = useState(0.65);

    // Auto-increment progress for demo
    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                const next = prev + 0.01;
                return next > 1 ? 0 : next;
            });
        }, 100);
        return () => clearInterval(interval);
    }, []);

    const handleSetProgress = (value: number) => {
        setProgress(value);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    headerTitle: 'Masked Progress',
                }}
            />

            <ScrollView style={styles.container}>
                <View style={styles.content}>
                    <Text style={styles.pageTitle}>Masked Progress Demos</Text>
                    <Text style={styles.description}>
                        Progress indicators using MaskedView with gradient fills
                    </Text>

                    <ItemGroup title="Gradient Percentage">
                        <View style={styles.example}>
                            <GradientPercentage value={progress} />
                            <Text style={styles.label}>Auto-animating: {Math.round(progress * 100)}%</Text>
                        </View>
                    </ItemGroup>

                    <ItemGroup title="Linear Progress Bars">
                        <View style={styles.example}>
                            <View style={styles.progressWrapper}>
                                <Text style={styles.label}>Rainbow Gradient</Text>
                                <MaskedProgressBar
                                    progress={progress}
                                    gradientColors={['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']}
                                />
                            </View>

                            <View style={styles.progressWrapper}>
                                <Text style={styles.label}>Purple to Pink</Text>
                                <MaskedProgressBar
                                    progress={progress}
                                    height={16}
                                    gradientColors={['#8B5CF6', '#EC4899']}
                                />
                            </View>

                            <View style={styles.progressWrapper}>
                                <Text style={styles.label}>Teal to Blue</Text>
                                <MaskedProgressBar
                                    progress={progress}
                                    height={8}
                                    gradientColors={['#14B8A6', '#3B82F6']}
                                />
                            </View>
                        </View>
                    </ItemGroup>

                    <ItemGroup title="Animated Shimmer Progress">
                        <View style={styles.example}>
                            <View style={styles.progressWrapper}>
                                <Text style={styles.label}>With Shimmer Effect</Text>
                                <AnimatedGradientProgress progress={0.7} />
                            </View>
                        </View>
                    </ItemGroup>

                    <ItemGroup title="Circular Progress">
                        <View style={[styles.example, styles.circlesRow]}>
                            <View style={styles.circleItem}>
                                <CircularGradientProgress
                                    progress={progress}
                                    size={80}
                                    strokeWidth={8}
                                    gradientColors={['#10B981', '#3B82F6']}
                                />
                                <Text style={styles.circleLabel}>Small</Text>
                            </View>
                            <View style={styles.circleItem}>
                                <CircularGradientProgress
                                    progress={progress}
                                    size={100}
                                    strokeWidth={10}
                                />
                                <Text style={styles.circleLabel}>Default</Text>
                            </View>
                            <View style={styles.circleItem}>
                                <CircularGradientProgress
                                    progress={progress}
                                    size={120}
                                    strokeWidth={12}
                                    gradientColors={['#EC4899', '#EF4444']}
                                />
                                <Text style={styles.circleLabel}>Large</Text>
                            </View>
                        </View>
                    </ItemGroup>

                    <ItemGroup title="Pulsing Indicator">
                        <View style={styles.example}>
                            <PulsingGradientIndicator />
                            <Text style={styles.label}>Loading...</Text>
                        </View>
                    </ItemGroup>

                    <ItemGroup title="Manual Control">
                        <View style={styles.example}>
                            <View style={styles.buttonRow}>
                                {[0, 0.25, 0.5, 0.75, 1].map(value => (
                                    <Pressable
                                        key={value}
                                        style={[
                                            styles.button,
                                            progress === value && styles.buttonActive,
                                        ]}
                                        onPress={() => handleSetProgress(value)}
                                    >
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                progress === value && styles.buttonTextActive,
                                            ]}
                                        >
                                            {value * 100}%
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </ItemGroup>
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    content: {
        flex: 1,
        paddingBottom: 40,
    },
    pageTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        marginTop: 20,
        marginBottom: 8,
        paddingHorizontal: 16,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        paddingHorizontal: 16,
    },
    example: {
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginTop: 12,
    },
    progressWrapper: {
        width: '100%',
        marginBottom: 20,
    },
    progressBarContainer: {
        width: '100%',
        overflow: 'hidden',
        marginTop: 8,
    },
    progressFill: {
        height: '100%',
        overflow: 'hidden',
    },
    percentageText: {
        fontSize: 64,
        fontWeight: 'bold',
        color: 'black',
    },
    circlesRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: 16,
    },
    circleItem: {
        alignItems: 'center',
    },
    circleLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
    },
    circleBase: {
        position: 'absolute',
    },
    circleProgress: {
        position: 'absolute',
    },
    circleCenter: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    circlePercentage: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    pulseCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'black',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#E5E5EA',
    },
    buttonActive: {
        backgroundColor: '#007AFF',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    buttonTextActive: {
        color: '#FFF',
    },
});

export default React.memo(MaskedProgressScreen);
