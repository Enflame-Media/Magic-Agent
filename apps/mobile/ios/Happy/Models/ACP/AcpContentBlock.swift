//
//  AcpContentBlock.swift
//  Happy
//
//  ACP content block types for the Agent Client Protocol.
//  Mirrors @magic-agent/protocol AcpContentBlock discriminated union.
//

import Foundation

// MARK: - Meta

/// Passthrough metadata present on all ACP objects.
/// Contains arbitrary key-value pairs; not inspected by the app.
struct AcpMeta: Codable, Hashable {
    init() {}
    init(from decoder: Decoder) throws {
        // Accept any shape, discard contents
        _ = try? decoder.container(keyedBy: DynamicCodingKey.self)
    }
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encodeNil()
    }

    private struct DynamicCodingKey: CodingKey {
        var stringValue: String
        var intValue: Int?
        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { self.stringValue = "\(intValue)"; self.intValue = intValue }
    }
}

// MARK: - Annotations

/// Optional annotations for ACP content.
struct AcpAnnotations: Codable, Hashable {
    let audience: [String]?
    let lastModified: String?
    let priority: Double?
}

// MARK: - Content Block

/// ACP content block - discriminated union on `type` field.
///
/// Represents displayable content: text, image, audio, resource_link, or resource.
enum AcpContentBlock: Codable, Hashable {
    case text(AcpTextContent)
    case image(AcpImageContent)
    case audio(AcpAudioContent)
    case resourceLink(AcpResourceLinkContent)
    case resource(AcpEmbeddedResourceContent)
    case unknown

    private enum TypeKey: String, Codable {
        case text, image, audio
        case resourceLink = "resource_link"
        case resource
    }

    private enum CodingKeys: String, CodingKey {
        case type
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let typeStr = try? container.decode(String.self, forKey: .type),
              let kind = TypeKey(rawValue: typeStr) else {
            self = .unknown
            return
        }
        switch kind {
        case .text:
            self = .text(try AcpTextContent(from: decoder))
        case .image:
            self = .image(try AcpImageContent(from: decoder))
        case .audio:
            self = .audio(try AcpAudioContent(from: decoder))
        case .resourceLink:
            self = .resourceLink(try AcpResourceLinkContent(from: decoder))
        case .resource:
            self = .resource(try AcpEmbeddedResourceContent(from: decoder))
        }
    }

    func encode(to encoder: Encoder) throws {
        switch self {
        case .text(let v): try v.encode(to: encoder)
        case .image(let v): try v.encode(to: encoder)
        case .audio(let v): try v.encode(to: encoder)
        case .resourceLink(let v): try v.encode(to: encoder)
        case .resource(let v): try v.encode(to: encoder)
        case .unknown: break
        }
    }

    /// Extract text content from this block. Returns empty string for non-text blocks.
    var text: String {
        switch self {
        case .text(let content): return content.text
        default: return ""
        }
    }
}

// MARK: - Content Block Variants

struct AcpTextContent: Codable, Hashable {
    let type: String
    let text: String
    let annotations: AcpAnnotations?

    private enum CodingKeys: String, CodingKey {
        case type, text, annotations
        case meta = "_meta"
    }

    init(type: String = "text", text: String, annotations: AcpAnnotations? = nil) {
        self.type = type
        self.text = text
        self.annotations = annotations
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.text = try container.decode(String.self, forKey: .text)
        self.annotations = try container.decodeIfPresent(AcpAnnotations.self, forKey: .annotations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(text, forKey: .text)
        try container.encodeIfPresent(annotations, forKey: .annotations)
    }
}

struct AcpImageContent: Codable, Hashable {
    let type: String
    let data: String
    let mimeType: String
    let uri: String?
    let annotations: AcpAnnotations?

