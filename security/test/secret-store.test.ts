/**
 * Secret Store (Memory & IndexedDB) Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { indexedDB } from "fake-indexeddb";
import { MemorySecretStore } from "../src/storage/memory-secret-store";
import { IndexedDBSecretStore } from "../src/storage/idb-secret-store";
import { generateMasterKey } from "../src/crypto/key-manager";
import { ISecretStore } from "../src/storage/secret-store-interface";

const storesToTest: Array<{ name: string; createStore: () => ISecretStore }> = [
  {
    name: "MemorySecretStore",
    createStore: () => new MemorySecretStore(),
  },
  {
    name: "IndexedDBSecretStore",
    createStore: () =>
      new IndexedDBSecretStore(
        { dbName: `test_db_${Date.now()}_${Math.random()}` },
        indexedDB
      ),
  },
];

storesToTest.forEach(({ name, createStore }) => {
  describe(`Local Secret Store: ${name}`, () => {
    let store: ISecretStore;
    let masterKey: CryptoKey;

    beforeEach(async () => {
      store = createStore();
      masterKey = await generateMasterKey();
    });

    it("saves and retrieves a secret by ID", async () => {
      const metadata = await store.saveSecret(
        {
          domain: "claims.insurance-demo.com",
          category: "EMAIL",
          label: "Ayush Email",
          value: "ayush@gmail.com",
          referenceKey: "EMAIL_1",
        },
        masterKey
      );

      expect(metadata.id).toBeDefined();
      expect(metadata.domain).toBe("claims.insurance-demo.com");
      expect(metadata.category).toBe("EMAIL");
      expect(metadata.referenceKey).toBe("EMAIL_1");

      const decrypted = await store.getSecret(metadata.id, masterKey);
      expect(decrypted).not.toBeNull();
      expect(decrypted?.value).toBe("ayush@gmail.com");
      expect(decrypted?.label).toBe("Ayush Email");
    });

    it("retrieves a secret by domain and reference key", async () => {
      await store.saveSecret(
        {
          domain: "claims.insurance-demo.com",
          category: "PHONE",
          label: "Ayush Phone",
          value: "9876543210",
          referenceKey: "PHONE_1",
        },
        masterKey
      );

      const decrypted = await store.getSecretByReference(
        "claims.insurance-demo.com",
        "PHONE_1",
        masterKey
      );

      expect(decrypted).not.toBeNull();
      expect(decrypted?.value).toBe("9876543210");
    });

    it("enforces domain scoping isolation", async () => {
      await store.saveSecret(
        {
          domain: "restricted.bank.com",
          category: "CARD",
          label: "Bank Card",
          value: "4111222233334444",
          referenceKey: "CARD_1",
        },
        masterKey
      );

      // Attempting to query from a different domain returns null
      const secretFromMaliciousDomain = await store.getSecretByReference(
        "attacker.com",
        "CARD_1",
        masterKey
      );
      expect(secretFromMaliciousDomain).toBeNull();
    });

    it("allows global secrets (domain='*') across any domain", async () => {
      await store.saveSecret(
        {
          domain: "*",
          category: "NAME",
          label: "User Name",
          value: "Ayush Raj",
          referenceKey: "NAME_1",
        },
        masterKey
      );

      const secretOnDomainA = await store.getSecretByReference(
        "site-a.com",
        "NAME_1",
        masterKey
      );
      const secretOnDomainB = await store.getSecretByReference(
        "site-b.com",
        "NAME_1",
        masterKey
      );

      expect(secretOnDomainA?.value).toBe("Ayush Raj");
      expect(secretOnDomainB?.value).toBe("Ayush Raj");
    });

    it("strictly rejects password storage (SIH password exclusion rule)", async () => {
      // 1. Rejection by category
      await expect(
        store.saveSecret(
          {
            domain: "login.example.com",
            category: "PASSWORD" as any,
            label: "My Password",
            value: "SuperSecret123!",
          },
          masterKey
        )
      ).rejects.toThrow(/PASSWORDS_EXCLUDED/i);

      // 2. Rejection by label
      await expect(
        store.saveSecret(
          {
            domain: "login.example.com",
            category: "CUSTOM",
            label: "account password",
            value: "SuperSecret123!",
          },
          masterKey
        )
      ).rejects.toThrow(/PASSWORDS_EXCLUDED/i);
    });

    it("lists metadata without exposing raw decrypted values", async () => {
      await store.saveSecret(
        {
          domain: "claims.insurance-demo.com",
          category: "NAME",
          label: "Name",
          value: "Ayush Raj",
          referenceKey: "NAME_1",
        },
        masterKey
      );

      await store.saveSecret(
        {
          domain: "claims.insurance-demo.com",
          category: "EMAIL",
          label: "Email",
          value: "ayush@gmail.com",
          referenceKey: "EMAIL_1",
        },
        masterKey
      );

      const list = await store.listSecrets("claims.insurance-demo.com");
      expect(list.length).toBe(2);

      for (const item of list) {
        expect((item as any).value).toBeUndefined(); // Raw value must not be in metadata
        expect(item.label).toBeDefined();
        expect(item.referenceKey).toBeDefined();
      }
    });

    it("deletes secrets and clears domain", async () => {
      const s1 = await store.saveSecret(
        {
          domain: "temp.com",
          category: "CUSTOM",
          label: "Temp1",
          value: "val1",
        },
        masterKey
      );

      expect(await store.deleteSecret(s1.id)).toBe(true);
      expect(await store.getSecret(s1.id, masterKey)).toBeNull();

      await store.saveSecret(
        {
          domain: "temp2.com",
          category: "CUSTOM",
          label: "Temp2",
          value: "val2",
        },
        masterKey
      );

      const clearedCount = await store.clearDomain("temp2.com");
      expect(clearedCount).toBe(1);
    });
  });
});
