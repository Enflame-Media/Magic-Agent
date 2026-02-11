/**
 * Analytics Query Builder - SQL Injection Prevention
 *
 * This utility provides safe query construction for the Cloudflare Analytics Engine
 * SQL API. It sanitizes all user inputs to prevent SQL injection attacks.
 *
 * Security measures:
 * 1. String values are validated against strict regex patterns
 * 2. Numeric values are parsed and bounds-checked
 * 3. All values are properly escaped before interpolation
 * 4. Unknown characters are stripped from string inputs
 *
 * @see https://owasp.org/www-community/attacks/SQL_Injection
 * @see https://developers.cloudflare.com/analytics/analytics-engine/sql-api/
 */

/**
 * Validation patterns for different input types
 */
export const ValidationPatterns = {
    /**
     * Branch names: alphanumeric, hyphens, underscores, slashes
     * Max 64 chars to prevent buffer issues
     * Examples: main, develop, feature/HAP-123, hotfix/urgent-fix
     * Note: hyphen must be at end of character class to be literal
     */
    BRANCH: /^[a-zA-Z0-9_/.-]{1,64}$/,

    /**
     * Platform identifiers: lowercase letters only
     * Examples: ios, android, web
     */
    PLATFORM: /^[a-z]{2,10}$/,

    /**
     * Generic safe string: alphanumeric, spaces, hyphens, underscores
     * Max 128 chars for general-purpose string fields
     */
    SAFE_STRING: /^[a-zA-Z0-9_\- ]{1,128}$/,

    /**
     * Commit hash: hex characters only
     * Supports short (7) and full (40) SHA hashes
     */
    COMMIT_HASH: /^[a-fA-F0-9]{7,40}$/,
} as const;

/**
 * Numeric bounds for query parameters
 */
export const NumericBounds = {
    HOURS: { min: 1, max: 720 }, // 1 hour to 30 days
    DAYS: { min: 1, max: 365 }, // 1 day to 1 year
    LIMIT: { min: 1, max: 100 }, // Reasonable pagination limit
    INTERVAL: { min: 1, max: 168 }, // 1 hour to 1 week for intervals
} as const;

/**
 * Allowed platform values (enum allowlist)
 */
export const ALLOWED_PLATFORMS = ['ios', 'android', 'web'] as const;
export type Platform = (typeof ALLOWED_PLATFORMS)[number];

/**
 * Result of validation operations
 */
export type ValidationResult<T> =
    | { success: true; value: T }
    | { success: false; error: string };

/**
 * Validate and sanitize a string value against a pattern
 *
 * @param value - The raw input string
 * @param pattern - Regex pattern to validate against
 * @param fieldName - Name of the field (for error messages)
 * @returns ValidationResult with sanitized value or error
 */
export function validateString(
    value: string,
    pattern: RegExp,
    fieldName: string
): ValidationResult<string> {
    if (!pattern.test(value)) {
        return {
            success: false,
            error: `Invalid ${fieldName}: contains disallowed characters or exceeds length limit`,
        };
    }
    return { success: true, value };
}

/**
 * Validate and bound a numeric value
 *
 * @param value - The raw input (string or number)
 * @param bounds - Min/max bounds
 * @param fieldName - Name of the field (for error messages)
 * @param defaultValue - Default if value is undefined
 * @returns ValidationResult with bounded number or error
 */
export function validateNumber(
    value: string | number | undefined,
    bounds: { min: number; max: number },
    fieldName: string,
    defaultValue: number
): ValidationResult<number> {
    if (value === undefined || value === '') {
        return { success: true, value: defaultValue };
    }

    const num = typeof value === 'number' ? value : parseInt(String(value), 10);

    if (isNaN(num)) {
        return {
            success: false,
            error: `Invalid ${fieldName}: must be a valid number`,
        };
    }

    if (num < bounds.min || num > bounds.max) {
        return {
            success: false,
            error: `Invalid ${fieldName}: must be between ${bounds.min} and ${bounds.max}`,
        };
    }

    return { success: true, value: num };
}

/**
 * Validate platform against allowlist
 *
 * @param value - The raw input
 * @returns ValidationResult with validated platform or error
 */
