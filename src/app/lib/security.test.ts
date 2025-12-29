/**
 * Security Utilities Tests
 *
 * Tests for redirect validation to prevent open redirect vulnerabilities (CWE-601).
 * These tests ensure malicious URLs are blocked while valid internal paths are allowed.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isValidRedirect, getSafeRedirect } from './security';

describe('isValidRedirect', () => {
    // Capture console.warn calls for verification
    let warnSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    describe('valid internal paths', () => {
        it('should allow root path', () => {
            expect(isValidRedirect('/')).toBe(true);
        });

        it('should allow known internal paths', () => {
            expect(isValidRedirect('/metrics')).toBe(true);
            expect(isValidRedirect('/analytics')).toBe(true);
            expect(isValidRedirect('/settings')).toBe(true);
            expect(isValidRedirect('/users')).toBe(true);
            expect(isValidRedirect('/login')).toBe(true);
        });

        it('should allow subpaths of known paths', () => {
            expect(isValidRedirect('/metrics/sync')).toBe(true);
            expect(isValidRedirect('/settings/profile')).toBe(true);
            expect(isValidRedirect('/users/123')).toBe(true);
        });

        it('should allow paths with query strings', () => {
            expect(isValidRedirect('/metrics?tab=sync')).toBe(true);
            expect(isValidRedirect('/?refresh=true')).toBe(true);
        });

        it('should allow paths with hash fragments', () => {
            expect(isValidRedirect('/metrics#overview')).toBe(true);
            expect(isValidRedirect('/#top')).toBe(true);
        });
    });

    describe('external URLs (blocked)', () => {
        it('should block HTTPS external URLs', () => {
            expect(isValidRedirect('https://evil.com')).toBe(false);
            expect(isValidRedirect('https://evil.com/path')).toBe(false);
            expect(isValidRedirect('https://evil.com/path?query=1')).toBe(false);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked external redirect'));
        });

        it('should block HTTP external URLs', () => {
            expect(isValidRedirect('http://evil.com')).toBe(false);
            expect(isValidRedirect('http://malware.site/steal-creds')).toBe(false);
        });

        it('should block protocol-relative URLs', () => {
            expect(isValidRedirect('//evil.com')).toBe(false);
            expect(isValidRedirect('//evil.com/path')).toBe(false);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked protocol-relative'));
        });
    });

    describe('dangerous schemes (blocked)', () => {
        it('should block javascript: scheme', () => {
            expect(isValidRedirect('javascript:alert(1)')).toBe(false);
            expect(isValidRedirect('/javascript:alert(1)')).toBe(false);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked dangerous scheme'));
        });

        it('should block data: scheme', () => {
            expect(isValidRedirect('data:text/html,<script>alert(1)</script>')).toBe(false);
        });

        it('should block vbscript: scheme', () => {
            expect(isValidRedirect('vbscript:msgbox("XSS")')).toBe(false);
        });

        it('should block file: scheme', () => {
            expect(isValidRedirect('file:///etc/passwd')).toBe(false);
        });

        it('should handle case-insensitive dangerous schemes', () => {
            expect(isValidRedirect('JAVASCRIPT:alert(1)')).toBe(false);
            expect(isValidRedirect('JavaScript:alert(1)')).toBe(false);
        });
    });

    describe('invalid/edge cases', () => {
        it('should block undefined', () => {
            expect(isValidRedirect(undefined)).toBe(false);
        });

        it('should block null', () => {
            expect(isValidRedirect(null)).toBe(false);
        });

        it('should block empty string', () => {
            expect(isValidRedirect('')).toBe(false);
        });

        it('should block whitespace-only string', () => {
            expect(isValidRedirect('   ')).toBe(false);
        });

        it('should block relative paths without leading slash', () => {
            expect(isValidRedirect('metrics')).toBe(false);
            expect(isValidRedirect('path/to/page')).toBe(false);
        });

        it('should block unknown paths', () => {
            expect(isValidRedirect('/unknown-path')).toBe(false);
            expect(isValidRedirect('/admin/secret')).toBe(false);
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Blocked redirect to unknown path'));
        });
    });

    describe('security logging', () => {
        it('should log blocked external URLs', () => {
            isValidRedirect('https://attacker.com/phish');
            expect(warnSpy).toHaveBeenCalledWith(
                '[Security] Blocked external redirect attempt: https://attacker.com/phish'
            );
        });

        it('should log blocked protocol-relative URLs', () => {
            isValidRedirect('//attacker.com');
            expect(warnSpy).toHaveBeenCalledWith(
                '[Security] Blocked protocol-relative redirect attempt: //attacker.com'
            );
        });

        it('should log blocked non-relative paths', () => {
            isValidRedirect('not-a-path');
            expect(warnSpy).toHaveBeenCalledWith('[Security] Blocked non-relative redirect attempt: not-a-path');
        });
    });
});

describe('getSafeRedirect', () => {
    describe('valid paths', () => {
        it('should return valid path unchanged', () => {
            expect(getSafeRedirect('/')).toBe('/');
            expect(getSafeRedirect('/metrics')).toBe('/metrics');
            expect(getSafeRedirect('/metrics?tab=sync')).toBe('/metrics?tab=sync');
        });
    });

    describe('invalid paths', () => {
        it('should return default for invalid paths', () => {
            expect(getSafeRedirect('https://evil.com')).toBe('/');
            expect(getSafeRedirect('//evil.com')).toBe('/');
            expect(getSafeRedirect(undefined)).toBe('/');
            expect(getSafeRedirect(null)).toBe('/');
            expect(getSafeRedirect('')).toBe('/');
        });

        it('should use custom default when provided', () => {
            expect(getSafeRedirect('https://evil.com', '/dashboard')).toBe('/dashboard');
            expect(getSafeRedirect(undefined, '/home')).toBe('/home');
        });
    });
});
