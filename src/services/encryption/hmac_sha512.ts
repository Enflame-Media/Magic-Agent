export async function hmacSha512(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const keyRaw = new Uint8Array(key).buffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyRaw,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );

  const dataRaw = new Uint8Array(data).buffer;
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, dataRaw);
  return new Uint8Array(signature);
}
