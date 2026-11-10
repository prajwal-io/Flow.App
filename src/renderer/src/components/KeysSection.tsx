const KEYS: Array<[string, string]> = [
  ['Space', 'Start / pause'],
  ['S', 'Skip'],
  ['R', 'Reset'],
  ['Esc', 'Collapse'],
]

/** A quiet reminder of the local keyboard map, kept out of the working view. */
export function KeysSection() {
  return (
    <section className="section keys-section">
      <h2 className="section-label">Keys</h2>
      <div className="keys-grid">
        {KEYS.map(([key, label]) => (
          <span key={key} className="key-item">
            <kbd className="keycap">{key}</kbd>
            <span>{label}</span>
          </span>
        ))}
      </div>
    </section>
  )
}
