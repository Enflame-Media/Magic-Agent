/**
 * ToastProvider - Context provider and UI renderer for toast notifications
 *
 * Features:
 * - Single toast at a time (new toast replaces previous)
 * - Auto-dismiss after duration
 * - Optional action button (e.g., Undo)
 * - Haptic feedback on show
 * - Platform-appropriate styling
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Pressable, Animated, Platform, AccessibilityInfo } from 'react-native';
import { Text } from '@/components/StyledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';
import { Typography } from '@/constants/Typography';
import { hapticsLight } from '@/components/haptics';
import { Toast } from './ToastManager';
import { ToastConfig, ToastState, ToastContextValue } from './types';

const DEFAULT_DURATION = 5000; // 5 seconds for undo actions

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        // Return a no-op implementation when used outside provider
        // This prevents crashes when Toast.show() is called before provider mounts
        return {
            state: { current: null },
            showToast: () => '',
            hideToast: () => {},
        };
    }
    return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ToastState>({ current: null });
    const insets = useSafeAreaInsets();
    const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const generateId = useCallback(() => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }, []);

    const hideToast = useCallback((id: string) => {
        setState((prev) => {
            if (prev.current?.id === id) {
                // Animate out
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: Platform.OS !== 'web',
                }).start(() => {
                    setState({ current: null });
                });
                return prev; // Let animation complete before clearing
            }
            return prev;
        });

        // Clear timer
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
            dismissTimerRef.current = null;
        }
    }, [fadeAnim]);

    const showToast = useCallback((config: Omit<ToastConfig, 'id'>): string => {
        const id = generateId();

        // Clear any existing timer
        if (dismissTimerRef.current) {
            clearTimeout(dismissTimerRef.current);
        }

        // Create the toast config
        const toastConfig: ToastConfig = {
            ...config,
            id,
            duration: config.duration ?? DEFAULT_DURATION,
        };

        // Set state immediately (replaces any existing toast)
        setState({ current: toastConfig });

        // Animate in
        fadeAnim.setValue(0);
        Animated.spring(fadeAnim, {
            toValue: 1,
            useNativeDriver: Platform.OS !== 'web',
            damping: 15,
            stiffness: 150,
        }).start();

        // Haptic feedback
        if (Platform.OS !== 'web') {
            hapticsLight();
        }

        // Accessibility announcement
        AccessibilityInfo.announceForAccessibility(config.message);

        // Set auto-dismiss timer
        const duration = toastConfig.duration ?? DEFAULT_DURATION;
        dismissTimerRef.current = setTimeout(() => {
            hideToast(id);
        }, duration);

        return id;
    }, [generateId, fadeAnim, hideToast]);

    // Register functions with ToastManager
    useEffect(() => {
        Toast.setFunctions(showToast, hideToast);
    }, [showToast, hideToast]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (dismissTimerRef.current) {
                clearTimeout(dismissTimerRef.current);
            }
        };
    }, []);

    // Use a ref to track current toast to avoid stale closures in handleActionPress
    const currentToastRef = useRef(state.current);
    currentToastRef.current = state.current;

    const handleActionPress = useCallback(() => {
        const current = currentToastRef.current;
        if (current?.action) {
            // Haptic feedback
            if (Platform.OS !== 'web') {
                hapticsLight();
            }
            // Execute action
            current.action.onPress();
            // Dismiss toast
            hideToast(current.id);
        }
    }, [hideToast]);

    const contextValue: ToastContextValue = {
        state,
        showToast,
        hideToast,
    };

    const styles = stylesheet;

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            {state.current && (
                <Animated.View
                    style={[
                        styles.container,
                        {
                            bottom: insets.bottom + 16,
                            opacity: fadeAnim,
                            transform: [{
                                translateY: fadeAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [20, 0],
                                }),
                            }],
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    <View style={styles.toast}>
                        <Text style={styles.message} numberOfLines={2}>
                            {state.current.message}
                        </Text>
                        {state.current.action && (
                            <Pressable
                                onPress={handleActionPress}
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    pressed && styles.actionButtonPressed,
                                ]}
                                accessibilityRole="button"
                                accessibilityLabel={state.current.action.label}
                            >
                                <Text style={styles.actionText}>
                                    {state.current.action.label}
                                </Text>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        alignItems: 'center',
        zIndex: 9999,
        pointerEvents: 'box-none',
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.dark ? '#1C1C1E' : '#323232',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 48,
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    message: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 15,
        ...Typography.default(),
    },
    actionButton: {
        marginLeft: 16,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    actionButtonPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    actionText: {
        color: '#0A84FF',
        fontSize: 15,
        ...Typography.default('semiBold'),
    },
}));