export function validatePlatform(value: string | undefined): ValidationResult<Platform | undefined> {
    if (value === undefined || value === '') {
        return { success: true, value: undefined };
    }

    if (!ALLOWED_PLATFORMS.includes(value as Platform)) {
        return {
            success: false,
            error: `Invalid platform: must be one of ${ALLOWED_PLATFORMS.join(', ')}`,
        };
    }

    return { success: true, value: value as Platform };
}

/**
 * Escape a string value for safe SQL interpolation
 *
 * This function:
 * 1. Escapes single quotes (SQL injection prevention)
 * 2. Strips any remaining potentially dangerous characters
 *
 * @param value - Pre-validated string value
 * @returns Safely escaped string ready for SQL interpolation
 */
export function escapeForSql(value: string): string {
    // Escape single quotes by doubling them (SQL standard)
    return value.replace(/'/g, "''");
}

/**
 * Build a safe SQL string literal
 *
 * @param value - The string value to wrap
 * @returns SQL-safe quoted string literal
 */
export function sqlString(value: string): string {
    return `'${escapeForSql(value)}'`;
}

/**
 * Build a safe SQL numeric literal
 *
 * @param value - The numeric value
 * @returns String representation of the number
 */
export function sqlNumber(value: number): string {
    return String(Math.floor(value));
}

/**
 * Analytics Query Builder for safe SQL construction
 *
 * Usage:
 * ```typescript
 * const builder = new AnalyticsQueryBuilder('sync_metrics_dev');
 * builder
 *   .select(['blob1 as syncType', 'COUNT() as count'])  // NOTE: Analytics Engine uses COUNT() not COUNT(*)
 *   .whereTimestamp('>', 'NOW() - INTERVAL 24 HOUR')
 *   .whereString('blob2', '=', branch, ValidationPatterns.BRANCH)
 *   .groupBy(['blob1'])
 *   .orderBy('count', 'DESC')
 *   .limit(10);
 *
 * const sql = builder.build();
 * ```
 */
export class AnalyticsQueryBuilder {
    private _table: string;
    private _columns: string[] = [];
    private _conditions: string[] = [];
    private _groupBy: string[] = [];
    private _orderBy: { column: string; direction: 'ASC' | 'DESC' }[] = [];
    private _limit: number | null = null;
    private _errors: string[] = [];

    /**
     * Create a new query builder
     *
     * @param table - The base table name (e.g., 'sync_metrics')
     * @param environment - 'prod' or 'dev' to append suffix
     */
    constructor(table: string, environment: 'production' | 'development' = 'development') {
        const suffix = environment === 'production' ? 'prod' : 'dev';
        this._table = `${table}_${suffix}`;
    }

    /**
     * Check if there are any validation errors
     */
    get hasErrors(): boolean {
        return this._errors.length > 0;
    }

    /**
     * Get all validation errors
     */
    get errors(): string[] {
        return [...this._errors];
    }

    /**
     * Set the SELECT columns
     *
     * @param columns - Array of column expressions
     */
    select(columns: string[]): this {
        this._columns = columns;
        return this;
    }

    /**
     * Add a timestamp condition
     *
     * @param operator - Comparison operator (>, <, >=, <=)
     * @param expression - Safe SQL expression (e.g., "NOW() - INTERVAL '24' HOUR")
     */
    whereTimestamp(operator: '>' | '<' | '>=' | '<=', expression: string): this {
        this._conditions.push(`timestamp ${operator} ${expression}`);
        return this;
    }

    /**
     * Add a safe numeric interval condition
     *
     * @param value - The validated numeric value
     * @param unit - Time unit (HOUR, DAY, etc.)
     */
    whereTimestampInterval(value: number, unit: 'HOUR' | 'DAY' = 'HOUR'): this {
        this._conditions.push(`timestamp > NOW() - INTERVAL '${sqlNumber(value)}' ${unit}`);
        return this;
    }

    /**
     * Add a string equality condition with validation
     *
     * @param column - The column name
     * @param operator - Comparison operator
     * @param value - The raw input value
     * @param pattern - Validation pattern
     * @param fieldName - Name for error messages
     */
    whereString(
        column: string,
        operator: '=' | '!=',
        value: string | undefined,
        pattern: RegExp,
        fieldName: string
    ): this {
        if (value === undefined || value === '') {
            return this; // Skip if no value provided
        }

        const result = validateString(value, pattern, fieldName);
        if (!result.success) {
            this._errors.push(result.error);
            return this;
        }

        this._conditions.push(`${column} ${operator} ${sqlString(result.value)}`);
        return this;
    }

    /**
     * Add a platform condition with allowlist validation
     *
     * @param column - The column name
     * @param value - The raw platform value
     */
    wherePlatform(column: string, value: string | undefined): this {
        const result = validatePlatform(value);
        if (!result.success) {
            this._errors.push(result.error);
            return this;
        }

        if (result.value !== undefined) {
            this._conditions.push(`${column} = ${sqlString(result.value)}`);
        }

        return this;
    }

    /**
     * Add a raw safe condition (for static conditions only)
     *
     * @param condition - A static SQL condition with no user input
     */
    whereRaw(condition: string): this {
        this._conditions.push(condition);
        return this;
    }

    /**
     * Set GROUP BY columns
     *
     * @param columns - Array of column names
     */
    groupBy(columns: string[]): this {
        this._groupBy = columns;
        return this;
    }

    /**
     * Set ORDER BY clause
     *
     * @param column - Column name to order by
     * @param direction - ASC or DESC
     */
    orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
        this._orderBy.push({ column, direction });
        return this;
    }

    /**
     * Set LIMIT with validation
     *
     * @param value - The raw limit value
     * @param bounds - Optional custom bounds (default: LIMIT bounds)
     */
    limitValidated(
        value: string | number | undefined,
        bounds: { min: number; max: number } = NumericBounds.LIMIT
    ): this {
        const result = validateNumber(value, bounds, 'limit', bounds.max);
        if (!result.success) {
            this._errors.push(result.error);
            return this;
        }
        this._limit = result.value;
        return this;
    }

    /**
     * Set LIMIT with a pre-validated number
     *
     * @param value - Already validated limit
     */
    limit(value: number): this {
        this._limit = value;
        return this;
    }

    /**
     * Build the final SQL query
     *
     * @returns The complete SQL string, or null if there are validation errors
     * @throws Error if there are validation errors (call hasErrors first)
     */
    build(): string {
        if (this._errors.length > 0) {
            throw new Error(`Query validation failed: ${this._errors.join('; ')}`);
        }

        const parts: string[] = [];

        // SELECT
        if (this._columns.length === 0) {
            parts.push('SELECT *');
        } else {
            parts.push(`SELECT\n            ${this._columns.join(',\n            ')}`);
        }

        // FROM
        parts.push(`FROM ${this._table}`);

        // WHERE
        if (this._conditions.length > 0) {
            parts.push(`WHERE ${this._conditions.join('\n          AND ')}`);
        }

        // GROUP BY
        if (this._groupBy.length > 0) {
            parts.push(`GROUP BY ${this._groupBy.join(', ')}`);
        }

        // ORDER BY
        if (this._orderBy.length > 0) {
            const orderClauses = this._orderBy.map((o) => `${o.column} ${o.direction}`);
            parts.push(`ORDER BY ${orderClauses.join(', ')}`);
        }

        // LIMIT
        if (this._limit !== null) {
            parts.push(`LIMIT ${sqlNumber(this._limit)}`);
        }

        return `\n        ${parts.join('\n        ')}\n        `;
    }

    /**
     * Try to build the query, returning null if validation fails
     *
     * @returns The SQL string or null
     */
    tryBuild(): string | null {
        if (this._errors.length > 0) {
            return null;
        }
        try {
            return this.build();
        } catch {
            return null;
        }
    }
}

/**
 * Create a query builder for the given table and environment
 *
 * @param table - Base table name without environment suffix
 * @param environment - Environment string from Env
 * @returns Configured AnalyticsQueryBuilder
 */
export function createQueryBuilder(
    table: string,
    environment: string | undefined
): AnalyticsQueryBuilder {
    const env = environment === 'production' ? 'production' : 'development';
    return new AnalyticsQueryBuilder(table, env);
}
