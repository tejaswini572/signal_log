import { useState } from 'react';
import { getEntries, appendEntry } from '../services/storage';
import { computeEntryHash, GENESIS_HASH } from '../services/crypto';

/**
 * LogEntryForm component
 * Handles adding an entry to the current incident's hash chain.
 * 
 * Requirements:
 * - Text input / textarea for response action
 * - Tag dropdown with exactly: detection, containment, eradication, communication
 * - Submit button
 * - Inline validation for empty or whitespace-only text
 * - Compute timestamp, prevHash, and hash (SHA-256)
 * - Save complete entry object to IndexedDB
 * - Clear text only after successful save
 * - Guard against repeated submissions while saving
 * - Graceful error display if crypto or IndexedDB fails
 */
export default function LogEntryForm({ onEntryAdded, activeIncident }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('detection');
  const [validationError, setValidationError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    setStorageError('');
    setSuccessNotice('');

    // Check if incident is active
    if (!activeIncident) {
      setValidationError('Please start or select an incident before logging an entry.');
      return;
    }

    // Validate: non-empty, non-whitespace
    if (!text || text.trim() === '') {
      setValidationError('Entry text cannot be empty or whitespace-only.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Load current entries to determine index and prevHash
      const entries = await getEntries();
      const index = entries.length;
      const prevHash = index === 0 ? GENESIS_HASH : entries[entries.length - 1].hash;
      const timestamp = Date.now();

      // Compute SHA-256 hash using exact formula: SHA256(prevHash + timestamp + text)
      // Uses the exact validated string entered by the user
      const hash = await computeEntryHash(prevHash, timestamp, text);

      const newEntry = {
        index,
        timestamp,
        text,
        tag,
        prevHash,
        hash,
      };

      // Persist to IndexedDB
      await appendEntry(newEntry);

      // Clear text only after successful save
      setText('');
      setSuccessNotice(`Entry #${index} logged successfully with hash: ${hash.slice(0, 10)}...`);

      if (typeof onEntryAdded === 'function') {
        onEntryAdded(newEntry);
      }
    } catch (err) {
      console.error('Failed to save log entry:', err);
      setStorageError(err.message || 'An error occurred while computing the hash or saving to IndexedDB.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card log-entry-card">
      <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-md)' }}>+ Log Response Action</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label htmlFor="entry-text">
            Response Action <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>
          </label>
          <textarea
            id="entry-text"
            name="entry-text"
            rows={3}
            placeholder="Describe action taken (e.g., Isolated compromised host from network segment VLAN 4)"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (validationError) setValidationError('');
            }}
            disabled={isSubmitting}
            aria-describedby={validationError ? 'entry-text-error' : undefined}
            aria-invalid={!!validationError}
          />
          {validationError && (
            <div id="entry-text-error" className="validation-msg" role="alert">
              <span aria-hidden="true">⚠</span> {validationError}
            </div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="entry-tag">Action Tag</label>
          <select
            id="entry-tag"
            name="entry-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="detection">detection</option>
            <option value="containment">containment</option>
            <option value="eradication">eradication</option>
            <option value="communication">communication</option>
          </select>
        </div>

        {storageError && (
          <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-md)' }}>
            <span aria-hidden="true">✖</span> {storageError}
          </div>
        )}

        {successNotice && (
          <div className="alert alert-success" role="status" style={{ marginBottom: 'var(--space-md)' }}>
            <span aria-hidden="true">✔</span> {successNotice}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? 'Computing hash & saving...' : '+ Log Entry'}
        </button>
      </form>
    </div>
  );
}
