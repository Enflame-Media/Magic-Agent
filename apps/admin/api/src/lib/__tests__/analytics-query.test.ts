/**
 * Security Unit Tests for Analytics Query Builder
 *
 * These tests verify that the query builder properly prevents SQL injection attacks
 * and validates all user inputs according to security requirements.
 *
 * @see HAP-611 - SQL Injection in Analytics Engine Queries
 * @see https://owasp.org/www-community/attacks/SQL_Injection
 */

import { describe, it, expect } from 'vitest';
import {
    AnalyticsQueryBuilder,
    createQueryBuilder,
    validateString,
    validateNumber,
    validatePlatform,
    escapeForSql,
    sqlString,
    sqlNumber,
    ValidationPatterns,
    NumericBounds,
    ALLOWED_PLATFORMS,
} from '../analytics-query';

describe('SQL Injection Prevention', () => {
    describe('validateString', () => {
        it('rejects SQL injection in branch parameter', () => {
            const maliciousInputs = [
                "main' OR '1'='1",
                "main' OR '1'='1' --",
                "main'; DROP TABLE users; --",
                "main' UNION SELECT * FROM secrets --",
                "main\\'",
                'main"',
                'main`',
                'main;',
                'main<script>',
            ];

            for (const input of maliciousInputs) {
                const result = validateString(input, ValidationPatterns.BRANCH, 'branch');
                expect(result.success).toBe(false);
                expect(result.success ? null : result.error).toContain('Invalid branch');
            }
        });

        it('accepts valid branch names', () => {
            const validInputs = [
                'main',
                'develop',
                'feature/HAP-123',
                'hotfix/urgent-fix',
                'release/v1.0.0',
                'user/john/feature',
                'test_branch',
                'Test-Branch-123',
            ];

            for (const input of validInputs) {
                const result = validateString(input, ValidationPatterns.BRANCH, 'branch');
                expect(result.success).toBe(true);
                if (result.success) {
                    expect(result.value).toBe(input);
                }
            }
        });

        it('rejects branch names exceeding max length', () => {
            const longBranch = 'a'.repeat(65);
            const result = validateString(longBranch, ValidationPatterns.BRANCH, 'branch');
            expect(result.success).toBe(false);
        });

        it('accepts branch at max length', () => {
            const maxBranch = 'a'.repeat(64);
            const result = validateString(maxBranch, ValidationPatterns.BRANCH, 'branch');
            expect(result.success).toBe(true);
        });
    });

    describe('validateNumber', () => {
        it('enforces numeric bounds on hours', () => {
            const result1 = validateNumber('999999', NumericBounds.HOURS, 'hours', 24);
            expect(result1.success).toBe(false);
            expect(result1.success ? null : result1.error).toContain('between 1 and 720');

            const result2 = validateNumber('0', NumericBounds.HOURS, 'hours', 24);
            expect(result2.success).toBe(false);

            const result3 = validateNumber('-1', NumericBounds.HOURS, 'hours', 24);
            expect(result3.success).toBe(false);
        });

        it('enforces numeric bounds on limit', () => {
            const result1 = validateNumber('1000', NumericBounds.LIMIT, 'limit', 10);
            expect(result1.success).toBe(false);
            expect(result1.success ? null : result1.error).toContain('between 1 and 100');

            const result2 = validateNumber('0', NumericBounds.LIMIT, 'limit', 10);
            expect(result2.success).toBe(false);
        });

        it('enforces numeric bounds on days', () => {
            const result = validateNumber('1000', NumericBounds.DAYS, 'days', 30);
            expect(result.success).toBe(false);
            expect(result.success ? null : result.error).toContain('between 1 and 365');
        });

        it('accepts valid numeric values', () => {
            const result1 = validateNumber('24', NumericBounds.HOURS, 'hours', 24);
            expect(result1.success).toBe(true);
            expect(result1.success ? result1.value : null).toBe(24);

            const result2 = validateNumber('720', NumericBounds.HOURS, 'hours', 24);
            expect(result2.success).toBe(true);
            expect(result2.success ? result2.value : null).toBe(720);

            const result3 = validateNumber('1', NumericBounds.HOURS, 'hours', 24);
            expect(result3.success).toBe(true);
            expect(result3.success ? result3.value : null).toBe(1);
        });

        it('returns default for undefined values', () => {
            const result = validateNumber(undefined, NumericBounds.HOURS, 'hours', 24);
            expect(result.success).toBe(true);
            expect(result.success ? result.value : null).toBe(24);
        });

        it('rejects non-numeric strings', () => {
            const result = validateNumber('abc', NumericBounds.HOURS, 'hours', 24);
            expect(result.success).toBe(false);
            expect(result.success ? null : result.error).toContain('must be a valid number');
        });
    });

    describe('validatePlatform', () => {
        it('rejects invalid platform values', () => {
            const invalidPlatforms = [
                'windows',
                'linux',
                "ios' OR '1'='1",
                'IOS',
                'Android',
                '',
            ];

            for (const platform of invalidPlatforms) {
                if (platform === '') continue; // Empty is valid (optional)
                const result = validatePlatform(platform);
                expect(result.success).toBe(false);
                expect(result.success ? null : result.error).toContain('Invalid platform');
            }
        });

        it('accepts valid platform values', () => {
            for (const platform of ALLOWED_PLATFORMS) {
                const result = validatePlatform(platform);
                expect(result.success).toBe(true);
                expect(result.success ? result.value : null).toBe(platform);
            }
        });

        it('accepts undefined (optional parameter)', () => {
            const result = validatePlatform(undefined);
            expect(result.success).toBe(true);
            expect(result.success ? result.value : null).toBe(undefined);
        });
    });

    describe('escapeForSql', () => {
        it('escapes single quotes', () => {
            expect(escapeForSql("test'value")).toBe("test''value");
            expect(escapeForSql("it's")).toBe("it''s");
            expect(escapeForSql("'''")).toBe("''''''");
        });

        it('handles strings without quotes', () => {
            expect(escapeForSql('normal')).toBe('normal');
            expect(escapeForSql('feature/test')).toBe('feature/test');
        });
    });

    describe('sqlString', () => {
        it('wraps value in quotes with escaping', () => {
            expect(sqlString('main')).toBe("'main'");
            expect(sqlString("test'value")).toBe("'test''value'");
        });
    });

    describe('sqlNumber', () => {
        it('converts number to safe string', () => {
            expect(sqlNumber(24)).toBe('24');
            expect(sqlNumber(100.7)).toBe('100'); // Floor
            expect(sqlNumber(0)).toBe('0');
        });
    });
});

