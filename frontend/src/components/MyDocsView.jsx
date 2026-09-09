import { useEffect, useState } from "react";
import { Status } from "./Status";
import { getDocumentFileURL } from "../api/documents";
import { ReviewerPicker } from "./ReviewerPicker";

export function MyDocsView({
  myDocs,
  loading,
  error,
  session,
  onSession,
  users,
}) {
  const [docs, setDocs] = useState([]);

  // Preview state
  const [previewURL, setPreviewURL] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [previewName, setPreviewName] = useState("");

  // Keep local docs state synchronized with the parent/hook
  useEffect(() => {
    setDocs(myDocs);
  }, [myDocs]);

  // Open document preview
  const handlePreview = async (doc) => {
    try {
      const url = await getDocumentFileURL(
        doc.id,
        session,
        onSession
      );

      setPreviewURL(url);
      setPreviewMime(doc.mime_type);
      setPreviewName(doc.title || doc.filename);
    } catch {
      alert("Could not load file preview.");
    }
  };

  // Called by ReviewerPicker when reviewer is assigned or removed
  const handleDocUpdated = (updatedDoc) => {
    setDocs((prev) =>
      prev.map((d) =>
        d.id === updatedDoc.id ? updatedDoc : d
      )
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="my-docs-empty">
        Loading your documents...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="my-docs-empty">
        {error}
      </div>
    );
  }

  // Empty state
  if (!docs.length) {
    return (
      <div className="my-docs-empty">
        <p>You haven't uploaded any documents yet.</p>
      </div>
    );
  }

  return (
    <div className="my-docs-view">
      <div className="page-title">
        <div>
          <h2>My Documents</h2>
          <p>
            Documents you have uploaded. Assign a reviewer to
            start the approval process.
          </p>
        </div>
      </div>

      <div className="my-docs-list">
        {docs.map((doc) => (
          <div key={doc.id} className="my-doc-card">
            {/* Document information */}
            <div className="my-doc-info">
              <span className="doc-icon">
                {doc.mime_type === "application/pdf"
                  ? "▤"
                  : "›_"}
              </span>

              <div className="my-doc-meta">
                <b>{doc.title || doc.filename}</b>

                <small>
                  {doc.filename} · {doc.mime_type}
                </small>
              </div>
            </div>

            {/* Document actions */}
            <div className="my-doc-actions">
              {/* Status */}
              <Status label={doc.status} />

              {/* View / Preview */}
              <button
                className="secondary-action"
                onClick={() => handlePreview(doc)}
              >
                View
              </button>

              {/* Reviewer picker */}
              {(doc.status === "draft" ||
                doc.status === "rejected" ||
                doc.status === "in_review") && (
                <ReviewerPicker
                  doc={doc}
                  users={users}
                  session={session}
                  onSession={onSession}
                  onUpdated={handleDocUpdated}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* File preview modal */}
      {previewURL && (
        <div
          className="preview-overlay"
          onClick={() => setPreviewURL(null)}
        >
          <div
            className="preview-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preview header */}
            <div className="preview-header">
              <span>{previewName}</span>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                }}
              >
                {/* Download */}
                <a
                  className="secondary-action"
                  href={previewURL}
                  download={previewName}
                >
                  Download
                </a>

                {/* Close */}
                <button
                  className="toast-close"
                  onClick={() => setPreviewURL(null)}
                >
                  ×
                </button>
              </div>
            </div>

            {/* PDF preview */}
            {previewMime === "application/pdf" ? (
              <iframe
                src={previewURL}
                title={previewName}
                className="preview-frame"
              />
            ) : (
              /* Markdown preview */
              <MarkdownPreview url={previewURL} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// MarkdownPreview fetches the file and displays it as text
function MarkdownPreview({ url }) {
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load file");
        }

        return response.text();
      })
      .then(setText)
      .catch(() => {
        setText("Could not load file.");
      });
  }, [url]);

  return <pre className="md-preview">{text}</pre>;
}