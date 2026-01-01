//
//  KeychainHelper.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation
import Security

/// Helper for secure credential storage in macOS Keychain.
///
/// This struct provides a simple interface for storing and retrieving
/// sensitive data like authentication tokens and encryption keys.
///
/// ## Security Considerations
/// - All data is stored in the system Keychain
/// - Uses kSecClassGenericPassword for credential storage
/// - Automatically handles encoding/decoding of Data
struct KeychainHelper {
    // MARK: - Configuration

    /// The service identifier for Keychain items.
    private static let service = "com.enflamemedia.happy"

    // MARK: - Keys

    /// Keys used for storing different types of credentials.
    enum Key: String {
        case authToken = "auth_token"
        case refreshToken = "refresh_token"
        case privateKey = "encryption_private_key"
        case publicKey = "encryption_public_key"
        case peerPublicKey = "peer_public_key"
        case machineId = "machine_id"
        case accountId = "account_id"
    }

    // MARK: - Save

    /// Save data to the Keychain.
    /// - Parameters:
    ///   - data: The data to store.
    ///   - key: The key to store it under.
    /// - Throws: KeychainError if the operation fails.
    static func save(_ data: Data, for key: Key) throws {
        // First, try to delete any existing item
        try? delete(key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    /// Save a string to the Keychain.
    /// - Parameters:
    ///   - string: The string to store.
    ///   - key: The key to store it under.
    static func save(_ string: String, for key: Key) throws {
        guard let data = string.data(using: .utf8) else {
            throw KeychainError.encodingFailed
        }
        try save(data, for: key)
    }

    // MARK: - Read

    /// Read data from the Keychain.
    /// - Parameter key: The key to read.
    /// - Returns: The stored data, or nil if not found.
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

        guard status == errSecSuccess else {
            return nil
        }

        return result as? Data
    }

    /// Read a string from the Keychain.
    /// - Parameter key: The key to read.
    /// - Returns: The stored string, or nil if not found.
    static func readString(_ key: Key) -> String? {
        guard let data = read(key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Delete

    /// Delete an item from the Keychain.
    /// - Parameter key: The key to delete.
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
        for key in [Key.authToken, .refreshToken, .privateKey, .publicKey, .peerPublicKey, .machineId, .accountId] {
            try? delete(key)
        }
    }

    // MARK: - Helpers

    /// Check if a key exists in the Keychain.
    /// - Parameter key: The key to check.
    /// - Returns: true if the key exists.
    static func exists(_ key: Key) -> Bool {
        read(key) != nil
    }
}

// MARK: - Errors

/// Errors that can occur during Keychain operations.
enum KeychainError: LocalizedError {
    case saveFailed(OSStatus)
    case deleteFailed(OSStatus)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .saveFailed(let status):
            return "Failed to save to Keychain: \(status)"
        case .deleteFailed(let status):
            return "Failed to delete from Keychain: \(status)"
        case .encodingFailed:
            return "Failed to encode data for Keychain"
        }
    }
}
