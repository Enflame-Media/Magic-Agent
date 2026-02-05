//
//  QRCodePayloadTests.swift
//  HappyTests
//
//  Created by Happy Engineering
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

final class QRCodePayloadTests: XCTestCase {

    // MARK: - Valid Payloads

    func testParseValidPayloadWithAllFields() throws {
        let json = """
        {
            "publicKey": "dGVzdHB1YmxpY2tleQ==",
            "serverUrl": "https://api.happy.example.com",
            "machineId": "MacBook-Pro-2024"
        }
        """

        let payload = try QRCodePayload.parse(from: json)

        XCTAssertEqual(payload.publicKey, "dGVzdHB1YmxpY2tleQ==")
        XCTAssertEqual(payload.serverUrl, "https://api.happy.example.com")
        XCTAssertEqual(payload.machineId, "MacBook-Pro-2024")
    }

    func testParseValidPayloadWithoutMachineId() throws {
        let json = """
        {
            "publicKey": "dGVzdHB1YmxpY2tleQ==",
            "serverUrl": "https://api.happy.example.com"
        }
        """

        let payload = try QRCodePayload.parse(from: json)

        XCTAssertEqual(payload.publicKey, "dGVzdHB1YmxpY2tleQ==")
        XCTAssertEqual(payload.serverUrl, "https://api.happy.example.com")
        XCTAssertNil(payload.machineId)
    }

    func testParseValidPayloadWithNullMachineId() throws {
        let json = """
        {
            "publicKey": "dGVzdHB1YmxpY2tleQ==",
            "serverUrl": "https://api.happy.example.com",
            "machineId": null
        }
        """

        let payload = try QRCodePayload.parse(from: json)

        XCTAssertNil(payload.machineId)
    }

    // MARK: - Invalid Payloads

    func testParseEmptyStringThrowsInvalidFormat() {
        XCTAssertThrowsError(try QRCodePayload.parse(from: "")) { error in
            XCTAssertEqual(error as? QRCodePayloadError, .invalidFormat(underlying: error))
        }
    }

    func testParseNonJsonStringThrowsInvalidFormat() {
        XCTAssertThrowsError(try QRCodePayload.parse(from: "not json")) { error in
            guard let payloadError = error as? QRCodePayloadError else {
                XCTFail("Expected QRCodePayloadError")
                return
            }
            if case .invalidFormat = payloadError {
                // Expected
            } else {
                XCTFail("Expected invalidFormat error, got \(payloadError)")
            }
        }
    }

    func testParseMissingPublicKeyThrows() {
        let json = """
        {
            "serverUrl": "https://api.happy.example.com"
        }
        """

        XCTAssertThrowsError(try QRCodePayload.parse(from: json)) { error in
            guard let payloadError = error as? QRCodePayloadError else {
                XCTFail("Expected QRCodePayloadError")
                return
            }
            // Missing required field triggers JSON decode error -> invalidFormat
            if case .invalidFormat = payloadError {
                // Expected
            } else {
                XCTFail("Expected invalidFormat error, got \(payloadError)")
            }
        }
    }

    func testParseEmptyPublicKeyThrows() {
        let json = """
        {
            "publicKey": "",
            "serverUrl": "https://api.happy.example.com"
        }
        """

        XCTAssertThrowsError(try QRCodePayload.parse(from: json)) { error in
            XCTAssertEqual(error as? QRCodePayloadError, .missingPublicKey)
        }
    }

    func testParseEmptyServerUrlThrows() {
        let json = """
        {
            "publicKey": "dGVzdHB1YmxpY2tleQ==",
            "serverUrl": ""
        }
        """

        XCTAssertThrowsError(try QRCodePayload.parse(from: json)) { error in
            XCTAssertEqual(error as? QRCodePayloadError, .missingServerUrl)
        }
    }

    func testParseInvalidBase64PublicKeyThrows() {
        let json = """
        {
            "publicKey": "not-valid-base64!!!",
            "serverUrl": "https://api.happy.example.com"
        }
        """

        XCTAssertThrowsError(try QRCodePayload.parse(from: json)) { error in
            XCTAssertEqual(error as? QRCodePayloadError, .invalidPublicKey)
        }
    }

    func testParseInvalidServerUrlThrows() {
        // A string with spaces is not a valid URL per URL(string:)
        let json = """
        {
            "publicKey": "dGVzdHB1YmxpY2tleQ==",
            "serverUrl": "not a valid url with spaces"
        }
        """

        XCTAssertThrowsError(try QRCodePayload.parse(from: json)) { error in
            XCTAssertEqual(error as? QRCodePayloadError, .invalidServerUrl)
        }
    }

    // MARK: - Equatable

    func testPayloadEquality() {
        let payload1 = QRCodePayload(
            publicKey: "dGVzdHB1YmxpY2tleQ==",
            serverUrl: "https://api.happy.example.com",
            machineId: "test"
        )
        let payload2 = QRCodePayload(
            publicKey: "dGVzdHB1YmxpY2tleQ==",
            serverUrl: "https://api.happy.example.com",
            machineId: "test"
        )

        XCTAssertEqual(payload1, payload2)
    }

    func testPayloadInequality() {
        let payload1 = QRCodePayload(
            publicKey: "dGVzdHB1YmxpY2tleQ==",
            serverUrl: "https://api.happy.example.com",
            machineId: nil
        )
        let payload2 = QRCodePayload(
            publicKey: "ZGlmZmVyZW50a2V5",
            serverUrl: "https://api.happy.example.com",
            machineId: nil
        )

        XCTAssertNotEqual(payload1, payload2)
    }

    // MARK: - Error Descriptions

    func testErrorDescriptionsAreNotEmpty() {
        let errors: [QRCodePayloadError] = [
            .invalidEncoding,
            .invalidFormat(underlying: NSError(domain: "", code: 0)),
            .missingPublicKey,
            .missingServerUrl,
            .invalidPublicKey,
            .invalidServerUrl
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            XCTAssertFalse(error.errorDescription?.isEmpty ?? true, "Error \(error) should have a description")
        }
    }

    // MARK: - Codable Round-Trip

    func testCodableRoundTrip() throws {
        let original = QRCodePayload(
            publicKey: "dGVzdHB1YmxpY2tleQ==",
            serverUrl: "https://api.happy.example.com",
            machineId: "test-machine"
        )

        let encoder = JSONEncoder()
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(QRCodePayload.self, from: data)

        XCTAssertEqual(original, decoded)
    }
}
