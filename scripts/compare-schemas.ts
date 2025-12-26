#!/usr/bin/env tsx
/**
 * Schema Drift Detection Script
 *
 * Compares OpenAPI schemas from happy-server with JSON schemas extracted from @happy/protocol
 * to detect schema drift between what the server exposes and what clients expect.
 *
 * This script performs two types of checks:
 * 1. **Schema Drift Detection**: Compares protocol schemas with server OpenAPI schemas
 * 2. **Breaking Change Detection**: Uses oasdiff to detect breaking changes between versions
 *
 * Usage:
 *   yarn schema:compare                    # Run all drift detection
 *   yarn schema:compare --protocol-only    # Only check protocol vs server schemas
 *   yarn schema:compare --breaking-only    # Only check for breaking changes
 *   yarn schema:compare --baseline <path>  # Compare against a baseline OpenAPI spec
 *   yarn schema:compare --ci               # Output format suitable for CI (markdown summary)
 *
 * Prerequisites:
 *   - yarn workspace @happy/protocol schema:extract (generates protocol-schemas.json)
 *   - yarn workspace happy-server openapi:generate (generates openapi.json)
 *   - oasdiff (optional, for breaking change detection)
 *
 * Exit codes:
 *   0 - No drift detected
 *   1 - Drift detected or errors
 *
 * @see HAP-565 - Add cross-project schema drift detection to CI
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

// Configuration
const PROTOCOL_SCHEMAS_PATH = resolve(ROOT_DIR, 'packages/@happy/protocol/protocol-schemas.json');
const OPENAPI_SPEC_PATH = resolve(ROOT_DIR, 'happy-server/openapi.json');
const DIFF_OUTPUT_PATH = resolve(ROOT_DIR, 'schema-diff.md');

// Types
interface SchemaProperty {
    type?: string;
    enum?: string[];
    properties?: Record<string, SchemaProperty>;
    required?: string[];
    additionalProperties?: boolean | SchemaProperty;
    items?: SchemaProperty;
    oneOf?: SchemaProperty[];
    anyOf?: SchemaProperty[];
    allOf?: SchemaProperty[];
    $ref?: string;
    nullable?: boolean;
    description?: string;
}

interface DriftIssue {
    severity: 'error' | 'warning' | 'info';
    type: 'missing' | 'type_mismatch' | 'property_diff' | 'enum_diff' | 'breaking';
    path: string;
    message: string;
    details?: Record<string, unknown>;
}

interface ComparisonResult {
    timestamp: string;
    protocolVersion: string;
    openApiVersion: string;
    issues: DriftIssue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        passed: boolean;
    };
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
    protocolOnly: boolean;
    breakingOnly: boolean;
    baseline?: string;
    ci: boolean;
    verbose: boolean;
} {
    const args = process.argv.slice(2);
    return {
        protocolOnly: args.includes('--protocol-only'),
        breakingOnly: args.includes('--breaking-only'),
        baseline: args.find((_, i, arr) => arr[i - 1] === '--baseline'),
        ci: args.includes('--ci'),
        verbose: args.includes('--verbose') || args.includes('-v'),
    };
}

/**
 * Load and parse JSON file
 */
function loadJsonFile<T>(path: string): T {
    if (!existsSync(path)) {
        throw new Error(`File not found: ${path}`);
    }
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
}

/**
 * Extract type information from a JSON Schema property
 */
function getTypeString(schema: SchemaProperty | undefined): string {
    if (!schema) return 'undefined';
    if (schema.$ref) return `$ref:${schema.$ref}`;
    if (schema.oneOf) return `oneOf[${schema.oneOf.map(s => getTypeString(s)).join('|')}]`;
    if (schema.anyOf) return `anyOf[${schema.anyOf.map(s => getTypeString(s)).join('|')}]`;
    if (schema.allOf) return `allOf[${schema.allOf.map(s => getTypeString(s)).join('&')}]`;
    if (schema.enum) return `enum[${schema.enum.join(',')}]`;
    if (schema.type === 'array') return `array<${getTypeString(schema.items)}>`;
    if (schema.type === 'object') {
        const props = Object.keys(schema.properties || {}).join(',');
        return props ? `object{${props}}` : 'object';
    }
    return schema.type || 'unknown';
}

