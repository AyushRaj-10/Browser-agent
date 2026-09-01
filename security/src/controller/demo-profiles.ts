/**
 * Demo Profile Fixtures for SIH Privacy-Preserving Browser Agent
 * Strictly contains synthetic dummy data for testing and demonstrations.
 */

import { CreateSecretInput } from "../storage/types";

/**
 * Official SIH Synthetic Insurance Claim Form Profile
 */
export const SYNTHETIC_INSURANCE_DEMO_PROFILE: CreateSecretInput[] = [
  {
    domain: "*", // Global profile availability
    category: "NAME",
    label: "Full Name",
    value: "Ayush Raj",
    referenceKey: "NAME_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "EMAIL",
    label: "Primary Email",
    value: "ayush@gmail.com",
    referenceKey: "EMAIL_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "PHONE",
    label: "Mobile Number",
    value: "9876543210",
    referenceKey: "PHONE_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "POLICY",
    label: "Insurance Policy Number",
    value: "POL12345",
    referenceKey: "POLICY_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "CUSTOM",
    label: "Claim Amount",
    value: "Rs. 50,000",
    referenceKey: "CLAIM_1",
    isLocked: true,
  },
];

/**
 * Synthetic E-Commerce & Profile Demo Profile
 */
export const SYNTHETIC_ECOMMERCE_DEMO_PROFILE: CreateSecretInput[] = [
  {
    domain: "*",
    category: "NAME",
    label: "Customer Name",
    value: "Ayush Raj",
    referenceKey: "NAME_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "ADDRESS",
    label: "Delivery Address",
    value: "42 Innovation Tech Park, Bengaluru, KA 560001",
    referenceKey: "ADDRESS_1",
    isLocked: true,
  },
  {
    domain: "*",
    category: "CARD",
    label: "Test Payment Card",
    value: "4111 2222 3333 4444",
    referenceKey: "CARD_1",
    isLocked: true,
  },
];
