/**
 * Mock for expo-updates module in Vitest tests.
 */

export async function reloadAsync(): Promise<void> {
    return;
}

export const isEnabled = false;
export const isEmbeddedLaunch = true;
export const channel = null;
export const updateId = null;
export const runtimeVersion = '1.0.0';
