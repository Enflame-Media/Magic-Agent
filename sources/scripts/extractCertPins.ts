#!/usr/bin/env tsx
/* oxlint-disable no-console */

/**
 * HAP-858: Extract Certificate SPKI Pins for SSL Pinning
 *
 * This script extracts the SHA-256 SPKI (Subject Public Key Info) fingerprints
 * from SSL certificates for use in certificate pinning configuration.
 *
 * Usage:
 *   npx tsx sources/scripts/extractCertPins.ts
 *   yarn extract-cert-pins
 *
 * Output:
 *   Base64-encoded SHA-256 hashes of the certificate chain's public keys.
 *   These can be used in the publicKeyHashes array in certificatePinning.ts
 *
 * Security Note:
 *   This script uses execSync with hardcoded domain names only.
 *   It is a development-time tool and never processes user input.
 *
 * @see https://owasp.org/www-community/controls/Certificate_and_Public_Key_Pinning
 * @see https://developers.cloudflare.com/ssl/reference/certificate-pinning/
 */

import { execFileSync } from 'child_process';

// Hardcoded domains - never modified by user input
const DOMAINS: readonly string[] = [
    'happy-api.enflamemedia.com',
    'happy-api-dev.enflamemedia.com',
] as const;

interface CertInfo {
    index: number;
    subject: string;
    issuer: string;
    notBefore: string;
    notAfter: string;
    spkiPin: string;
}

/**
 * Execute openssl command safely using execFileSync.
 * Input is piped via stdin to avoid shell injection.
 */
function runOpenssl(args: string[], input?: string): string {
    try {
        return execFileSync('openssl', args, {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            input,
        }).trim();
    } catch {
        return '';
    }
}

function extractCertificateChain(domain: string): CertInfo[] {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`Extracting certificate chain for: ${domain}`);
    console.log('='.repeat(70));

    const certs: CertInfo[] = [];

    try {
        // Get the certificate chain using openssl s_client
        // Using execFileSync with explicit arguments (no shell)
        const chainOutput = execFileSync('openssl', [
            's_client',
            '-servername', domain,
            '-connect', `${domain}:443`,
            '-showcerts',
        ], {
            encoding: 'utf-8',
            maxBuffer: 10 * 1024 * 1024,
            input: '', // Empty input to close stdin
            timeout: 30000, // 30 second timeout
        });

        // Split the output into individual certificates
        const certMatches = chainOutput.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);

        if (!certMatches || certMatches.length === 0) {
            console.error(`  ERROR: No certificates found for ${domain}`);
            return [];
        }

        console.log(`  Found ${certMatches.length} certificate(s) in chain\n`);

        for (let i = 0; i < certMatches.length; i++) {
            const certPem = certMatches[i];

            try {
                // Extract subject
                const subjectOutput = runOpenssl(['x509', '-noout', '-subject'], certPem);
                const subject = subjectOutput.replace('subject=', '').trim();

                // Extract issuer
                const issuerOutput = runOpenssl(['x509', '-noout', '-issuer'], certPem);
                const issuer = issuerOutput.replace('issuer=', '').trim();

                // Extract validity dates
                const datesOutput = runOpenssl(['x509', '-noout', '-dates'], certPem);
                const notBefore = datesOutput.match(/notBefore=(.+)/)?.[1] || 'unknown';
                const notAfter = datesOutput.match(/notAfter=(.+)/)?.[1] || 'unknown';

                // Extract public key in DER format
                const pubkeyPem = runOpenssl(['x509', '-pubkey', '-noout'], certPem);

                // Convert to DER format
                const pubkeyDer = execFileSync('openssl', ['pkey', '-pubin', '-outform', 'DER'], {
                    input: pubkeyPem,
                    maxBuffer: 10 * 1024 * 1024,
                });

                // Hash with SHA-256
                const hashBinary = execFileSync('openssl', ['dgst', '-sha256', '-binary'], {
                    input: pubkeyDer,
                    maxBuffer: 10 * 1024 * 1024,
                });

                // Encode as base64
                const spkiPin = execFileSync('openssl', ['enc', '-base64'], {
                    input: hashBinary,
                    encoding: 'utf-8',
                    maxBuffer: 10 * 1024 * 1024,
                }).trim();

                certs.push({
                    index: i,
                    subject,
                    issuer,
                    notBefore,
                    notAfter,
                    spkiPin,
                });

                const certType = i === 0 ? 'LEAF' : i === certMatches.length - 1 ? 'ROOT/INTERMEDIATE' : 'INTERMEDIATE';

                console.log(`  Certificate ${i + 1} (${certType}):`);
                console.log(`    Subject:    ${subject}`);
                console.log(`    Issuer:     ${issuer}`);
                console.log(`    Valid:      ${notBefore} - ${notAfter}`);
                console.log(`    SPKI Pin:   '${spkiPin}'`);
                console.log('');
            } catch (certError) {
                console.error(`  ERROR processing certificate ${i + 1}:`, certError);
            }
        }
    } catch (error) {
        console.error(`  ERROR connecting to ${domain}:`, error);
    }

    return certs;
}