describe('AnalyticsQueryBuilder', () => {
    describe('query construction', () => {
        it('builds basic SELECT query', () => {
            const query = new AnalyticsQueryBuilder('sync_metrics', 'development');
            query
                .select(['COUNT(*) as count'])
                .whereTimestampInterval(24, 'HOUR');

            const sql = query.build();
            expect(sql).toContain('SELECT');
            expect(sql).toContain('COUNT(*) as count');
            expect(sql).toContain('FROM sync_metrics_dev');
            expect(sql).toContain("INTERVAL '24' HOUR");
        });

        it('uses correct table suffix for production', () => {
            const query = new AnalyticsQueryBuilder('sync_metrics', 'production');
            query.select(['*']);
            const sql = query.build();
            expect(sql).toContain('FROM sync_metrics_prod');
        });

        it('uses correct table suffix for development', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query.select(['*']);
            const sql = query.build();
            expect(sql).toContain('FROM bundle_metrics_dev');
        });
    });

    describe('SQL injection prevention via whereString', () => {
        it('rejects SQL injection attempts', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .whereString('blob2', '=', "main' OR '1'='1", ValidationPatterns.BRANCH, 'branch');

            expect(query.hasErrors).toBe(true);
            expect(query.errors).toHaveLength(1);
            expect(query.errors[0]).toContain('Invalid branch');
        });

        it('throws when building with validation errors', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .whereString('blob2', '=', "'; DROP TABLE users; --", ValidationPatterns.BRANCH, 'branch');

            expect(() => query.build()).toThrow('Query validation failed');
        });

        it('tryBuild returns null on validation errors', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .whereString('blob2', '=', "main' UNION SELECT * FROM secrets", ValidationPatterns.BRANCH, 'branch');

            expect(query.tryBuild()).toBe(null);
        });

        it('accepts valid branch in whereString', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .whereString('blob2', '=', 'feature/HAP-123', ValidationPatterns.BRANCH, 'branch');

            expect(query.hasErrors).toBe(false);
            const sql = query.build();
            expect(sql).toContain("blob2 = 'feature/HAP-123'");
        });
    });

    describe('SQL injection prevention via wherePlatform', () => {
        it('rejects SQL injection in platform', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .wherePlatform('blob1', "ios' OR '1'='1");

            expect(query.hasErrors).toBe(true);
            expect(query.errors[0]).toContain('Invalid platform');
        });

        it('accepts valid platform values', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .wherePlatform('blob1', 'ios');

            expect(query.hasErrors).toBe(false);
            const sql = query.build();
            expect(sql).toContain("blob1 = 'ios'");
        });

        it('skips undefined platform', () => {
            const query = new AnalyticsQueryBuilder('bundle_metrics', 'development');
            query
                .select(['*'])
                .wherePlatform('blob1', undefined);

            expect(query.hasErrors).toBe(false);
            const sql = query.build();
            expect(sql).not.toContain('blob1');
        });
    });

    describe('SQL injection prevention via limitValidated', () => {
        it('rejects out-of-bounds limit', () => {
            const query = new AnalyticsQueryBuilder('client_metrics', 'development');
            query
                .select(['*'])
                .limitValidated('999999');

            expect(query.hasErrors).toBe(true);
            expect(query.errors[0]).toContain('between 1 and 100');
        });

        it('accepts valid limit', () => {
            const query = new AnalyticsQueryBuilder('client_metrics', 'development');
            query
                .select(['*'])
                .limitValidated('50');

            expect(query.hasErrors).toBe(false);
            const sql = query.build();
            expect(sql).toContain('LIMIT 50');
        });
    });

    describe('complete query building', () => {
        it('builds complete bundle-trends query safely', () => {
            const query = createQueryBuilder('bundle_metrics', 'production');
            query
                .select([
                    'toStartOfDay(timestamp) as date',
                    'blob1 as platform',
                    'AVG(double3) as avgTotalSize',
                ])
                .whereTimestampInterval(30, 'DAY')
                .whereString('blob2', '=', 'main', ValidationPatterns.BRANCH, 'branch')
                .wherePlatform('blob1', 'web')
                .groupBy(['date', 'blob1'])
                .orderBy('date', 'ASC');

            expect(query.hasErrors).toBe(false);
            const sql = query.build();

            expect(sql).toContain('FROM bundle_metrics_prod');
            expect(sql).toContain("INTERVAL '30' DAY");
            expect(sql).toContain("blob2 = 'main'");
            expect(sql).toContain("blob1 = 'web'");
            expect(sql).toContain('GROUP BY date, blob1');
            expect(sql).toContain('ORDER BY date ASC');
        });

        it('builds validation-unknown-types query safely', () => {
            const query = createQueryBuilder('client_metrics', 'development');
            query
                .select(['blob3 as typeName', 'SUM(double1) as count'])
                .whereTimestampInterval(24, 'HOUR')
                .whereRaw("blob1 = 'validation'")
                .whereRaw("blob2 = 'unknown'")
                .groupBy(['blob3'])
                .orderBy('count', 'DESC')
                .limit(10);

            expect(query.hasErrors).toBe(false);
            const sql = query.build();

            expect(sql).toContain('FROM client_metrics_dev');
            expect(sql).toContain("INTERVAL '24' HOUR");
            expect(sql).toContain("blob1 = 'validation'");
            expect(sql).toContain("blob2 = 'unknown'");
            expect(sql).toContain('LIMIT 10');
        });
    });
});

