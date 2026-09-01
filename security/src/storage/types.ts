/**
 * Storage types for Local Secret Store
 */

import {
  SecretCategory,
  EncryptedPayload,
  StoredSecretMetadata,
  StoredSecretRecord,
  DecryptedSecret,
  CreateSecretInput,
} from "../../../shared/types";

export type {
  SecretCategory,
  EncryptedPayload,
  StoredSecretMetadata,
  StoredSecretRecord,
  DecryptedSecret,
  CreateSecretInput,
};

export interface SecretStoreConfig {
  dbName?: string;
  dbVersion?: number;
}
