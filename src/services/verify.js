/**
 * verify.js — Chain verification service for SignalLog.
 *
 * Performs a complete integrity audit of the stored entry chain without
 * modifying, repairing, or re-saving any entries.
 *
 * Checks (in order, stopping at the first failure):
 *  1. Sequential entry indexes (0, 1, 2 …)
 *  2. prevHash linkage:
 *     – entry 0   → prevHash must equal 'GENESIS'
 *     – entry i>0 → prevHash must equal entries[i-1].hash
 *  3. Recomputed hash matches stored hash using the exact formula:
 *     SHA256(entry.prevHash + entry.timestamp + entry.text)
 */

import { computeEntryHash, GENESIS_HASH } from './crypto';

/**
 * Result shape returned by verifyChain():
 *
 * { status: 'empty' }
 * { status: 'intact', count: number }
 * { status: 'broken', brokenAt: number, reason: string }
 */

/**
 * Verifies the full entry hash chain.
 *
 * @param {Array} entries - Ordered array of entry objects from IndexedDB.
 * @returns {Promise<{ status: string, count?: number, brokenAt?: number, reason?: string }>}
 */
export async function verifyChain(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return { status: 'empty' };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // 1. Sequential index check
    if (entry.index !== i) {
      return {
        status: 'broken',
        brokenAt: i,
        reason: `Expected sequential index ${i} but found ${entry.index}.`,
      };
    }

    // 2. prevHash linkage check
    const expectedPrevHash = i === 0 ? GENESIS_HASH : entries[i - 1].hash;
    if (entry.prevHash !== expectedPrevHash) {
      return {
        status: 'broken',
        brokenAt: i,
        reason:
          i === 0
            ? `Entry #0 prevHash must be "GENESIS" but found "${entry.prevHash}".`
            : `Entry #${i} prevHash does not match the preceding entry's stored hash.`,
      };
    }

    // 3. Recomputed hash check — exact formula: SHA256(prevHash + timestamp + text)
    let recomputed;
    try {
      recomputed = await computeEntryHash(entry.prevHash, entry.timestamp, entry.text);
    } catch (err) {
      return {
        status: 'broken',
        brokenAt: i,
        reason: `Crypto error while verifying entry #${i}: ${err.message}`,
      };
    }

    if (recomputed !== entry.hash) {
      return {
        status: 'broken',
        brokenAt: i,
        reason: `Entry #${i} stored hash does not match the recomputed hash. The entry text or hash may have been tampered with.`,
      };
    }
  }

  return { status: 'intact', count: entries.length };
}
