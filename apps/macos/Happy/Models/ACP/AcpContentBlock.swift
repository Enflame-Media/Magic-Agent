//
//  AcpContentBlock.swift
//  Happy
//
//  Created by Happy Engineering
//  Copyright © 2024 Enflame Media. All rights reserved.
//

import Foundation

// MARK: - Content Block

/// A content block in the ACP protocol, discriminated on the `type` field.
///
/// Content blocks represent displayable information: text, images, audio,
/// resource links, or embedded resources.
///
/// - SeeAlso: `AcpContentBlockSchema` in `@magic-agent/protocol`
enum AcpContentBlock: Codable, Hashable {
    case text(AcpTextContent)
    case image(AcpImageContent)
    case audio(AcpAudioContent)
    case resourceLink(AcpResourceLink)
    case resource(AcpEmbeddedResource)
    case unknown(String)

    // MARK: - Coding

    private enum CodingKeys: String, CodingKey {
        case type
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let type = try container.decode(String.self, forKey: .type)

        switch type {
        case "text":
            self = .text(try AcpTextContent(from: decoder))
        case "image":
            self = .image(try AcpImageContent(from: decoder))
        case "audio":
            self = .audio(try AcpAudioContent(from: decoder))
        case "resource_link":
            self = .resourceLink(try AcpResourceLink(from: decoder))
        case "resource":
            self = .resource(try AcpEmbeddedResource(from: decoder))
        default:
            self = .unknown(type)
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .text(let content):
            try content.encode(to: encoder)
        case .image(let content):
            try content.encode(to: encoder)
        case .audio(let content):
            try content.encode(to: encoder)
        case .resourceLink(let content):
            try content.encode(to: encoder)
        case .resource(let content):
            try content.encode(to: encoder)
        case .unknown:
            var container = encoder.container(keyedBy: CodingKeys.self)
            try container.encode("unknown", forKey: .type)
        }
    }

    // MARK: - Helpers

    /// Extract text from this content block. Returns empty string for non-text blocks.
    var textContent: String {
        switch self {
        case .text(let content):
            return content.text
        default:
            return ""
        }
    }
}

// MARK: - Text Content

/// A text content block.
struct AcpTextContent: Codable, Hashable {
    let type: String
    let text: String
    let annotations: AcpAnnotations?

    init(type: String = "text", text: String, annotations: AcpAnnotations? = nil) {
        self.type = type
        self.text = text
        self.annotations = annotations
    }
}

// MARK: - Image Content

/// An image content block.
struct AcpImageContent: Codable, Hashable {
    let type: String
    let data: String
    let mimeType: String
    let uri: String?
    let annotations: AcpAnnotations?
}

// MARK: - Audio Content

/// An audio content block.
struct AcpAudioContent: Codable, Hashable {
    let type: String
    let data: String
    let mimeType: String
    let annotations: AcpAnnotations?
}

// MARK: - Resource Link

/// A resource link content block.
struct AcpResourceLink: Codable, Hashable {
    let type: String
    let name: String
    let uri: String
    let description: String?
    let mimeType: String?
    let size: Int?
    let title: String?
    let annotations: AcpAnnotations?
}

// MARK: - Embedded Resource

/// An embedded resource content block.
struct AcpEmbeddedResource: Codable, Hashable {
    let type: String
    let resource: AcpResourceContents
    let annotations: AcpAnnotations?
}

// MARK: - Resource Contents

/// Resource content that can be text or binary (blob).
enum AcpResourceContents: Codable, Hashable {
    case text(AcpTextResourceContents)
    case blob(AcpBlobResourceContents)

    private enum CodingKeys: String, CodingKey {
        case text, blob, uri, mimeType
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        // Discriminate: if "blob" key exists, it's blob content; otherwise text
        if container.contains(.blob) {
            self = .blob(try AcpBlobResourceContents(from: decoder))
        } else {
            self = .text(try AcpTextResourceContents(from: decoder))
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .text(let contents):
            try contents.encode(to: encoder)
        case .blob(let contents):
            try contents.encode(to: encoder)
        }
    }
}

/// Text-based resource contents.
struct AcpTextResourceContents: Codable, Hashable {
    let uri: String
    let text: String
    let mimeType: String?
}

/// Binary resource contents (base64 encoded).
struct AcpBlobResourceContents: Codable, Hashable {
    let uri: String
    let blob: String
    let mimeType: String?
}

// MARK: - Annotations

/// Optional annotations for content blocks.
struct AcpAnnotations: Codable, Hashable {
    let audience: [AcpRole]?
    let lastModified: String?
    let priority: Double?
}

/// Role in a conversation.
enum AcpRole: String, Codable, Hashable {
    case assistant
    case user
}
