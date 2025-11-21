CREATE TABLE `AccessKey` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`machineId` text NOT NULL,
	`sessionId` text NOT NULL,
	`data` text NOT NULL,
	`dataVersion` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AccessKey_accountId_machineId_sessionId_key` ON `AccessKey` (`accountId`,`machineId`,`sessionId`);--> statement-breakpoint
CREATE INDEX `AccessKey_accountId_idx` ON `AccessKey` (`accountId`);--> statement-breakpoint
CREATE INDEX `AccessKey_sessionId_idx` ON `AccessKey` (`sessionId`);--> statement-breakpoint
CREATE INDEX `AccessKey_machineId_idx` ON `AccessKey` (`machineId`);--> statement-breakpoint
CREATE TABLE `AccountAuthRequest` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`response` text,
	`responseAccountId` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AccountAuthRequest_publicKey_unique` ON `AccountAuthRequest` (`publicKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `AccountAuthRequest_publicKey_key` ON `AccountAuthRequest` (`publicKey`);--> statement-breakpoint
CREATE TABLE `AccountPushToken` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`token` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `AccountPushToken_accountId_token_key` ON `AccountPushToken` (`accountId`,`token`);--> statement-breakpoint
CREATE TABLE `Account` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	`feedSeq` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`settings` text,
	`settingsVersion` integer DEFAULT 0 NOT NULL,
	`githubUserId` text,
	`firstName` text,
	`lastName` text,
	`username` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Account_publicKey_unique` ON `Account` (`publicKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_githubUserId_unique` ON `Account` (`githubUserId`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_username_unique` ON `Account` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_publicKey_key` ON `Account` (`publicKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_username_key` ON `Account` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `Account_githubUserId_key` ON `Account` (`githubUserId`);--> statement-breakpoint
CREATE TABLE `Artifact` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`header` blob NOT NULL,
	`headerVersion` integer DEFAULT 0 NOT NULL,
	`body` blob NOT NULL,
	`bodyVersion` integer DEFAULT 0 NOT NULL,
	`dataEncryptionKey` blob NOT NULL,
	`seq` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `Artifact_accountId_idx` ON `Artifact` (`accountId`);--> statement-breakpoint
CREATE INDEX `Artifact_accountId_updatedAt_idx` ON `Artifact` (`accountId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `GithubOrganization` (
	`id` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `GithubUser` (
	`id` text PRIMARY KEY NOT NULL,
	`profile` text NOT NULL,
	`token` blob,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `GlobalLock` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Machine` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`metadata` text NOT NULL,
	`metadataVersion` integer DEFAULT 0 NOT NULL,
	`daemonState` text,
	`daemonStateVersion` integer DEFAULT 0 NOT NULL,
	`dataEncryptionKey` blob,
	`seq` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`lastActiveAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Machine_accountId_id_key` ON `Machine` (`accountId`,`id`);--> statement-breakpoint
CREATE INDEX `Machine_accountId_idx` ON `Machine` (`accountId`);--> statement-breakpoint
CREATE TABLE `RepeatKey` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ServiceAccountToken` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`vendor` text NOT NULL,
	`token` blob NOT NULL,
	`metadata` text,
	`lastUsedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ServiceAccountToken_accountId_vendor_key` ON `ServiceAccountToken` (`accountId`,`vendor`);--> statement-breakpoint
CREATE INDEX `ServiceAccountToken_accountId_idx` ON `ServiceAccountToken` (`accountId`);--> statement-breakpoint
CREATE TABLE `SessionMessage` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`localId` text,
	`seq` integer NOT NULL,
	`content` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SessionMessage_sessionId_localId_key` ON `SessionMessage` (`sessionId`,`localId`);--> statement-breakpoint
CREATE INDEX `SessionMessage_sessionId_seq_idx` ON `SessionMessage` (`sessionId`,`seq`);--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL,
	`accountId` text NOT NULL,
	`metadata` text NOT NULL,
	`metadataVersion` integer DEFAULT 0 NOT NULL,
	`agentState` text,
	`agentStateVersion` integer DEFAULT 0 NOT NULL,
	`dataEncryptionKey` blob,
	`seq` integer DEFAULT 0 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`lastActiveAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Session_accountId_tag_key` ON `Session` (`accountId`,`tag`);--> statement-breakpoint
CREATE INDEX `Session_accountId_updatedAt_idx` ON `Session` (`accountId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `SimpleCache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `TerminalAuthRequest` (
	`id` text PRIMARY KEY NOT NULL,
	`publicKey` text NOT NULL,
	`supportsV2` integer DEFAULT false NOT NULL,
	`response` text,
	`responseAccountId` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `TerminalAuthRequest_publicKey_unique` ON `TerminalAuthRequest` (`publicKey`);--> statement-breakpoint
CREATE UNIQUE INDEX `TerminalAuthRequest_publicKey_key` ON `TerminalAuthRequest` (`publicKey`);--> statement-breakpoint
CREATE TABLE `UploadedFile` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`path` text NOT NULL,
	`width` integer,
	`height` integer,
	`thumbhash` text,
	`reuseKey` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UploadedFile_accountId_path_key` ON `UploadedFile` (`accountId`,`path`);--> statement-breakpoint
CREATE INDEX `UploadedFile_accountId_idx` ON `UploadedFile` (`accountId`);--> statement-breakpoint
CREATE TABLE `UsageReport` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`accountId` text NOT NULL,
	`sessionId` text,
	`data` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UsageReport_accountId_sessionId_key_key` ON `UsageReport` (`accountId`,`sessionId`,`key`);--> statement-breakpoint
CREATE INDEX `UsageReport_accountId_idx` ON `UsageReport` (`accountId`);--> statement-breakpoint
CREATE INDEX `UsageReport_sessionId_idx` ON `UsageReport` (`sessionId`);--> statement-breakpoint
CREATE TABLE `UserFeedItem` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`counter` integer NOT NULL,
	`repeatKey` text,
	`body` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserFeedItem_userId_counter_key` ON `UserFeedItem` (`userId`,`counter`);--> statement-breakpoint
CREATE UNIQUE INDEX `UserFeedItem_userId_repeatKey_key` ON `UserFeedItem` (`userId`,`repeatKey`);--> statement-breakpoint
CREATE INDEX `UserFeedItem_userId_counter_idx` ON `UserFeedItem` (`userId`,`counter`);--> statement-breakpoint
CREATE TABLE `UserKVStore` (
	`id` text PRIMARY KEY NOT NULL,
	`accountId` text NOT NULL,
	`key` text NOT NULL,
	`value` blob,
	`version` integer DEFAULT 0 NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UserKVStore_accountId_key_key` ON `UserKVStore` (`accountId`,`key`);--> statement-breakpoint
CREATE INDEX `UserKVStore_accountId_idx` ON `UserKVStore` (`accountId`);--> statement-breakpoint
CREATE TABLE `UserRelationship` (
	`fromUserId` text NOT NULL,
	`toUserId` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`acceptedAt` integer,
	`lastNotifiedAt` integer
);
--> statement-breakpoint
CREATE INDEX `UserRelationship_fromUserId_toUserId_pk` ON `UserRelationship` (`fromUserId`,`toUserId`);--> statement-breakpoint
CREATE INDEX `UserRelationship_toUserId_status_idx` ON `UserRelationship` (`toUserId`,`status`);--> statement-breakpoint
CREATE INDEX `UserRelationship_fromUserId_status_idx` ON `UserRelationship` (`fromUserId`,`status`);