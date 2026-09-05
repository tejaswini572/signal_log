import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveIncident, initIncident } from '../services/storage';
import LogEntryForm from '../components/LogEntryForm';

/**
 * StartIncident page
 * Allows responders to initialize an incident, view the active incident, and log entries.
 */
export default function StartIncident() {
  const [incidentNameInput, setIncidentNameInput] = useState('');
  const [activeIncident, setActiveIncident] = useState(null);
  const [validationError, setValidationError] = useState('');
  const [storageError, setStorageError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewIncidentForm, setShowNewIncidentForm] = useState(false);

  useEffect(() => {
    async function loadIncident() {
      try {
        const current = await getActiveIncident();
        setActiveIncident(current);
      } catch (_err) {
        setStorageError('Failed to load incident status from IndexedDB.');
      } finally {
        setIsLoading(false);
      }
    }
    loadIncident();
  }, []);

  const handleStartIncident = async (e) => {
    e.preventDefault();
    setValidationError('');
    setStorageError('');

    if (!incidentNameInput || incidentNameInput.trim() === '') {
      setValidationError('Incident name cannot be empty or whitespace-only.');
      return;
    }

    try {
      const trimmedName = incidentNameInput.trim();
      await initIncident(trimmedName);
      setActiveIncident(trimmedName);
      setIncidentNameInput('');
      setShowNewIncidentForm(false);
    } catch (err) {
      console.error('Failed to create incident:', err);
      setStorageError(err.message || 'Failed to initialize incident in storage.');
    }
  };

  if (isLoading) {
    return (
      <main className="main-content" id="main">
        <div className="card">
          <p className="empty-state">Loading incident data...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content" id="main">
      <div className="page-header">
        <h1>Start Incident</h1>
        <p>Initialize a security response incident and record chain-linked actions.</p>
      </div>

      {storageError && (
        <div className="alert alert-error" role="alert" style={{ marginBottom: 'var(--space-lg)' }}>
          <span aria-hidden="true">✖</span> {storageError}
        </div>
      )}

      {/* Active Incident Banner */}
      {activeIncident && !showNewIncidentForm && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)', borderColor: 'var(--color-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Active Incident
              </span>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-primary)', marginTop: '2px' }}>
                {activeIncident}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <Link to="/timeline" className="btn btn-secondary">
                View Timeline
              </Link>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowNewIncidentForm(true)}
              >
                Start New Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Creation Form (Shown if no active incident or user chose to start a new one) */}
      {(!activeIncident || showNewIncidentForm) && (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-xs)' }}>
            {activeIncident ? 'Start a New Incident' : 'Create New Incident'}
          </h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: 'var(--space-md)' }}>
            {activeIncident
              ? 'Warning: Initializing a new incident resets the local hash log for this device.'
              : 'Enter an identifier or description for this security incident.'}
          </p>

          <form onSubmit={handleStartIncident} noValidate>
            <div className="form-group">
              <label htmlFor="incident-name">
                Incident Name <span aria-hidden="true" style={{ color: 'var(--color-error)' }}>*</span>
              </label>
              <input
                id="incident-name"
                name="incident-name"
                type="text"
                placeholder="e.g., INC-2026-0905-MALWARE"
                value={incidentNameInput}
                onChange={(e) => {
                  setIncidentNameInput(e.target.value);
                  if (validationError) setValidationError('');
                }}
                aria-describedby={validationError ? 'incident-name-error' : undefined}
                aria-invalid={!!validationError}
              />
              {validationError && (
                <div id="incident-name-error" className="validation-msg" role="alert">
                  <span aria-hidden="true">⚠</span> {validationError}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
              <button type="submit" className="btn btn-primary">
                Initialize Incident
              </button>
              {activeIncident && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowNewIncidentForm(false)}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Log Entry Section (Available whenever an incident is active) */}
      {activeIncident && (
        <LogEntryForm activeIncident={activeIncident} />
      )}
    </main>
  );
}
