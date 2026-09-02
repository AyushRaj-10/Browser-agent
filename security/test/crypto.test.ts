/**
 * Web Crypto AES-GCM & PBKDF2 Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
  encryptString,
  decryptString,
  encryptObject,
  decryptObject,
  uint8ArrayToBase64,
  base64ToUint8Array,
} from "../src/crypto/aes-gcm";
import {
  generateMasterKey,
  deriveKeyFromPassphrase,
  exportKey,
  importKey,
  generateSalt,
} from "../src/crypto/key-manager";

describe("Web Crypto - AES-GCM (256-bit)", () => {
  it("encrypts and decrypts a plain text string successfully", async () => {
    const key = await generateMasterKey();
    const secretText = "Ayush Raj - ayush@gmail.com";

    const payload = await encryptString(secretText, key);

    expect(payload.ciphertext).toBeDefined();
    expect(payload.iv).toBeDefined();
    expect(payload.version).toBe(1);
    expect(payload.ciphertext).not.toBe(secretText);

    const decrypted = await decryptString(payload, key);
    expect(decrypted).toBe(secretText);
  });

  it("produces distinct ciphertexts and IVs for identical plaintext", async () => {
    const key = await generateMasterKey();
    const text = "Same secret value";

    const payload1 = await encryptString(text, key);
    const payload2 = await encryptString(text, key);

    expect(payload1.iv).not.toBe(payload2.iv);
    expect(payload1.ciphertext).not.toBe(payload2.ciphertext);

    expect(await decryptString(payload1, key)).toBe(text);
    expect(await decryptString(payload2, key)).toBe(text);
  });

  it("fails decryption when ciphertext is tampered (integrity verification)", async () => {
    const key = await generateMasterKey();
    const payload = await encryptString("Sensitive Data", key);

    // Tamper with base64 ciphertext
    const tamperedBytes = base64ToUint8Array(payload.ciphertext);
    tamperedBytes[0] ^= 0xff; // Flip bits
    const tamperedPayload = {
      ...payload,
      ciphertext: uint8ArrayToBase64(tamperedBytes),
    };

    await expect(decryptString(tamperedPayload, key)).rejects.toThrow(
      /Decryption failed/i
    );
  });

  it("fails decryption when wrong decryption key is provided", async () => {
    const key1 = await generateMasterKey();
    const key2 = await generateMasterKey();

    const payload = await encryptString("Confidential Insurance Info", key1);

    await expect(decryptString(payload, key2)).rejects.toThrow(
      /Decryption failed/i
    );
  });

  it("handles complex Unicode characters and empty strings", async () => {
    const key = await generateMasterKey();
    const unicodeText = "Ayush Raj 🚀 🛡️ नमस्ते ₹50,000";

    const payloadUnicode = await encryptString(unicodeText, key);
    expect(await decryptString(payloadUnicode, key)).toBe(unicodeText);

    const emptyText = "";
    const payloadEmpty = await encryptString(emptyText, key);
    expect(await decryptString(payloadEmpty, key)).toBe(emptyText);
  });

  it("encrypts and decrypts structured JSON objects", async () => {
    const key = await generateMasterKey();
    const originalObject = {
      name: "Ayush Raj",
      email: "ayush@gmail.com",
      phone: "9876543210",
      claimAmount: 50000,
      verified: true,
    };

    const payload = await encryptObject(originalObject, key);
    const decrypted = await decryptObject<typeof originalObject>(payload, key);

    expect(decrypted).toEqual(originalObject);
  });
});

describe("Web Crypto - Key Management & PBKDF2 Derivation", () => {
  it("derives AES-GCM key from passphrase using PBKDF2 with reproducible results for same salt", async () => {
    const passphrase = "UserSecureMasterPassphrase#2026";
    const salt = generateSalt();

    const { key: key1 } = await deriveKeyFromPassphrase(passphrase, { salt });
    const { key: key2 } = await deriveKeyFromPassphrase(passphrase, { salt });

    const plaintext = "Data protected by passphrase";
    const payload = await encryptString(plaintext, key1);

    // key2 derived with same passphrase and salt must decrypt key1's payload
    const decrypted = await decryptString(payload, key2);
    expect(decrypted).toBe(plaintext);
  });

  it("derives different keys for different passphrases", async () => {
    const salt = generateSalt();
    const { key: key1 } = await deriveKeyFromPassphrase("PassphraseA", { salt });
    const { key: key2 } = await deriveKeyFromPassphrase("PassphraseB", { salt });

    const payload = await encryptString("Data", key1);
    await expect(decryptString(payload, key2)).rejects.toThrow(/Decryption failed/i);
  });

  it("exports and imports extractable CryptoKeys", async () => {
    const originalKey = await generateMasterKey(true);
    const exported = await exportKey(originalKey);

    expect(exported.rawKeyBase64).toBeDefined();
    expect(exported.algorithm).toBe("AES-GCM");

    const importedKey = await importKey(exported.rawKeyBase64);
    const plaintext = "Export-Import Roundtrip Test";

    const payload = await encryptString(plaintext, originalKey);
    const decrypted = await decryptString(payload, importedKey);

    expect(decrypted).toBe(plaintext);
  });
});
