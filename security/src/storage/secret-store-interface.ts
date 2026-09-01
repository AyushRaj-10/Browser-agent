/**
 * Contract Interface for Secret Store Implementations
 */

import {
  CreateSecretInput,
  DecryptedSecret,
  StoredSecretMetadata,
  SecretCategory,
} from "./types";

export interface ISecretStore {
  /**
   * Encrypts and saves a new secret record scoped to a domain.
   */
  saveSecret(
    secretInput: CreateSecretInput,
    encryptionKey: CryptoKey
  ): Promise<StoredSecretMetadata>;

  /**
   * Retrieves and decrypts a secret by its unique ID.
   */
  getSecret(
    id: string,
    decryptionKey: CryptoKey
  ): Promise<DecryptedSecret | null>;

  /**
   * Retrieves and decrypts a secret matching a domain and reference key (e.g. EMAIL_1).
   */
  getSecretByReference(
    domain: string,
    referenceKey: string,
    decryptionKey: CryptoKey
  ): Promise<DecryptedSecret | null>;

  /**
   * Lists metadata for all stored secrets without decrypting raw values.
   */
  listSecrets(
    domain?: string,
    category?: SecretCategory
  ): Promise<StoredSecretMetadata[]>;

  /**
   * Deletes a secret by its unique ID.
   */
  deleteSecret(id: string): Promise<boolean>;

  /**
   * Clears all secrets associated with a specific domain.
   */
  clearDomain(domain: string): Promise<number>;

  /**
   * Clears all stored secrets across all domains.
   */
  clearAll(): Promise<void>;
}
