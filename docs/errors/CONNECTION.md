# Connection Errors

This guide covers network and connectivity errors when communicating with the Happy server.

---

## connect-failed

**Error Code**: `CONNECT_FAILED`

### Symptoms

- CLI shows "Failed to connect to server"
- Connection times out during initial handshake
- Error appears when starting a session or during authentication

### Common Causes

1. **Server is unreachable** - The Happy server may be down or experiencing issues
2. **Network connectivity** - Firewall, proxy, or DNS blocking outbound connections
3. **Incorrect server URL** - The `HAPPY_SERVER_URL` environment variable points to wrong address

### Solutions

#### 1. Check server status

Verify the server is responding:

```bash
# Check server health endpoint
curl -I https://api.happy-servers.com/health

# Expected: HTTP 200 OK
```

#### 2. Verify your network connection

```bash
# Test basic connectivity
ping api.happy-servers.com

# Check DNS resolution
nslookup api.happy-servers.com
```

#### 3. Check environment configuration

```bash
# View current server URL
echo $HAPPY_SERVER_URL

# The default is usually correct; only set this if instructed
```

#### 4. Check firewall/proxy settings

If behind a corporate firewall or proxy:

- Ensure HTTPS (port 443) outbound connections are allowed
- Check if your proxy requires authentication
- Try connecting from a different network to isolate the issue

### Related Errors

- [NO_RESPONSE](#no-response) - Server reachable but not responding
- [REQUEST_CONFIG_ERROR](#request-config-error) - Configuration issue with request

---

## no-response

**Error Code**: `NO_RESPONSE`

### Symptoms

- CLI hangs then shows "No response from server"
- Request sent successfully but no reply received
- Timeout after extended waiting period

### Common Causes

1. **Server overload** - Server is processing too many requests
2. **Network instability** - Packets being dropped mid-connection
3. **Long-running operation** - Request requires more processing time than allowed

### Solutions

#### 1. Retry the operation

Transient issues often resolve on retry:

```bash
# Simply run your command again
happy <your-command>
```

#### 2. Check for server status

Visit the Happy status page or check social channels for any reported outages.

#### 3. Check your connection stability

```bash
# Test for packet loss
ping -c 10 api.happy-servers.com

# Look for packet loss percentage - should be 0%
```

#### 4. Try with verbose logging

```bash
DEBUG=1 happy <your-command>
```

This may reveal more details about where the request is stalling.

### Related Errors

- [CONNECT_FAILED](#connect-failed) - Cannot establish initial connection
- [PROCESS_TIMEOUT](DAEMON.md#process-timeout) - Local process timeout

---

## request-config-error

**Error Code**: `REQUEST_CONFIG_ERROR`

### Symptoms

- Error immediately on sending request
- Message indicates "Request configuration error"
- No network activity occurs

### Common Causes

1. **Invalid URL format** - Malformed `HAPPY_SERVER_URL`
2. **Missing required headers** - Internal configuration issue
3. **Incompatible client version** - CLI version mismatch

### Solutions

#### 1. Check environment variables

```bash
# Verify URL format is correct
echo $HAPPY_SERVER_URL

# Should be a valid HTTPS URL like:
# https://api.happy-servers.com
```

#### 2. Reset to defaults

```bash
# Unset custom server URL to use defaults
unset HAPPY_SERVER_URL

# Try your command again
happy <your-command>
```

#### 3. Update the CLI

```bash
# Check current version
happy --version

# Update to latest
npm update -g @anthropic-ai/happy
```

#### 4. Clear local state

If issues persist after update:

```bash
# Remove cached configuration (data is preserved)
rm -rf ~/.happy/config.json

# Re-run authentication
happy auth
```

### Related Errors

- [CONNECT_FAILED](#connect-failed) - Cannot connect to server
- [VERSION_MISMATCH](CLI.md#version-mismatch) - Client/server version incompatibility

---

## When to Contact Support

Contact support if:

- Server health check passes but you still can't connect
- Error persists across multiple networks/devices
- You see this error intermittently with no clear pattern

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- Output of `happy --version`
- Network environment (home, corporate, VPN)
- Contents of `~/.happy/logs/` (latest log file)
