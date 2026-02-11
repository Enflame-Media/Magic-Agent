//
// HappyProtocol.swift
// Happy
//
// AUTO-GENERATED FILE - DO NOT EDIT
// Generated: 2026-01-04T17:25:32.951Z
// Source: @magic-agent/protocol Zod schemas
//
// Regenerate with:
//   yarn workspace @magic-agent/protocol generate:swift
//
// @see HAP-687 - Set up Zod to Swift type generation for happy-macos
//

import Foundation

// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let gitHubProfile = try GitHubProfile(json)
//   let imageRef = try ImageRef(json)
//   let relationshipStatus = try? JSONDecoder().decode(RelationshipStatus.self, from: jsonData)
//   let userProfile = try UserProfile(json)
//   let feedBody = try FeedBody(json)
//   let encryptedContent = try EncryptedContent(json)
//   let versionedValue = try VersionedValue(json)
//   let nullableVersionedValue = try NullableVersionedValue(json)
//   let aPIUpdateNewSession = try APIUpdateNewSession(json)
//   let aPIUpdateSessionState = try APIUpdateSessionState(json)
//   let aPIDeleteSession = try APIDeleteSession(json)
//   let aPINewMachine = try APINewMachine(json)
//   let aPIUpdateMachineState = try APIUpdateMachineState(json)
//   let aPIMessage = try APIMessage(json)
//   let aPIUpdateNewMessage = try APIUpdateNewMessage(json)
//   let aPINewArtifact = try APINewArtifact(json)
//   let aPIUpdateArtifact = try APIUpdateArtifact(json)
//   let aPIDeleteArtifact = try APIDeleteArtifact(json)
//   let aPIUpdateAccount = try APIUpdateAccount(json)
//   let aPIRelationshipUpdated = try APIRelationshipUpdated(json)
//   let aPINewFeedPost = try APINewFeedPost(json)
//   let aPIKvBatchUpdate = try APIKvBatchUpdate(json)
//   let aPIUpdate = try APIUpdate(json)
//   let aPIEphemeralActivityUpdate = try APIEphemeralActivityUpdate(json)
//   let aPIEphemeralUsageUpdate = try APIEphemeralUsageUpdate(json)
//   let aPIEphemeralMachineActivityUpdate = try APIEphemeralMachineActivityUpdate(json)
//   let aPIEphemeralMachineStatusUpdate = try APIEphemeralMachineStatusUpdate(json)
//   let aPIEphemeralUpdate = try APIEphemeralUpdate(json)
//   let aPIUpdateContainer = try APIUpdateContainer(json)
//   let ephemeralPayload = try EphemeralPayload(json)
//   let sessionSharePermission = try? JSONDecoder().decode(SessionSharePermission.self, from: jsonData)
//   let sessionShareEntry = try SessionShareEntry(json)
//   let sessionShareUrlConfig = try SessionShareUrlConfig(json)
//   let invitationStatus = try? JSONDecoder().decode(InvitationStatus.self, from: jsonData)
//   let sessionShareInvitation = try SessionShareInvitation(json)
//   let sessionShareSettings = try SessionShareSettings(json)
//   let addSessionShareRequest = try AddSessionShareRequest(json)
//   let updateSessionShareRequest = try UpdateSessionShareRequest(json)
//   let removeSessionShareRequest = try RemoveSessionShareRequest(json)
//   let updateUrlSharingRequest = try UpdateUrlSharingRequest(json)
//   let revokeInvitationRequest = try RevokeInvitationRequest(json)
//   let resendInvitationRequest = try ResendInvitationRequest(json)

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

import Foundation

// MARK: - GitHubProfile
public struct GitHubProfile: Codable, Hashable, Sendable {
    public let avatarUrl: String?
    public let bio: String?
    public let email: String?
    public let id: Double
    public let login: String
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case avatarUrl = "avatar_url"
        case bio, email, id, login, name
    }

    public init(avatarUrl: String?, bio: String?, email: String?, id: Double, login: String, name: String?) {
        self.avatarUrl = avatarUrl
        self.bio = bio
        self.email = email
        self.id = id
        self.login = login
        self.name = name
    }
}

// MARK: GitHubProfile convenience initializers and mutators

