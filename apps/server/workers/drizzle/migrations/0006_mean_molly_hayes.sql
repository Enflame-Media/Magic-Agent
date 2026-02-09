CREATE TABLE `SessionShareInvitation` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`email` text NOT NULL,
	`permission` text NOT NULL,
	`token` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`invitedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`invitedBy` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "SessionShareInvitation_permission_check" CHECK(permission IN ('view_only', 'view_and_chat')),
	CONSTRAINT "SessionShareInvitation_status_check" CHECK(status IN ('pending', 'accepted', 'expired', 'revoked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SessionShareInvitation_token_unique` ON `SessionShareInvitation` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `SessionShareInvitation_token_key` ON `SessionShareInvitation` (`token`);--> statement-breakpoint
CREATE INDEX `SessionShareInvitation_sessionId_idx` ON `SessionShareInvitation` (`sessionId`);--> statement-breakpoint
CREATE INDEX `SessionShareInvitation_email_idx` ON `SessionShareInvitation` (`email`);--> statement-breakpoint
CREATE INDEX `SessionShareInvitation_status_idx` ON `SessionShareInvitation` (`status`);--> statement-breakpoint
CREATE TABLE `SessionShareUrl` (
	`sessionId` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`passwordHash` text,
	`permission` text NOT NULL,
	`expiresAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "SessionShareUrl_permission_check" CHECK(permission IN ('view_only', 'view_and_chat'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SessionShareUrl_token_unique` ON `SessionShareUrl` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `SessionShareUrl_token_key` ON `SessionShareUrl` (`token`);--> statement-breakpoint
CREATE TABLE `SessionShare` (
	`id` text PRIMARY KEY NOT NULL,
	`sessionId` text NOT NULL,
	`userId` text NOT NULL,
	`permission` text NOT NULL,
	`sharedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`sharedBy` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "SessionShare_permission_check" CHECK(permission IN ('view_only', 'view_and_chat'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `SessionShare_sessionId_userId_key` ON `SessionShare` (`sessionId`,`userId`);--> statement-breakpoint
CREATE INDEX `SessionShare_sessionId_idx` ON `SessionShare` (`sessionId`);--> statement-breakpoint
CREATE INDEX `SessionShare_userId_idx` ON `SessionShare` (`userId`);