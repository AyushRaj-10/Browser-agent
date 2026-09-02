/**
 * In-Memory Secret Store Implementation
 * Useful for headless testing, ephemeral sandbox sessions, and fallback environments.
 */

import { ISecretStore } from "./secret-store-interface";
import {
  CreateSecretInput,
  DecryptedSecret,
  StoredSecretMetadata,
  StoredSecretRecord,
  SecretCategory,
} from "./types";
import { encryptString, decryptString } from "../crypto/aes-gcm";
import { SECURITY_POLICY_ERRORS } from "../../../shared/constants";

export class MemorySecretStore implements ISecretStore {
  private records: Map<string, StoredSecretRecord> = new Map();

  /**
   * Validates security invariants before storing a secret.
   */
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

    const id = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `secret_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const refKey =
      input.referenceKey ||
      `${input.category.toUpperCase()}_${this.records.size + 1}`;

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

    this.records.set(id, record);

    const { encryptedValue: _, ...metadata } = record;
    return metadata;
  }

  async getSecret(
    id: string,
    key: CryptoKey
  ): Promise<DecryptedSecret | null> {
    const record = this.records.get(id);
    if (!record) return null;

    const value = await decryptString(record.encryptedValue, key);
    record.lastUsedAt = Date.now();

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
    const normalizedDomain = domain.toLowerCase();
    const normalizedRef = referenceKey.toUpperCase().replace(/[<>]/g, "");

    for (const record of this.records.values()) {
      const matchesDomain =
        record.domain === "*" ||
        record.domain === normalizedDomain ||
        normalizedDomain.endsWith("." + record.domain);

      const matchesRef =
        record.referenceKey.toUpperCase() === normalizedRef;

      if (matchesDomain && matchesRef) {
        const value = await decryptString(record.encryptedValue, key);
        record.lastUsedAt = Date.now();
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
    const result: StoredSecretMetadata[] = [];
    const normalizedDomain = domain?.toLowerCase();

    for (const record of this.records.values()) {
      if (
        normalizedDomain &&
        record.domain !== "*" &&
        record.domain !== normalizedDomain &&
        !normalizedDomain.endsWith("." + record.domain)
      ) {
        continue;
      }

      if (category && record.category !== category) {
        continue;
      }

      const { encryptedValue: _, ...metadata } = record;
      result.push(metadata);
    }

    return result;
  }

  async deleteSecret(id: string): Promise<boolean> {
    return this.records.delete(id);
  }

  async clearDomain(domain: string): Promise<number> {
    const normalizedDomain = domain.toLowerCase();
    let deletedCount = 0;

    for (const [id, record] of this.records.entries()) {
      if (record.domain === normalizedDomain) {
        this.records.delete(id);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  async clearAll(): Promise<void> {
    this.records.clear();
  }
}
