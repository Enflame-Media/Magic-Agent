# Happy CLI Error Reference

This directory contains troubleshooting guides for common errors in the Happy CLI. When an error occurs, the CLI will display a link to the relevant documentation section.

## Quick Reference

| Error Code | Category | Description |
|------------|----------|-------------|
| [`CONNECT_FAILED`](CONNECTION.md#connect-failed) | Connection | Failed to establish connection to server |
| [`NO_RESPONSE`](CONNECTION.md#no-response) | Connection | Server did not respond to request |
| [`REQUEST_CONFIG_ERROR`](CONNECTION.md#request-config-error) | Connection | Invalid request configuration |
| [`AUTH_FAILED`](AUTHENTICATION.md#auth-failed) | Authentication | Authentication request failed |
| [`TOKEN_EXCHANGE_FAILED`](AUTHENTICATION.md#token-exchange-failed) | Authentication | Token exchange with server failed |
| [`SESSION_NOT_FOUND`](SESSIONS.md#session-not-found) | Sessions | Requested session does not exist |
| [`DAEMON_START_FAILED`](DAEMON.md#start-failed) | Daemon | Failed to start background daemon |
| [`PROCESS_TIMEOUT`](DAEMON.md#process-timeout) | Daemon | Process exceeded timeout threshold |
| [`VERSION_MISMATCH`](CLI.md#version-mismatch) | CLI | CLI and server version incompatibility |
| [`LOCK_ACQUISITION_FAILED`](CLI.md#lock-acquisition-failed) | CLI | Could not acquire lock on resource |
| [`DIRECTORY_REQUIRED`](CLI.md#directory-required) | CLI | Required directory does not exist |
| [`RESOURCE_NOT_FOUND`](CLI.md#resource-not-found) | CLI | Requested resource not found |
| [`ENCRYPTION_ERROR`](ENCRYPTION.md#encryption-error) | Encryption | Encryption or decryption operation failed |
| [`NONCE_TOO_SHORT`](ENCRYPTION.md#nonce-too-short) | Encryption | Cryptographic nonce length invalid |

## Documentation Structure

- **[CONNECTION.md](CONNECTION.md)** - Network and server connectivity issues
- **[AUTHENTICATION.md](AUTHENTICATION.md)** - Authentication and authorization errors
- **[SESSIONS.md](SESSIONS.md)** - Session management errors
- **[DAEMON.md](DAEMON.md)** - Background daemon lifecycle issues
- **[CLI.md](CLI.md)** - General CLI operational errors
- **[ENCRYPTION.md](ENCRYPTION.md)** - End-to-end encryption errors

## Understanding Error Messages

When an error occurs, the CLI displays:

```
Error: Failed to connect to server (ref: abc12345)
  For more information, see: https://github.com/Enflame-Media/happy-shared/blob/main/docs/errors/CONNECTION.md#connect-failed
```

- **Error message**: Brief description of what went wrong
- **ref**: Correlation ID for support requests (first 8 characters)
- **URL**: Link to detailed troubleshooting steps

## Getting More Details

Use verbose mode for additional diagnostics:

```bash
# Show full correlation ID and stack trace
happy --verbose <command>

# Or set DEBUG environment variable
DEBUG=1 happy <command>
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HAPPY_SERVER_URL` | Override the default server URL |
| `HAPPY_HOME_DIR` | Override the default data directory (~/.happy) |
| `DEBUG` | Enable verbose logging (set to `1`) |

## Support

If you can't resolve an issue using these guides:

1. Note your **correlation ID** (the `ref:` value in the error)
2. Check your log files at `~/.happy/logs/`
3. Open an issue at [GitHub Issues](https://github.com/Enflame-Media/happy/issues)

Include your correlation ID in support requests to help us trace the issue.
