import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

/**
 * Generates a unique certificate code
 * Format: CERT-<UUID>
 * @returns {string} Unique certificate code
 */
export function generateCertCode() {
  const uuid = crypto.randomUUID().toUpperCase();
  return `CERT-${uuid}`;
}

/**
 * Generates a certificate code with custom prefix
 * @param {string} prefix - Custom prefix for the certificate code
 * @returns {string} Certificate code with custom prefix
 */
export function generateCertCodeWithPrefix(prefix = "CERT") {
  const uuid = uuidv4().toUpperCase();
  return `${prefix}-${uuid}`;
}

/**
 * Validates certificate code format
 * @param {string} certCode - Certificate code to validate
 * @returns {boolean} True if valid, false otherwise
 */
export function isValidCertCode(certCode) {
  const certCodeRegex = /^CERT-[A-F0-9-]{36}$/;
  return certCodeRegex.test(certCode);
}

/**
 * Extracts timestamp from certificate code
 * @param {string} certCode - Certificate code
 * @returns {Date|null} Date object or null if invalid
 */
export function extractTimestampFromCertCode(certCode) {
  if (!isValidCertCode(certCode)) {
    return null;
  }

  const parts = certCode.split("-");
  if (parts.length < 2) return null;

  try {
    const timestamp = parseInt(parts[1], 36);
    return new Date(timestamp);
  } catch (error) {
    return null;
  }
}
