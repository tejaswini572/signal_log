/**
 * Timeline — placeholder screen (Stage 1).
 * Will display the ordered entry log in Stage 2.
 */
export default function Timeline() {
  return (
    <main className="main-content" id="main">
      <div className="page-header">
        <h1>Timeline</h1>
        <p>Chronological log of all incident-response actions.</p>
      </div>

      <div className="card">
        <p className="empty-state" style={{ padding: '2rem 0' }}>
          Entry timeline will be implemented in Stage 2.
        </p>
      </div>
    </main>
  )
}
