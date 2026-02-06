//
//  KeychainHelperTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

final class KeychainHelperTests: XCTestCase {

    // MARK: - Setup / Teardown

    override func tearDownWithError() throws {
        try KeychainHelper.deleteAll()
    }

    // MARK: - Key Enum

    func testAllKeysHaveUniqueRawValues() {
        let rawValues = KeychainHelper.Key.allCases.map(\.rawValue)
        let uniqueValues = Set(rawValues)
        XCTAssertEqual(rawValues.count, uniqueValues.count, "All keys must have unique raw values")
    }

    func testKeyRawValuesMatchExpected() {
        XCTAssertEqual(KeychainHelper.Key.authToken.rawValue, "auth_token")
        XCTAssertEqual(KeychainHelper.Key.refreshToken.rawValue, "refresh_token")
        XCTAssertEqual(KeychainHelper.Key.privateKey.rawValue, "encryption_private_key")
        XCTAssertEqual(KeychainHelper.Key.publicKey.rawValue, "encryption_public_key")
        XCTAssertEqual(KeychainHelper.Key.peerPublicKey.rawValue, "peer_public_key")
        XCTAssertEqual(KeychainHelper.Key.machineId.rawValue, "machine_id")
        XCTAssertEqual(KeychainHelper.Key.accountId.rawValue, "account_id")
        XCTAssertEqual(KeychainHelper.Key.serverUrl.rawValue, "server_url")
        XCTAssertEqual(KeychainHelper.Key.deviceToken.rawValue, "apns_device_token")
        XCTAssertEqual(KeychainHelper.Key.elevenLabsApiKey.rawValue, "elevenlabs_api_key")
    }

    func testKeyCaseIterableCount() {
        XCTAssertEqual(KeychainHelper.Key.allCases.count, 10)
    }

    // MARK: - Save and Read (String)

    func testSaveAndReadString() throws {
        try KeychainHelper.save("test-token-123", for: .authToken)
        let result = KeychainHelper.readString(.authToken)
        XCTAssertEqual(result, "test-token-123")
    }

    func testSaveOverwritesExisting() throws {
        try KeychainHelper.save("first-value", for: .authToken)
        try KeychainHelper.save("second-value", for: .authToken)
        let result = KeychainHelper.readString(.authToken)
        XCTAssertEqual(result, "second-value")
    }

    func testSaveDifferentKeys() throws {
        try KeychainHelper.save("token-value", for: .authToken)
        try KeychainHelper.save("machine-value", for: .machineId)

        XCTAssertEqual(KeychainHelper.readString(.authToken), "token-value")
        XCTAssertEqual(KeychainHelper.readString(.machineId), "machine-value")
    }

    // MARK: - Save and Read (Data)

    func testSaveAndReadData() throws {
        let data = Data([0x01, 0x02, 0x03, 0xFF])
        try KeychainHelper.save(data, for: .privateKey)
        let result = KeychainHelper.read(.privateKey)
        XCTAssertEqual(result, data)
    }

    func testSaveEmptyData() throws {
        let data = Data()
        try KeychainHelper.save(data, for: .privateKey)
        let result = KeychainHelper.read(.privateKey)
        XCTAssertEqual(result, data)
    }

    // MARK: - Read Non-Existent

    func testReadNonExistentKeyReturnsNil() {
        let result = KeychainHelper.read(.authToken)
        XCTAssertNil(result)
    }

    func testReadStringNonExistentKeyReturnsNil() {
        let result = KeychainHelper.readString(.authToken)
        XCTAssertNil(result)
    }

    // MARK: - Update

    func testUpdateExistingItem() throws {
        try KeychainHelper.save("original", for: .authToken)
        try KeychainHelper.update("updated", for: .authToken)
        XCTAssertEqual(KeychainHelper.readString(.authToken), "updated")
    }

    func testUpdateNonExistentItemCreatesIt() throws {
        try KeychainHelper.update("new-value", for: .authToken)
        XCTAssertEqual(KeychainHelper.readString(.authToken), "new-value")
    }

    func testUpdateData() throws {
        let original = Data([0x01, 0x02])
        let updated = Data([0x03, 0x04])
        try KeychainHelper.save(original, for: .privateKey)
        try KeychainHelper.update(updated, for: .privateKey)
        XCTAssertEqual(KeychainHelper.read(.privateKey), updated)
    }

    // MARK: - Delete

    func testDeleteExistingItem() throws {
        try KeychainHelper.save("token", for: .authToken)
        try KeychainHelper.delete(.authToken)
        XCTAssertNil(KeychainHelper.readString(.authToken))
    }

    func testDeleteNonExistentItemDoesNotThrow() throws {
        XCTAssertNoThrow(try KeychainHelper.delete(.authToken))
    }

    func testDeleteAllRemovesAllKeys() throws {
        try KeychainHelper.save("token", for: .authToken)
        try KeychainHelper.save("refresh", for: .refreshToken)
        try KeychainHelper.save("key", for: .privateKey)

        try KeychainHelper.deleteAll()

        XCTAssertNil(KeychainHelper.readString(.authToken))
        XCTAssertNil(KeychainHelper.readString(.refreshToken))
        XCTAssertNil(KeychainHelper.read(.privateKey))
    }

    // MARK: - Exists

    func testExistsReturnsTrueForStoredKey() throws {
        try KeychainHelper.save("token", for: .authToken)
        XCTAssertTrue(KeychainHelper.exists(.authToken))
    }

    func testExistsReturnsFalseForMissingKey() {
        XCTAssertFalse(KeychainHelper.exists(.authToken))
    }

    func testExistsReturnsFalseAfterDelete() throws {
        try KeychainHelper.save("token", for: .authToken)
        try KeychainHelper.delete(.authToken)
        XCTAssertFalse(KeychainHelper.exists(.authToken))
    }

    // MARK: - Error Descriptions

    func testErrorDescriptionsAreNotEmpty() {
        let errors: [KeychainError] = [
            .saveFailed(errSecDuplicateItem),
            .updateFailed(errSecItemNotFound),
            .deleteFailed(errSecAuthFailed),
            .encodingFailed
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            XCTAssertFalse(error.errorDescription?.isEmpty ?? true,
                          "Error \(error) should have a description")
        }
    }

    // MARK: - Error Equatable

    func testErrorEquality() {
        XCTAssertEqual(KeychainError.saveFailed(0), KeychainError.saveFailed(0))
        XCTAssertEqual(KeychainError.encodingFailed, KeychainError.encodingFailed)
        XCTAssertNotEqual(KeychainError.saveFailed(0), KeychainError.saveFailed(1))
        XCTAssertNotEqual(KeychainError.saveFailed(0), KeychainError.encodingFailed)
    }

    // MARK: - Unicode and Special Characters

    func testSaveAndReadUnicodeString() throws {
        let value = "Hello World! Emoji and unicode support"
        try KeychainHelper.save(value, for: .accountId)
        XCTAssertEqual(KeychainHelper.readString(.accountId), value)
    }

    func testSaveAndReadLongString() throws {
        let value = String(repeating: "a", count: 10_000)
        try KeychainHelper.save(value, for: .authToken)
        XCTAssertEqual(KeychainHelper.readString(.authToken), value)
    }

    // MARK: - Server URL Key

    func testServerUrlKeyRoundTrip() throws {
        let url = "https://api.happy.example.com"
        try KeychainHelper.save(url, for: .serverUrl)
        XCTAssertEqual(KeychainHelper.readString(.serverUrl), url)
    }
}
