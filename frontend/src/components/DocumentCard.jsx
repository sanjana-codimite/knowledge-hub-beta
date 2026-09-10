import { useEffect, useState } from "react";
import { Status } from "./Status";
import { getDocumentFileURL } from "../api/documents";

// DocumentCard renders a single document row in the search results list.
export function DocumentCard({ doc, onClick, session, onSession }) {
  const title = doc.title || doc.filename || "Untitled document";
  const type = doc.type || getDocumentType(doc.mime_type);
  const status = formatStatus(doc.status);
  const project = doc.project || doc.project_id || "Unassigned";
  const meta = doc.meta || formatUpdatedAt(doc.updated_at);
  const excerpt = doc.excerpt || doc.filename || "No description available.";
  const [previewURL, setPreviewURL] = useState(null);
  const [previewError, setPreviewError] = useState("");

  const handlePreview = async () => {
    setPreviewError("");
    try {
      const url = await getDocumentFileURL(doc.id, session, onSession);
      setPreviewURL(url);
    } catch {
      setPreviewError("Could not load file preview.");
    }
  };

  useEffect(() => {
    return () => {
      if (previewURL) URL.revokeObjectURL(previewURL);
    };
  }, [previewURL]);

  return (
    <>
      <div className="document-card" onClick={(event) => {
            event.stopPropagation();
            handlePreview();
          }} role="button" tabIndex={0}>
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
      {/* View / Preview */}
        <button
          className="secondary-action"
          onClick={(event) => {
            event.stopPropagation();
            handlePreview();
          }}
        >
          View
        </button>
      </div>

      {previewError && <div className="my-docs-empty">{previewError}</div>}

      {previewURL && (
        <div className="preview-overlay" onClick={() => setPreviewURL(null)}>
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="preview-header">
              <span>{title}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <a className="secondary-action" href={previewURL} download={title}>
                  Download
                </a>
                <button className="toast-close" onClick={() => setPreviewURL(null)}>
                  ×
                </button>
              </div>
            </div>

            {doc.mime_type === "application/pdf" ? (
              <iframe src={previewURL} title={title} className="preview-frame" />
            ) : (
              <MarkdownPreview url={previewURL} />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function MarkdownPreview({ url }) {
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load file");
        return response.text();
      })
      .then((content) => {
        if (active) setText(content);
      })
      .catch(() => {
        if (active) setText("Could not load file.");
      });

    return () => {
      active = false;
    };
  }, [url]);

  return <pre className="md-preview">{text}</pre>;
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
