/**
 * Native IndexedDB Secret Store with Web Crypto AES-GCM (256-bit) Encryption
 * Directly powers the Chrome/Firefox Extension background worker and popup.
 *
 * Database Name: BrowserAgent_SecretStore_v1
 * Store: secrets
 */

const DB_NAME = "BrowserAgent_SecretStore_v1";
const DB_VERSION = 1;
const STORE_NAME = "secrets";

export interface VaultSecretItem {
  id?: string;
  ref: string;
  category: string;
  label: string;
  decryptedValue: string;
  encryptedCiphertext: string;
  iv: string;
}

interface StoredSecretEntry {
  id: string;
  referenceKey: string;
  category: string;
  label: string;
  domain: string;
  ciphertext: string; // Base64
  iv: string;         // Base64
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_SEED_SECRETS: Array<{
  ref: string;
  category: string;
  label: string;
  value: string;
}> = [
  { ref: "NAME_1", category: "NAME", label: "Full Name", value: "Ayush Raj" },
  { ref: "FIRST_NAME_1", category: "NAME", label: "First Name", value: "Ayush" },
  { ref: "LAST_NAME_1", category: "NAME", label: "Last Name", value: "Raj" },
  { ref: "EMAIL_1", category: "EMAIL", label: "Primary Email", value: "ayush@gmail.com" },
  { ref: "PHONE_1", category: "PHONE", label: "Primary Mobile", value: "9876543210" },
  { ref: "DOB_1", category: "DOB", label: "Date of Birth", value: "1998-05-15" },
  { ref: "PAN_1", category: "GOVID", label: "PAN Number", value: "ABCDE1234F" },
  { ref: "AADHAAR_1", category: "GOVID", label: "Aadhaar Number", value: "1234 5678 9012" },
  { ref: "ADDRESS_1", category: "ADDRESS", label: "Address Line 1", value: "402, Lotus Towers, SV Road" },
  { ref: "CITY_1", category: "ADDRESS", label: "City", value: "Mumbai" },
  { ref: "STATE_1", category: "ADDRESS", label: "State", value: "MH" },
  { ref: "PINCODE_1", category: "ADDRESS", label: "PIN Code", value: "400001" },
  { ref: "POLICY_1", category: "POLICY", label: "Health Policy Number", value: "POL12345" },
  { ref: "AMOUNT_1", category: "CUSTOM", label: "Claim Amount", value: "Rs. 50,000" },
];

let cachedKey: CryptoKey | null = null;

/**
 * Derives or retrieves a persistent AES-GCM-256 encryption key using Web Crypto API.
 */
async function getOrCreateEncryptionKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const KEY_STORAGE_ID = "browserAgent.vaultKeyRaw";
  let rawKeyHex: string | null = null;

  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const stored = await chrome.storage.local.get(KEY_STORAGE_ID);
      rawKeyHex = stored[KEY_STORAGE_ID] as string || null;
    }
  } catch {
    // Fall back to memory
  }

  if (rawKeyHex) {
    const rawKeyBytes = new Uint8Array(
      rawKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    cachedKey = await crypto.subtle.importKey(
      "raw",
      rawKeyBytes,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
    return cachedKey;
  }

  // Generate deterministic key based on browser agent local entropy
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  const hex = Array.from(new Uint8Array(exported))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [KEY_STORAGE_ID]: hex });
    }
  } catch {
    // Storage unavailable
  }

  cachedKey = key;
  return key;
}

/**
 * Opens or upgrades the IndexedDB database.
 */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not available in this environment."));
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by_reference_key", "referenceKey", { unique: false });
        store.createIndex("by_category", "category", { unique: false });
        store.createIndex("by_domain", "domain", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Encrypts a plaintext string with Web Crypto AES-GCM (256-bit).
 */
async function encryptWithAES(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv.buffer),
  };
}

/**
 * Decrypts AES-GCM ciphertext using Web Crypto API.
 */
async function decryptWithAES(ciphertext: string, ivBase64: string, key: CryptoKey): Promise<string> {
  try {
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const encryptedBytes = base64ToArrayBuffer(ciphertext);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      encryptedBytes
    );

    return new TextDecoder().decode(decrypted);
  } catch (err) {
    return "[Decryption Error]";
  }
}

/**
 * Initializes the IndexedDB vault and seeds default synthetic profiles if empty.
 */
