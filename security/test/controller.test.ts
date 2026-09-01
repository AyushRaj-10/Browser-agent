/**
 * Secret Setup Controller Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SecretSetupController } from "../src/controller/secret-setup-controller";
import { MemorySecretStore } from "../src/storage/memory-secret-store";

describe("SecretSetupController", () => {
  let controller: SecretSetupController;
  let store: MemorySecretStore;

  beforeEach(async () => {
    store = new MemorySecretStore();
    controller = new SecretSetupController(store);
    await controller.unlock();
  });

  it("preloads and lists synthetic insurance claim profile", async () => {
    const listInitial = await controller.listSecrets();
    expect(listInitial.length).toBe(0);

    const loaded = await controller.preloadInsuranceDemoProfile();
    expect(loaded.length).toBe(5);

    const listAfter = await controller.listSecrets();
    expect(listAfter.length).toBe(5);

    const emailItem = listAfter.find((s) => s.category === "EMAIL");
    expect(emailItem).toBeDefined();
    expect(emailItem?.referenceKey).toBe("EMAIL_1");
    expect((emailItem as any).value).toBeUndefined(); // Raw value not in list
  });

  it("adds, views, and removes a custom credential", async () => {
    const created = await controller.addSecret({
      domain: "finance.portal.com",
      category: "CARD",
      label: "Corporate Card",
      value: "4111222233334444",
      referenceKey: "CARD_CORP",
    });

    expect(created.id).toBeDefined();
    expect(created.referenceKey).toBe("CARD_CORP");

    const viewed = await controller.viewSecret(created.id);
    expect(viewed).not.toBeNull();
    expect(viewed?.value).toBe("4111222233334444");

    const removed = await controller.removeSecret(created.id);
    expect(removed).toBe(true);

    const viewedAfter = await controller.viewSecret(created.id);
    expect(viewedAfter).toBeNull();
  });

  it("unlocks with custom passphrase", async () => {
    const controllerWithPassphrase = new SecretSetupController(new MemorySecretStore());
    const key = await controllerWithPassphrase.unlock("MySecretMasterPassphrase#123");
    expect(key).toBeDefined();
    expect(key.algorithm.name).toBe("AES-GCM");
  });
});
