# Encryption Errors

This guide covers errors related to end-to-end encryption in the Happy CLI.

Happy uses TweetNaCl (NaCl Box) for end-to-end encryption. All data is encrypted on your device before transmission, ensuring the server never sees plaintext content.

---

## encryption-error

**Error Code**: `ENCRYPTION_ERROR`

### Symptoms

- CLI shows "Encryption error" or "Failed to encrypt/decrypt"
- Cannot send or receive messages
- Session data appears corrupted or unreadable

### Common Causes

1. **Key mismatch** - Encryption keys don't match between devices
2. **Corrupted key material** - Local key files are damaged
3. **Re-authentication needed** - Key exchange needs to be repeated
4. **Clock skew** - Significant time differences affecting crypto operations

### Solutions

#### 1. Re-authenticate

The most reliable fix is to re-establish the key exchange:

```bash
# Stop current session
happy stop

# Clear auth state
rm -rf ~/.happy/auth/

# Re-authenticate with mobile app
happy auth
```

This generates fresh keypairs and performs a new key exchange.

#### 2. Check for key file corruption

```bash
# Check key files exist and have content
ls -la ~/.happy/auth/

# Files should be non-empty
# If any are 0 bytes, delete and re-auth
```

#### 3. Verify device pairing

Ensure both devices completed the pairing:

1. Open Happy mobile app
2. Go to Settings > Linked Devices
3. Verify your computer is listed
4. If not, re-pair the devices

#### 4. Check system time

Cryptographic operations can fail with significant clock drift:

```bash
# Check system time
date

# Sync with NTP if needed
# macOS:
sudo sntp -sS time.apple.com

# Linux:
sudo ntpdate pool.ntp.org
```

### Understanding E2E Encryption

Happy's encryption flow:

1. **Key Generation**: Each device generates a NaCl keypair
2. **Key Exchange**: Public keys are exchanged during QR pairing
3. **Shared Secret**: Both devices derive the same shared secret
4. **Message Encryption**: All messages encrypted with NaCl Box before transmission
5. **Server Role**: Server relays encrypted blobs; cannot decrypt content

### Related Errors

- [AUTH_FAILED](AUTHENTICATION.md#auth-failed) - Authentication issues
- [NONCE_TOO_SHORT](#nonce-too-short) - Cryptographic nonce issues

---

## nonce-too-short

**Error Code**: `NONCE_TOO_SHORT`

### Symptoms

- CLI shows "Nonce too short" or "Invalid nonce length"
- Decryption fails with cryptographic error
- Error appears when receiving messages

### Common Causes

1. **Data corruption** - Encrypted message was corrupted in transit
2. **Protocol mismatch** - Sender using different encryption protocol version
3. **Truncated message** - Message was cut off during transmission

### Solutions

#### 1. Retry the operation

Transient network issues can corrupt data:

```bash
# Stop and restart
happy stop
happy start

# Retry your operation
```

#### 2. Check CLI version

Ensure both devices use compatible versions:

```bash
# Check CLI version
happy --version

# Update if needed
npm update -g @anthropic-ai/happy
```

Also update the mobile app to the latest version.

#### 3. Re-authenticate

If errors persist, refresh the encryption setup:

```bash
# Full re-authentication
rm -rf ~/.happy/auth/
happy auth
```

#### 4. Clear session cache

Corrupted cached data can cause issues:

```bash
# Clear session cache
rm -rf ~/.happy/sessions/

# Sync fresh from server
happy sync --force
```

### Technical Details

NaCl Box encryption requires:

- **Nonce**: 24 bytes (192 bits) - unique per message
- **Public Key**: 32 bytes (256 bits)
- **Secret Key**: 32 bytes (256 bits)

The "nonce too short" error means the nonce portion of an encrypted message is less than 24 bytes, making decryption impossible.

### Message Format

Encrypted messages are structured as:

```
[nonce (24 bytes)][ciphertext (variable)]
```

If a message is truncated before the full nonce is received, this error occurs.

### Related Errors

- [ENCRYPTION_ERROR](#encryption-error) - General encryption failure
- [NO_RESPONSE](CONNECTION.md#no-response) - Network delivery issues

---

## Security Best Practices

1. **Keep devices updated** - Use latest CLI and mobile app versions
2. **Secure your devices** - Encryption keys are stored locally
3. **Re-authenticate periodically** - Rotate keys by re-pairing
4. **Don't share key files** - Never copy `~/.happy/auth/` between machines

## When to Contact Support

Contact support if:

- Encryption errors persist after re-authentication
- You suspect key compromise
- You see consistent nonce errors on fresh installs

**Include in your report:**
- Your correlation ID (the `ref:` value in the error)
- CLI version (`happy --version`)
- Whether re-authentication was attempted
- Whether the issue affects all paired devices or just one

**Note**: For security reasons, never share your key files or encryption-related log entries with support.