function generatePinningConfig(domain: string, certs: CertInfo[]): void {
    if (certs.length === 0) return;

    console.log(`\nGenerated pinning configuration for ${domain}:`);
    console.log('-'.repeat(50));
    console.log(`'${domain}': {`);
    console.log('    includeSubdomains: false,');
    console.log('    publicKeyHashes: [');

    // Add pins for non-leaf certificates (intermediate and root)
    // Leaf certificates rotate frequently, so we typically pin intermediates/roots
    for (let i = 1; i < certs.length; i++) {
        const cert = certs[i];
        const certType = i === certs.length - 1 ? 'Root/Intermediate CA' : 'Intermediate CA';
        const cn = cert.subject.match(/CN\s*=\s*([^,]+)/)?.[1] || cert.subject;
        console.log(`        // ${certType}: ${cn}`);
        console.log(`        // Valid until: ${cert.notAfter}`);
        console.log(`        '${cert.spkiPin}',`);
    }

    // Also include leaf for reference (commented out)
    if (certs.length > 0) {
        const leaf = certs[0];
        const cn = leaf.subject.match(/CN\s*=\s*([^,]+)/)?.[1] || leaf.subject;
        console.log(`        // Leaf certificate (rotates frequently - use with caution): ${cn}`);
        console.log(`        // '${leaf.spkiPin}',`);
    }

    console.log('    ],');
    console.log(`    expirationDate: '2027-12-31',`);
    console.log('},');
}

function main(): void {
    console.log('HAP-858: Certificate Pin Extraction Script');
    console.log('==========================================');
    console.log('');
    console.log('This script extracts SPKI pins for SSL certificate pinning.');
    console.log('The output can be used in certificatePinning.ts');
    console.log('');
    console.log('Note: Pinning to root/intermediate CAs is recommended over leaf');
    console.log('certificates since leaf certs rotate frequently (every 90 days).');

    const allCerts: Map<string, CertInfo[]> = new Map();

    for (const domain of DOMAINS) {
        const certs = extractCertificateChain(domain);
        allCerts.set(domain, certs);
    }

    console.log('\n' + '='.repeat(70));
    console.log('RECOMMENDED PINNING CONFIGURATION');
    console.log('='.repeat(70));
    console.log('');
    console.log('Copy the following into certificatePinning.ts:');
    console.log('');

    for (const [domain, certs] of allCerts) {
        generatePinningConfig(domain, certs);
        console.log('');
    }

    // Print warnings
    console.log('\n' + '='.repeat(70));
    console.log('IMPORTANT NOTES');
    console.log('='.repeat(70));
    console.log('');
    console.log('1. Cloudflare uses Google Trust Services (GTS) for SSL certificates.');
    console.log('2. Leaf certificates rotate every ~90 days - pin to intermediates/roots.');
    console.log('3. Always include multiple pins for backup during certificate rotation.');
    console.log('4. Test pinning on both iOS and Android before production deployment.');
    console.log('5. iOS requires at least 2 pins per domain.');
    console.log('6. Consider using SSL Labs (ssllabs.com) to verify certificate chains.');
    console.log('');
}

main();
