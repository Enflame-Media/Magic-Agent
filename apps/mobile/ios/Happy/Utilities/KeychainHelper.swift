//
//  KeychainHelper.swift
//  Happy
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import Foundation
import Security

/// Helper for secure credential storage in the iOS Keychain.
///
/// Mirrors the macOS `KeychainHelper` in `apps/macos/Happy/Utilities/`
/// to maintain a consistent API across platforms.
struct KeychainHelper {

    // MARK: - Configuration

    private static let service = "com.enflamemedia.happy"

    /// Keys that store cryptographic material or sensitive credentials.
    /// These use `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly` to prevent
    /// iCloud Keychain sync, ensuring private keys never leave the device.
    private static let sensitiveKeys: Set<Key> = [
        .privateKey, .publicKey, .peerPublicKey, .authToken, .refreshToken,
        .elevenLabsApiKey
    ]

    /// Returns the appropriate accessibility level for a given key.
    /// Sensitive keys (cryptographic material, tokens) use `ThisDeviceOnly`
    /// to prevent iCloud Keychain sync.
    private static func accessibility(for key: Key) -> CFString {
        sensitiveKeys.contains(key)
            ? kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
            : kSecAttrAccessibleAfterFirstUnlock
    }

    // MARK: - Keys

    enum Key: String, CaseIterable {
        case authToken = "auth_token"
        case refreshToken = "refresh_token"
        case privateKey = "encryption_private_key"
        case publicKey = "encryption_public_key"
        case peerPublicKey = "peer_public_key"
        case machineId = "machine_id"
        case accountId = "account_id"
        case serverUrl = "server_url"
        case deviceToken = "apns_device_token"
        case elevenLabsApiKey = "elevenlabs_api_key"
    }

    // MARK: - Save

    /// Save data to the Keychain. Replaces existing items.
    ///
    /// Sensitive keys (private keys, tokens) use `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`
    /// to prevent iCloud Keychain sync. Other keys use `kSecAttrAccessibleAfterFirstUnlock`.
    static func save(_ data: Data, for key: Key) throws {
        try? delete(key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: accessibility(for: key)
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    /// Save a string to the Keychain (UTF-8 encoded).
    static func save(_ string: String, for key: Key) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        try save(data, for: key)
    }

    // MARK: - Read

    /// Read data from the Keychain. Returns nil if not found.
    static func read(_ key: Key) -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess else { return nil }
        return result as? Data
    }

    /// Read a string from the Keychain. Returns nil if not found.
    static func readString(_ key: Key) -> String? {
        guard let data = read(key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Update

    /// Update an existing Keychain item in place. Falls back to save if not found.
    static func update(_ data: Data, for key: Key) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue
        ]
        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            try save(data, for: key)
        } else if status != errSecSuccess {
            throw KeychainError.updateFailed(status)
        }
    }

    /// Update an existing Keychain string item in place.
    static func update(_ string: String, for key: Key) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        try update(data, for: key)
    }

    // MARK: - Delete

    /// Delete an item from the Keychain. No-op if not found.
    static func delete(_ key: Key) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }

    /// Delete all Happy-related items from the Keychain.
    static func deleteAll() throws {
        for key in Key.allCases {
            try? delete(key)
        }
    }

    // MARK: - Helpers

    /// Check if a key exists in the Keychain.
    static func exists(_ key: Key) -> Bool {
        read(key) != nil
    }
}

// MARK: - Errors

enum KeychainError: LocalizedError, Equatable {
    case saveFailed(OSStatus)
    case updateFailed(OSStatus)
    case deleteFailed(OSStatus)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .saveFailed(let status):
            return "Failed to save to Keychain (OSStatus \(status))."
        case .updateFailed(let status):
            return "Failed to update Keychain item (OSStatus \(status))."
        case .deleteFailed(let status):
            return "Failed to delete from Keychain (OSStatus \(status))."
        case .encodingFailed:
            return "Failed to encode data for Keychain storage."
        }
    }
}
