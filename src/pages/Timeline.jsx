import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveIncident, getEntries } from '../services/storage';
import LogEntryForm from '../components/LogEntryForm';

/**
 * Timeline page
 * Displays chronological log of incident actions.
 * Requirements:
 * - Load active incident and entries from IndexedDB
 * - Display entries in ascending index order
 * - Show index, formatted timestamp, text, tag, prevHash, and hash
 * - Use monospace style for timestamps and hashes
 * - Visually distinct tag labels with text (not color alone)
 * - Tag colors: containment=red, detection=orange, communication=blue, eradication=green
 * - If no entries, show exactly: No entries yet
 */
export default function Timeline() {
  const [activeIncident, setActiveIncident] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogForm, setShowLogForm] = useState(false);

  const loadData = async () => {
    try {
      setError('');
      const incident = await getActiveIncident();
      setActiveIncident(incident);
      const loadedEntries = await getEntries();
      setEntries(loadedEntries);
    } catch (err) {
      console.error('Failed to load timeline data:', err);
      setError('Failed to load incident log from IndexedDB.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatTimestamp = (ts) => {
    if (!ts) return 'N/A';
    try {
      const d = new Date(ts);
      // Format as ISO UTC string for unambiguous security timestamps
      return d.toISOString();
    } catch {
      return String(ts);
    }
  };

  if (isLoading) {
    return (
      <main className="main-content" id="main">
        <div className="card">
          <p className="empty-state">Loading timeline...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" id="main">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <h1>Timeline</h1>
            <p>
              {activeIncident ? (
                <>
                  Incident: <strong style={{ color: 'var(--color-primary)' }}>{activeIncident}</strong> ({entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                </>
              ) : (
                'No active incident selected.'
              )}
            </p>
          </div>
          {activeIncident && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setShowLogForm((prev) => !prev)}
            >
              {showLogForm ? 'Close Entry Form' : '+ Log Entry'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          <span aria-hidden="true">✖</span> {error}
        </div>
      )}

      {/* Optional inline log form */}
      {showLogForm && activeIncident && (
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <LogEntryForm
            activeIncident={activeIncident}
            onEntryAdded={() => {
              loadData();
              setShowLogForm(false);
            }}
          />
        </div>
      )}

      {/* No incident banner */}
      {!activeIncident && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl) var(--space-xl)' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            No incident has been initialized yet.
          </p>
          <Link to="/" className="btn btn-primary">
            Start an Incident
          </Link>
        </div>
      )}

      {/* Entries List or Empty State */}
      {activeIncident && entries.length === 0 && (
        <div className="card empty-state">
          <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No entries yet</p>
          <p style={{ marginTop: 'var(--space-xs)', color: 'var(--color-text-muted)' }}>
            Use the Log Entry form to record your first response action.
          </p>
        </div>
      )}

      {activeIncident && entries.length > 0 && (
        <div className="timeline-list" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {entries.map((entry) => (
            <article
              key={entry.index}
              className="card entry-card"
              style={{
                position: 'relative',
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
              {/* Top row: Index, Tag, and Timestamp */}
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
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: '1rem',
                      color: 'var(--color-text)',
                    }}
                  >
                    Entry #{entry.index}
                  </span>
                  <span className={`tag-badge tag-${entry.tag}`}>
                    {entry.tag}
                  </span>
                </div>
                <time
                  dateTime={new Date(entry.timestamp).toISOString()}
                  className="mono"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {formatTimestamp(entry.timestamp)}
                </time>
              </div>

              {/* Action description text */}
              <p
                style={{
                  fontSize: '1rem',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-md)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {entry.text}
              </p>

              {/* Hash Chain Metadata */}
              <div
                style={{
                  backgroundColor: 'var(--color-bg)',
                  padding: 'var(--space-sm) var(--space-md)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-xs)',
                  fontSize: '0.8rem',
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
                  <span className="mono" style={{ color: 'var(--color-primary)' }}>
                    {entry.hash}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
