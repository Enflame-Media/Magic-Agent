/**
 * Mock for react-native module in Vitest tests.
 *
 * React Native's index.js uses Flow syntax (`import typeof * as`)
 * that Rollup/Vite cannot parse. This mock provides the commonly
 * used exports with minimal implementations.
 *
 * This file is loaded via Vite's `resolve.alias` in vitest.config.ts.
 */

export const Platform = {
    OS: 'web' as const,
    select: <T>(obj: { ios?: T; android?: T; web?: T; default?: T }): T | undefined =>
        obj.web ?? obj.default,
    Version: 1,
    isTV: false,
    isTesting: true,
};

export const AppState = {
    currentState: 'active' as const,
    addEventListener: (_type: string, _handler: () => void) => ({
        remove: () => {},
    }),
    removeEventListener: (_type: string, _handler: () => void) => {},
};

export const Dimensions = {
    get: (_dim: string) => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    addEventListener: (_type: string, _handler: () => void) => ({
        remove: () => {},
    }),
    removeEventListener: (_type: string, _handler: () => void) => {},
};

export const StyleSheet = {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
    flatten: <T>(style: T): T => style,
    absoluteFillObject: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    hairlineWidth: 1,
};

export const NativeModules = {};

export const Appearance = {
    getColorScheme: () => 'light' as const,
    addChangeListener: () => ({ remove: () => {} }),
};

export const Keyboard = {
    dismiss: () => {},
    addListener: () => ({ remove: () => {} }),
};

export const Linking = {
    openURL: async (_url: string) => {},
    canOpenURL: async (_url: string) => true,
    getInitialURL: async () => null,
};

export const PixelRatio = {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (layoutSize: number) => layoutSize * 2,
    roundToNearestPixel: (layoutSize: number) => Math.round(layoutSize * 2) / 2,
};

export const Alert = {
    alert: (_title: string, _message?: string, _buttons?: unknown[]) => {},
};

// Common components as simple no-ops
export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const ScrollView = 'ScrollView';
export const TouchableOpacity = 'TouchableOpacity';
export const ActivityIndicator = 'ActivityIndicator';
