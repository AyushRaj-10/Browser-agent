/**
 * Reference Resolution Module
 * Resolves abstract reference tokens (e.g. EMAIL_1) to real decrypted values
 * strictly at DOM execution time.
 */

import { ISecretStore } from "../storage/secret-store-interface";
import { ReferenceManager } from "./reference-manager";
import { ResolveTokenOptions, ResolvedSecretValue } from "./types";
import { SECURITY_POLICY_ERRORS } from "../../../shared/constants";

export class ReferenceResolver {
  private secretStore: ISecretStore;
  private referenceManager: ReferenceManager;

  constructor(
    secretStore: ISecretStore,
    referenceManager?: ReferenceManager
  ) {
    this.secretStore = secretStore;
    this.referenceManager = referenceManager || new ReferenceManager();
  }

  /**
   * Resolves a reference token to a decrypted secret value.
   *
   * @param options Object containing domain, referenceToken, and masterKey
   * @returns ResolvedSecretValue with decrypted value
   */
  public async resolveToken(
    options: ResolveTokenOptions
  ): Promise<ResolvedSecretValue> {
    const { domain, referenceToken, expectedCategory, masterKey } = options;
    const normalizedToken = this.referenceManager.normalizeToken(referenceToken);

    // 1. Check if token is for password - strictly forbidden
    if (normalizedToken.startsWith("PASSWORD")) {
      throw new Error(
        `Security Policy Violation: ${SECURITY_POLICY_ERRORS.PASSWORD_AUTOTYPE_FORBIDDEN}`
      );
    }

    // 2. Check in-memory session reference manager
    const sessionMapping = this.referenceManager.getMapping(
      normalizedToken,
      domain
    );

    let decrypted = null;

    // If mapped to a specific secretId
    if (sessionMapping?.secretId) {
      decrypted = await this.secretStore.getSecret(
        sessionMapping.secretId,
        masterKey
      );
    }

    // If not found yet, lookup directly by reference key in store
    if (!decrypted) {
      decrypted = await this.secretStore.getSecretByReference(
        domain,
        normalizedToken,
        masterKey
      );
    }

    if (!decrypted) {
      throw new Error(
        `Resolution Error: ${SECURITY_POLICY_ERRORS.INVALID_REFERENCE_TOKEN} (${referenceToken} for domain ${domain})`
      );
    }

    // 3. Validate category consistency
    if (
      expectedCategory &&
      decrypted.category.toUpperCase() !== expectedCategory.toUpperCase()
    ) {
      throw new Error(
        `Category Mismatch: Expected secret of type ${expectedCategory} but found ${decrypted.category}`
      );
    }

    return {
      token: normalizedToken,
      category: decrypted.category,
      value: decrypted.value,
      domain: decrypted.domain,
      label: decrypted.label,
    };
  }

  /**
   * Helper to resolve an action if it has a reference token.
   */
  public async resolveActionReference(
    action: { action: string; target: string; reference?: string },
    domain: string,
    masterKey: CryptoKey
  ): Promise<{ action: string; target: string; resolvedValue?: string }> {
    if (action.action !== "TYPE_REFERENCE" || !action.reference) {
      return {
        action: action.action,
        target: action.target,
      };
    }

    const resolved = await this.resolveToken({
      domain,
      referenceToken: action.reference,
      masterKey,
    });

    return {
      action: "TYPE",
      target: action.target,
      resolvedValue: resolved.value,
    };
  }
}
