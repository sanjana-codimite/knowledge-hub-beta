import { Status } from "./Status";

// DocumentCard renders a single document row in the search results list.
export function DocumentCard({ doc, onClick }) {
  const title = doc.title || doc.filename || "Untitled document";
  const type = doc.type || getDocumentType(doc.mime_type);
  const status = formatStatus(doc.status);
  const project = doc.project || doc.project_id || "Unassigned";
  const meta = doc.meta || formatUpdatedAt(doc.updated_at);
  const excerpt = doc.excerpt || doc.filename || "No description available.";

  return (
    <button className="document-card" onClick={onClick}>
      <span className="doc-icon">{doc.icon || getDocumentIcon(doc.mime_type)}</span>
      <span className="doc-body">
        <span className="doc-title">
          <b>{title}</b>
          <Status label={status} />
        </span>
        <span className="doc-excerpt">{excerpt}</span>
        <span className="doc-meta">
          {type} · {project} · {meta}
        </span>
      </span>
      <span className="arrow">›</span>
    </button>
  );
}

function getDocumentType(mimeType) {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType === "text/markdown") return "Markdown";
  return "Document";
}

function getDocumentIcon(mimeType) {
  return mimeType === "application/pdf" ? "▤" : "›_";
}

function formatStatus(status) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatUpdatedAt(updatedAt) {
  if (!updatedAt) return "No update date";
  return `updated ${new Date(updatedAt).toLocaleDateString()}`;
}