    private enum CodingKeys: String, CodingKey {
        case type, data, mimeType, uri, annotations
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.data = try container.decode(String.self, forKey: .data)
        self.mimeType = try container.decode(String.self, forKey: .mimeType)
        self.uri = try container.decodeIfPresent(String.self, forKey: .uri)
        self.annotations = try container.decodeIfPresent(AcpAnnotations.self, forKey: .annotations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(data, forKey: .data)
        try container.encode(mimeType, forKey: .mimeType)
        try container.encodeIfPresent(uri, forKey: .uri)
        try container.encodeIfPresent(annotations, forKey: .annotations)
    }
}

struct AcpAudioContent: Codable, Hashable {
    let type: String
    let data: String
    let mimeType: String
    let annotations: AcpAnnotations?

    private enum CodingKeys: String, CodingKey {
        case type, data, mimeType, annotations
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.data = try container.decode(String.self, forKey: .data)
        self.mimeType = try container.decode(String.self, forKey: .mimeType)
        self.annotations = try container.decodeIfPresent(AcpAnnotations.self, forKey: .annotations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(data, forKey: .data)
        try container.encode(mimeType, forKey: .mimeType)
        try container.encodeIfPresent(annotations, forKey: .annotations)
    }
}

struct AcpResourceLinkContent: Codable, Hashable {
    let type: String
    let uri: String
    let name: String
    let title: String?
    let description: String?
    let mimeType: String?
    let size: Int?
    let annotations: AcpAnnotations?

    private enum CodingKeys: String, CodingKey {
        case type, uri, name, title, description, mimeType, size, annotations
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.uri = try container.decode(String.self, forKey: .uri)
        self.name = try container.decode(String.self, forKey: .name)
        self.title = try container.decodeIfPresent(String.self, forKey: .title)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.mimeType = try container.decodeIfPresent(String.self, forKey: .mimeType)
        self.size = try container.decodeIfPresent(Int.self, forKey: .size)
        self.annotations = try container.decodeIfPresent(AcpAnnotations.self, forKey: .annotations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(uri, forKey: .uri)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(title, forKey: .title)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(mimeType, forKey: .mimeType)
        try container.encodeIfPresent(size, forKey: .size)
        try container.encodeIfPresent(annotations, forKey: .annotations)
    }
}

struct AcpEmbeddedResourceContent: Codable, Hashable {
    let type: String
    let resource: AcpResourceContents
    let annotations: AcpAnnotations?

    private enum CodingKeys: String, CodingKey {
        case type, resource, annotations
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.resource = try container.decode(AcpResourceContents.self, forKey: .resource)
        self.annotations = try container.decodeIfPresent(AcpAnnotations.self, forKey: .annotations)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(resource, forKey: .resource)
        try container.encodeIfPresent(annotations, forKey: .annotations)
    }
}

// MARK: - Resource Contents

/// Resource content that can be text or binary (base64).
enum AcpResourceContents: Codable, Hashable {
    case text(uri: String, text: String, mimeType: String?)
    case blob(uri: String, blob: String, mimeType: String?)

    /// Convenience accessor for the URI across both cases.
    var resourceUri: String {
        switch self {
        case .text(let uri, _, _): return uri
        case .blob(let uri, _, _): return uri
        }
    }

    private enum CodingKeys: String, CodingKey {
        case uri, text, blob, mimeType
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        let uri = try container.decode(String.self, forKey: .uri)
        let mimeType = try container.decodeIfPresent(String.self, forKey: .mimeType)

        if let text = try container.decodeIfPresent(String.self, forKey: .text) {
            self = .text(uri: uri, text: text, mimeType: mimeType)
        } else if let blob = try container.decodeIfPresent(String.self, forKey: .blob) {
            self = .blob(uri: uri, blob: blob, mimeType: mimeType)
        } else {
            self = .text(uri: uri, text: "", mimeType: mimeType)
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .text(let uri, let text, let mimeType):
            try container.encode(uri, forKey: .uri)
            try container.encode(text, forKey: .text)
            try container.encodeIfPresent(mimeType, forKey: .mimeType)
        case .blob(let uri, let blob, let mimeType):
            try container.encode(uri, forKey: .uri)
            try container.encode(blob, forKey: .blob)
            try container.encodeIfPresent(mimeType, forKey: .mimeType)
        }
    }
}
