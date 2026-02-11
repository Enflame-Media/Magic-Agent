/**
 * Mock for expo-secure-store module in Vitest tests.
 */

export async function getItemAsync(_key: string): Promise<string | null> {
    return null;
}

export async function setItemAsync(_key: string, _value: string): Promise<void> {
    return;
}

export async function deleteItemAsync(_key: string): Promise<void> {
    return;
}
