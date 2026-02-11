import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index, uniqueIndex, blob } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role"),
  banned: integer("banned", { mode: "boolean" }).default(false),
  banReason: text("ban_reason"),
  banExpires: integer("ban_expires", { mode: "timestamp_ms" }),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [index("sessions_userId_idx").on(table.userId)],
);

export const accounts = sqliteTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("accounts_userId_idx").on(table.userId)],
);

export const verifications = sqliteTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  users: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  users: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// App Session Tables (from happy-server-workers schema)
// These tables are managed by happy-server-workers but we need read/write
// access for admin operations like bulk archive/delete.
// ============================================================================

/**
 * App Sessions - Work sessions with encrypted state
 * Note: This is different from Better-Auth sessions above (admin auth sessions)
 */
export const appSessions = sqliteTable(
  "Session",
  {
    id: text("id").primaryKey(),
    tag: text("tag").notNull(),
    accountId: text("accountId").notNull(),
    metadata: text("metadata").notNull(),
    metadataVersion: integer("metadataVersion").notNull().default(0),
    agentState: text("agentState"),
    agentStateVersion: integer("agentStateVersion").notNull().default(0),
    dataEncryptionKey: blob("dataEncryptionKey", { mode: "buffer" }),
    seq: integer("seq").notNull().default(0),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    lastActiveAt: integer("lastActiveAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    // Session state tracking for revival flow (HAP-734)
    stoppedAt: integer("stoppedAt", { mode: "timestamp_ms" }),
    stoppedReason: text("stoppedReason"),
    archivedAt: integer("archivedAt", { mode: "timestamp_ms" }),
    archiveReason: text("archiveReason"), // 'revival_failed' | 'user_requested' | 'timeout'
    archiveError: text("archiveError"),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("Session_accountId_tag_key").on(table.accountId, table.tag),
    index("Session_accountId_updatedAt_idx").on(table.accountId, table.updatedAt),
  ]
);

/**
 * Session Messages - Encrypted messages within sessions
 */
export const sessionMessages = sqliteTable(
  "SessionMessage",
  {
    id: text("id").primaryKey(),
    sessionId: text("sessionId").notNull(),
    localId: text("localId"),
    seq: integer("seq").notNull(),
    content: text("content", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("SessionMessage_sessionId_localId_key").on(table.sessionId, table.localId),
    index("SessionMessage_sessionId_seq_idx").on(table.sessionId, table.seq),
  ]
);

/**
 * Access Keys - Session-machine access credentials
 */
export const accessKeys = sqliteTable(
  "AccessKey",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    machineId: text("machineId").notNull(),
    sessionId: text("sessionId").notNull(),
    data: text("data").notNull(),
    dataVersion: integer("dataVersion").notNull().default(0),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("AccessKey_accountId_machineId_sessionId_key").on(
      table.accountId,
      table.machineId,
      table.sessionId
    ),
    index("AccessKey_sessionId_idx").on(table.sessionId),
  ]
);

/**
 * Usage Reports - Token/cost tracking data
 */
export const usageReports = sqliteTable(
  "UsageReport",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    accountId: text("accountId").notNull(),
    sessionId: text("sessionId"),
    data: text("data", { mode: "json" }).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updatedAt", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`)
      .$onUpdate(() => /* @__PURE__ */ new Date()),
  },
  (table) => [
    uniqueIndex("UsageReport_accountId_sessionId_key_key").on(
      table.accountId,
      table.sessionId,
      table.key
    ),
    index("UsageReport_sessionId_idx").on(table.sessionId),
  ]
);

// ============================================================================
// Admin Audit Log Table (HAP-804)
// Persists admin actions for compliance and incident response.
// ============================================================================

/**
 * Admin Audit Logs - Tracks sensitive admin operations
 *
 * Currently tracks:
 * - Role changes (admin/user promotions/demotions)
 *
 * Future extensions may include:
 * - User bans/unbans
 * - Bulk operations
 * - Permission changes
 */
export const adminAuditLogs = sqliteTable(
    "admin_audit_logs",
    {
        id: text("id").primaryKey(),
        /**
         * Type of action performed
         * @example "role_change", "user_ban", "bulk_delete"
         */
        action: text("action").notNull(),
        /**
         * User ID of the admin who performed the action
         */
        actorId: text("actor_id").notNull(),
        /**
         * Email of the admin who performed the action (denormalized for queryability)
         */
        actorEmail: text("actor_email").notNull(),
        /**
         * User ID of the target (for actions on other users)
         */
        targetId: text("target_id"),
        /**
         * Email of the target user (denormalized for queryability)
         */
        targetEmail: text("target_email"),
        /**
         * Previous value (e.g., old role)
         */
        previousValue: text("previous_value"),
        /**
         * New value (e.g., new role)
         */
        newValue: text("new_value"),
        /**
         * Request metadata as JSON (IP, user-agent, request ID)
         */
        metadata: text("metadata", { mode: "json" }).$type<{
            ipAddress?: string | null;
            userAgent?: string | null;
            requestId?: string;
        }>(),
        /**
         * When the action was performed
         */
        createdAt: integer("created_at", { mode: "timestamp_ms" })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
            .notNull(),
    },
    (table) => [
        index("admin_audit_logs_actor_id_idx").on(table.actorId),
        index("admin_audit_logs_target_id_idx").on(table.targetId),
        index("admin_audit_logs_action_idx").on(table.action),
        index("admin_audit_logs_created_at_idx").on(table.createdAt),
    ]
);