public extension GitHubProfile {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(GitHubProfile.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatarUrl: String?? = nil,
        bio: String?? = nil,
        email: String?? = nil,
        id: Double? = nil,
        login: String? = nil,
        name: String?? = nil
    ) -> GitHubProfile {
        return GitHubProfile(
            avatarUrl: avatarUrl ?? self.avatarUrl,
            bio: bio ?? self.bio,
            email: email ?? self.email,
            id: id ?? self.id,
            login: login ?? self.login,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - ImageRef
public struct ImageRef: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: ImageRef convenience initializers and mutators

public extension ImageRef {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ImageRef.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> ImageRef {
        return ImageRef(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - UserProfile
public struct UserProfile: Codable, Hashable, Sendable {
    public let avatar: UserProfileAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: UserProfileAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: UserProfile convenience initializers and mutators

public extension UserProfile {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UserProfile.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: UserProfileAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> UserProfile {
        return UserProfile(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - UserProfileAvatar
public struct UserProfileAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: UserProfileAvatar convenience initializers and mutators

public extension UserProfileAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UserProfileAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> UserProfileAvatar {
        return UserProfileAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum RelationshipStatus: String, Codable, Hashable, Sendable {
    case friend = "friend"
    case none = "none"
    case pending = "pending"
    case rejected = "rejected"
    case requested = "requested"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FeedBody
public struct FeedBody: Codable, Hashable, Sendable {
    public let kind: Kind
    public let uid: String?
    public let text: String?

    public init(kind: Kind, uid: String?, text: String?) {
        self.kind = kind
        self.uid = uid
        self.text = text
    }
}

// MARK: FeedBody convenience initializers and mutators

public extension FeedBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FeedBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        kind: Kind? = nil,
        uid: String?? = nil,
        text: String?? = nil
    ) -> FeedBody {
        return FeedBody(
            kind: kind ?? self.kind,
            uid: uid ?? self.uid,
            text: text ?? self.text
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum Kind: String, Codable, Hashable, Sendable {
    case friendAccepted = "friend_accepted"
    case friendRequest = "friend_request"
    case text = "text"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - EncryptedContent
public struct EncryptedContent: Codable, Hashable, Sendable {
    public let c: String
    public let t: EncryptedContentT

    public init(c: String, t: EncryptedContentT) {
        self.c = c
        self.t = t
    }
}

// MARK: EncryptedContent convenience initializers and mutators

public extension EncryptedContent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EncryptedContent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        c: String? = nil,
        t: EncryptedContentT? = nil
    ) -> EncryptedContent {
        return EncryptedContent(
            c: c ?? self.c,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum EncryptedContentT: String, Codable, Hashable, Sendable {
    case encrypted = "encrypted"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - VersionedValue
public struct VersionedValue: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: VersionedValue convenience initializers and mutators

public extension VersionedValue {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(VersionedValue.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> VersionedValue {
        return VersionedValue(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - NullableVersionedValue
public struct NullableVersionedValue: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: NullableVersionedValue convenience initializers and mutators

public extension NullableVersionedValue {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(NullableVersionedValue.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> NullableVersionedValue {
        return NullableVersionedValue(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateNewSession
public struct APIUpdateNewSession: Codable, Hashable, Sendable {
    public let active: Bool
    public let activeAt: Double
    public let agentState: String?
    public let agentStateVersion, createdAt: Double
    public let dataEncryptionKey: String?
    public let metadata: String
    public let metadataVersion, seq: Double
    public let sid: String
    public let t: APIUpdateNewSessionT
    public let updatedAt: Double

    public init(active: Bool, activeAt: Double, agentState: String?, agentStateVersion: Double, createdAt: Double, dataEncryptionKey: String?, metadata: String, metadataVersion: Double, seq: Double, sid: String, t: APIUpdateNewSessionT, updatedAt: Double) {
        self.active = active
        self.activeAt = activeAt
        self.agentState = agentState
        self.agentStateVersion = agentStateVersion
        self.createdAt = createdAt
        self.dataEncryptionKey = dataEncryptionKey
        self.metadata = metadata
        self.metadataVersion = metadataVersion
        self.seq = seq
        self.sid = sid
        self.t = t
        self.updatedAt = updatedAt
    }
}

// MARK: APIUpdateNewSession convenience initializers and mutators

public extension APIUpdateNewSession {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateNewSession.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool? = nil,
        activeAt: Double? = nil,
        agentState: String?? = nil,
        agentStateVersion: Double? = nil,
        createdAt: Double? = nil,
        dataEncryptionKey: String?? = nil,
        metadata: String? = nil,
        metadataVersion: Double? = nil,
        seq: Double? = nil,
        sid: String? = nil,
        t: APIUpdateNewSessionT? = nil,
        updatedAt: Double? = nil
    ) -> APIUpdateNewSession {
        return APIUpdateNewSession(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            agentState: agentState ?? self.agentState,
            agentStateVersion: agentStateVersion ?? self.agentStateVersion,
            createdAt: createdAt ?? self.createdAt,
            dataEncryptionKey: dataEncryptionKey ?? self.dataEncryptionKey,
            metadata: metadata ?? self.metadata,
            metadataVersion: metadataVersion ?? self.metadataVersion,
            seq: seq ?? self.seq,
            sid: sid ?? self.sid,
            t: t ?? self.t,
            updatedAt: updatedAt ?? self.updatedAt
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateNewSessionT: String, Codable, Hashable, Sendable {
    case newSession = "new-session"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateSessionState
public struct APIUpdateSessionState: Codable, Hashable, Sendable {
    public let agentState: APIUpdateSessionStateAgentState?
    public let metadata: APIUpdateSessionStateMetadata?
    public let sid: String
    public let t: APIUpdateSessionStateT

    public init(agentState: APIUpdateSessionStateAgentState?, metadata: APIUpdateSessionStateMetadata?, sid: String, t: APIUpdateSessionStateT) {
        self.agentState = agentState
        self.metadata = metadata
        self.sid = sid
        self.t = t
    }
}

// MARK: APIUpdateSessionState convenience initializers and mutators

public extension APIUpdateSessionState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateSessionState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        agentState: APIUpdateSessionStateAgentState?? = nil,
        metadata: APIUpdateSessionStateMetadata?? = nil,
        sid: String? = nil,
        t: APIUpdateSessionStateT? = nil
    ) -> APIUpdateSessionState {
        return APIUpdateSessionState(
            agentState: agentState ?? self.agentState,
            metadata: metadata ?? self.metadata,
            sid: sid ?? self.sid,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateSessionStateAgentState
public struct APIUpdateSessionStateAgentState: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateSessionStateAgentState convenience initializers and mutators

public extension APIUpdateSessionStateAgentState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateSessionStateAgentState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> APIUpdateSessionStateAgentState {
        return APIUpdateSessionStateAgentState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateSessionStateMetadata
public struct APIUpdateSessionStateMetadata: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateSessionStateMetadata convenience initializers and mutators

public extension APIUpdateSessionStateMetadata {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateSessionStateMetadata.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> APIUpdateSessionStateMetadata {
        return APIUpdateSessionStateMetadata(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateSessionStateT: String, Codable, Hashable, Sendable {
    case updateSession = "update-session"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIDeleteSession
public struct APIDeleteSession: Codable, Hashable, Sendable {
    public let sid: String
    public let t: APIDeleteSessionT

    public init(sid: String, t: APIDeleteSessionT) {
        self.sid = sid
        self.t = t
    }
}

// MARK: APIDeleteSession convenience initializers and mutators

public extension APIDeleteSession {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIDeleteSession.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        sid: String? = nil,
        t: APIDeleteSessionT? = nil
    ) -> APIDeleteSession {
        return APIDeleteSession(
            sid: sid ?? self.sid,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIDeleteSessionT: String, Codable, Hashable, Sendable {
    case deleteSession = "delete-session"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APINewMachine
public struct APINewMachine: Codable, Hashable, Sendable {
    public let active: Bool
    public let activeAt, createdAt: Double
    public let daemonState: String?
    public let daemonStateVersion: Double
    public let dataEncryptionKey: String?
    public let machineId: String
    public let metadata: String
    public let metadataVersion, seq: Double
    public let t: APINewMachineT
    public let updatedAt: Double

    public init(active: Bool, activeAt: Double, createdAt: Double, daemonState: String?, daemonStateVersion: Double, dataEncryptionKey: String?, machineId: String, metadata: String, metadataVersion: Double, seq: Double, t: APINewMachineT, updatedAt: Double) {
        self.active = active
        self.activeAt = activeAt
        self.createdAt = createdAt
        self.daemonState = daemonState
        self.daemonStateVersion = daemonStateVersion
        self.dataEncryptionKey = dataEncryptionKey
        self.machineId = machineId
        self.metadata = metadata
        self.metadataVersion = metadataVersion
        self.seq = seq
        self.t = t
        self.updatedAt = updatedAt
    }
}

// MARK: APINewMachine convenience initializers and mutators

public extension APINewMachine {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APINewMachine.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool? = nil,
        activeAt: Double? = nil,
        createdAt: Double? = nil,
        daemonState: String?? = nil,
        daemonStateVersion: Double? = nil,
        dataEncryptionKey: String?? = nil,
        machineId: String? = nil,
        metadata: String? = nil,
        metadataVersion: Double? = nil,
        seq: Double? = nil,
        t: APINewMachineT? = nil,
        updatedAt: Double? = nil
    ) -> APINewMachine {
        return APINewMachine(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            createdAt: createdAt ?? self.createdAt,
            daemonState: daemonState ?? self.daemonState,
            daemonStateVersion: daemonStateVersion ?? self.daemonStateVersion,
            dataEncryptionKey: dataEncryptionKey ?? self.dataEncryptionKey,
            machineId: machineId ?? self.machineId,
            metadata: metadata ?? self.metadata,
            metadataVersion: metadataVersion ?? self.metadataVersion,
            seq: seq ?? self.seq,
            t: t ?? self.t,
            updatedAt: updatedAt ?? self.updatedAt
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APINewMachineT: String, Codable, Hashable, Sendable {
    case newMachine = "new-machine"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateMachineState
public struct APIUpdateMachineState: Codable, Hashable, Sendable {
    public let active: Bool?
    public let activeAt: Double?
    public let daemonState: APIUpdateMachineStateDaemonState?
    public let machineId: String
    public let metadata: APIUpdateMachineStateMetadata?
    public let t: APIUpdateMachineStateT

    public init(active: Bool?, activeAt: Double?, daemonState: APIUpdateMachineStateDaemonState?, machineId: String, metadata: APIUpdateMachineStateMetadata?, t: APIUpdateMachineStateT) {
        self.active = active
        self.activeAt = activeAt
        self.daemonState = daemonState
        self.machineId = machineId
        self.metadata = metadata
        self.t = t
    }
}

// MARK: APIUpdateMachineState convenience initializers and mutators

public extension APIUpdateMachineState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateMachineState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool?? = nil,
        activeAt: Double?? = nil,
        daemonState: APIUpdateMachineStateDaemonState?? = nil,
        machineId: String? = nil,
        metadata: APIUpdateMachineStateMetadata?? = nil,
        t: APIUpdateMachineStateT? = nil
    ) -> APIUpdateMachineState {
        return APIUpdateMachineState(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            daemonState: daemonState ?? self.daemonState,
            machineId: machineId ?? self.machineId,
            metadata: metadata ?? self.metadata,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateMachineStateDaemonState
public struct APIUpdateMachineStateDaemonState: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateMachineStateDaemonState convenience initializers and mutators

public extension APIUpdateMachineStateDaemonState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateMachineStateDaemonState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> APIUpdateMachineStateDaemonState {
        return APIUpdateMachineStateDaemonState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateMachineStateMetadata
public struct APIUpdateMachineStateMetadata: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateMachineStateMetadata convenience initializers and mutators

public extension APIUpdateMachineStateMetadata {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateMachineStateMetadata.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> APIUpdateMachineStateMetadata {
        return APIUpdateMachineStateMetadata(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateMachineStateT: String, Codable, Hashable, Sendable {
    case updateMachine = "update-machine"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIMessage
public struct APIMessage: Codable, Hashable, Sendable {
    public let content: APIMessageContent
    public let createdAt: Double
    public let id: String
    public let localId: String?
    public let seq: Double

    public init(content: APIMessageContent, createdAt: Double, id: String, localId: String?, seq: Double) {
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.localId = localId
        self.seq = seq
    }
}

// MARK: APIMessage convenience initializers and mutators

public extension APIMessage {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIMessage.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        content: APIMessageContent? = nil,
        createdAt: Double? = nil,
        id: String? = nil,
        localId: String?? = nil,
        seq: Double? = nil
    ) -> APIMessage {
        return APIMessage(
            content: content ?? self.content,
            createdAt: createdAt ?? self.createdAt,
            id: id ?? self.id,
            localId: localId ?? self.localId,
            seq: seq ?? self.seq
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIMessageContent
public struct APIMessageContent: Codable, Hashable, Sendable {
    public let c: String
    public let t: EncryptedContentT

    public init(c: String, t: EncryptedContentT) {
        self.c = c
        self.t = t
    }
}

// MARK: APIMessageContent convenience initializers and mutators

public extension APIMessageContent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIMessageContent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        c: String? = nil,
        t: EncryptedContentT? = nil
    ) -> APIMessageContent {
        return APIMessageContent(
            c: c ?? self.c,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateNewMessage
public struct APIUpdateNewMessage: Codable, Hashable, Sendable {
    public let message: APIUpdateNewMessageMessage
    public let sid: String
    public let t: APIUpdateNewMessageT

    public init(message: APIUpdateNewMessageMessage, sid: String, t: APIUpdateNewMessageT) {
        self.message = message
        self.sid = sid
        self.t = t
    }
}

// MARK: APIUpdateNewMessage convenience initializers and mutators

public extension APIUpdateNewMessage {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateNewMessage.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: APIUpdateNewMessageMessage? = nil,
        sid: String? = nil,
        t: APIUpdateNewMessageT? = nil
    ) -> APIUpdateNewMessage {
        return APIUpdateNewMessage(
            message: message ?? self.message,
            sid: sid ?? self.sid,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateNewMessageMessage
public struct APIUpdateNewMessageMessage: Codable, Hashable, Sendable {
    public let content: PurpleContent
    public let createdAt: Double
    public let id: String
    public let localId: String?
    public let seq: Double

    public init(content: PurpleContent, createdAt: Double, id: String, localId: String?, seq: Double) {
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.localId = localId
        self.seq = seq
    }
}

// MARK: APIUpdateNewMessageMessage convenience initializers and mutators

public extension APIUpdateNewMessageMessage {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateNewMessageMessage.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        content: PurpleContent? = nil,
        createdAt: Double? = nil,
        id: String? = nil,
        localId: String?? = nil,
        seq: Double? = nil
    ) -> APIUpdateNewMessageMessage {
        return APIUpdateNewMessageMessage(
            content: content ?? self.content,
            createdAt: createdAt ?? self.createdAt,
            id: id ?? self.id,
            localId: localId ?? self.localId,
            seq: seq ?? self.seq
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleContent
public struct PurpleContent: Codable, Hashable, Sendable {
    public let c: String
    public let t: EncryptedContentT

    public init(c: String, t: EncryptedContentT) {
        self.c = c
        self.t = t
    }
}

// MARK: PurpleContent convenience initializers and mutators

public extension PurpleContent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleContent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        c: String? = nil,
        t: EncryptedContentT? = nil
    ) -> PurpleContent {
        return PurpleContent(
            c: c ?? self.c,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateNewMessageT: String, Codable, Hashable, Sendable {
    case newMessage = "new-message"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APINewArtifact
public struct APINewArtifact: Codable, Hashable, Sendable {
    public let artifactId: String
    public let body: String?
    public let bodyVersion: Double?
    public let createdAt: Double
    public let dataEncryptionKey: String
    public let header: String
    public let headerVersion, seq: Double
    public let t: APINewArtifactT
    public let updatedAt: Double

    public init(artifactId: String, body: String?, bodyVersion: Double?, createdAt: Double, dataEncryptionKey: String, header: String, headerVersion: Double, seq: Double, t: APINewArtifactT, updatedAt: Double) {
        self.artifactId = artifactId
        self.body = body
        self.bodyVersion = bodyVersion
        self.createdAt = createdAt
        self.dataEncryptionKey = dataEncryptionKey
        self.header = header
        self.headerVersion = headerVersion
        self.seq = seq
        self.t = t
        self.updatedAt = updatedAt
    }
}

// MARK: APINewArtifact convenience initializers and mutators

public extension APINewArtifact {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APINewArtifact.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        artifactId: String? = nil,
        body: String?? = nil,
        bodyVersion: Double?? = nil,
        createdAt: Double? = nil,
        dataEncryptionKey: String? = nil,
        header: String? = nil,
        headerVersion: Double? = nil,
        seq: Double? = nil,
        t: APINewArtifactT? = nil,
        updatedAt: Double? = nil
    ) -> APINewArtifact {
        return APINewArtifact(
            artifactId: artifactId ?? self.artifactId,
            body: body ?? self.body,
            bodyVersion: bodyVersion ?? self.bodyVersion,
            createdAt: createdAt ?? self.createdAt,
            dataEncryptionKey: dataEncryptionKey ?? self.dataEncryptionKey,
            header: header ?? self.header,
            headerVersion: headerVersion ?? self.headerVersion,
            seq: seq ?? self.seq,
            t: t ?? self.t,
            updatedAt: updatedAt ?? self.updatedAt
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APINewArtifactT: String, Codable, Hashable, Sendable {
    case newArtifact = "new-artifact"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateArtifact
public struct APIUpdateArtifact: Codable, Hashable, Sendable {
    public let artifactId: String
    public let body: APIUpdateArtifactBody?
    public let header: APIUpdateArtifactHeader?
    public let t: APIUpdateArtifactT

    public init(artifactId: String, body: APIUpdateArtifactBody?, header: APIUpdateArtifactHeader?, t: APIUpdateArtifactT) {
        self.artifactId = artifactId
        self.body = body
        self.header = header
        self.t = t
    }
}

// MARK: APIUpdateArtifact convenience initializers and mutators

public extension APIUpdateArtifact {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateArtifact.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        artifactId: String? = nil,
        body: APIUpdateArtifactBody?? = nil,
        header: APIUpdateArtifactHeader?? = nil,
        t: APIUpdateArtifactT? = nil
    ) -> APIUpdateArtifact {
        return APIUpdateArtifact(
            artifactId: artifactId ?? self.artifactId,
            body: body ?? self.body,
            header: header ?? self.header,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateArtifactBody
public struct APIUpdateArtifactBody: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateArtifactBody convenience initializers and mutators

public extension APIUpdateArtifactBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateArtifactBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> APIUpdateArtifactBody {
        return APIUpdateArtifactBody(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateArtifactHeader
public struct APIUpdateArtifactHeader: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateArtifactHeader convenience initializers and mutators

public extension APIUpdateArtifactHeader {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateArtifactHeader.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> APIUpdateArtifactHeader {
        return APIUpdateArtifactHeader(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateArtifactT: String, Codable, Hashable, Sendable {
    case updateArtifact = "update-artifact"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIDeleteArtifact
public struct APIDeleteArtifact: Codable, Hashable, Sendable {
    public let artifactId: String
    public let t: APIDeleteArtifactT

    public init(artifactId: String, t: APIDeleteArtifactT) {
        self.artifactId = artifactId
        self.t = t
    }
}

// MARK: APIDeleteArtifact convenience initializers and mutators

public extension APIDeleteArtifact {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIDeleteArtifact.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        artifactId: String? = nil,
        t: APIDeleteArtifactT? = nil
    ) -> APIDeleteArtifact {
        return APIDeleteArtifact(
            artifactId: artifactId ?? self.artifactId,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIDeleteArtifactT: String, Codable, Hashable, Sendable {
    case deleteArtifact = "delete-artifact"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateAccount
public struct APIUpdateAccount: Codable, Hashable, Sendable {
    public let avatar: APIUpdateAccountAvatar?
    public let firstName: String?
    public let github: APIUpdateAccountGithub?
    public let id: String
    public let lastName: String?
    public let settings: APIUpdateAccountSettings?
    public let t: APIUpdateAccountT

    public init(avatar: APIUpdateAccountAvatar?, firstName: String?, github: APIUpdateAccountGithub?, id: String, lastName: String?, settings: APIUpdateAccountSettings?, t: APIUpdateAccountT) {
        self.avatar = avatar
        self.firstName = firstName
        self.github = github
        self.id = id
        self.lastName = lastName
        self.settings = settings
        self.t = t
    }
}

// MARK: APIUpdateAccount convenience initializers and mutators

public extension APIUpdateAccount {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateAccount.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: APIUpdateAccountAvatar?? = nil,
        firstName: String?? = nil,
        github: APIUpdateAccountGithub?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        settings: APIUpdateAccountSettings?? = nil,
        t: APIUpdateAccountT? = nil
    ) -> APIUpdateAccount {
        return APIUpdateAccount(
            avatar: avatar ?? self.avatar,
            firstName: firstName ?? self.firstName,
            github: github ?? self.github,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            settings: settings ?? self.settings,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateAccountAvatar
public struct APIUpdateAccountAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: APIUpdateAccountAvatar convenience initializers and mutators

public extension APIUpdateAccountAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateAccountAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> APIUpdateAccountAvatar {
        return APIUpdateAccountAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateAccountGithub
public struct APIUpdateAccountGithub: Codable, Hashable, Sendable {
    public let avatarUrl: String?
    public let bio: String?
    public let email: String?
    public let id: Double
    public let login: String
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case avatarUrl = "avatar_url"
        case bio, email, id, login, name
    }

    public init(avatarUrl: String?, bio: String?, email: String?, id: Double, login: String, name: String?) {
        self.avatarUrl = avatarUrl
        self.bio = bio
        self.email = email
        self.id = id
        self.login = login
        self.name = name
    }
}

// MARK: APIUpdateAccountGithub convenience initializers and mutators

public extension APIUpdateAccountGithub {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateAccountGithub.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatarUrl: String?? = nil,
        bio: String?? = nil,
        email: String?? = nil,
        id: Double? = nil,
        login: String? = nil,
        name: String?? = nil
    ) -> APIUpdateAccountGithub {
        return APIUpdateAccountGithub(
            avatarUrl: avatarUrl ?? self.avatarUrl,
            bio: bio ?? self.bio,
            email: email ?? self.email,
            id: id ?? self.id,
            login: login ?? self.login,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateAccountSettings
public struct APIUpdateAccountSettings: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateAccountSettings convenience initializers and mutators

public extension APIUpdateAccountSettings {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateAccountSettings.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> APIUpdateAccountSettings {
        return APIUpdateAccountSettings(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateAccountT: String, Codable, Hashable, Sendable {
    case updateAccount = "update-account"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIRelationshipUpdated
public struct APIRelationshipUpdated: Codable, Hashable, Sendable {
    public let action: Action
    public let fromUser: APIRelationshipUpdatedFromUser?
    public let fromUserId: String
    public let status: RelationshipStatus
    public let t: APIRelationshipUpdatedT
    public let timestamp: Double
    public let toUser: APIRelationshipUpdatedToUser?
    public let toUserId: String

    public init(action: Action, fromUser: APIRelationshipUpdatedFromUser?, fromUserId: String, status: RelationshipStatus, t: APIRelationshipUpdatedT, timestamp: Double, toUser: APIRelationshipUpdatedToUser?, toUserId: String) {
        self.action = action
        self.fromUser = fromUser
        self.fromUserId = fromUserId
        self.status = status
        self.t = t
        self.timestamp = timestamp
        self.toUser = toUser
        self.toUserId = toUserId
    }
}

// MARK: APIRelationshipUpdated convenience initializers and mutators

public extension APIRelationshipUpdated {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIRelationshipUpdated.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        action: Action? = nil,
        fromUser: APIRelationshipUpdatedFromUser?? = nil,
        fromUserId: String? = nil,
        status: RelationshipStatus? = nil,
        t: APIRelationshipUpdatedT? = nil,
        timestamp: Double? = nil,
        toUser: APIRelationshipUpdatedToUser?? = nil,
        toUserId: String? = nil
    ) -> APIRelationshipUpdated {
        return APIRelationshipUpdated(
            action: action ?? self.action,
            fromUser: fromUser ?? self.fromUser,
            fromUserId: fromUserId ?? self.fromUserId,
            status: status ?? self.status,
            t: t ?? self.t,
            timestamp: timestamp ?? self.timestamp,
            toUser: toUser ?? self.toUser,
            toUserId: toUserId ?? self.toUserId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum Action: String, Codable, Hashable, Sendable {
    case created = "created"
    case deleted = "deleted"
    case updated = "updated"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIRelationshipUpdatedFromUser
public struct APIRelationshipUpdatedFromUser: Codable, Hashable, Sendable {
    public let avatar: PurpleAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: PurpleAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: APIRelationshipUpdatedFromUser convenience initializers and mutators

public extension APIRelationshipUpdatedFromUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIRelationshipUpdatedFromUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: PurpleAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> APIRelationshipUpdatedFromUser {
        return APIRelationshipUpdatedFromUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleAvatar
public struct PurpleAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: PurpleAvatar convenience initializers and mutators

public extension PurpleAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> PurpleAvatar {
        return PurpleAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIRelationshipUpdatedT: String, Codable, Hashable, Sendable {
    case relationshipUpdated = "relationship-updated"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIRelationshipUpdatedToUser
public struct APIRelationshipUpdatedToUser: Codable, Hashable, Sendable {
    public let avatar: FluffyAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: FluffyAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: APIRelationshipUpdatedToUser convenience initializers and mutators

public extension APIRelationshipUpdatedToUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIRelationshipUpdatedToUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: FluffyAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> APIRelationshipUpdatedToUser {
        return APIRelationshipUpdatedToUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyAvatar
public struct FluffyAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: FluffyAvatar convenience initializers and mutators

public extension FluffyAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> FluffyAvatar {
        return FluffyAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APINewFeedPost
public struct APINewFeedPost: Codable, Hashable, Sendable {
    public let body: APINewFeedPostBody
    public let counter, createdAt: Double
    public let cursor: String
    public let id: String
    public let repeatKey: String?
    public let t: APINewFeedPostT

    public init(body: APINewFeedPostBody, counter: Double, createdAt: Double, cursor: String, id: String, repeatKey: String?, t: APINewFeedPostT) {
        self.body = body
        self.counter = counter
        self.createdAt = createdAt
        self.cursor = cursor
        self.id = id
        self.repeatKey = repeatKey
        self.t = t
    }
}

// MARK: APINewFeedPost convenience initializers and mutators

public extension APINewFeedPost {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APINewFeedPost.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        body: APINewFeedPostBody? = nil,
        counter: Double? = nil,
        createdAt: Double? = nil,
        cursor: String? = nil,
        id: String? = nil,
        repeatKey: String?? = nil,
        t: APINewFeedPostT? = nil
    ) -> APINewFeedPost {
        return APINewFeedPost(
            body: body ?? self.body,
            counter: counter ?? self.counter,
            createdAt: createdAt ?? self.createdAt,
            cursor: cursor ?? self.cursor,
            id: id ?? self.id,
            repeatKey: repeatKey ?? self.repeatKey,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APINewFeedPostBody
public struct APINewFeedPostBody: Codable, Hashable, Sendable {
    public let kind: Kind
    public let uid: String?
    public let text: String?

    public init(kind: Kind, uid: String?, text: String?) {
        self.kind = kind
        self.uid = uid
        self.text = text
    }
}

// MARK: APINewFeedPostBody convenience initializers and mutators

public extension APINewFeedPostBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APINewFeedPostBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        kind: Kind? = nil,
        uid: String?? = nil,
        text: String?? = nil
    ) -> APINewFeedPostBody {
        return APINewFeedPostBody(
            kind: kind ?? self.kind,
            uid: uid ?? self.uid,
            text: text ?? self.text
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APINewFeedPostT: String, Codable, Hashable, Sendable {
    case newFeedPost = "new-feed-post"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIKvBatchUpdate
public struct APIKvBatchUpdate: Codable, Hashable, Sendable {
    public let changes: [APIKvBatchUpdateChange]
    public let t: APIKvBatchUpdateT

    public init(changes: [APIKvBatchUpdateChange], t: APIKvBatchUpdateT) {
        self.changes = changes
        self.t = t
    }
}

// MARK: APIKvBatchUpdate convenience initializers and mutators

public extension APIKvBatchUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIKvBatchUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        changes: [APIKvBatchUpdateChange]? = nil,
        t: APIKvBatchUpdateT? = nil
    ) -> APIKvBatchUpdate {
        return APIKvBatchUpdate(
            changes: changes ?? self.changes,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIKvBatchUpdateChange
public struct APIKvBatchUpdateChange: Codable, Hashable, Sendable {
    public let key: String
    public let value: String?
    public let version: Double

    public init(key: String, value: String?, version: Double) {
        self.key = key
        self.value = value
        self.version = version
    }
}

// MARK: APIKvBatchUpdateChange convenience initializers and mutators

public extension APIKvBatchUpdateChange {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIKvBatchUpdateChange.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        key: String? = nil,
        value: String?? = nil,
        version: Double? = nil
    ) -> APIKvBatchUpdateChange {
        return APIKvBatchUpdateChange(
            key: key ?? self.key,
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIKvBatchUpdateT: String, Codable, Hashable, Sendable {
    case kvBatchUpdate = "kv-batch-update"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdate
public struct APIUpdate: Codable, Hashable, Sendable {
    public let message: APIUpdateMessage?
    public let sid: String?
    public let t: APIUpdateT
    public let active: Bool?
    public let activeAt: Double?
    public let agentState: APIUpdateAgentState?
    public let agentStateVersion, createdAt: Double?
    public let dataEncryptionKey: String?
    public let metadata: APIUpdateMetadata?
    public let metadataVersion, seq, updatedAt, archivedAt: Double?
    public let archiveReason: ArchiveReason?
    public let avatar: APIUpdateAvatar?
    public let firstName: String?
    public let github: APIUpdateGithub?
    public let id: String?
    public let lastName: String?
    public let settings: APIUpdateSettings?
    public let daemonState: APIUpdateDaemonState?
    public let machineId: String?
    public let daemonStateVersion: Double?
    public let artifactId: String?
    public let body: APIUpdateBody?
    public let bodyVersion: Double?
    public let header: APIUpdateHeader?
    public let headerVersion: Double?
    public let action: Action?
    public let fromUser: APIUpdateFromUser?
    public let fromUserId: String?
    public let status: RelationshipStatus?
    public let timestamp: Double?
    public let toUser: APIUpdateToUser?
    public let toUserId: String?
    public let counter: Double?
    public let cursor: String?
    public let repeatKey: String?
    public let changes: [APIUpdateChange]?

    public init(message: APIUpdateMessage?, sid: String?, t: APIUpdateT, active: Bool?, activeAt: Double?, agentState: APIUpdateAgentState?, agentStateVersion: Double?, createdAt: Double?, dataEncryptionKey: String?, metadata: APIUpdateMetadata?, metadataVersion: Double?, seq: Double?, updatedAt: Double?, archivedAt: Double?, archiveReason: ArchiveReason?, avatar: APIUpdateAvatar?, firstName: String?, github: APIUpdateGithub?, id: String?, lastName: String?, settings: APIUpdateSettings?, daemonState: APIUpdateDaemonState?, machineId: String?, daemonStateVersion: Double?, artifactId: String?, body: APIUpdateBody?, bodyVersion: Double?, header: APIUpdateHeader?, headerVersion: Double?, action: Action?, fromUser: APIUpdateFromUser?, fromUserId: String?, status: RelationshipStatus?, timestamp: Double?, toUser: APIUpdateToUser?, toUserId: String?, counter: Double?, cursor: String?, repeatKey: String?, changes: [APIUpdateChange]?) {
        self.message = message
        self.sid = sid
        self.t = t
        self.active = active
        self.activeAt = activeAt
        self.agentState = agentState
        self.agentStateVersion = agentStateVersion
        self.createdAt = createdAt
        self.dataEncryptionKey = dataEncryptionKey
        self.metadata = metadata
        self.metadataVersion = metadataVersion
        self.seq = seq
        self.updatedAt = updatedAt
        self.archivedAt = archivedAt
        self.archiveReason = archiveReason
        self.avatar = avatar
        self.firstName = firstName
        self.github = github
        self.id = id
        self.lastName = lastName
        self.settings = settings
        self.daemonState = daemonState
        self.machineId = machineId
        self.daemonStateVersion = daemonStateVersion
        self.artifactId = artifactId
        self.body = body
        self.bodyVersion = bodyVersion
        self.header = header
        self.headerVersion = headerVersion
        self.action = action
        self.fromUser = fromUser
        self.fromUserId = fromUserId
        self.status = status
        self.timestamp = timestamp
        self.toUser = toUser
        self.toUserId = toUserId
        self.counter = counter
        self.cursor = cursor
        self.repeatKey = repeatKey
        self.changes = changes
    }
}

// MARK: APIUpdate convenience initializers and mutators

public extension APIUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: APIUpdateMessage?? = nil,
        sid: String?? = nil,
        t: APIUpdateT? = nil,
        active: Bool?? = nil,
        activeAt: Double?? = nil,
        agentState: APIUpdateAgentState?? = nil,
        agentStateVersion: Double?? = nil,
        createdAt: Double?? = nil,
        dataEncryptionKey: String?? = nil,
        metadata: APIUpdateMetadata?? = nil,
        metadataVersion: Double?? = nil,
        seq: Double?? = nil,
        updatedAt: Double?? = nil,
        archivedAt: Double?? = nil,
        archiveReason: ArchiveReason?? = nil,
        avatar: APIUpdateAvatar?? = nil,
        firstName: String?? = nil,
        github: APIUpdateGithub?? = nil,
        id: String?? = nil,
        lastName: String?? = nil,
        settings: APIUpdateSettings?? = nil,
        daemonState: APIUpdateDaemonState?? = nil,
        machineId: String?? = nil,
        daemonStateVersion: Double?? = nil,
        artifactId: String?? = nil,
        body: APIUpdateBody?? = nil,
        bodyVersion: Double?? = nil,
        header: APIUpdateHeader?? = nil,
        headerVersion: Double?? = nil,
        action: Action?? = nil,
        fromUser: APIUpdateFromUser?? = nil,
        fromUserId: String?? = nil,
        status: RelationshipStatus?? = nil,
        timestamp: Double?? = nil,
        toUser: APIUpdateToUser?? = nil,
        toUserId: String?? = nil,
        counter: Double?? = nil,
        cursor: String?? = nil,
        repeatKey: String?? = nil,
        changes: [APIUpdateChange]?? = nil
    ) -> APIUpdate {
        return APIUpdate(
            message: message ?? self.message,
            sid: sid ?? self.sid,
            t: t ?? self.t,
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            agentState: agentState ?? self.agentState,
            agentStateVersion: agentStateVersion ?? self.agentStateVersion,
            createdAt: createdAt ?? self.createdAt,
            dataEncryptionKey: dataEncryptionKey ?? self.dataEncryptionKey,
            metadata: metadata ?? self.metadata,
            metadataVersion: metadataVersion ?? self.metadataVersion,
            seq: seq ?? self.seq,
            updatedAt: updatedAt ?? self.updatedAt,
            archivedAt: archivedAt ?? self.archivedAt,
            archiveReason: archiveReason ?? self.archiveReason,
            avatar: avatar ?? self.avatar,
            firstName: firstName ?? self.firstName,
            github: github ?? self.github,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            settings: settings ?? self.settings,
            daemonState: daemonState ?? self.daemonState,
            machineId: machineId ?? self.machineId,
            daemonStateVersion: daemonStateVersion ?? self.daemonStateVersion,
            artifactId: artifactId ?? self.artifactId,
            body: body ?? self.body,
            bodyVersion: bodyVersion ?? self.bodyVersion,
            header: header ?? self.header,
            headerVersion: headerVersion ?? self.headerVersion,
            action: action ?? self.action,
            fromUser: fromUser ?? self.fromUser,
            fromUserId: fromUserId ?? self.fromUserId,
            status: status ?? self.status,
            timestamp: timestamp ?? self.timestamp,
            toUser: toUser ?? self.toUser,
            toUserId: toUserId ?? self.toUserId,
            counter: counter ?? self.counter,
            cursor: cursor ?? self.cursor,
            repeatKey: repeatKey ?? self.repeatKey,
            changes: changes ?? self.changes
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateAgentState: Codable, Hashable, Sendable {
    case purpleAgentState(PurpleAgentState)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(PurpleAgentState.self) {
            self = .purpleAgentState(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(APIUpdateAgentState.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for APIUpdateAgentState"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .purpleAgentState(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleAgentState
public struct PurpleAgentState: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: PurpleAgentState convenience initializers and mutators

public extension PurpleAgentState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleAgentState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> PurpleAgentState {
        return PurpleAgentState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum ArchiveReason: String, Codable, Hashable, Sendable {
    case revivalFailed = "revival_failed"
    case timeout = "timeout"
    case userRequested = "user_requested"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateAvatar
public struct APIUpdateAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: APIUpdateAvatar convenience initializers and mutators

public extension APIUpdateAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> APIUpdateAvatar {
        return APIUpdateAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateBody: Codable, Hashable, Sendable {
    case purpleBody(PurpleBody)
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(PurpleBody.self) {
            self = .purpleBody(x)
            return
        }
        throw DecodingError.typeMismatch(APIUpdateBody.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for APIUpdateBody"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .purpleBody(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleBody
public struct PurpleBody: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double?
    public let kind: Kind?
    public let uid: String?
    public let text: String?

    public init(value: String?, version: Double?, kind: Kind?, uid: String?, text: String?) {
        self.value = value
        self.version = version
        self.kind = kind
        self.uid = uid
        self.text = text
    }
}

// MARK: PurpleBody convenience initializers and mutators

public extension PurpleBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double?? = nil,
        kind: Kind?? = nil,
        uid: String?? = nil,
        text: String?? = nil
    ) -> PurpleBody {
        return PurpleBody(
            value: value ?? self.value,
            version: version ?? self.version,
            kind: kind ?? self.kind,
            uid: uid ?? self.uid,
            text: text ?? self.text
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateChange
public struct APIUpdateChange: Codable, Hashable, Sendable {
    public let key: String
    public let value: String?
    public let version: Double

    public init(key: String, value: String?, version: Double) {
        self.key = key
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateChange convenience initializers and mutators

public extension APIUpdateChange {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateChange.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        key: String? = nil,
        value: String?? = nil,
        version: Double? = nil
    ) -> APIUpdateChange {
        return APIUpdateChange(
            key: key ?? self.key,
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateDaemonState: Codable, Hashable, Sendable {
    case purpleDaemonState(PurpleDaemonState)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(PurpleDaemonState.self) {
            self = .purpleDaemonState(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(APIUpdateDaemonState.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for APIUpdateDaemonState"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .purpleDaemonState(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleDaemonState
public struct PurpleDaemonState: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: PurpleDaemonState convenience initializers and mutators

public extension PurpleDaemonState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleDaemonState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> PurpleDaemonState {
        return PurpleDaemonState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateFromUser
public struct APIUpdateFromUser: Codable, Hashable, Sendable {
    public let avatar: TentacledAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: TentacledAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: APIUpdateFromUser convenience initializers and mutators

public extension APIUpdateFromUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateFromUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: TentacledAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> APIUpdateFromUser {
        return APIUpdateFromUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - TentacledAvatar
public struct TentacledAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: TentacledAvatar convenience initializers and mutators

public extension TentacledAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TentacledAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> TentacledAvatar {
        return TentacledAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateGithub
public struct APIUpdateGithub: Codable, Hashable, Sendable {
    public let avatarUrl: String?
    public let bio: String?
    public let email: String?
    public let id: Double
    public let login: String
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case avatarUrl = "avatar_url"
        case bio, email, id, login, name
    }

    public init(avatarUrl: String?, bio: String?, email: String?, id: Double, login: String, name: String?) {
        self.avatarUrl = avatarUrl
        self.bio = bio
        self.email = email
        self.id = id
        self.login = login
        self.name = name
    }
}

// MARK: APIUpdateGithub convenience initializers and mutators

public extension APIUpdateGithub {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateGithub.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatarUrl: String?? = nil,
        bio: String?? = nil,
        email: String?? = nil,
        id: Double? = nil,
        login: String? = nil,
        name: String?? = nil
    ) -> APIUpdateGithub {
        return APIUpdateGithub(
            avatarUrl: avatarUrl ?? self.avatarUrl,
            bio: bio ?? self.bio,
            email: email ?? self.email,
            id: id ?? self.id,
            login: login ?? self.login,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateHeader: Codable, Hashable, Sendable {
    case purpleHeader(PurpleHeader)
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(PurpleHeader.self) {
            self = .purpleHeader(x)
            return
        }
        throw DecodingError.typeMismatch(APIUpdateHeader.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for APIUpdateHeader"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .purpleHeader(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleHeader
public struct PurpleHeader: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: PurpleHeader convenience initializers and mutators

public extension PurpleHeader {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleHeader.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> PurpleHeader {
        return PurpleHeader(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateMessage
public struct APIUpdateMessage: Codable, Hashable, Sendable {
    public let content: FluffyContent
    public let createdAt: Double
    public let id: String
    public let localId: String?
    public let seq: Double

    public init(content: FluffyContent, createdAt: Double, id: String, localId: String?, seq: Double) {
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.localId = localId
        self.seq = seq
    }
}

// MARK: APIUpdateMessage convenience initializers and mutators

public extension APIUpdateMessage {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateMessage.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        content: FluffyContent? = nil,
        createdAt: Double? = nil,
        id: String? = nil,
        localId: String?? = nil,
        seq: Double? = nil
    ) -> APIUpdateMessage {
        return APIUpdateMessage(
            content: content ?? self.content,
            createdAt: createdAt ?? self.createdAt,
            id: id ?? self.id,
            localId: localId ?? self.localId,
            seq: seq ?? self.seq
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyContent
public struct FluffyContent: Codable, Hashable, Sendable {
    public let c: String
    public let t: EncryptedContentT

    public init(c: String, t: EncryptedContentT) {
        self.c = c
        self.t = t
    }
}

// MARK: FluffyContent convenience initializers and mutators

public extension FluffyContent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyContent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        c: String? = nil,
        t: EncryptedContentT? = nil
    ) -> FluffyContent {
        return FluffyContent(
            c: c ?? self.c,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateMetadata: Codable, Hashable, Sendable {
    case purpleMetadata(PurpleMetadata)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(PurpleMetadata.self) {
            self = .purpleMetadata(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(APIUpdateMetadata.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for APIUpdateMetadata"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .purpleMetadata(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - PurpleMetadata
public struct PurpleMetadata: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: PurpleMetadata convenience initializers and mutators

public extension PurpleMetadata {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(PurpleMetadata.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> PurpleMetadata {
        return PurpleMetadata(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateSettings
public struct APIUpdateSettings: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: APIUpdateSettings convenience initializers and mutators

public extension APIUpdateSettings {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateSettings.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> APIUpdateSettings {
        return APIUpdateSettings(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIUpdateT: String, Codable, Hashable, Sendable {
    case archiveSession = "archive-session"
    case deleteArtifact = "delete-artifact"
    case deleteSession = "delete-session"
    case kvBatchUpdate = "kv-batch-update"
    case newArtifact = "new-artifact"
    case newFeedPost = "new-feed-post"
    case newMachine = "new-machine"
    case newMessage = "new-message"
    case newSession = "new-session"
    case relationshipUpdated = "relationship-updated"
    case updateAccount = "update-account"
    case updateArtifact = "update-artifact"
    case updateMachine = "update-machine"
    case updateSession = "update-session"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateToUser
public struct APIUpdateToUser: Codable, Hashable, Sendable {
    public let avatar: StickyAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: StickyAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: APIUpdateToUser convenience initializers and mutators

public extension APIUpdateToUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateToUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: StickyAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> APIUpdateToUser {
        return APIUpdateToUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - StickyAvatar
public struct StickyAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: StickyAvatar convenience initializers and mutators

public extension StickyAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(StickyAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> StickyAvatar {
        return StickyAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIEphemeralActivityUpdate
public struct APIEphemeralActivityUpdate: Codable, Hashable, Sendable {
    public let active: Bool
    public let activeAt: Double
    public let sid: String
    public let thinking: Bool
    public let type: APIEphemeralActivityUpdateType

    public init(active: Bool, activeAt: Double, sid: String, thinking: Bool, type: APIEphemeralActivityUpdateType) {
        self.active = active
        self.activeAt = activeAt
        self.sid = sid
        self.thinking = thinking
        self.type = type
    }
}

// MARK: APIEphemeralActivityUpdate convenience initializers and mutators

public extension APIEphemeralActivityUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIEphemeralActivityUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool? = nil,
        activeAt: Double? = nil,
        sid: String? = nil,
        thinking: Bool? = nil,
        type: APIEphemeralActivityUpdateType? = nil
    ) -> APIEphemeralActivityUpdate {
        return APIEphemeralActivityUpdate(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            sid: sid ?? self.sid,
            thinking: thinking ?? self.thinking,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIEphemeralActivityUpdateType: String, Codable, Hashable, Sendable {
    case activity = "activity"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIEphemeralUsageUpdate
public struct APIEphemeralUsageUpdate: Codable, Hashable, Sendable {
    public let cost: [String: Double]
    public let key: String
    public let sid: String
    public let timestamp: Double
    public let tokens: [String: Double]
    public let type: APIEphemeralUsageUpdateType

    public init(cost: [String: Double], key: String, sid: String, timestamp: Double, tokens: [String: Double], type: APIEphemeralUsageUpdateType) {
        self.cost = cost
        self.key = key
        self.sid = sid
        self.timestamp = timestamp
        self.tokens = tokens
        self.type = type
    }
}

// MARK: APIEphemeralUsageUpdate convenience initializers and mutators

public extension APIEphemeralUsageUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIEphemeralUsageUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        cost: [String: Double]? = nil,
        key: String? = nil,
        sid: String? = nil,
        timestamp: Double? = nil,
        tokens: [String: Double]? = nil,
        type: APIEphemeralUsageUpdateType? = nil
    ) -> APIEphemeralUsageUpdate {
        return APIEphemeralUsageUpdate(
            cost: cost ?? self.cost,
            key: key ?? self.key,
            sid: sid ?? self.sid,
            timestamp: timestamp ?? self.timestamp,
            tokens: tokens ?? self.tokens,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIEphemeralUsageUpdateType: String, Codable, Hashable, Sendable {
    case usage = "usage"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIEphemeralMachineActivityUpdate
public struct APIEphemeralMachineActivityUpdate: Codable, Hashable, Sendable {
    public let active: Bool
    public let activeAt: Double
    public let machineId: String
    public let type: APIEphemeralMachineActivityUpdateType

    public init(active: Bool, activeAt: Double, machineId: String, type: APIEphemeralMachineActivityUpdateType) {
        self.active = active
        self.activeAt = activeAt
        self.machineId = machineId
        self.type = type
    }
}

// MARK: APIEphemeralMachineActivityUpdate convenience initializers and mutators

public extension APIEphemeralMachineActivityUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIEphemeralMachineActivityUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool? = nil,
        activeAt: Double? = nil,
        machineId: String? = nil,
        type: APIEphemeralMachineActivityUpdateType? = nil
    ) -> APIEphemeralMachineActivityUpdate {
        return APIEphemeralMachineActivityUpdate(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            machineId: machineId ?? self.machineId,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIEphemeralMachineActivityUpdateType: String, Codable, Hashable, Sendable {
    case machineActivity = "machine-activity"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIEphemeralMachineStatusUpdate
public struct APIEphemeralMachineStatusUpdate: Codable, Hashable, Sendable {
    public let machineId: String
    public let online: Bool
    public let timestamp: Double
    public let type: APIEphemeralMachineStatusUpdateType

    public init(machineId: String, online: Bool, timestamp: Double, type: APIEphemeralMachineStatusUpdateType) {
        self.machineId = machineId
        self.online = online
        self.timestamp = timestamp
        self.type = type
    }
}

// MARK: APIEphemeralMachineStatusUpdate convenience initializers and mutators

public extension APIEphemeralMachineStatusUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIEphemeralMachineStatusUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        machineId: String? = nil,
        online: Bool? = nil,
        timestamp: Double? = nil,
        type: APIEphemeralMachineStatusUpdateType? = nil
    ) -> APIEphemeralMachineStatusUpdate {
        return APIEphemeralMachineStatusUpdate(
            machineId: machineId ?? self.machineId,
            online: online ?? self.online,
            timestamp: timestamp ?? self.timestamp,
            type: type ?? self.type
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIEphemeralMachineStatusUpdateType: String, Codable, Hashable, Sendable {
    case machineStatus = "machine-status"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIEphemeralUpdate
public struct APIEphemeralUpdate: Codable, Hashable, Sendable {
    public let active: Bool?
    public let activeAt: Double?
    public let sid: String?
    public let thinking: Bool?
    public let type: APIEphemeralUpdateType
    public let cost: [String: Double]?
    public let key: String?
    public let timestamp: Double?
    public let tokens: [String: Double]?
    public let machineId: String?
    public let online, isOnline: Bool?
    public let lastSeen: Date?
    public let userId: String?

    public init(active: Bool?, activeAt: Double?, sid: String?, thinking: Bool?, type: APIEphemeralUpdateType, cost: [String: Double]?, key: String?, timestamp: Double?, tokens: [String: Double]?, machineId: String?, online: Bool?, isOnline: Bool?, lastSeen: Date?, userId: String?) {
        self.active = active
        self.activeAt = activeAt
        self.sid = sid
        self.thinking = thinking
        self.type = type
        self.cost = cost
        self.key = key
        self.timestamp = timestamp
        self.tokens = tokens
        self.machineId = machineId
        self.online = online
        self.isOnline = isOnline
        self.lastSeen = lastSeen
        self.userId = userId
    }
}

// MARK: APIEphemeralUpdate convenience initializers and mutators

public extension APIEphemeralUpdate {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIEphemeralUpdate.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool?? = nil,
        activeAt: Double?? = nil,
        sid: String?? = nil,
        thinking: Bool?? = nil,
        type: APIEphemeralUpdateType? = nil,
        cost: [String: Double]?? = nil,
        key: String?? = nil,
        timestamp: Double?? = nil,
        tokens: [String: Double]?? = nil,
        machineId: String?? = nil,
        online: Bool?? = nil,
        isOnline: Bool?? = nil,
        lastSeen: Date?? = nil,
        userId: String?? = nil
    ) -> APIEphemeralUpdate {
        return APIEphemeralUpdate(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            sid: sid ?? self.sid,
            thinking: thinking ?? self.thinking,
            type: type ?? self.type,
            cost: cost ?? self.cost,
            key: key ?? self.key,
            timestamp: timestamp ?? self.timestamp,
            tokens: tokens ?? self.tokens,
            machineId: machineId ?? self.machineId,
            online: online ?? self.online,
            isOnline: isOnline ?? self.isOnline,
            lastSeen: lastSeen ?? self.lastSeen,
            userId: userId ?? self.userId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum APIEphemeralUpdateType: String, Codable, Hashable, Sendable {
    case activity = "activity"
    case friendStatus = "friend-status"
    case machineActivity = "machine-activity"
    case machineStatus = "machine-status"
    case usage = "usage"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateContainer
public struct APIUpdateContainer: Codable, Hashable, Sendable {
    public let body: APIUpdateContainerBody
    public let createdAt: Double
    public let id: String
    public let seq: Double

    public init(body: APIUpdateContainerBody, createdAt: Double, id: String, seq: Double) {
        self.body = body
        self.createdAt = createdAt
        self.id = id
        self.seq = seq
    }
}

// MARK: APIUpdateContainer convenience initializers and mutators

public extension APIUpdateContainer {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateContainer.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        body: APIUpdateContainerBody? = nil,
        createdAt: Double? = nil,
        id: String? = nil,
        seq: Double? = nil
    ) -> APIUpdateContainer {
        return APIUpdateContainer(
            body: body ?? self.body,
            createdAt: createdAt ?? self.createdAt,
            id: id ?? self.id,
            seq: seq ?? self.seq
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - APIUpdateContainerBody
public struct APIUpdateContainerBody: Codable, Hashable, Sendable {
    public let message: BodyMessage?
    public let sid: String?
    public let t: APIUpdateT
    public let active: Bool?
    public let activeAt: Double?
    public let agentState: BodyAgentState?
    public let agentStateVersion, createdAt: Double?
    public let dataEncryptionKey: String?
    public let metadata: BodyMetadata?
    public let metadataVersion, seq, updatedAt, archivedAt: Double?
    public let archiveReason: ArchiveReason?
    public let avatar: BodyAvatar?
    public let firstName: String?
    public let github: BodyGithub?
    public let id: String?
    public let lastName: String?
    public let settings: BodySettings?
    public let daemonState: BodyDaemonState?
    public let machineId: String?
    public let daemonStateVersion: Double?
    public let artifactId: String?
    public let body: BodyBodyUnion?
    public let bodyVersion: Double?
    public let header: BodyHeader?
    public let headerVersion: Double?
    public let action: Action?
    public let fromUser: BodyFromUser?
    public let fromUserId: String?
    public let status: RelationshipStatus?
    public let timestamp: Double?
    public let toUser: BodyToUser?
    public let toUserId: String?
    public let counter: Double?
    public let cursor: String?
    public let repeatKey: String?
    public let changes: [BodyChange]?

    public init(message: BodyMessage?, sid: String?, t: APIUpdateT, active: Bool?, activeAt: Double?, agentState: BodyAgentState?, agentStateVersion: Double?, createdAt: Double?, dataEncryptionKey: String?, metadata: BodyMetadata?, metadataVersion: Double?, seq: Double?, updatedAt: Double?, archivedAt: Double?, archiveReason: ArchiveReason?, avatar: BodyAvatar?, firstName: String?, github: BodyGithub?, id: String?, lastName: String?, settings: BodySettings?, daemonState: BodyDaemonState?, machineId: String?, daemonStateVersion: Double?, artifactId: String?, body: BodyBodyUnion?, bodyVersion: Double?, header: BodyHeader?, headerVersion: Double?, action: Action?, fromUser: BodyFromUser?, fromUserId: String?, status: RelationshipStatus?, timestamp: Double?, toUser: BodyToUser?, toUserId: String?, counter: Double?, cursor: String?, repeatKey: String?, changes: [BodyChange]?) {
        self.message = message
        self.sid = sid
        self.t = t
        self.active = active
        self.activeAt = activeAt
        self.agentState = agentState
        self.agentStateVersion = agentStateVersion
        self.createdAt = createdAt
        self.dataEncryptionKey = dataEncryptionKey
        self.metadata = metadata
        self.metadataVersion = metadataVersion
        self.seq = seq
        self.updatedAt = updatedAt
        self.archivedAt = archivedAt
        self.archiveReason = archiveReason
        self.avatar = avatar
        self.firstName = firstName
        self.github = github
        self.id = id
        self.lastName = lastName
        self.settings = settings
        self.daemonState = daemonState
        self.machineId = machineId
        self.daemonStateVersion = daemonStateVersion
        self.artifactId = artifactId
        self.body = body
        self.bodyVersion = bodyVersion
        self.header = header
        self.headerVersion = headerVersion
        self.action = action
        self.fromUser = fromUser
        self.fromUserId = fromUserId
        self.status = status
        self.timestamp = timestamp
        self.toUser = toUser
        self.toUserId = toUserId
        self.counter = counter
        self.cursor = cursor
        self.repeatKey = repeatKey
        self.changes = changes
    }
}

// MARK: APIUpdateContainerBody convenience initializers and mutators

public extension APIUpdateContainerBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(APIUpdateContainerBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        message: BodyMessage?? = nil,
        sid: String?? = nil,
        t: APIUpdateT? = nil,
        active: Bool?? = nil,
        activeAt: Double?? = nil,
        agentState: BodyAgentState?? = nil,
        agentStateVersion: Double?? = nil,
        createdAt: Double?? = nil,
        dataEncryptionKey: String?? = nil,
        metadata: BodyMetadata?? = nil,
        metadataVersion: Double?? = nil,
        seq: Double?? = nil,
        updatedAt: Double?? = nil,
        archivedAt: Double?? = nil,
        archiveReason: ArchiveReason?? = nil,
        avatar: BodyAvatar?? = nil,
        firstName: String?? = nil,
        github: BodyGithub?? = nil,
        id: String?? = nil,
        lastName: String?? = nil,
        settings: BodySettings?? = nil,
        daemonState: BodyDaemonState?? = nil,
        machineId: String?? = nil,
        daemonStateVersion: Double?? = nil,
        artifactId: String?? = nil,
        body: BodyBodyUnion?? = nil,
        bodyVersion: Double?? = nil,
        header: BodyHeader?? = nil,
        headerVersion: Double?? = nil,
        action: Action?? = nil,
        fromUser: BodyFromUser?? = nil,
        fromUserId: String?? = nil,
        status: RelationshipStatus?? = nil,
        timestamp: Double?? = nil,
        toUser: BodyToUser?? = nil,
        toUserId: String?? = nil,
        counter: Double?? = nil,
        cursor: String?? = nil,
        repeatKey: String?? = nil,
        changes: [BodyChange]?? = nil
    ) -> APIUpdateContainerBody {
        return APIUpdateContainerBody(
            message: message ?? self.message,
            sid: sid ?? self.sid,
            t: t ?? self.t,
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            agentState: agentState ?? self.agentState,
            agentStateVersion: agentStateVersion ?? self.agentStateVersion,
            createdAt: createdAt ?? self.createdAt,
            dataEncryptionKey: dataEncryptionKey ?? self.dataEncryptionKey,
            metadata: metadata ?? self.metadata,
            metadataVersion: metadataVersion ?? self.metadataVersion,
            seq: seq ?? self.seq,
            updatedAt: updatedAt ?? self.updatedAt,
            archivedAt: archivedAt ?? self.archivedAt,
            archiveReason: archiveReason ?? self.archiveReason,
            avatar: avatar ?? self.avatar,
            firstName: firstName ?? self.firstName,
            github: github ?? self.github,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            settings: settings ?? self.settings,
            daemonState: daemonState ?? self.daemonState,
            machineId: machineId ?? self.machineId,
            daemonStateVersion: daemonStateVersion ?? self.daemonStateVersion,
            artifactId: artifactId ?? self.artifactId,
            body: body ?? self.body,
            bodyVersion: bodyVersion ?? self.bodyVersion,
            header: header ?? self.header,
            headerVersion: headerVersion ?? self.headerVersion,
            action: action ?? self.action,
            fromUser: fromUser ?? self.fromUser,
            fromUserId: fromUserId ?? self.fromUserId,
            status: status ?? self.status,
            timestamp: timestamp ?? self.timestamp,
            toUser: toUser ?? self.toUser,
            toUserId: toUserId ?? self.toUserId,
            counter: counter ?? self.counter,
            cursor: cursor ?? self.cursor,
            repeatKey: repeatKey ?? self.repeatKey,
            changes: changes ?? self.changes
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum BodyAgentState: Codable, Hashable, Sendable {
    case fluffyAgentState(FluffyAgentState)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(FluffyAgentState.self) {
            self = .fluffyAgentState(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(BodyAgentState.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for BodyAgentState"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .fluffyAgentState(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyAgentState
public struct FluffyAgentState: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: FluffyAgentState convenience initializers and mutators

public extension FluffyAgentState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyAgentState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> FluffyAgentState {
        return FluffyAgentState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyAvatar
public struct BodyAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: BodyAvatar convenience initializers and mutators

public extension BodyAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> BodyAvatar {
        return BodyAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum BodyBodyUnion: Codable, Hashable, Sendable {
    case fluffyBody(FluffyBody)
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(FluffyBody.self) {
            self = .fluffyBody(x)
            return
        }
        throw DecodingError.typeMismatch(BodyBodyUnion.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for BodyBodyUnion"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .fluffyBody(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyBody
public struct FluffyBody: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double?
    public let kind: Kind?
    public let uid: String?
    public let text: String?

    public init(value: String?, version: Double?, kind: Kind?, uid: String?, text: String?) {
        self.value = value
        self.version = version
        self.kind = kind
        self.uid = uid
        self.text = text
    }
}

// MARK: FluffyBody convenience initializers and mutators

public extension FluffyBody {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyBody.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double?? = nil,
        kind: Kind?? = nil,
        uid: String?? = nil,
        text: String?? = nil
    ) -> FluffyBody {
        return FluffyBody(
            value: value ?? self.value,
            version: version ?? self.version,
            kind: kind ?? self.kind,
            uid: uid ?? self.uid,
            text: text ?? self.text
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyChange
public struct BodyChange: Codable, Hashable, Sendable {
    public let key: String
    public let value: String?
    public let version: Double

    public init(key: String, value: String?, version: Double) {
        self.key = key
        self.value = value
        self.version = version
    }
}

// MARK: BodyChange convenience initializers and mutators

public extension BodyChange {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyChange.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        key: String? = nil,
        value: String?? = nil,
        version: Double? = nil
    ) -> BodyChange {
        return BodyChange(
            key: key ?? self.key,
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum BodyDaemonState: Codable, Hashable, Sendable {
    case fluffyDaemonState(FluffyDaemonState)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(FluffyDaemonState.self) {
            self = .fluffyDaemonState(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(BodyDaemonState.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for BodyDaemonState"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .fluffyDaemonState(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyDaemonState
public struct FluffyDaemonState: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: FluffyDaemonState convenience initializers and mutators

public extension FluffyDaemonState {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyDaemonState.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> FluffyDaemonState {
        return FluffyDaemonState(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyFromUser
public struct BodyFromUser: Codable, Hashable, Sendable {
    public let avatar: IndigoAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: IndigoAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: BodyFromUser convenience initializers and mutators

public extension BodyFromUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyFromUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: IndigoAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> BodyFromUser {
        return BodyFromUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - IndigoAvatar
public struct IndigoAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: IndigoAvatar convenience initializers and mutators

public extension IndigoAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(IndigoAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> IndigoAvatar {
        return IndigoAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyGithub
public struct BodyGithub: Codable, Hashable, Sendable {
    public let avatarUrl: String?
    public let bio: String?
    public let email: String?
    public let id: Double
    public let login: String
    public let name: String?

    public enum CodingKeys: String, CodingKey {
        case avatarUrl = "avatar_url"
        case bio, email, id, login, name
    }

    public init(avatarUrl: String?, bio: String?, email: String?, id: Double, login: String, name: String?) {
        self.avatarUrl = avatarUrl
        self.bio = bio
        self.email = email
        self.id = id
        self.login = login
        self.name = name
    }
}

// MARK: BodyGithub convenience initializers and mutators

public extension BodyGithub {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyGithub.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatarUrl: String?? = nil,
        bio: String?? = nil,
        email: String?? = nil,
        id: Double? = nil,
        login: String? = nil,
        name: String?? = nil
    ) -> BodyGithub {
        return BodyGithub(
            avatarUrl: avatarUrl ?? self.avatarUrl,
            bio: bio ?? self.bio,
            email: email ?? self.email,
            id: id ?? self.id,
            login: login ?? self.login,
            name: name ?? self.name
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum BodyHeader: Codable, Hashable, Sendable {
    case fluffyHeader(FluffyHeader)
    case string(String)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(FluffyHeader.self) {
            self = .fluffyHeader(x)
            return
        }
        throw DecodingError.typeMismatch(BodyHeader.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for BodyHeader"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .fluffyHeader(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyHeader
public struct FluffyHeader: Codable, Hashable, Sendable {
    public let value: String
    public let version: Double

    public init(value: String, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: FluffyHeader convenience initializers and mutators

public extension FluffyHeader {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyHeader.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String? = nil,
        version: Double? = nil
    ) -> FluffyHeader {
        return FluffyHeader(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyMessage
public struct BodyMessage: Codable, Hashable, Sendable {
    public let content: TentacledContent
    public let createdAt: Double
    public let id: String
    public let localId: String?
    public let seq: Double

    public init(content: TentacledContent, createdAt: Double, id: String, localId: String?, seq: Double) {
        self.content = content
        self.createdAt = createdAt
        self.id = id
        self.localId = localId
        self.seq = seq
    }
}

// MARK: BodyMessage convenience initializers and mutators

public extension BodyMessage {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyMessage.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        content: TentacledContent? = nil,
        createdAt: Double? = nil,
        id: String? = nil,
        localId: String?? = nil,
        seq: Double? = nil
    ) -> BodyMessage {
        return BodyMessage(
            content: content ?? self.content,
            createdAt: createdAt ?? self.createdAt,
            id: id ?? self.id,
            localId: localId ?? self.localId,
            seq: seq ?? self.seq
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - TentacledContent
public struct TentacledContent: Codable, Hashable, Sendable {
    public let c: String
    public let t: EncryptedContentT

    public init(c: String, t: EncryptedContentT) {
        self.c = c
        self.t = t
    }
}

// MARK: TentacledContent convenience initializers and mutators

public extension TentacledContent {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(TentacledContent.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        c: String? = nil,
        t: EncryptedContentT? = nil
    ) -> TentacledContent {
        return TentacledContent(
            c: c ?? self.c,
            t: t ?? self.t
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum BodyMetadata: Codable, Hashable, Sendable {
    case fluffyMetadata(FluffyMetadata)
    case string(String)
    case null

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let x = try? container.decode(String.self) {
            self = .string(x)
            return
        }
        if let x = try? container.decode(FluffyMetadata.self) {
            self = .fluffyMetadata(x)
            return
        }
        if container.decodeNil() {
            self = .null
            return
        }
        throw DecodingError.typeMismatch(BodyMetadata.self, DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Wrong type for BodyMetadata"))
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .fluffyMetadata(let x):
            try container.encode(x)
        case .string(let x):
            try container.encode(x)
        case .null:
            try container.encodeNil()
        }
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - FluffyMetadata
public struct FluffyMetadata: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: FluffyMetadata convenience initializers and mutators

public extension FluffyMetadata {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(FluffyMetadata.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> FluffyMetadata {
        return FluffyMetadata(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodySettings
public struct BodySettings: Codable, Hashable, Sendable {
    public let value: String?
    public let version: Double

    public init(value: String?, version: Double) {
        self.value = value
        self.version = version
    }
}

// MARK: BodySettings convenience initializers and mutators

public extension BodySettings {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodySettings.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        value: String?? = nil,
        version: Double? = nil
    ) -> BodySettings {
        return BodySettings(
            value: value ?? self.value,
            version: version ?? self.version
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - BodyToUser
public struct BodyToUser: Codable, Hashable, Sendable {
    public let avatar: IndecentAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: IndecentAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: BodyToUser convenience initializers and mutators

public extension BodyToUser {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(BodyToUser.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: IndecentAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> BodyToUser {
        return BodyToUser(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - IndecentAvatar
public struct IndecentAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: IndecentAvatar convenience initializers and mutators

public extension IndecentAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(IndecentAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> IndecentAvatar {
        return IndecentAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - EphemeralPayload
public struct EphemeralPayload: Codable, Hashable, Sendable {
    public let active: Bool?
    public let activeAt: Double?
    public let sid: String?
    public let thinking: Bool?
    public let type: APIEphemeralUpdateType
    public let cost: [String: Double]?
    public let key: String?
    public let timestamp: Double?
    public let tokens: [String: Double]?
    public let machineId: String?
    public let online, isOnline: Bool?
    public let lastSeen: Date?
    public let userId: String?

    public init(active: Bool?, activeAt: Double?, sid: String?, thinking: Bool?, type: APIEphemeralUpdateType, cost: [String: Double]?, key: String?, timestamp: Double?, tokens: [String: Double]?, machineId: String?, online: Bool?, isOnline: Bool?, lastSeen: Date?, userId: String?) {
        self.active = active
        self.activeAt = activeAt
        self.sid = sid
        self.thinking = thinking
        self.type = type
        self.cost = cost
        self.key = key
        self.timestamp = timestamp
        self.tokens = tokens
        self.machineId = machineId
        self.online = online
        self.isOnline = isOnline
        self.lastSeen = lastSeen
        self.userId = userId
    }
}

// MARK: EphemeralPayload convenience initializers and mutators

public extension EphemeralPayload {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(EphemeralPayload.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        active: Bool?? = nil,
        activeAt: Double?? = nil,
        sid: String?? = nil,
        thinking: Bool?? = nil,
        type: APIEphemeralUpdateType? = nil,
        cost: [String: Double]?? = nil,
        key: String?? = nil,
        timestamp: Double?? = nil,
        tokens: [String: Double]?? = nil,
        machineId: String?? = nil,
        online: Bool?? = nil,
        isOnline: Bool?? = nil,
        lastSeen: Date?? = nil,
        userId: String?? = nil
    ) -> EphemeralPayload {
        return EphemeralPayload(
            active: active ?? self.active,
            activeAt: activeAt ?? self.activeAt,
            sid: sid ?? self.sid,
            thinking: thinking ?? self.thinking,
            type: type ?? self.type,
            cost: cost ?? self.cost,
            key: key ?? self.key,
            timestamp: timestamp ?? self.timestamp,
            tokens: tokens ?? self.tokens,
            machineId: machineId ?? self.machineId,
            online: online ?? self.online,
            isOnline: isOnline ?? self.isOnline,
            lastSeen: lastSeen ?? self.lastSeen,
            userId: userId ?? self.userId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - SessionShareEntry
public struct SessionShareEntry: Codable, Hashable, Sendable {
    public let id: String
    public let permission: SessionSharePermission
    public let sharedAt: Date
    public let sharedBy, userId: String
    public let userProfile: SessionShareEntryUserProfile?

    public init(id: String, permission: SessionSharePermission, sharedAt: Date, sharedBy: String, userId: String, userProfile: SessionShareEntryUserProfile?) {
        self.id = id
        self.permission = permission
        self.sharedAt = sharedAt
        self.sharedBy = sharedBy
        self.userId = userId
        self.userProfile = userProfile
    }
}

// MARK: SessionShareEntry convenience initializers and mutators

public extension SessionShareEntry {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SessionShareEntry.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        id: String? = nil,
        permission: SessionSharePermission? = nil,
        sharedAt: Date? = nil,
        sharedBy: String? = nil,
        userId: String? = nil,
        userProfile: SessionShareEntryUserProfile?? = nil
    ) -> SessionShareEntry {
        return SessionShareEntry(
            id: id ?? self.id,
            permission: permission ?? self.permission,
            sharedAt: sharedAt ?? self.sharedAt,
            sharedBy: sharedBy ?? self.sharedBy,
            userId: userId ?? self.userId,
            userProfile: userProfile ?? self.userProfile
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum SessionSharePermission: String, Codable, Hashable, Sendable {
    case viewAndChat = "view_and_chat"
    case viewOnly = "view_only"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - SessionShareEntryUserProfile
public struct SessionShareEntryUserProfile: Codable, Hashable, Sendable {
    public let avatar: HilariousAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: HilariousAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: SessionShareEntryUserProfile convenience initializers and mutators

public extension SessionShareEntryUserProfile {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SessionShareEntryUserProfile.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: HilariousAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> SessionShareEntryUserProfile {
        return SessionShareEntryUserProfile(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - HilariousAvatar
public struct HilariousAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: HilariousAvatar convenience initializers and mutators

public extension HilariousAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(HilariousAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> HilariousAvatar {
        return HilariousAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - SessionShareUrlConfig
public struct SessionShareUrlConfig: Codable, Hashable, Sendable {
    public let enabled: Bool
    public let expiresAt: Date?
    public let password: String?
    public let permission: SessionSharePermission
    public let token: String?

    public init(enabled: Bool, expiresAt: Date?, password: String?, permission: SessionSharePermission, token: String?) {
        self.enabled = enabled
        self.expiresAt = expiresAt
        self.password = password
        self.permission = permission
        self.token = token
    }
}

// MARK: SessionShareUrlConfig convenience initializers and mutators

public extension SessionShareUrlConfig {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SessionShareUrlConfig.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        enabled: Bool? = nil,
        expiresAt: Date?? = nil,
        password: String?? = nil,
        permission: SessionSharePermission? = nil,
        token: String?? = nil
    ) -> SessionShareUrlConfig {
        return SessionShareUrlConfig(
            enabled: enabled ?? self.enabled,
            expiresAt: expiresAt ?? self.expiresAt,
            password: password ?? self.password,
            permission: permission ?? self.permission,
            token: token ?? self.token
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - SessionShareInvitation
public struct SessionShareInvitation: Codable, Hashable, Sendable {
    public let email: String
    public let expiresAt: Date
    public let id: String
    public let invitedAt: Date
    public let invitedBy: String
    public let permission: SessionSharePermission
    public let status: InvitationStatus

    public init(email: String, expiresAt: Date, id: String, invitedAt: Date, invitedBy: String, permission: SessionSharePermission, status: InvitationStatus) {
        self.email = email
        self.expiresAt = expiresAt
        self.id = id
        self.invitedAt = invitedAt
        self.invitedBy = invitedBy
        self.permission = permission
        self.status = status
    }
}

// MARK: SessionShareInvitation convenience initializers and mutators

public extension SessionShareInvitation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SessionShareInvitation.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        email: String? = nil,
        expiresAt: Date? = nil,
        id: String? = nil,
        invitedAt: Date? = nil,
        invitedBy: String? = nil,
        permission: SessionSharePermission? = nil,
        status: InvitationStatus? = nil
    ) -> SessionShareInvitation {
        return SessionShareInvitation(
            email: email ?? self.email,
            expiresAt: expiresAt ?? self.expiresAt,
            id: id ?? self.id,
            invitedAt: invitedAt ?? self.invitedAt,
            invitedBy: invitedBy ?? self.invitedBy,
            permission: permission ?? self.permission,
            status: status ?? self.status
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

public enum InvitationStatus: String, Codable, Hashable, Sendable {
    case accepted = "accepted"
    case expired = "expired"
    case pending = "pending"
    case revoked = "revoked"
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - SessionShareSettings
public struct SessionShareSettings: Codable, Hashable, Sendable {
    public let invitations: [Invitation]
    public let sessionId: String
    public let shares: [Share]
    public let urlSharing: URLSharing

    public init(invitations: [Invitation], sessionId: String, shares: [Share], urlSharing: URLSharing) {
        self.invitations = invitations
        self.sessionId = sessionId
        self.shares = shares
        self.urlSharing = urlSharing
    }
}

// MARK: SessionShareSettings convenience initializers and mutators

public extension SessionShareSettings {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(SessionShareSettings.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        invitations: [Invitation]? = nil,
        sessionId: String? = nil,
        shares: [Share]? = nil,
        urlSharing: URLSharing? = nil
    ) -> SessionShareSettings {
        return SessionShareSettings(
            invitations: invitations ?? self.invitations,
            sessionId: sessionId ?? self.sessionId,
            shares: shares ?? self.shares,
            urlSharing: urlSharing ?? self.urlSharing
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - Invitation
public struct Invitation: Codable, Hashable, Sendable {
    public let email: String
    public let expiresAt: Date
    public let id: String
    public let invitedAt: Date
    public let invitedBy: String
    public let permission: SessionSharePermission
    public let status: InvitationStatus

    public init(email: String, expiresAt: Date, id: String, invitedAt: Date, invitedBy: String, permission: SessionSharePermission, status: InvitationStatus) {
        self.email = email
        self.expiresAt = expiresAt
        self.id = id
        self.invitedAt = invitedAt
        self.invitedBy = invitedBy
        self.permission = permission
        self.status = status
    }
}

// MARK: Invitation convenience initializers and mutators

public extension Invitation {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Invitation.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        email: String? = nil,
        expiresAt: Date? = nil,
        id: String? = nil,
        invitedAt: Date? = nil,
        invitedBy: String? = nil,
        permission: SessionSharePermission? = nil,
        status: InvitationStatus? = nil
    ) -> Invitation {
        return Invitation(
            email: email ?? self.email,
            expiresAt: expiresAt ?? self.expiresAt,
            id: id ?? self.id,
            invitedAt: invitedAt ?? self.invitedAt,
            invitedBy: invitedBy ?? self.invitedBy,
            permission: permission ?? self.permission,
            status: status ?? self.status
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - Share
public struct Share: Codable, Hashable, Sendable {
    public let id: String
    public let permission: SessionSharePermission
    public let sharedAt: Date
    public let sharedBy, userId: String
    public let userProfile: ShareUserProfile?

    public init(id: String, permission: SessionSharePermission, sharedAt: Date, sharedBy: String, userId: String, userProfile: ShareUserProfile?) {
        self.id = id
        self.permission = permission
        self.sharedAt = sharedAt
        self.sharedBy = sharedBy
        self.userId = userId
        self.userProfile = userProfile
    }
}

// MARK: Share convenience initializers and mutators

public extension Share {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(Share.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        id: String? = nil,
        permission: SessionSharePermission? = nil,
        sharedAt: Date? = nil,
        sharedBy: String? = nil,
        userId: String? = nil,
        userProfile: ShareUserProfile?? = nil
    ) -> Share {
        return Share(
            id: id ?? self.id,
            permission: permission ?? self.permission,
            sharedAt: sharedAt ?? self.sharedAt,
            sharedBy: sharedBy ?? self.sharedBy,
            userId: userId ?? self.userId,
            userProfile: userProfile ?? self.userProfile
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - ShareUserProfile
public struct ShareUserProfile: Codable, Hashable, Sendable {
    public let avatar: AmbitiousAvatar?
    public let bio: String?
    public let firstName: String
    public let friendshipDate: String?
    public let id: String
    public let lastName: String?
    public let status: RelationshipStatus
    public let username: String

    public init(avatar: AmbitiousAvatar?, bio: String?, firstName: String, friendshipDate: String?, id: String, lastName: String?, status: RelationshipStatus, username: String) {
        self.avatar = avatar
        self.bio = bio
        self.firstName = firstName
        self.friendshipDate = friendshipDate
        self.id = id
        self.lastName = lastName
        self.status = status
        self.username = username
    }
}

// MARK: ShareUserProfile convenience initializers and mutators

public extension ShareUserProfile {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ShareUserProfile.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        avatar: AmbitiousAvatar?? = nil,
        bio: String?? = nil,
        firstName: String? = nil,
        friendshipDate: String?? = nil,
        id: String? = nil,
        lastName: String?? = nil,
        status: RelationshipStatus? = nil,
        username: String? = nil
    ) -> ShareUserProfile {
        return ShareUserProfile(
            avatar: avatar ?? self.avatar,
            bio: bio ?? self.bio,
            firstName: firstName ?? self.firstName,
            friendshipDate: friendshipDate ?? self.friendshipDate,
            id: id ?? self.id,
            lastName: lastName ?? self.lastName,
            status: status ?? self.status,
            username: username ?? self.username
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - AmbitiousAvatar
public struct AmbitiousAvatar: Codable, Hashable, Sendable {
    public let height: Double?
    public let path: String
    public let thumbhash: String?
    public let url: String
    public let width: Double?

    public init(height: Double?, path: String, thumbhash: String?, url: String, width: Double?) {
        self.height = height
        self.path = path
        self.thumbhash = thumbhash
        self.url = url
        self.width = width
    }
}

// MARK: AmbitiousAvatar convenience initializers and mutators

public extension AmbitiousAvatar {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AmbitiousAvatar.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        height: Double?? = nil,
        path: String? = nil,
        thumbhash: String?? = nil,
        url: String? = nil,
        width: Double?? = nil
    ) -> AmbitiousAvatar {
        return AmbitiousAvatar(
            height: height ?? self.height,
            path: path ?? self.path,
            thumbhash: thumbhash ?? self.thumbhash,
            url: url ?? self.url,
            width: width ?? self.width
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - URLSharing
public struct URLSharing: Codable, Hashable, Sendable {
    public let enabled: Bool
    public let expiresAt: Date?
    public let password: String?
    public let permission: SessionSharePermission
    public let token: String?

    public init(enabled: Bool, expiresAt: Date?, password: String?, permission: SessionSharePermission, token: String?) {
        self.enabled = enabled
        self.expiresAt = expiresAt
        self.password = password
        self.permission = permission
        self.token = token
    }
}

// MARK: URLSharing convenience initializers and mutators

public extension URLSharing {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(URLSharing.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        enabled: Bool? = nil,
        expiresAt: Date?? = nil,
        password: String?? = nil,
        permission: SessionSharePermission? = nil,
        token: String?? = nil
    ) -> URLSharing {
        return URLSharing(
            enabled: enabled ?? self.enabled,
            expiresAt: expiresAt ?? self.expiresAt,
            password: password ?? self.password,
            permission: permission ?? self.permission,
            token: token ?? self.token
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - AddSessionShareRequest
public struct AddSessionShareRequest: Codable, Hashable, Sendable {
    public let email: String?
    public let permission: SessionSharePermission
    public let sessionId: String
    public let userId: String?

    public init(email: String?, permission: SessionSharePermission, sessionId: String, userId: String?) {
        self.email = email
        self.permission = permission
        self.sessionId = sessionId
        self.userId = userId
    }
}

// MARK: AddSessionShareRequest convenience initializers and mutators

public extension AddSessionShareRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(AddSessionShareRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        email: String?? = nil,
        permission: SessionSharePermission? = nil,
        sessionId: String? = nil,
        userId: String?? = nil
    ) -> AddSessionShareRequest {
        return AddSessionShareRequest(
            email: email ?? self.email,
            permission: permission ?? self.permission,
            sessionId: sessionId ?? self.sessionId,
            userId: userId ?? self.userId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - UpdateSessionShareRequest
public struct UpdateSessionShareRequest: Codable, Hashable, Sendable {
    public let permission: SessionSharePermission
    public let shareId: String

    public init(permission: SessionSharePermission, shareId: String) {
        self.permission = permission
        self.shareId = shareId
    }
}

// MARK: UpdateSessionShareRequest convenience initializers and mutators

public extension UpdateSessionShareRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UpdateSessionShareRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        permission: SessionSharePermission? = nil,
        shareId: String? = nil
    ) -> UpdateSessionShareRequest {
        return UpdateSessionShareRequest(
            permission: permission ?? self.permission,
            shareId: shareId ?? self.shareId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - RemoveSessionShareRequest
public struct RemoveSessionShareRequest: Codable, Hashable, Sendable {
    public let shareId: String

    public init(shareId: String) {
        self.shareId = shareId
    }
}

// MARK: RemoveSessionShareRequest convenience initializers and mutators

public extension RemoveSessionShareRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RemoveSessionShareRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        shareId: String? = nil
    ) -> RemoveSessionShareRequest {
        return RemoveSessionShareRequest(
            shareId: shareId ?? self.shareId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - UpdateUrlSharingRequest
public struct UpdateUrlSharingRequest: Codable, Hashable, Sendable {
    public let enabled: Bool
    public let password: String?
    public let permission: SessionSharePermission?
    public let sessionId: String

    public init(enabled: Bool, password: String?, permission: SessionSharePermission?, sessionId: String) {
        self.enabled = enabled
        self.password = password
        self.permission = permission
        self.sessionId = sessionId
    }
}

// MARK: UpdateUrlSharingRequest convenience initializers and mutators

public extension UpdateUrlSharingRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(UpdateUrlSharingRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        enabled: Bool? = nil,
        password: String?? = nil,
        permission: SessionSharePermission?? = nil,
        sessionId: String? = nil
    ) -> UpdateUrlSharingRequest {
        return UpdateUrlSharingRequest(
            enabled: enabled ?? self.enabled,
            password: password ?? self.password,
            permission: permission ?? self.permission,
            sessionId: sessionId ?? self.sessionId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - RevokeInvitationRequest
public struct RevokeInvitationRequest: Codable, Hashable, Sendable {
    public let invitationId: String

    public init(invitationId: String) {
        self.invitationId = invitationId
    }
}

// MARK: RevokeInvitationRequest convenience initializers and mutators

public extension RevokeInvitationRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(RevokeInvitationRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        invitationId: String? = nil
    ) -> RevokeInvitationRequest {
        return RevokeInvitationRequest(
            invitationId: invitationId ?? self.invitationId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

//
// Hashable or Equatable:
// The compiler will not be able to synthesize the implementation of Hashable or Equatable
// for types that require the use of JSONAny, nor will the implementation of Hashable be
// synthesized for types that have collections (such as arrays or dictionaries).

// MARK: - ResendInvitationRequest
public struct ResendInvitationRequest: Codable, Hashable, Sendable {
    public let invitationId: String

    public init(invitationId: String) {
        self.invitationId = invitationId
    }
}

// MARK: ResendInvitationRequest convenience initializers and mutators

public extension ResendInvitationRequest {
    init(data: Data) throws {
        self = try newJSONDecoder().decode(ResendInvitationRequest.self, from: data)
    }

    init(_ json: String, using encoding: String.Encoding = .utf8) throws {
        guard let data = json.data(using: encoding) else {
            throw NSError(domain: "JSONDecoding", code: 0, userInfo: nil)
        }
        try self.init(data: data)
    }

    init(fromURL url: URL) throws {
        try self.init(data: try Data(contentsOf: url))
    }

    func with(
        invitationId: String? = nil
    ) -> ResendInvitationRequest {
        return ResendInvitationRequest(
            invitationId: invitationId ?? self.invitationId
        )
    }

    func jsonData() throws -> Data {
        return try newJSONEncoder().encode(self)
    }

    func jsonString(encoding: String.Encoding = .utf8) throws -> String? {
        return String(data: try self.jsonData(), encoding: encoding)
    }
}

// MARK: - Helper functions for creating encoders and decoders

func newJSONDecoder() -> JSONDecoder {
    let decoder = JSONDecoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        decoder.dateDecodingStrategy = .iso8601
    }
    return decoder
}

func newJSONEncoder() -> JSONEncoder {
    let encoder = JSONEncoder()
    if #available(iOS 10.0, OSX 10.12, tvOS 10.0, watchOS 3.0, *) {
        encoder.dateEncodingStrategy = .iso8601
    }
    return encoder
}
