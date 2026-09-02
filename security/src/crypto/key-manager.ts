/**
 * Key Management and PBKDF2 Key Derivation Module
 * Generates and manages AES-GCM 256-bit CryptoKey instances.
 */

import {
  uint8ArrayToBase64,
  base64ToUint8Array,
  wipeBuffer,
} from "./aes-gcm";
import { KeyDerivationOptions, ExportedKeyBundle } from "./types";

const PBKDF2_ALGORITHM = "PBKDF2";
const AES_ALGORITHM = "AES-GCM";
const AES_KEY_LENGTH = 256;
const DEFAULT_ITERATIONS = 100000;
const SALT_LENGTH_BYTES = 16;

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "SubtleCrypto is not available in the current runtime environment."
    );
  }
  return subtle;
}

/**
 * Generates a cryptographically random salt.
 */
export function generateSalt(lengthBytes = SALT_LENGTH_BYTES): Uint8Array {
  const salt = new Uint8Array(lengthBytes);
  globalThis.crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generates a fresh random 256-bit AES-GCM CryptoKey for session/device use.
 */
export async function generateMasterKey(extractable = false): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  return subtle.generateKey(
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    extractable,
    ["encrypt", "decrypt"]
  );
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a user passphrase using PBKDF2 with SHA-256.
 *
 * @param passphrase The user master passphrase.
 * @param options Custom salt and iteration count.
 * @returns Object containing the derived CryptoKey and the salt used.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  options?: KeyDerivationOptions
): Promise<{ key: CryptoKey; salt: Uint8Array }> {
  const subtle = getSubtleCrypto();

  const iterations = options?.iterations || DEFAULT_ITERATIONS;
  const salt = options?.salt || generateSalt(SALT_LENGTH_BYTES);

  const encoder = new TextEncoder();
  const passphraseBytes = encoder.encode(passphrase);

  // 1. Import passphrase as raw key material for PBKDF2
  const baseKey = await subtle.importKey(
    "raw",
    passphraseBytes,
    { name: PBKDF2_ALGORITHM },
    false,
    ["deriveKey"]
  );

  // 2. Derive AES-GCM 256-bit key
  const derivedKey = await subtle.deriveKey(
    {
      name: PBKDF2_ALGORITHM,
      salt: salt as BufferSource,
      iterations: iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: AES_ALGORITHM,
      length: AES_KEY_LENGTH,
    },
    false, // Non-extractable for security
    ["encrypt", "decrypt"]
  );

  // Wipe temporary passphrase buffer
  wipeBuffer(passphraseBytes);

  return { key: derivedKey, salt };
}

/**
 * Exports an extractable CryptoKey to a Base64-encoded raw key bundle.
 */
export async function exportKey(key: CryptoKey): Promise<ExportedKeyBundle> {
  const subtle = getSubtleCrypto();
  const rawKeyBuffer = await subtle.exportKey("raw", key);
  const rawKeyBytes = new Uint8Array(rawKeyBuffer);

  const bundle: ExportedKeyBundle = {
    rawKeyBase64: uint8ArrayToBase64(rawKeyBytes),
    algorithm: key.algorithm.name,
    extractable: key.extractable,
  };

  wipeBuffer(rawKeyBytes);
  return bundle;
}

/**
 * Imports a raw Base64-encoded key bundle into a CryptoKey.
 */
export async function importKey(
  rawKeyBase64: string,
  extractable = false
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const rawKeyBytes = base64ToUint8Array(rawKeyBase64);

  try {
    return await subtle.importKey(
      "raw",
      rawKeyBytes as BufferSource,
      {
        name: AES_ALGORITHM,
        length: AES_KEY_LENGTH,
      },
      extractable,
      ["encrypt", "decrypt"]
    );
  } finally {
    wipeBuffer(rawKeyBytes);
  }
}
