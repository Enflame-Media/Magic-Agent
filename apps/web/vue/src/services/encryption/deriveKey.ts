import { hmacSha512 } from './hmac_sha512';

export type KeyTreeState = {
  key: Uint8Array;
  chainCode: Uint8Array;
};

export async function deriveSecretKeyTreeRoot(seed: Uint8Array, usage: string): Promise<KeyTreeState> {
  const key = new TextEncoder().encode(`${usage} Master Seed`);
  const I = await hmacSha512(key, seed);
  return {
    key: I.slice(0, 32),
    chainCode: I.slice(32),
  };
}

export async function deriveSecretKeyTreeChild(
  chainCode: Uint8Array,
  index: string
): Promise<KeyTreeState> {
  const data = new Uint8Array([0x0, ...new TextEncoder().encode(index)]);
  const I = await hmacSha512(chainCode, data);
  return {
    key: I.subarray(0, 32),
    chainCode: I.subarray(32),
  };
}

export async function deriveKey(
  master: Uint8Array,
  usage: string,
  path: string[]
): Promise<Uint8Array> {
  let state = await deriveSecretKeyTreeRoot(master, usage);
  for (const index of path) {
    state = await deriveSecretKeyTreeChild(state.chainCode, index);
  }

  return state.key;
}
