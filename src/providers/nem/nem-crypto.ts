import { ed25519 } from '@noble/curves/ed25519.js';
import { keccak256, keccak_512 } from 'js-sha3';

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = bytes.length - 1; i >= 0; i--) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Decrypt a NEM NIS1 encrypted message.
 *
 * NEM's ECDH uses Ed25519 curve scalar multiplication directly:
 * 1. Hash reversed private key with Keccak-512, clamp → scalar
 * 2. Decode sender's Ed25519 public key → point
 * 3. Multiply: shared_point = scalar * sender_pubkey_point
 * 4. Pack shared_point → 32 bytes (y-coordinate encoding)
 * 5. XOR shared with salt
 * 6. Keccak-256 → AES-256 key
 * 7. AES-256-CBC decrypt
 */
export async function decryptMessage(
  recipientPrivateKey: string,
  senderPublicKey: string,
  payloadHex: string
): Promise<string> {
  const payload = hexToBytes(payloadHex);
  const salt = payload.slice(0, 32);
  const iv = payload.slice(32, 48);
  const ciphertext = payload.slice(48);

  // 1. Hash reversed private key with Keccak-512 and clamp
  const privKeyBytes = hexToBytes(recipientPrivateKey);
  const reversed = new Uint8Array(privKeyBytes).reverse();
  const d = hexToBytes(keccak_512(reversed));
  d[0] &= 248;
  d[31] &= 127;
  d[31] |= 64;
  // Ed25519 curve order
  const L = BigInt('7237005577332262213973186563042994240857116359379907606001950938285454250989');
  const scalar = bytesToBigInt(d.slice(0, 32)) % L;

  // 2-3. Ed25519 scalar multiplication: shared_point = scalar * sender_pubkey
  const senderPoint = (ed25519 as any).Point.fromHex(senderPublicKey);
  const sharedPoint = senderPoint.multiply(scalar);
  const shared = sharedPoint.toBytes();

  // 4-5. XOR shared with salt
  for (let i = 0; i < salt.length; i++) {
    shared[i] ^= salt[i];
  }

  // 6. Keccak-256 → AES key
  const aesKey = hexToBytes(keccak256(shared));

  // 7. AES-256-CBC decrypt
  const cryptoKey = await crypto.subtle.importKey(
    'raw', aesKey.buffer as ArrayBuffer, { name: 'AES-CBC' }, false, ['decrypt']
  );
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: iv.buffer as ArrayBuffer },
    cryptoKey,
    ciphertext.buffer as ArrayBuffer
  );

  return new TextDecoder('utf-8').decode(decrypted);
}
