import { Status } from "./Status";

// DocumentCard renders a single document row in the search results list.
export function DocumentCard({ doc, onClick }) {
  return (
    <button className="document-card" onClick={onClick}>
      <span className="doc-icon">{doc.icon}</span>
      <span className="doc-body">
        <span className="doc-title">
          <b>{doc.title}</b>
          <Status label={doc.status} />
        </span>
        <span className="doc-excerpt">{doc.excerpt}</span>
        <span className="doc-meta">
          {doc.type} · {doc.project} · {doc.meta}
        </span>
      </span>
      <span className="arrow">›</span>
    </button>
  );
}
