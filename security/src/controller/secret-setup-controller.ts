/**
 * Secret Setup & Management Controller
 * Powers the extension settings UI and manages domain-scoped secrets and profiles.
 */

import { ISecretStore } from "../storage/secret-store-interface";
import { MemorySecretStore } from "../storage/memory-secret-store";
import { IndexedDBSecretStore } from "../storage/idb-secret-store";
import {
  CreateSecretInput,
  DecryptedSecret,
  StoredSecretMetadata,
  SecretCategory,
} from "../storage/types";
import { generateMasterKey, deriveKeyFromPassphrase } from "../crypto/key-manager";
import { ReferenceManager } from "../references/reference-manager";
import { ReferenceResolver } from "../references/reference-resolver";
import { SYNTHETIC_INSURANCE_DEMO_PROFILE } from "./demo-profiles";

export class SecretSetupController {
  private secretStore: ISecretStore;
  private masterKey: CryptoKey | null = null;
  private referenceManager: ReferenceManager;
  private referenceResolver: ReferenceResolver;

  constructor(secretStore?: ISecretStore, referenceManager?: ReferenceManager) {
    if (secretStore) {
      this.secretStore = secretStore;
    } else if (typeof globalThis.indexedDB !== "undefined") {
      this.secretStore = new IndexedDBSecretStore();
    } else {
      this.secretStore = new MemorySecretStore();
    }

    this.referenceManager = referenceManager || new ReferenceManager();
    this.referenceResolver = new ReferenceResolver(
      this.secretStore,
      this.referenceManager
    );
  }

  /**
   * Initializes or unlocks the master encryption key using a passphrase or auto-generated session key.
   */
  public async unlock(passphrase?: string): Promise<CryptoKey> {
    if (passphrase) {
      const { key } = await deriveKeyFromPassphrase(passphrase);
      this.masterKey = key;
    } else {
      this.masterKey = await generateMasterKey();
    }
    return this.masterKey;
  }

  /**
   * Ensures the controller is unlocked and returns the active master key.
   */
  public async getMasterKey(): Promise<CryptoKey> {
    if (!this.masterKey) {
      await this.unlock();
    }
    return this.masterKey!;
  }

  /**
   * Pre-loads the official SIH Synthetic Insurance Demo profile.
   */
  public async preloadInsuranceDemoProfile(): Promise<StoredSecretMetadata[]> {
    const key = await this.getMasterKey();
    const results: StoredSecretMetadata[] = [];

    for (const item of SYNTHETIC_INSURANCE_DEMO_PROFILE) {
      const meta = await this.secretStore.saveSecret(item, key);
      results.push(meta);

      // Register session reference mapping
      this.referenceManager.registerMapping({
        token: item.referenceKey || `${item.category}_1`,
        category: item.category,
        domain: item.domain,
        secretId: meta.id,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    }

    return results;
  }

  /**
   * Saves a new user credential/profile item.
   */
  public async addSecret(
    input: CreateSecretInput
  ): Promise<StoredSecretMetadata> {
    const key = await this.getMasterKey();
    const meta = await this.secretStore.saveSecret(input, key);

    this.referenceManager.registerMapping({
      token: meta.referenceKey,
      category: meta.category,
      domain: meta.domain,
      secretId: meta.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });

    return meta;
  }

  /**
   * Retrieves a decrypted secret for the user to view in settings.
   */
  public async viewSecret(id: string): Promise<DecryptedSecret | null> {
    const key = await this.getMasterKey();
    return this.secretStore.getSecret(id, key);
  }

  /**
   * Lists all stored secret metadata (without decrypted raw values).
   */
  public async listSecrets(
    domain?: string,
    category?: SecretCategory
  ): Promise<StoredSecretMetadata[]> {
    return this.secretStore.listSecrets(domain, category);
  }

  /**
   * Deletes a secret by its ID.
   */
  public async removeSecret(id: string): Promise<boolean> {
    return this.secretStore.deleteSecret(id);
  }

  /**
   * Returns the underlying secret store.
   */
  public getSecretStore(): ISecretStore {
    return this.secretStore;
  }

  /**
   * Returns the reference manager.
   */
  public getReferenceManager(): ReferenceManager {
    return this.referenceManager;
  }

  /**
   * Returns the reference resolver.
   */
  public getReferenceResolver(): ReferenceResolver {
    return this.referenceResolver;
  }
}
