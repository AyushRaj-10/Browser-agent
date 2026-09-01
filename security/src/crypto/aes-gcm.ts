/**
 * Web Crypto AES-GCM (256-bit) Authenticated Encryption / Decryption Module
 * Supports browser WebExtension environments and Node.js test runtimes.
 */

import { EncryptedPayload } from "./types";

const AES_ALGORITHM = "AES-GCM";
const IV_LENGTH_BYTES = 12; // Standard 96-bit IV for AES-GCM
const DEFAULT_TAG_LENGTH = 128;
const SCHEMA_VERSION = 1;

/**
 * Encodes a Uint8Array to a standard Base64 string.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a Base64 string to a Uint8Array.
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Safely clears a typed array from memory.
 */
export function wipeBuffer(buffer: Uint8Array): void {
  buffer.fill(0);
}

/**
 * Returns the active SubtleCrypto instance.
 */
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
 * Encrypts a plaintext UTF-8 string with AES-GCM-256.
 *
 * @param plaintext The string value to encrypt.
 * @param key The AES-GCM CryptoKey.
 * @param salt Optional salt to preserve in the payload if derived via PBKDF2.
 * @returns EncryptedPayload containing Base64 ciphertext, IV, and metadata.
 */
export async function encryptString(
  plaintext: string,
  key: CryptoKey,
  salt?: Uint8Array
): Promise<EncryptedPayload> {
  const subtle = getSubtleCrypto();

  // 1. Generate unique 12-byte IV for this encryption operation
  const iv = new Uint8Array(IV_LENGTH_BYTES);
  globalThis.crypto.getRandomValues(iv);

  // 2. Encode plaintext to bytes
  const encoder = new TextEncoder();
  const plaintextBytes = encoder.encode(plaintext);

  // 3. Perform AES-GCM encryption with 128-bit authentication tag
  const ciphertextBuffer = await subtle.encrypt(
    {
      name: AES_ALGORITHM,
      iv: iv,
      tagLength: DEFAULT_TAG_LENGTH,
    },
    key,
    plaintextBytes
  );

  const ciphertextBytes = new Uint8Array(ciphertextBuffer);

  const payload: EncryptedPayload = {
    ciphertext: uint8ArrayToBase64(ciphertextBytes),
    iv: uint8ArrayToBase64(iv),
    tagLength: DEFAULT_TAG_LENGTH,
    version: SCHEMA_VERSION,
  };

  if (salt && salt.length > 0) {
    payload.salt = uint8ArrayToBase64(salt);
  }

  // Best-effort cleanup of plaintext buffer
  wipeBuffer(plaintextBytes);

  return payload;
}

/**
 * Decrypts an AES-GCM EncryptedPayload back into plaintext UTF-8 string.
 *
 * @param payload The EncryptedPayload with Base64 ciphertext and IV.
 * @param key The AES-GCM CryptoKey.
 * @returns The decrypted plaintext string.
 */
export async function decryptString(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const subtle = getSubtleCrypto();

  if (!payload || !payload.ciphertext || !payload.iv) {
    throw new Error("Invalid encrypted payload: ciphertext and iv are required.");
  }

  const ciphertextBytes = base64ToUint8Array(payload.ciphertext);
  const ivBytes = base64ToUint8Array(payload.iv);

  try {
    const decryptedBuffer = await subtle.decrypt(
      {
        name: AES_ALGORITHM,
        iv: ivBytes as BufferSource,
        tagLength: payload.tagLength || DEFAULT_TAG_LENGTH,
      },
      key,
      ciphertextBytes as BufferSource
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    throw new Error(
      "Decryption failed: Ciphertext integrity check failed or wrong decryption key."
    );
  } finally {
    wipeBuffer(ivBytes);
  }
}

/**
 * Encrypts an arbitrary JSON-serializable object.
 */
export async function encryptObject<T>(
  data: T,
  key: CryptoKey,
  salt?: Uint8Array
): Promise<EncryptedPayload> {
  const jsonString = JSON.stringify(data);
  return encryptString(jsonString, key, salt);
}

/**
 * Decrypts an EncryptedPayload into a parsed JSON object.
 */
export async function decryptObject<T>(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<T> {
  const jsonString = await decryptString(payload, key);
  return JSON.parse(jsonString) as T;
}
