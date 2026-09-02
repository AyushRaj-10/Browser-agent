/**
 * Reference Resolver & Lifecycle Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MemorySecretStore } from "../src/storage/memory-secret-store";
import { ReferenceManager } from "../src/references/reference-manager";
import { ReferenceResolver } from "../src/references/reference-resolver";
import { generateMasterKey } from "../src/crypto/key-manager";

describe("Reference Management and Execution-time Resolution", () => {
  let store: MemorySecretStore;
  let refManager: ReferenceManager;
  let resolver: ReferenceResolver;
  let masterKey: CryptoKey;

  beforeEach(async () => {
    store = new MemorySecretStore();
    refManager = new ReferenceManager();
    resolver = new ReferenceResolver(store, refManager);
    masterKey = await generateMasterKey();
  });

  it("generates structured reference tokens and placeholders", () => {
    const token1 = refManager.createReference("EMAIL", "insurance.demo.com", "input_email");
    const token2 = refManager.createReference("PHONE", "insurance.demo.com", "input_phone");
    const token3 = refManager.createReference("EMAIL", "insurance.demo.com", "input_alt_email");

    expect(token1).toBe("EMAIL_1");
    expect(token2).toBe("PHONE_1");
    expect(token3).toBe("EMAIL_2");

    expect(refManager.formatPlaceholder(token1)).toBe("<EMAIL_1>");
    expect(refManager.normalizeToken("<EMAIL_1>")).toBe("EMAIL_1");
  });

  it("resolves reference tokens at execution time using stored secrets", async () => {
    const meta = await store.saveSecret(
      {
        domain: "claims.insurance-demo.com",
        category: "EMAIL",
        label: "Ayush Email",
        value: "ayush@gmail.com",
        referenceKey: "EMAIL_1",
      },
      masterKey
    );

    refManager.registerMapping({
      token: "EMAIL_1",
      category: "EMAIL",
      domain: "claims.insurance-demo.com",
      secretId: meta.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
    });

    const resolved = await resolver.resolveToken({
      domain: "claims.insurance-demo.com",
      referenceToken: "<EMAIL_1>",
      masterKey,
    });

    expect(resolved.token).toBe("EMAIL_1");
    expect(resolved.value).toBe("ayush@gmail.com");
    expect(resolved.category).toBe("EMAIL");
  });

  it("resolves TYPE_REFERENCE action into executable action with decrypted value", async () => {
    await store.saveSecret(
      {
        domain: "claims.insurance-demo.com",
        category: "PHONE",
        label: "Mobile Number",
        value: "9876543210",
        referenceKey: "PHONE_1",
      },
      masterKey
    );

    const action = {
      action: "TYPE_REFERENCE",
      target: "input_phone",
      reference: "PHONE_1",
    };

    const executable = await resolver.resolveActionReference(
      action,
      "claims.insurance-demo.com",
      masterKey
    );

    expect(executable.action).toBe("TYPE");
    expect(executable.target).toBe("input_phone");
    expect(executable.resolvedValue).toBe("9876543210");
  });

  it("rejects resolution for unauthorized/cross-domain requests", async () => {
    await store.saveSecret(
      {
        domain: "bank.secure.com",
        category: "CARD",
        label: "Credit Card",
        value: "4111222233334444",
        referenceKey: "CARD_1",
      },
      masterKey
    );

    await expect(
      resolver.resolveToken({
        domain: "malicious-site.com",
        referenceToken: "CARD_1",
        masterKey,
      })
    ).rejects.toThrow(/INVALID_OR_EXPIRED_REFERENCE_TOKEN/i);
  });

  it("strictly prohibits password reference creation or resolution", async () => {
    expect(() => {
      refManager.createReference("PASSWORD" as any, "login.example.com");
    }).toThrow(/PASSWORDS_EXCLUDED/i);

    await expect(
      resolver.resolveToken({
        domain: "login.example.com",
        referenceToken: "PASSWORD_1",
        masterKey,
      })
    ).rejects.toThrow(/PASSWORD_TARGET_AUTOMATION_FORBIDDEN/i);
  });
});
