//
//  APIServiceTests.swift
//  HappyTests
//
//  Copyright (c) 2024-2026 Enflame Media. All rights reserved.
//

import XCTest
@testable import Happy

final class APIServiceTests: XCTestCase {

    // MARK: - Configuration Tests

    func testDefaultBaseURL() {
        let url = APIConfiguration.baseURL
        XCTAssertEqual(url.scheme, "https")
        XCTAssertTrue(url.absoluteString.contains("api.happy.engineering"))
    }

    func testDefaultWebSocketURL() {
        let url = APIConfiguration.webSocketURL
        XCTAssertEqual(url.scheme, "wss")
        XCTAssertTrue(url.absoluteString.contains("/sync"))
    }

    // MARK: - Initialization

    func testAPIServiceCreatesWithDefaultBaseURL() async {
        let service = APIService()
        XCTAssertNotNil(service)
    }

    func testAPIServiceCreatesWithCustomBaseURL() async {
        let customURL = URL(string: "https://custom.api.example.com")!
        let service = APIService(baseURL: customURL)
        XCTAssertNotNil(service)
    }

    func testAPIServiceCreatesWithCustomSession() async {
        let config = URLSessionConfiguration.ephemeral
        let customSession = URLSession(configuration: config)
        let service = APIService(session: customSession)
        XCTAssertNotNil(service)
    }

    // MARK: - APIError Tests

    func testAPIErrorDescriptionsAreNotEmpty() {
        let errors: [APIError] = [
            .invalidResponse,
            .httpError(statusCode: 400),
            .decodingError(NSError(domain: "", code: 0)),
            .noAuthToken,
            .noRefreshToken,
            .unauthorized,
            .forbidden,
            .notFound,
            .rateLimited,
            .serverError(statusCode: 500),
            .networkError(NSError(domain: "", code: 0))
        ]

        for error in errors {
            XCTAssertNotNil(error.errorDescription)
            XCTAssertFalse(error.errorDescription?.isEmpty ?? true)
        }
    }

    func testAPIErrorEquatable() {
        XCTAssertEqual(APIError.invalidResponse, APIError.invalidResponse)
        XCTAssertEqual(APIError.noAuthToken, APIError.noAuthToken)
        XCTAssertEqual(APIError.unauthorized, APIError.unauthorized)
        XCTAssertEqual(APIError.httpError(statusCode: 400), APIError.httpError(statusCode: 400))
        XCTAssertEqual(APIError.serverError(statusCode: 500), APIError.serverError(statusCode: 500))

        XCTAssertNotEqual(APIError.invalidResponse, APIError.noAuthToken)
        XCTAssertNotEqual(APIError.httpError(statusCode: 400), APIError.httpError(statusCode: 401))
    }

    // MARK: - Mock URL Protocol Tests

    func testFetchDecodesValidJSON() async throws {
        let mockData = """
        {"id": "test-123", "title": "Test Session", "status": "active", \
        "machine_id": "m1", "created_at": "2026-01-01T00:00:00Z", \
        "updated_at": "2026-01-01T00:00:00Z"}
        """.data(using: .utf8)!

        MockURLProtocol.mockResponses = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200,
                httpVersion: nil, headerFields: nil)!
            return (mockData, response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]
        let mockSession = URLSession(configuration: config)

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: mockSession)

        let session: Session = try await service.fetch("/v1/sessions/test-123", authenticated: false)
        XCTAssertEqual(session.id, "test-123")
        XCTAssertEqual(session.title, "Test Session")
        XCTAssertEqual(session.status, .active)
    }

    func testFetchThrowsOnHTTP401() async {
        MockURLProtocol.mockResponses = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 401,
                httpVersion: nil, headerFields: nil)!
            return (Data(), response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: URLSession(configuration: config))

        do {
            let _: Session = try await service.fetch("/v1/test", authenticated: false)
            XCTFail("Expected unauthorized error")
        } catch let error as APIError {
            XCTAssertEqual(error, .unauthorized)
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    func testFetchThrowsOnHTTP404() async {
        MockURLProtocol.mockResponses = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 404,
                httpVersion: nil, headerFields: nil)!
            return (Data(), response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: URLSession(configuration: config))

        do {
            let _: Session = try await service.fetch("/v1/test", authenticated: false)
            XCTFail("Expected notFound error")
        } catch let error as APIError {
            XCTAssertEqual(error, .notFound)
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    func testFetchThrowsOnHTTP500() async {
        MockURLProtocol.mockResponses = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 500,
                httpVersion: nil, headerFields: nil)!
            return (Data(), response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: URLSession(configuration: config))

        do {
            let _: Session = try await service.fetch("/v1/test", authenticated: false)
            XCTFail("Expected serverError")
        } catch let error as APIError {
            XCTAssertEqual(error, .serverError(statusCode: 500))
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    func testFetchThrowsDecodingErrorOnInvalidJSON() async {
        let invalidData = "not json".data(using: .utf8)!

        MockURLProtocol.mockResponses = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200,
                httpVersion: nil, headerFields: nil)!
            return (invalidData, response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: URLSession(configuration: config))

        do {
            let _: Session = try await service.fetch("/v1/test", authenticated: false)
            XCTFail("Expected decodingError")
        } catch let error as APIError {
            if case .decodingError = error { /* expected */ } else {
                XCTFail("Expected decodingError, got \(error)")
            }
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    func testPostSendsJSONBody() async throws {
        struct TestBody: Encodable {
            let name: String
        }

        var capturedRequest: URLRequest?

        MockURLProtocol.mockResponses = { request in
            capturedRequest = request
            let responseData = """
            {"id": "new-123", "title": "New Session", "status": "active", \
            "machine_id": "m1", "created_at": "2026-01-01T00:00:00Z", \
            "updated_at": "2026-01-01T00:00:00Z"}
            """.data(using: .utf8)!
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200,
                httpVersion: nil, headerFields: nil)!
            return (responseData, response)
        }

        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [MockURLProtocol.self]

        let service = APIService(
            baseURL: URL(string: "https://test.example.com")!,
            session: URLSession(configuration: config))

        let body = TestBody(name: "test")
        let session: Session = try await service.post("/v1/sessions", body: body, authenticated: false)

        XCTAssertEqual(session.id, "new-123")
        XCTAssertEqual(capturedRequest?.httpMethod, "POST")
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Content-Type"), "application/json")
    }
}

// MARK: - Mock URL Protocol

final class MockURLProtocol: URLProtocol {
    static var mockResponses: ((URLRequest) -> (Data, HTTPURLResponse))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.mockResponses else {
            client?.urlProtocol(self, didFailWithError: NSError(domain: "MockURLProtocol", code: 0))
            return
        }

        let (data, response) = handler(request)
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}