describe('Integration scenarios', () => {
    it('prevents real-world SQL injection attack vector 1: OR bypass', () => {
        // Attack: ?branch=main' OR '1'='1
        const result = validateString("main' OR '1'='1", ValidationPatterns.BRANCH, 'branch');
        expect(result.success).toBe(false);
    });

    it('prevents real-world SQL injection attack vector 2: UNION injection', () => {
        // Attack: ?branch=main' UNION SELECT password FROM users --
        const result = validateString("main' UNION SELECT password FROM users --", ValidationPatterns.BRANCH, 'branch');
        expect(result.success).toBe(false);
    });

    it('prevents real-world SQL injection attack vector 3: Comment truncation', () => {
        // Attack: ?branch=main'; --
        const result = validateString("main'; --", ValidationPatterns.BRANCH, 'branch');
        expect(result.success).toBe(false);
    });

    it('prevents real-world SQL injection attack vector 4: Stacked queries', () => {
        // Attack: ?branch=main'; DROP TABLE users; --
        const result = validateString("main'; DROP TABLE users; --", ValidationPatterns.BRANCH, 'branch');
        expect(result.success).toBe(false);
    });

    it('prevents numeric overflow attack', () => {
        // Attack: ?hours=999999999999999999
        const result = validateNumber('999999999999999999', NumericBounds.HOURS, 'hours', 24);
        expect(result.success).toBe(false);
    });

    it('prevents negative number injection', () => {
        // Attack: ?limit=-1
        const result = validateNumber('-1', NumericBounds.LIMIT, 'limit', 10);
        expect(result.success).toBe(false);
    });
});
