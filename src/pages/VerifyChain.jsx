import { useState, useEffect, useCallback } from 'react';
import { getEntries, saveEntries } from '../services/storage';
import { verifyChain } from '../services/verify';

/**
 * VerifyChain page — Stage 6
 *
 * Loads stored entries and recomputes the entire SHA-256 hash chain.
 * Displays one of three states:
 *   • Empty  → "Nothing to verify yet."
 *   • Intact → green "Chain intact — N entries verified"
 *   • Broken → red  "Chain broken at entry #X" + highlighted entry list
 *
 * Includes a collapsed debug tool: "Debug: edit entry text directly"
 * to simulate unauthorized edits and test tamper detection.
 */
export default function VerifyChain() {
  const [entries, setEntries] = useState([]);
  const [result, setResult] = useState(null);   // null = not yet run
  const [isVerifying, setIsVerifying] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Debug tamper panel state
  const [backupEntries, setBackupEntries] = useState(null);
  const [tamperIndex, setTamperIndex] = useState(0);
  const [tamperType, setTamperType] = useState('text');
  const [editedText, setEditedText] = useState('');
  const [tamperFeedback, setTamperFeedback] = useState('');
  const [copiedHash, setCopiedHash] = useState(null);

  /** Load entries from IndexedDB and run verification immediately. */
  const runVerification = useCallback(async () => {
    setIsVerifying(true);
    setLoadError('');
    setResult(null);

    let loaded;
    try {
      loaded = await getEntries();
      setEntries(loaded);
      const sel = loaded.find((e) => e.index === tamperIndex) || loaded[0];
      if (sel) {
        setEditedText(sel.text);
      }
    } catch (err) {
      console.error('VerifyChain: failed to load entries', err);
      setLoadError('Could not read entries from IndexedDB: ' + err.message);
      setIsVerifying(false);
      return;
    }

    try {
      const outcome = await verifyChain(loaded);
      setResult(outcome);
    } catch (err) {
      console.error('VerifyChain: unexpected error during verification', err);
      setLoadError('An unexpected error occurred during chain verification: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  }, [tamperIndex]);

  // Auto-run when the component mounts so the user sees a result immediately
  useEffect(() => {
    runVerification();
  }, [runVerification]);

  /* ── Tamper / Direct Edit Handler ──────────────────────────────────── */
  const handleTamper = async () => {
    if (!entries || entries.length === 0) return;
    const targetIdx = Number(tamperIndex);
    if (targetIdx < 0 || targetIdx >= entries.length) return;

    // Save pristine backup if not already preserved
    if (!backupEntries) {
      setBackupEntries(JSON.parse(JSON.stringify(entries)));
    }

    // Only update the selected entry's text without recomputing any hashes or altering any other fields
    const modified = entries.map((entry, idx) => {
      if (idx !== targetIdx) return { ...entry };
      if (tamperType === 'text') {
        return {
          ...entry,
          text: editedText,
        };
      } else if (tamperType === 'hash') {
        return {
          ...entry,
          hash: '0000000000000000000000000000000000000000000000000000000000000000',
        };
      } else if (tamperType === 'prevHash') {
        return {
          ...entry,
          prevHash: 'CORRUPTED_PREV_HASH_LINK',
        };
      }
      return { ...entry };
    });

    try {
      await saveEntries(modified);
      setEntries(modified);
      setTamperFeedback(
        tamperType === 'text'
          ? `Overwrote text of Entry #${targetIdx} directly in IndexedDB. Re-verifying...`
          : `Injected tamper into Entry #${targetIdx} (${tamperType}). Re-verifying...`
      );
      const outcome = await verifyChain(modified);
      setResult(outcome);
    } catch (err) {
      setLoadError('Failed to write modified entry to IndexedDB: ' + err.message);
    }
  };

  /* ── Restore Original Entries ─────────────────────────────────────── */
  const handleRestore = async () => {
    if (!backupEntries) return;
    try {
      await saveEntries(backupEntries);
      setEntries(backupEntries);
      const restoredTarget = backupEntries.find((e) => e.index === tamperIndex) || backupEntries[0];
      if (restoredTarget) setEditedText(restoredTarget.text);
      setTamperFeedback('Restored entries to pristine pre-tamper state. Re-verifying...');
      const outcome = await verifyChain(backupEntries);
      setResult(outcome);
      setBackupEntries(null);
    } catch (err) {
      setLoadError('Failed to restore entries in IndexedDB: ' + err.message);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const formatTimestamp = (ts) => {
    try { return new Date(ts).toISOString(); } catch { return String(ts); }
  };

  const handleCopyHash = (hash) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1800);
    }
  };

  /* ------------------------------------------------------------------ */
  /* Render                                                               */
  /* ------------------------------------------------------------------ */

  return (
    <main className="main-content" id="main">
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-md)',
          }}
        >
          <div>
            <h1>Verify Chain</h1>
            <p>Recompute and validate every SHA-256 hash in the incident log.</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={runVerification}
            disabled={isVerifying}
            aria-busy={isVerifying}
          >
            {isVerifying ? 'Verifying…' : '↻ Re-verify'}
          </button>
        </div>
      </div>

      {/* IndexedDB / crypto load error */}
      {loadError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          <span aria-hidden="true">✖</span> {loadError}
        </div>
      )}

      {/* ── STAGE 6: COLLAPSED DEBUG TOOL ─────────────────────────────── */}
      <details className="card tamper-panel" style={{ marginBottom: 'var(--space-xl)' }}>
        <summary>
          <span>Debug: edit entry text directly</span>
        </summary>
        <div className="tamper-panel-body">
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            This debug tool directly modifies IndexedDB records without recalculating cryptographic hashes,
            allowing you to safely test and demonstrate tamper detection.
          </p>

          {entries.length === 0 ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-dim)', fontStyle: 'italic' }}>
              No entries logged yet. Add at least one entry in the Timeline to test tamper detection.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)' }}>
                <div>
                  <label htmlFor="tamper-target-select">Target Entry</label>
                  <select
                    id="tamper-target-select"
                    value={tamperIndex}
                    onChange={(e) => {
                      const idx = Number(e.target.value);
                      setTamperIndex(idx);
                      const target = entries.find((ent) => ent.index === idx);
                      if (target) setEditedText(target.text);
                    }}
                  >
                    {entries.map((ent) => (
                      <option key={ent.index} value={ent.index}>
                        Entry #{ent.index} ({ent.tag}): {ent.text.slice(0, 28)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="tamper-type-select">Corruption Type</label>
                  <select
                    id="tamper-type-select"
                    value={tamperType}
                    onChange={(e) => setTamperType(e.target.value)}
                  >
                    <option value="text">Modify Text (Hash Mismatch)</option>
                    <option value="hash">Corrupt Stored Hash</option>
                    <option value="prevHash">Corrupt prevHash Link</option>
                  </select>
                </div>
              </div>

              {/* Labelled textarea for manual replacement text when "Modify Text" is selected */}
              {tamperType === 'text' && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label htmlFor="tamper-text-input">
                    Current Entry #{tamperIndex} Text (Direct Edit)
                  </label>
                  <textarea
                    id="tamper-text-input"
                    rows={3}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    placeholder="Enter modified replacement text..."
                    style={{ fontFamily: 'inherit', fontSize: '0.9rem' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ color: 'var(--color-warning)', borderColor: 'rgba(210, 153, 34, 0.5)' }}
                  onClick={handleTamper}
                >
                  {tamperType === 'text' ? 'Overwrite stored text' : '⚠ Inject Tamper into IndexedDB'}
                </button>

                {backupEntries && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: 'var(--color-success)', borderColor: 'rgba(63, 185, 80, 0.5)' }}
                    onClick={handleRestore}
                  >
                    ↺ Restore Original Log
                  </button>
                )}
              </div>

              {tamperFeedback && (
                <div className="alert alert-warning" style={{ fontSize: '0.85rem', padding: 'var(--space-sm) var(--space-md)' }}>
                  <span aria-hidden="true">ℹ</span> {tamperFeedback}
                </div>
              )}
            </div>
          )}
        </div>
      </details>

      {/* Spinner while running */}
      {isVerifying && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', textAlign: 'center', padding: 'var(--space-xl)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Verifying chain integrity…</p>
        </div>
      )}

      {/* ── EMPTY STATE ───────────────────────────────────────────────── */}
      {!isVerifying && result?.status === 'empty' && (
        <div className="card empty-state">
          <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-text)' }}>
            Nothing to verify yet.
          </p>
          <p style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-muted)' }}>
            Start an incident and log at least one entry before verifying.
          </p>
        </div>
      )}

      {/* ── INTACT STATE ──────────────────────────────────────────────── */}
      {!isVerifying && result?.status === 'intact' && (
        <>
          <div
            className="alert alert-success"
            role="status"
            aria-label={`Chain intact — ${result.count} entries verified`}
            style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem', fontWeight: 600 }}
          >
            {/* Text label: not colour alone */}
            <span aria-hidden="true">✔</span>
            Chain intact — {result.count} {result.count === 1 ? 'entry' : 'entries'} verified
          </div>

          <EntryList
            entries={entries}
            brokenAt={null}
            formatTimestamp={formatTimestamp}
            onCopyHash={handleCopyHash}
            copiedHash={copiedHash}
          />
        </>
      )}

      {/* ── BROKEN STATE ──────────────────────────────────────────────── */}
      {!isVerifying && result?.status === 'broken' && (
        <>
          <div
            className="alert alert-error"
            role="alert"
            aria-label={`Chain broken at entry #${result.brokenAt}`}
            style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem', fontWeight: 600 }}
          >
            {/* Text label: not colour alone */}
            <span aria-hidden="true">✖</span>
            Chain broken at entry #{result.brokenAt}
          </div>

          {result.reason && (
            <div
              className="alert alert-warning"
              role="note"
              style={{ marginBottom: 'var(--space-lg)' }}
            >
              <span aria-hidden="true">⚠</span> {result.reason}
            </div>
          )}

          <EntryList
            entries={entries}
            brokenAt={result.brokenAt}
            formatTimestamp={formatTimestamp}
            onCopyHash={handleCopyHash}
            copiedHash={copiedHash}
          />
        </>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* EntryList sub-component                                             */
/* Shows all entries; highlights the first broken entry.              */
/* ------------------------------------------------------------------ */

function EntryList({ entries, brokenAt, formatTimestamp, onCopyHash, copiedHash }) {
  if (!entries || entries.length === 0) return null;

  return (
    <div
      className="timeline-list"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}
    >
      {entries.map((entry) => {
        const isBroken = brokenAt !== null && entry.index === brokenAt;
        const isAfterBreak = brokenAt !== null && entry.index > brokenAt;

        return (
          <article
            key={entry.index}
            className="card"
            aria-label={
              isBroken
                ? `Entry ${entry.index} — integrity failure`
                : `Entry ${entry.index} — verified`
            }
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: isBroken
                ? 'var(--color-error)'
                : isAfterBreak
                ? 'var(--color-border)'
                : 'var(--color-success)',
              opacity: isAfterBreak ? 0.5 : 1,
              position: 'relative',
              transition: 'border-color var(--transition), opacity var(--transition)',
            }}
          >
            {/* Top row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 'var(--space-sm)',
                marginBottom: 'var(--space-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                {/* Status icon — NOT colour alone */}
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: '1rem',
                    color: isBroken
                      ? 'var(--color-error)'
                      : isAfterBreak
                      ? 'var(--color-text-dim)'
                      : 'var(--color-success)',
                  }}
                >
                  {isBroken ? '✖' : isAfterBreak ? '–' : '✔'}
                </span>

                <span style={{ fontWeight: 700 }}>Entry #{entry.index}</span>

                <span className={`tag-badge tag-${entry.tag}`}>{entry.tag}</span>

                {isBroken && (
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: 'var(--color-error)',
                      border: '1px solid var(--color-error)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '1px 6px',
                    }}
                  >
                    INTEGRITY FAILURE
                  </span>
                )}
              </div>

              <time
                dateTime={new Date(entry.timestamp).toISOString()}
                className="mono"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {formatTimestamp(entry.timestamp)}
              </time>
            </div>

            {/* Entry text */}
            <p
              style={{
                fontSize: '0.95rem',
                lineHeight: 1.5,
                marginBottom: 'var(--space-md)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                color: isAfterBreak ? 'var(--color-text-muted)' : 'var(--color-text)',
              }}
            >
              {entry.text}
            </p>

            {/* Hash details */}
            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                padding: 'var(--space-sm) var(--space-md)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
              }}
            >
              <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-dim)', minWidth: '75px' }}>prevHash:</span>
                <span className="mono" style={{ color: 'var(--color-text-muted)', wordBreak: 'break-all' }}>
                  {entry.prevHash}
                </span>
                {entry.prevHash !== 'GENESIS' && (
                  <button
                    type="button"
                    className="btn-copy"
                    onClick={() => onCopyHash(entry.prevHash)}
                    aria-label="Copy prevHash to clipboard"
                  >
                    {copiedHash === entry.prevHash ? 'Copied!' : 'Copy'}
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: 'var(--color-text-dim)', minWidth: '75px' }}>hash:</span>
                <span
                  className="mono"
                  style={{
                    color: isBroken ? 'var(--color-error)' : 'var(--color-primary)',
                    wordBreak: 'break-all',
                  }}
                >
                  {entry.hash}
                </span>
                <button
                  type="button"
                  className="btn-copy"
                  onClick={() => onCopyHash(entry.hash)}
                  aria-label="Copy hash to clipboard"
                >
                  {copiedHash === entry.hash ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
