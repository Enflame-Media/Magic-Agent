/**
 * String length constraints and validation patterns for input validation
 *
 * These constants define security-focused limits to prevent:
 * - Memory exhaustion from oversized payloads (DoS)
 * - Database bloat from unbounded field sizes
 * - Buffer overflow issues
 * - Log injection attacks
 *
 * @see https://owasp.org/www-community/controls/Input_Validation
 */

/**
 * Maximum string lengths for different field types
 *
 * Categories:
 * - Short: Labels, titles, names (UI-displayed, single line)
 * - Medium: Descriptions, summaries (multi-line, bounded)
 * - Large: Content, messages (main payload data)
 * - IDs: Fixed-length identifiers
 */
export const STRING_LIMITS = {
    // ═══════════════════════════════════════════════════════════════
    // Short strings (single-line, UI-displayed)
    // ═══════════════════════════════════════════════════════════════

    /** Max title length (session titles, artifact titles) */
    TITLE_MAX: 256,

    /** Max name length (user names, machine names, server names) */
    NAME_MAX: 128,

    /** Max label/tag length (short identifiers) */
    LABEL_MAX: 64,

    /** Max username length (login identifiers) */
    USERNAME_MAX: 64,

    // ═══════════════════════════════════════════════════════════════
    // Medium strings (multi-line, bounded content)
    // ═══════════════════════════════════════════════════════════════

    /** Max description length (session descriptions, bios) */
    DESCRIPTION_MAX: 4096,

    /** Max summary length (short descriptions) */
    SUMMARY_MAX: 1024,

    /** Max bio length (user profile bios) */
    BIO_MAX: 500,

    // ═══════════════════════════════════════════════════════════════
    // Large strings (main payload content)
    // ═══════════════════════════════════════════════════════════════

    /** Max content length for encrypted payloads (1MB) */
    CONTENT_MAX: 1_000_000,

    /** Max message content length (100KB) */
    MESSAGE_MAX: 100_000,

    /** Max encrypted state length (500KB) */
    ENCRYPTED_STATE_MAX: 500_000,

    /** Max versioned value content (500KB) */
    VERSIONED_VALUE_MAX: 500_000,

    // ═══════════════════════════════════════════════════════════════
    // IDs and tokens
    // ═══════════════════════════════════════════════════════════════

    /** Standard UUID length (36 chars with hyphens) */
    UUID_LENGTH: 36,

    /** Max token/key length (for encryption keys, API tokens) */
    TOKEN_MAX: 8192,

    /** Max data encryption key length (base64 encoded NaCl key) */
    DATA_ENCRYPTION_KEY_MAX: 256,

    /** Max session/machine/artifact ID length */
    ID_MAX: 128,

    /** Max local ID length (client-generated IDs) */
    LOCAL_ID_MAX: 128,

    // ═══════════════════════════════════════════════════════════════
    // URLs and paths
    // ═══════════════════════════════════════════════════════════════

    /** Max URL length */
    URL_MAX: 2048,

    /** Max file path length */
    PATH_MAX: 1024,

    /** Max thumbhash length (base64 encoded placeholder image) */
    THUMBHASH_MAX: 256,

    // ═══════════════════════════════════════════════════════════════
    // KV and settings
    // ═══════════════════════════════════════════════════════════════

    /** Max KV key length */
    KV_KEY_MAX: 256,

    /** Max KV value length */
    KV_VALUE_MAX: 65536, // 64KB

    // ═══════════════════════════════════════════════════════════════
    // MCP-specific
    // ═══════════════════════════════════════════════════════════════

    /** Max MCP server name length */
    MCP_SERVER_NAME_MAX: 128,

    /** Max MCP tool name length */
    MCP_TOOL_NAME_MAX: 128,

    /** Max MCP tool description length */
    MCP_TOOL_DESCRIPTION_MAX: 2048,

    // ═══════════════════════════════════════════════════════════════
    // Feed and social
    // ═══════════════════════════════════════════════════════════════

    /** Max feed post text length */
    FEED_TEXT_MAX: 4096,

    /** Max cursor string length */
    CURSOR_MAX: 256,

    /** Max repeat key length */
    REPEAT_KEY_MAX: 128,
} as const;

/**
 * Validation patterns for format checking
 *
 * Note: These are security-focused patterns. For GitHub specifically,
 * we validate username format but allow passthrough for additional fields.
 */
export const PATTERNS = {
    /** URL slug pattern (lowercase alphanumeric with hyphens) */
    SLUG: /^[a-z0-9-]+$/,

    /** Basic email format validation */
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

    /** Username pattern (alphanumeric with underscores and hyphens) */
    USERNAME: /^[a-zA-Z0-9_-]+$/,

    /** GitHub login pattern (alphanumeric with hyphens, no leading/trailing) */
    GITHUB_LOGIN: /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/,

    /** Safe string pattern (no control characters except newline/tab) */
    SAFE_STRING: /^[^\x00-\x08\x0B\x0C\x0E-\x1F]*$/,
} as const;

/**
 * Request body size limits for server-level validation
 *
 * These are enforced at the server level before schema validation.
 * Schema-level limits provide defense in depth.
 */
export const BODY_SIZE_LIMITS = {
    /** Default max request body (5MB) */
    DEFAULT: 5 * 1024 * 1024,

    /** Max body for file uploads (50MB) */
    UPLOAD: 50 * 1024 * 1024,

    /** Max body for sync payloads (10MB) */
    SYNC: 10 * 1024 * 1024,

    /** Max body for admin API (1MB) */
    ADMIN: 1 * 1024 * 1024,
} as const;

// Type exports for better IDE support
export type StringLimits = typeof STRING_LIMITS;
export type Patterns = typeof PATTERNS;
export type BodySizeLimits = typeof BODY_SIZE_LIMITS;
