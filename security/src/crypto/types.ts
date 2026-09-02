/**
 * Types and interfaces for Web Crypto operations in Browser Agent
 */

import { EncryptedPayload } from "../../../shared/types";

export type { EncryptedPayload };

export interface KeyDerivationOptions {
  passphrase?: string;
  salt?: Uint8Array;
  iterations?: number;
}

export interface ExportedKeyBundle {
  rawKeyBase64: string;
  algorithm: string;
  extractable: boolean;
}
