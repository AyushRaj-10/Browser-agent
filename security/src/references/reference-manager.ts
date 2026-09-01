/**
 * Reference Manager Module
 * Manages the generation, registry, and lifecycle of ephemeral reference tokens.
 */

import { ReferenceMapping } from "./types";
import { SecretCategory } from "../../../shared/types";
import { SECURITY_POLICY_ERRORS } from "../../../shared/constants";

const DEFAULT_REFERENCE_TTL_MS = 10 * 60 * 1000; // 10 minutes session TTL

export class ReferenceManager {
  private mappings: Map<string, ReferenceMapping> = new Map();
  private categoryCounters: Map<string, number> = new Map();

  /**
   * Normalizes a reference token string, removing angle brackets if present.
   */
  public normalizeToken(token: string): string {
    return token.trim().toUpperCase().replace(/^[<[]+|[>\]]+$/g, "");
  }

  /**
   * Formats a token into the standard sanitized representation <TOKEN>.
   */
  public formatPlaceholder(token: string): string {
    const norm = this.normalizeToken(token);
    return `<${norm}>`;
  }

  /**
   * Generates a new canonical reference token for a sensitive field.
   *
   * @param category The category of secret (EMAIL, PHONE, NAME, etc.)
   * @param domain Current webpage domain scope
   * @param elementId Associated DOM element ID
   * @param secretId Optional persistent secret ID
   * @param ttlMs Expiration time in milliseconds
   */
  public createReference(
    category: SecretCategory,
    domain: string,
    elementId?: string,
    secretId?: string,
    ttlMs: number = DEFAULT_REFERENCE_TTL_MS
  ): string {
    if ((category as string).toUpperCase() === "PASSWORD") {
      throw new Error(
        `Security Violation: ${SECURITY_POLICY_ERRORS.PASSWORD_STORAGE_FORBIDDEN}`
      );
    }

    const normCat = category.toUpperCase();
    const currentCount = (this.categoryCounters.get(normCat) || 0) + 1;
    this.categoryCounters.set(normCat, currentCount);

    const token = `${normCat}_${currentCount}`;
    const now = Date.now();

    const mapping: ReferenceMapping = {
      token,
      category,
      domain: domain.toLowerCase(),
      elementId,
      secretId,
      createdAt: now,
      expiresAt: now + ttlMs,
    };

    this.mappings.set(token, mapping);
    return token;
  }

  /**
   * Registers an explicit reference mapping (e.g. from an existing secret).
   */
  public registerMapping(mapping: ReferenceMapping): void {
    if ((mapping.category as string).toUpperCase() === "PASSWORD") {
      throw new Error(
        `Security Violation: ${SECURITY_POLICY_ERRORS.PASSWORD_STORAGE_FORBIDDEN}`
      );
    }
    const token = this.normalizeToken(mapping.token);
    this.mappings.set(token, {
      ...mapping,
      token,
      domain: mapping.domain.toLowerCase(),
    });
  }

  /**
   * Retrieves a reference mapping if it exists, is valid for the domain, and is not expired.
   */
  public getMapping(
    token: string,
    domain: string
  ): ReferenceMapping | null {
    const normToken = this.normalizeToken(token);
    const mapping = this.mappings.get(normToken);

    if (!mapping) return null;

    if (Date.now() > mapping.expiresAt) {
      this.mappings.delete(normToken);
      return null;
    }

    const normalizedDomain = domain.toLowerCase();
    const domainMatches =
      mapping.domain === "*" ||
      mapping.domain === normalizedDomain ||
      normalizedDomain.endsWith("." + mapping.domain);

    if (!domainMatches) {
      return null;
    }

    return mapping;
  }

  /**
   * Returns all active reference mappings for a given domain.
   */
  public getActiveReferencesForDomain(
    domain: string
  ): Record<string, { category: SecretCategory; domain: string }> {
    const result: Record<string, { category: SecretCategory; domain: string }> = {};
    const normalizedDomain = domain.toLowerCase();
    const now = Date.now();

    for (const [token, mapping] of this.mappings.entries()) {
      if (now > mapping.expiresAt) {
        this.mappings.delete(token);
        continue;
      }

      const domainMatches =
        mapping.domain === "*" ||
        mapping.domain === normalizedDomain ||
        normalizedDomain.endsWith("." + mapping.domain);

      if (domainMatches) {
        result[token] = {
          category: mapping.category,
          domain: mapping.domain,
        };
      }
    }

    return result;
  }

  /**
   * Cleans up expired references from memory.
   */
  public cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;
    for (const [token, mapping] of this.mappings.entries()) {
      if (now > mapping.expiresAt) {
        this.mappings.delete(token);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Clears all session references.
   */
  public clearAll(): void {
    this.mappings.clear();
    this.categoryCounters.clear();
  }
}