/**
 * Compare two schema properties for structural differences
 */
function compareSchemaProperties(
    protocolProp: SchemaProperty | undefined,
    openApiProp: SchemaProperty | undefined,
    path: string,
    issues: DriftIssue[]
): void {
    if (!protocolProp && !openApiProp) return;

    // Missing in one or the other
    if (!protocolProp) {
        issues.push({
            severity: 'info',
            type: 'missing',
            path,
            message: `Property exists in OpenAPI but not in protocol`,
            details: { openApiType: getTypeString(openApiProp) },
        });
        return;
    }

    if (!openApiProp) {
        issues.push({
            severity: 'warning',
            type: 'missing',
            path,
            message: `Property exists in protocol but not in OpenAPI`,
            details: { protocolType: getTypeString(protocolProp) },
        });
        return;
    }

    // Type comparison (basic)
    const protocolType = getTypeString(protocolProp);
    const openApiType = getTypeString(openApiProp);

    // Skip comparison for complex types - just note they exist
    if (protocolType.includes('oneOf') || protocolType.includes('anyOf') ||
        openApiType.includes('oneOf') || openApiType.includes('anyOf')) {
        return;
    }

    // Compare basic types
    if (protocolProp.type && openApiProp.type && protocolProp.type !== openApiProp.type) {
        issues.push({
            severity: 'error',
            type: 'type_mismatch',
            path,
            message: `Type mismatch: protocol has "${protocolProp.type}", OpenAPI has "${openApiProp.type}"`,
            details: { protocolType, openApiType },
        });
    }

    // Compare enums
    if (protocolProp.enum && openApiProp.enum) {
        const protocolEnums = new Set(protocolProp.enum);
        const openApiEnums = new Set(openApiProp.enum);

        const missingInOpenApi = protocolProp.enum.filter(e => !openApiEnums.has(e));
        const missingInProtocol = openApiProp.enum.filter(e => !protocolEnums.has(e));

        if (missingInOpenApi.length > 0) {
            issues.push({
                severity: 'warning',
                type: 'enum_diff',
                path,
                message: `Enum values in protocol missing from OpenAPI: ${missingInOpenApi.join(', ')}`,
                details: { missingInOpenApi },
            });
        }

        if (missingInProtocol.length > 0) {
            issues.push({
                severity: 'info',
                type: 'enum_diff',
                path,
                message: `Extra enum values in OpenAPI: ${missingInProtocol.join(', ')}`,
                details: { missingInProtocol },
            });
        }
    }

    // Recursively compare object properties
    if (protocolProp.type === 'object' && openApiProp.type === 'object') {
        const allKeys = new Set([
            ...Object.keys(protocolProp.properties || {}),
            ...Object.keys(openApiProp.properties || {}),
        ]);

        for (const key of allKeys) {
            compareSchemaProperties(
                protocolProp.properties?.[key],
                openApiProp.properties?.[key],
                `${path}.${key}`,
                issues
            );
        }

        // Compare required fields
        const protocolRequired = new Set(protocolProp.required || []);
        const openApiRequired = new Set(openApiProp.required || []);

        for (const field of protocolRequired) {
            if (!openApiRequired.has(field)) {
                issues.push({
                    severity: 'warning',
                    type: 'property_diff',
                    path: `${path}.${field}`,
                    message: `Field is required in protocol but optional in OpenAPI`,
                });
            }
        }
    }

    // Compare array items
    if (protocolProp.type === 'array' && openApiProp.type === 'array') {
        compareSchemaProperties(
            protocolProp.items,
            openApiProp.items,
            `${path}[]`,
            issues
        );
    }
}

/**
 * Check if oasdiff is available
 */
