// PageTitle renders a section header with an optional action button.
// Used by the Threads and Sources views.
export function PageTitle({ title, subtitle, action, onAction }) {
  return (
    <div className="page-title">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {action && (
        <button className="upload-button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
