/**
 * storage.js — Persistence module using idb-keyval for IndexedDB storage.
 * Stores:
 * - Current incident name
 * - Ordered array of entries
 */
import { get, set } from 'idb-keyval';

const KEY_INCIDENT_NAME = 'signallog_incident_name';
const KEY_ENTRIES = 'signallog_entries';

/**
 * Retrieves the currently active incident name from IndexedDB.
 * @returns {Promise<string|null>}
 */
export async function getActiveIncident() {
  try {
    const name = await get(KEY_INCIDENT_NAME);
    return typeof name === 'string' ? name : null;
  } catch (err) {
    console.error('Failed to read incident name from IndexedDB:', err);
    throw new Error('Could not access IndexedDB to retrieve incident.');
  }
}

/**
 * Initializes or updates the active incident name and initializes empty entries array.
 * @param {string} incidentName 
 * @returns {Promise<void>}
 */
export async function initIncident(incidentName) {
  try {
    await set(KEY_INCIDENT_NAME, incidentName);
    await set(KEY_ENTRIES, []);
  } catch (err) {
    console.error('Failed to initialize incident in IndexedDB:', err);
    throw new Error('Could not initialize incident in IndexedDB.');
  }
}

/**
 * Retrieves the ordered array of entries from IndexedDB.
 * Preserves ascending index order, returns [] if missing.
 * @returns {Promise<Array>}
 */
export async function getEntries() {
  try {
    const raw = await get(KEY_ENTRIES);
    if (!Array.isArray(raw)) {
      return [];
    }
    // Return sorted in ascending index order
    return [...raw].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  } catch (err) {
    console.error('Failed to read entries from IndexedDB:', err);
    throw new Error('Could not access IndexedDB to load entries.');
  }
}

/**
 * Saves an array of entries to IndexedDB.
 * @param {Array} entries 
 * @returns {Promise<void>}
 */
export async function saveEntries(entries) {
  try {
    await set(KEY_ENTRIES, entries);
  } catch (err) {
    console.error('Failed to save entries to IndexedDB:', err);
    throw new Error('Could not save entries to IndexedDB.');
  }
}

/**
 * Appends a new entry to the entries list in IndexedDB.
 * @param {Object} entry 
 * @returns {Promise<Array>} updated entries list
 */
export async function appendEntry(entry) {
  try {
    const current = await getEntries();
    const updated = [...current, entry];
    await set(KEY_ENTRIES, updated);
    return updated;
  } catch (err) {
    console.error('Failed to append entry to IndexedDB:', err);
    throw new Error('Could not save entry to IndexedDB.');
  }
}