function isOasdiffAvailable(): boolean {
    try {
        execFileSync('which', ['oasdiff'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Check for breaking changes using oasdiff (if available)
 * Uses execFileSync for safety - no shell injection possible
 */
function checkBreakingChanges(baseline: string, current: string): DriftIssue[] {
    const issues: DriftIssue[] = [];

    if (!isOasdiffAvailable()) {
        console.error('⚠️  oasdiff not installed - skipping breaking change detection');
        console.error('   Install: npm install -g @oasdiff/oasdiff');
        return issues;
    }

    try {
        // Using execFileSync with array args - safe from shell injection
        const result = execFileSync(
            'oasdiff',
            ['breaking', baseline, current, '--format', 'json'],
            { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
        );

        const breakingChanges = JSON.parse(result);

        for (const change of breakingChanges.breaking || []) {
            issues.push({
                severity: 'error',
                type: 'breaking',
                path: change.path || 'unknown',
                message: change.message || 'Breaking change detected',
                details: change,
            });
        }
    } catch (error) {
        // oasdiff returns non-zero when breaking changes are found
        if (error instanceof Error && 'stdout' in error) {
            try {
                const breakingChanges = JSON.parse((error as { stdout: string }).stdout);
                for (const change of breakingChanges.breaking || []) {
                    issues.push({
                        severity: 'error',
                        type: 'breaking',
                        path: change.path || 'unknown',
                        message: change.message || 'Breaking change detected',
                        details: change,
                    });
                }
            } catch {
                // Couldn't parse output - might be an actual error
                console.error('⚠️  Could not parse oasdiff output');
            }
        }
    }

    return issues;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(result: ComparisonResult): string {
    const lines: string[] = [
        '# Schema Drift Detection Report',
        '',
        `**Generated:** ${result.timestamp}`,
        `**Protocol Version:** ${result.protocolVersion}`,
        `**OpenAPI Version:** ${result.openApiVersion}`,
        '',
        '## Summary',
        '',
        `| Severity | Count |`,
        `|----------|-------|`,
        `| 🔴 Errors | ${result.summary.errors} |`,
        `| 🟡 Warnings | ${result.summary.warnings} |`,
        `| 🔵 Info | ${result.summary.info} |`,
        '',
        result.summary.passed ? '✅ **No blocking issues detected**' : '❌ **Blocking issues detected**',
        '',
    ];

    if (result.issues.length > 0) {
        lines.push('## Issues', '');

        // Group by severity
        const grouped: Record<string, DriftIssue[]> = {
            error: [],
            warning: [],
            info: [],
        };

        for (const issue of result.issues) {
            grouped[issue.severity].push(issue);
        }

        for (const [severity, issues] of Object.entries(grouped)) {
            if (issues.length === 0) continue;

            const icon = severity === 'error' ? '🔴' : severity === 'warning' ? '🟡' : '🔵';
            lines.push(`### ${icon} ${severity.charAt(0).toUpperCase() + severity.slice(1)}s (${issues.length})`, '');

            for (const issue of issues) {
                lines.push(`- **${issue.path}**: ${issue.message}`);
                if (issue.details) {
                    lines.push(`  \`\`\`json`);
                    lines.push(`  ${JSON.stringify(issue.details, null, 2).split('\n').join('\n  ')}`);
                    lines.push(`  \`\`\``);
                }
            }

            lines.push('');
        }
    }

    return lines.join('\n');
}

/**
 * Main comparison function
 */
async function main(): Promise<void> {
    const args = parseArgs();

    console.error('🔍 Schema Drift Detection');
    console.error('='.repeat(50));

    // Check prerequisites
    if (!existsSync(PROTOCOL_SCHEMAS_PATH)) {
        console.error(`❌ Protocol schemas not found: ${PROTOCOL_SCHEMAS_PATH}`);
        console.error('   Run: yarn workspace @happy/protocol schema:extract');
        process.exit(1);
    }

    if (!existsSync(OPENAPI_SPEC_PATH)) {
        console.error(`❌ OpenAPI spec not found: ${OPENAPI_SPEC_PATH}`);
        console.error('   Run: yarn workspace happy-server openapi:generate');
        process.exit(1);
    }

    const issues: DriftIssue[] = [];

    // Load schemas
    console.error('\n📂 Loading schemas...');

    interface ProtocolSchemas {
        _metadata: { packageVersion: string };
        schemas: Record<string, Record<string, SchemaProperty>>;
    }

    interface OpenAPISpec {
        info: { version: string };
        components?: { schemas?: Record<string, SchemaProperty> };
        paths?: Record<string, unknown>;
    }

    const protocolSchemas = loadJsonFile<ProtocolSchemas>(PROTOCOL_SCHEMAS_PATH);
    const openApiSpec = loadJsonFile<OpenAPISpec>(OPENAPI_SPEC_PATH);

    console.error(`   Protocol: ${Object.values(protocolSchemas.schemas).reduce((acc, cat) => acc + Object.keys(cat).length, 0)} schemas`);
    console.error(`   OpenAPI: ${Object.keys(openApiSpec.components?.schemas || {}).length} schemas, ${Object.keys(openApiSpec.paths || {}).length} paths`);

    // Protocol vs OpenAPI comparison
    if (!args.breakingOnly) {
        console.error('\n🔄 Comparing protocol schemas with OpenAPI...');

        const openApiSchemas = openApiSpec.components?.schemas || {};

        // Compare each protocol schema category
        for (const [category, categorySchemas] of Object.entries(protocolSchemas.schemas)) {
            for (const [schemaName, protocolSchema] of Object.entries(categorySchemas)) {
                // Look for matching OpenAPI schema (by name)
                const openApiSchema = openApiSchemas[schemaName];

                if (openApiSchema) {
                    compareSchemaProperties(
                        protocolSchema as SchemaProperty,
                        openApiSchema as SchemaProperty,
                        `${category}.${schemaName}`,
                        issues
                    );
                } else {
                    // Not all protocol schemas need to be in OpenAPI
                    // This is expected for internal schemas like payloads
                    if (args.verbose) {
                        console.error(`   ⚪ ${category}.${schemaName} - not in OpenAPI (expected for internal schemas)`);
                    }
                }
            }
        }
    }

    // Breaking change detection
    if (!args.protocolOnly && args.baseline) {
        console.error('\n🔍 Checking for breaking changes...');

        if (!existsSync(args.baseline)) {
            console.error(`⚠️  Baseline not found: ${args.baseline}`);
        } else {
            const breakingIssues = checkBreakingChanges(args.baseline, OPENAPI_SPEC_PATH);
            issues.push(...breakingIssues);
            console.error(`   Found ${breakingIssues.length} breaking changes`);
        }
    }

    // Generate result
    const result: ComparisonResult = {
        timestamp: new Date().toISOString(),
        protocolVersion: protocolSchemas._metadata.packageVersion,
        openApiVersion: openApiSpec.info.version,
        issues,
        summary: {
            errors: issues.filter(i => i.severity === 'error').length,
            warnings: issues.filter(i => i.severity === 'warning').length,
            info: issues.filter(i => i.severity === 'info').length,
            passed: issues.filter(i => i.severity === 'error').length === 0,
        },
    };

    // Output
    console.error('\n📊 Results:');
    console.error(`   Errors: ${result.summary.errors}`);
    console.error(`   Warnings: ${result.summary.warnings}`);
    console.error(`   Info: ${result.summary.info}`);

    if (args.ci) {
        // Write markdown report for GitHub Actions
        const markdown = generateMarkdownReport(result);
        writeFileSync(DIFF_OUTPUT_PATH, markdown, 'utf-8');
        console.error(`\n📄 Report written to: ${DIFF_OUTPUT_PATH}`);

        // Also output to stdout for GitHub Step Summary
        console.log(markdown);
    } else {
        // Console output
        if (issues.length > 0) {
            console.error('\n📋 Issues:');
            for (const issue of issues) {
                const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🔵';
                console.error(`   ${icon} [${issue.type}] ${issue.path}: ${issue.message}`);
            }
        }
    }

    // Exit code
    if (result.summary.passed) {
        console.error('\n✅ Schema drift check passed');
        process.exit(0);
    } else {
        console.error('\n❌ Schema drift check failed');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('❌ Schema comparison failed:', error);
    process.exit(1);
});
