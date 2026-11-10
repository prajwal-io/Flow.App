import { api } from '../lib/api'

/** Local-only backup actions. Files are chosen through native dialogs. */
export function DataSection() {
  return (
    <section className="section">
      <h2 className="section-label">Data</h2>
      <div className="row data-row">
        <span className="row-copy">
          <span className="row-label">Local backup</span>
          <span className="row-hint">Settings, tasks, history · local only</span>
        </span>
        <div className="data-actions">
          <button
            type="button"
            className="text-btn"
            title="Save a JSON backup"
            onClick={() => api.command({ type: 'export-data' })}
          >
            Export
          </button>
          <button
            type="button"
            className="text-btn"
            title="Restore settings, tasks, and history from a JSON backup"
            onClick={() => api.command({ type: 'import-data' })}
          >
            Import
          </button>
        </div>
      </div>
    </section>
  )
}
