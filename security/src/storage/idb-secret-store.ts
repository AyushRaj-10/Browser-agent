/**
 * IndexedDB-backed Local Secret Store Implementation
 * Uses Web Crypto AES-GCM for at-rest encryption and IndexedDB for persistence.
 */

import { ISecretStore } from "./secret-store-interface";
import {
  CreateSecretInput,
  DecryptedSecret,
  StoredSecretMetadata,
  StoredSecretRecord,
  SecretCategory,
  SecretStoreConfig,
} from "./types";
import { encryptString, decryptString } from "../crypto/aes-gcm";
import { SECURITY_POLICY_ERRORS } from "../../../shared/constants";

const DEFAULT_DB_NAME = "BrowserAgent_SecretStore_v1";
const DEFAULT_DB_VERSION = 1;
const STORE_NAME = "secrets";

export class IndexedDBSecretStore implements ISecretStore {
  private dbName: string;
  private dbVersion: number;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private customIndexedDB?: IDBFactory;

  constructor(config?: SecretStoreConfig, customIndexedDB?: IDBFactory) {
    this.dbName = config?.dbName || DEFAULT_DB_NAME;
    this.dbVersion = config?.dbVersion || DEFAULT_DB_VERSION;
    this.customIndexedDB = customIndexedDB;
  }

  private getIDBFactory(): IDBFactory {
    const idb = this.customIndexedDB || globalThis.indexedDB;
    if (!idb) {
      throw new Error(
        "IndexedDB is not available in the current execution environment."
      );
    }
    return idb;
  }

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    const idb = this.getIDBFactory();

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = idb.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("by_domain", "domain", { unique: false });
          store.createIndex("by_category", "category", { unique: false });
          store.createIndex("by_reference_key", "referenceKey", { unique: false });
          store.createIndex(
            "by_domain_category",
            ["domain", "category"],
            { unique: false }
          );
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private validateSecretPolicy(input: CreateSecretInput): void {
    const isPasswordCategory =
      (input.category as string).toUpperCase() === "PASSWORD";
    const hasPasswordInLabel = /password|pin|otp|passcode/i.test(input.label);

    if (isPasswordCategory || hasPasswordInLabel) {
      throw new Error(
        `Security Policy Violation: ${SECURITY_POLICY_ERRORS.PASSWORD_STORAGE_FORBIDDEN}`
      );
    }
  }

  async saveSecret(
    input: CreateSecretInput,
    key: CryptoKey
  ): Promise<StoredSecretMetadata> {
    this.validateSecretPolicy(input);
    const db = await this.getDB();

    const id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `sec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const refKey =
      input.referenceKey || `${input.category.toUpperCase()}_${Date.now().toString().slice(-4)}`;

    const encryptedValue = await encryptString(input.value, key);
    const now = Date.now();

    const record: StoredSecretRecord = {
      id,
      domain: input.domain.toLowerCase(),
      category: input.category,
      label: input.label,
      referenceKey: refKey,
      createdAt: now,
      updatedAt: now,
      isLocked: input.isLocked ?? false,
      encryptedValue,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => {
        const { encryptedValue: _, ...metadata } = record;
        resolve(metadata);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getSecret(
    id: string,
    key: CryptoKey
  ): Promise<DecryptedSecret | null> {
    const db = await this.getDB();

    const record = await new Promise<StoredSecretRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    const value = await decryptString(record.encryptedValue, key);

    // Update lastUsedAt asynchronously in background
    try {
      const updateTx = db.transaction(STORE_NAME, "readwrite");
      record.lastUsedAt = Date.now();
      updateTx.objectStore(STORE_NAME).put(record);
    } catch {
      // Non-blocking update failure
    }

    const { encryptedValue: _, ...metadata } = record;
    return {
      ...metadata,
      value,
    };
  }

  async getSecretByReference(
    domain: string,
    referenceKey: string,
    key: CryptoKey
  ): Promise<DecryptedSecret | null> {
    const db = await this.getDB();
    const normalizedDomain = domain.toLowerCase();
    const normalizedRef = referenceKey.toUpperCase().replace(/[<>]/g, "");

    const records = await new Promise<StoredSecretRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_reference_key");
      const req = index.getAll(normalizedRef);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    for (const record of records) {
      const matchesDomain =
        record.domain === "*" ||
        record.domain === normalizedDomain ||
        normalizedDomain.endsWith("." + record.domain);

      if (matchesDomain) {
        const value = await decryptString(record.encryptedValue, key);
        const { encryptedValue: _, ...metadata } = record;
        return {
          ...metadata,
          value,
        };
      }
    }

    return null;
  }

  async listSecrets(
    domain?: string,
    category?: SecretCategory
  ): Promise<StoredSecretMetadata[]> {
    const db = await this.getDB();
    const normalizedDomain = domain?.toLowerCase();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const allRecords: StoredSecretRecord[] = req.result || [];
        const filtered = allRecords
          .filter((rec) => {
            if (
              normalizedDomain &&
              rec.domain !== "*" &&
              rec.domain !== normalizedDomain &&
              !normalizedDomain.endsWith("." + rec.domain)
            ) {
              return false;
            }
            if (category && rec.category !== category) {
              return false;
            }
            return true;
          })
          .map(({ encryptedValue: _, ...metadata }) => metadata);

        resolve(filtered);
      };

      req.onerror = () => reject(req.error);
    });
  }

  async deleteSecret(id: string): Promise<boolean> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clearDomain(domain: string): Promise<number> {
    const db = await this.getDB();
    const normalizedDomain = domain.toLowerCase();

    const records = await new Promise<StoredSecretRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("by_domain");
      const req = index.getAll(normalizedDomain);

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (records.length === 0) return 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);

      for (const rec of records) {
        store.delete(rec.id);
      }

      tx.oncomplete = () => resolve(records.length);
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}
