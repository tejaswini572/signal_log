import { useState, useEffect, useCallback } from 'react';
import { getEntries } from '../services/storage';
import { verifyChain } from '../services/verify';

/**
 * VerifyChain page — Stage 3
 *
 * Loads stored entries and recomputes the entire SHA-256 hash chain.
 * Displays one of three states:
 *   • Empty  → "Nothing to verify yet."
 *   • Intact → green "Chain intact — N entries verified"
 *   • Broken → red  "Chain broken at entry #X" + highlighted entry list
 *
 * The verification never modifies, repairs, or re-saves any entries.
 */
export default function VerifyChain() {
  const [entries, setEntries] = useState([]);
  const [result, setResult] = useState(null);   // null = not yet run
  const [isVerifying, setIsVerifying] = useState(false);
  const [loadError, setLoadError] = useState('');

  /** Load entries from IndexedDB and run verification immediately. */
  const runVerification = useCallback(async () => {
    setIsVerifying(true);
    setLoadError('');
    setResult(null);

    let loaded;
    try {
      loaded = await getEntries();
      setEntries(loaded);
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
  }, []);

  // Auto-run when the component mounts so the user sees a result immediately
  useEffect(() => {
    runVerification();
  }, [runVerification]);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */

  const formatTimestamp = (ts) => {
    try { return new Date(ts).toISOString(); } catch { return String(ts); }
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

          <EntryList entries={entries} brokenAt={null} formatTimestamp={formatTimestamp} />
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

          <EntryList entries={entries} brokenAt={result.brokenAt} formatTimestamp={formatTimestamp} />
        </>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* EntryList sub-component                                             */
/* Shows all entries; highlights the first broken entry.              */
/* ------------------------------------------------------------------ */

function EntryList({ entries, brokenAt, formatTimestamp }) {
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
              <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--color-text-dim)', minWidth: '75px' }}>prevHash:</span>
                <span className="mono" style={{ color: 'var(--color-text-muted)' }}>
                  {entry.prevHash}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--color-text-dim)', minWidth: '75px' }}>hash:</span>
                <span
                  className="mono"
                  style={{ color: isBroken ? 'var(--color-error)' : 'var(--color-primary)' }}
                >
                  {entry.hash}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
