//
//  AcpCommand.swift
//  Happy
//
//  ACP available commands and session config for the Agent Client Protocol.
//  Mirrors @magic-agent/protocol AcpAvailableCommand, AcpSessionConfigOption.
//

import Foundation

// MARK: - Available Command Input

/// Input specification for a command.
struct AcpCommandInput: Codable, Hashable {
    let type: String
    let hint: String

    private enum CodingKeys: String, CodingKey {
        case type, hint
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.hint = try container.decode(String.self, forKey: .hint)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(hint, forKey: .hint)
    }
}

// MARK: - Available Command

/// A slash command available in the session.
struct AcpAvailableCommand: Codable, Hashable {
    let name: String
    let description: String
    let input: AcpCommandInput?

    private enum CodingKeys: String, CodingKey {
        case name, description, input
        case meta = "_meta"
    }

    init(name: String, description: String, input: AcpCommandInput? = nil) {
        self.name = name
        self.description = description
        self.input = input
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.name = try container.decode(String.self, forKey: .name)
        self.description = try container.decode(String.self, forKey: .description)
        self.input = try container.decodeIfPresent(AcpCommandInput.self, forKey: .input)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(name, forKey: .name)
        try container.encode(description, forKey: .description)
        try container.encodeIfPresent(input, forKey: .input)
    }
}

// MARK: - Session Config Option

/// A select option value for a session config option.
struct AcpConfigSelectOption: Codable, Hashable {
    let value: String
    let name: String
    let description: String?

    private enum CodingKeys: String, CodingKey {
        case value, name, description
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.value = try container.decode(String.self, forKey: .value)
        self.name = try container.decode(String.self, forKey: .name)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(value, forKey: .value)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
    }
}

/// A group of config select options.
struct AcpConfigSelectGroup: Codable, Hashable {
    let group: String
    let name: String
    let options: [AcpConfigSelectOption]

    private enum CodingKeys: String, CodingKey {
        case group, name, options
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.group = try container.decode(String.self, forKey: .group)
        self.name = try container.decode(String.self, forKey: .name)
        self.options = try container.decode([AcpConfigSelectOption].self, forKey: .options)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(group, forKey: .group)
        try container.encode(name, forKey: .name)
        try container.encode(options, forKey: .options)
    }
}

/// Session configuration options are either flat or grouped select options.
/// The options field in the JSON can be either [AcpConfigSelectOption] or [AcpConfigSelectGroup].
enum AcpConfigSelectOptions: Codable, Hashable {
    case flat([AcpConfigSelectOption])
    case grouped([AcpConfigSelectGroup])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let flat = try? container.decode([AcpConfigSelectOption].self) {
            self = .flat(flat)
        } else if let grouped = try? container.decode([AcpConfigSelectGroup].self) {
            self = .grouped(grouped)
        } else {
            self = .flat([])
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .flat(let options): try container.encode(options)
        case .grouped(let groups): try container.encode(groups)
        }
    }
}

/// A session configuration option (currently only "select" type).
struct AcpSessionConfigOption: Codable, Hashable {
    let type: String
    let id: String
    let name: String
    let description: String?
    let category: String?
    let currentValue: String
    let options: AcpConfigSelectOptions

    private enum CodingKeys: String, CodingKey {
        case type, id, name, description, category, currentValue, options
        case meta = "_meta"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.type = try container.decode(String.self, forKey: .type)
        self.id = try container.decode(String.self, forKey: .id)
        self.name = try container.decode(String.self, forKey: .name)
        self.description = try container.decodeIfPresent(String.self, forKey: .description)
        self.category = try container.decodeIfPresent(String.self, forKey: .category)
        self.currentValue = try container.decode(String.self, forKey: .currentValue)
        self.options = try container.decode(AcpConfigSelectOptions.self, forKey: .options)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(type, forKey: .type)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encodeIfPresent(description, forKey: .description)
        try container.encodeIfPresent(category, forKey: .category)
        try container.encode(currentValue, forKey: .currentValue)
        try container.encode(options, forKey: .options)
    }
}

// MARK: - Cost

/// Cost information for a session.
struct AcpCost: Codable, Hashable {
    let amount: Double
    let currency: String
}

// MARK: - Usage

/// Context window and cost usage for a session.
struct AcpUsage: Codable, Hashable {
    let used: Int
    let size: Int
    let cost: AcpCost?

    init(used: Int, size: Int, cost: AcpCost? = nil) {
        self.used = used
        self.size = size
        self.cost = cost
    }
}
