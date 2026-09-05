/**
 * crypto.js — Cryptographic utility module for SignalLog
 * Uses Web Crypto API (crypto.subtle.digest) for SHA-256 hashing.
 * 
 * Exact Hash Formula:
 * SHA256(prevHash + timestamp + text)
 * - Normal JS string concatenation with no delimiter
 * - TextEncoder for UTF-8 conversion
 * - Lowercase hexadecimal output string
 */

export const GENESIS_HASH = 'GENESIS';

/**
 * Computes the SHA-256 hash for an entry.
 * @param {string} prevHash - 'GENESIS' for index 0 or preceding entry's hash
 * @param {number} timestamp - numeric Date.now() timestamp
 * @param {string} text - exact validated text entered by user
 * @returns {Promise<string>} - lowercase hex string
 */
export async function computeEntryHash(prevHash, timestamp, text) {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('Web Crypto API (crypto.subtle) is not supported in this browser environment.');
  }

  const message = `${prevHash}${timestamp}${text}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toLowerCase();
}