export async function initIndexedDBVault(): Promise<void> {
  const db = await openIDB();
  const key = await getOrCreateEncryptionKey();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (count === 0) {
    console.log(`[IndexedDB-Vault] Initializing and seeding ${DEFAULT_SEED_SECRETS.length} records into ${DB_NAME}`);
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const seed of DEFAULT_SEED_SECRETS) {
      const { ciphertext, iv } = await encryptWithAES(seed.value, key);
      const entry: StoredSecretEntry = {
        id: `sec_${seed.ref.toLowerCase()}`,
        referenceKey: seed.ref,
        category: seed.category,
        label: seed.label,
        domain: "*",
        ciphertext,
        iv,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      store.put(entry);
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    console.log(`[IndexedDB-Vault] ✅ Seed complete. Database "${DB_NAME}" populated with encrypted AES-GCM records.`);
  }
}

/**
 * Returns all secrets from IndexedDB with both decrypted and encrypted views for the UI.
 */
export async function getAllVaultSecrets(): Promise<VaultSecretItem[]> {
  await initIndexedDBVault();
  const db = await openIDB();
  const key = await getOrCreateEncryptionKey();

  const entries = await new Promise<StoredSecretEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const results: VaultSecretItem[] = [];
  for (const entry of entries) {
    const decryptedValue = await decryptWithAES(entry.ciphertext, entry.iv, key);
    results.push({
      id: entry.id,
      ref: entry.referenceKey,
      category: entry.category,
      label: entry.label,
      decryptedValue,
      encryptedCiphertext: entry.ciphertext,
      iv: entry.iv,
    });
  }

  return results;
}

/**
 * Saves or updates a secret in IndexedDB with real AES-GCM encryption.
 */
export async function saveVaultSecret(
  ref: string,
  category: string,
  label: string,
  plaintext: string
): Promise<void> {
  await initIndexedDBVault();
  const db = await openIDB();
  const key = await getOrCreateEncryptionKey();

  const { ciphertext, iv } = await encryptWithAES(plaintext, key);
  const entry: StoredSecretEntry = {
    id: `sec_${ref.toLowerCase()}`,
    referenceKey: ref,
    category,
    label,
    domain: "*",
    ciphertext,
    iv,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });

  console.log(`[IndexedDB-Vault] 🔐 Encrypted & updated "${ref}" in ${DB_NAME}`);
}

/**
 * Resolves a reference token (e.g. "NAME_1", "EMAIL_1") by querying IndexedDB and decrypting on-device.
 */
export async function resolveVaultReference(ref: string): Promise<string> {
  try {
    await initIndexedDBVault();
    const db = await openIDB();
    const key = await getOrCreateEncryptionKey();

    const normalizedRef = ref.toUpperCase().replace(/[<>]/g, "");

    const entry = await new Promise<StoredSecretEntry | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_reference_key");
      const req = index.get(normalizedRef);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (entry) {
      return await decryptWithAES(entry.ciphertext, entry.iv, key);
    }

    // Dynamic alias resolution
    if (normalizedRef.startsWith("FIRST_NAME")) {
      const fullName = await resolveVaultReference("NAME_1");
      return fullName ? fullName.split(" ")[0] : "";
    }
    if (normalizedRef.startsWith("LAST_NAME")) {
      const fullName = await resolveVaultReference("NAME_1");
      if (fullName) {
        const parts = fullName.split(" ");
        return parts.length > 1 ? parts.slice(1).join(" ") : "";
      }
    }
    if (normalizedRef.startsWith("PAN")) {
      return await resolveVaultReference("PAN_1");
    }
    if (normalizedRef.startsWith("AADHAAR")) {
      return await resolveVaultReference("AADHAAR_1");
    }
    if (normalizedRef.startsWith("GOVID")) {
      const pan = await resolveVaultReference("PAN_1");
      return pan || await resolveVaultReference("AADHAAR_1");
    }
    if (normalizedRef.startsWith("PHONE") || normalizedRef.startsWith("MOBILE")) {
      return await resolveVaultReference("PHONE_1");
    }
    if (normalizedRef.startsWith("POLICY")) {
      return await resolveVaultReference("POLICY_1");
    }
  } catch (err) {
    console.error("[IndexedDB-Vault] Error resolving reference:", err);
  }

  return "";
}
