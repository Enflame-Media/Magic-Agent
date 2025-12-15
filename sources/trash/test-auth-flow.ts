/**
 * Test script to debug the auth flow on happy-server-workers
 * Run with: npx tsx sources/trash/test-auth-flow.ts
 */

import sodium from 'libsodium-wrappers';

const API_ENDPOINT = 'https://happy-api-dev.enflamemedia.com';

// Helper to encode to base64
function encodeBase64(data: Uint8Array): string {
    return Buffer.from(data).toString('base64');
}

async function testAuthFlow() {
    // Initialize libsodium
    await sodium.ready;

    console.log('🔐 Testing auth flow on:', API_ENDPOINT);
    console.log('');

    // Step 1: Generate Ed25519 keypair (like happy-app does)
    const keyPair = sodium.crypto_sign_keypair();
    console.log('✅ Generated Ed25519 keypair');
    console.log('   Public key length:', keyPair.publicKey.length);

    // Step 2: Create challenge and sign it
    const challenge = sodium.randombytes_buf(32);
    const signature = sodium.crypto_sign_detached(challenge, keyPair.privateKey);
    console.log('✅ Created challenge and signature');

    // Step 3: Call POST /v1/auth
    console.log('');
    console.log('📤 Calling POST /v1/auth...');

    const authResponse = await fetch(`${API_ENDPOINT}/v1/auth`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            publicKey: encodeBase64(keyPair.publicKey),
            challenge: encodeBase64(challenge),
            signature: encodeBase64(signature),
        }),
    });

    console.log('   Status:', authResponse.status);
    const authData = await authResponse.json();
    console.log('   Response:', JSON.stringify(authData, null, 2));

    if (!authResponse.ok || !authData.token) {
        console.error('❌ Auth failed!');
        return;
    }

    const token = authData.token;
    console.log('✅ Got token:', token.substring(0, 50) + '...');

    // Wait a moment then immediately verify the token
    console.log('');
    console.log('⏳ Waiting 1 second...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 4: Call GET /v1/account/settings with the token
    console.log('');
    console.log('📤 Calling GET /v1/account/settings (to verify token)...');

    const settingsResponse = await fetch(`${API_ENDPOINT}/v1/account/settings`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
    });

    console.log('   Status:', settingsResponse.status);
    const settingsData = await settingsResponse.json();
    console.log('   Response:', JSON.stringify(settingsData, null, 2));

    if (settingsResponse.status === 401) {
        console.error('❌ Token was REJECTED! This is the bug.');
    } else if (!settingsResponse.ok) {
        console.error('❌ Settings fetch failed (but not 401)');
    } else {
        console.log('✅ Token verified successfully!');
    }

    // Summary
    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('Summary:');
    console.log('  POST /v1/auth:', authResponse.ok ? '✅ OK' : '❌ FAILED');
    console.log('  GET /v1/account/settings:', settingsResponse.ok ? '✅ OK' : `❌ FAILED (${settingsResponse.status})`);
    console.log('═══════════════════════════════════════════════════');
}

testAuthFlow().catch(console.error);
