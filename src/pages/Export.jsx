import { useState, useEffect } from 'react';
import { getActiveIncident, getEntries } from '../services/storage';

/**
 * Export page — Stage 4
 *
 * Two features:
 *  1. JSON Download — serialises the full incident + entries as formatted JSON
 *     and triggers a local browser download.  No data is sent anywhere.
 *  2. Human-Readable Report — rendered inside the app:
 *     incident name, ordered entries (index, timestamp, tag, text),
 *     and the final chain hash.
 */
export default function Export() {
  const [incidentName, setIncidentName] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [downloadMsg, setDownloadMsg] = useState('');
  const [downloadError, setDownloadError] = useState('');

  /* ── Load from IndexedDB on mount ─────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const name = await getActiveIncident();
        const loaded = await getEntries();
        setIncidentName(name);
        setEntries(loaded);
      } catch (err) {
        console.error('Export: failed to load data', err);
        setLoadError('Could not load incident data from IndexedDB: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  /* ── JSON Download ────────────────────────────────────────────────── */
  const handleDownloadJSON = () => {
    setDownloadMsg('');
    setDownloadError('');

    try {
      const exportPayload = {
        incident: incidentName,
        exportedAt: new Date().toISOString(),
        totalEntries: entries.length,
        finalHash: entries.length > 0 ? entries[entries.length - 1].hash : null,
        entries,
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(blob);

      // Build a safe filename from the incident name and today's date
      const safeName = (incidentName || 'incident')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 64);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `signallog-${safeName}-${dateStr}.json`;

      // Trigger download via a temporary anchor element
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename;
      anchor.setAttribute('aria-hidden', 'true');
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      // Revoke the object URL immediately after triggering
      URL.revokeObjectURL(objectUrl);

      setDownloadMsg(`Download triggered: ${filename}`);
    } catch (err) {
      console.error('Export: download failed', err);
      setDownloadError('Failed to generate JSON export: ' + err.message);
    }
  };

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const formatTimestamp = (ts) => {
    try { return new Date(ts).toISOString(); } catch { return String(ts); }
  };

  /* ── Render ───────────────────────────────────────────────────────── */
  if (isLoading) {
    return (
      <main className="main-content" id="main">
        <div className="card">
          <p className="empty-state">Loading incident data…</p>
        </div>
      </main>
    );
  }

  const finalEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <main className="main-content" id="main">
      <div className="page-header">
        <h1>Export</h1>
        <p>Download a complete JSON export or review the human-readable incident report.</p>
      </div>

      {/* Global load error */}
      {loadError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          <span aria-hidden="true">✖</span> {loadError}
        </div>
      )}

      {/* No active incident */}
      {!incidentName && !loadError && (
        <div className="card empty-state" style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ fontWeight: 600 }}>No active incident found.</p>
          <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
            Start an incident before exporting.
          </p>
        </div>
      )}

      {/* ── JSON Download Panel ──────────────────────────────────────── */}
      {incidentName && (
        <section className="card" style={{ marginBottom: 'var(--space-lg)' }} aria-labelledby="download-heading">
          <h2 id="download-heading" style={{ fontSize: '1.2rem', marginBottom: 'var(--space-sm)' }}>
            JSON Download
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
            Downloads a local JSON file containing the full incident record and every entry.
            {entries.length === 0 && ' The log has no entries yet — the file will contain an empty entries array.'}
          </p>

          <button
            type="button"
            id="btn-download-json"
            className="btn btn-primary"
            onClick={handleDownloadJSON}
            aria-label="Download incident as JSON file"
          >
            ↓ Download JSON
          </button>

          {downloadMsg && (
            <div className="alert alert-success" role="status" style={{ marginTop: 'var(--space-md)' }}>
              <span aria-hidden="true">✔</span> {downloadMsg}
            </div>
          )}
          {downloadError && (
            <div className="alert alert-error" role="alert" style={{ marginTop: 'var(--space-md)' }}>
              <span aria-hidden="true">✖</span> {downloadError}
            </div>
          )}
        </section>
      )}

      {/* ── Human-Readable Report ────────────────────────────────────── */}
      {incidentName && (
        <section aria-labelledby="report-heading">
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <h2 id="report-heading" style={{ fontSize: '1.2rem', marginBottom: 'var(--space-md)' }}>
              Incident Report
            </h2>

            {/* Incident metadata */}
            <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: 'var(--space-xs) var(--space-lg)' }}>
              <dt style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Incident</dt>
              <dd style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}>
                {incidentName}
              </dd>

              <dt style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Total Entries</dt>
              <dd style={{ fontWeight: 600 }}>{entries.length}</dd>

              <dt style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Final Chain Hash</dt>
              <dd>
                {finalEntry ? (
                  <span className="mono" style={{ color: 'var(--color-primary)', fontSize: '0.82rem' }}>
                    {finalEntry.hash}
                  </span>
                ) : (
                  <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    No entries — no final hash.
                  </span>
                )}
              </dd>
            </dl>
          </div>

          {/* Entry list */}
          {entries.length === 0 ? (
            <div className="card empty-state">
              <p style={{ fontWeight: 600 }}>No entries logged yet.</p>
              <p style={{ color: 'var(--color-text-muted)', marginTop: 'var(--space-xs)' }}>
                Log response actions from the Start Incident screen.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {entries.map((entry) => (
                <article
                  key={entry.index}
                  className="card"
                  style={{
                    borderLeftWidth: '4px',
                    borderLeftColor:
                      entry.tag === 'containment'
                        ? 'var(--color-containment)'
                        : entry.tag === 'detection'
                        ? 'var(--color-detection)'
                        : entry.tag === 'communication'
                        ? 'var(--color-communication)'
                        : 'var(--color-eradication)',
                  }}
                >
                  {/* Entry header row */}
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
                      <span style={{ fontWeight: 700 }}>#{entry.index}</span>
                      <span className={`tag-badge tag-${entry.tag}`}>{entry.tag}</span>
                    </div>
                    <time
                      dateTime={new Date(entry.timestamp).toISOString()}
                      className="mono"
                      style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}
                    >
                      {formatTimestamp(entry.timestamp)}
                    </time>
                  </div>

                  {/* Action text */}
                  <p
                    style={{
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {entry.text}
                  </p>

                  {/* Final hash badge — only on last entry */}
                  {entry.index === entries.length - 1 && (
                    <div
                      style={{
                        marginTop: 'var(--space-md)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.8rem',
                      }}
                    >
                      <span style={{ color: 'var(--color-text-dim)' }}>Final hash: </span>
                      <span className="mono" style={{ color: 'var(--color-primary)' }}>
                        {entry.hash}
                      </span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
