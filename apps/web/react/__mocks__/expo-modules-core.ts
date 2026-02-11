/**
 * Mock for expo-modules-core module in Vitest tests.
 */

export const requireNativeModule = (_moduleName: string) => ({});
export const requireOptionalNativeModule = (_moduleName: string) => null;
export const EventEmitter = class {
    addListener = () => ({ remove: () => {} });
    removeListener = () => {};
    emit = () => {};
};
export const NativeModulesProxy = {};
export const Platform = {
    OS: 'web',
    select: <T>(obj: { ios?: T; android?: T; web?: T; default?: T }): T | undefined =>
        obj.web ?? obj.default,
};
