import { useState } from "react";
import { approveDocument, rejectDocument, getDocumentFileURL } from "../api/documents";
import { Status } from "./Status";

export function ReviewView({ reviewDocs, loading, error, session, onSession, onDocActioned }) {
  const [processing, setProcessing] = useState(null); // docId being processed
  const [actionError, setActionError] = useState("");
  const [previewURL, setPreviewURL]   = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [rejectNote, setRejectNote]   = useState(""); // optional reject reason
  const [rejectingDoc, setRejectingDoc] = useState(null); // docId confirm dialog

  const handlePreview = async (doc) => {
    try {
      const url = await getDocumentFileURL(doc.id, session, onSession);
      setPreviewURL(url);
      setPreviewName(doc.title || doc.filename);
      setPreviewMime(doc.mime_type);
    } catch {
      setActionError("Could not load file preview.");
    }
  };

  const handleApprove = async (docId) => {
    setProcessing(docId);
    setActionError("");
    try {
      await approveDocument(docId, session, onSession);
      onDocActioned(docId); // remove from list
    } catch (e) {
      setActionError(e.message || "Could not approve document.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (docId) => {
    setProcessing(docId);
    setActionError("");
    try {
      await rejectDocument(docId, session, onSession);
      onDocActioned(docId); // remove from list
      setRejectingDoc(null);
      setRejectNote("");
    } catch (e) {
      setActionError(e.message || "Could not reject document.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="my-docs-empty">Loading review queue...</div>;
  if (error)   return <div className="my-docs-empty">{error}</div>;
  if (!reviewDocs.length) return (
    <div className="my-docs-empty">
      <p>No documents assigned to you for review.</p>
    </div>
  );

  return (
    <div className="my-docs-view">
      <div className="page-title">
        <div>
          <h2>Review Queue</h2>
          <p>Documents assigned to you. Review and approve or reject each one.</p>
        </div>
      </div>

      {actionError && <div className="error-message">{actionError}</div>}

      <div className="my-docs-list">
        {reviewDocs.map((doc) => (
          <div key={doc.id} className="my-doc-card">

            {/* Doc info */}
            <div className="my-doc-info">
              <span className="doc-icon">
                {doc.mime_type === "application/pdf" ? "▤" : "›_"}
              </span>
              <div className="my-doc-meta">
                <b>{doc.title || doc.filename}</b>
                <small>{doc.filename} · uploaded by {doc.uploaded_by}</small>
              </div>
            </div>

            {/* Actions */}
            <div className="my-doc-actions">
              <Status label={doc.status} />

              <button
                className="secondary-action"
                onClick={() => handlePreview(doc)}
              >
                View
              </button>

              <button
                className="approve-btn"
                onClick={() => handleApprove(doc.id)}
                disabled={processing === doc.id}
              >
                {processing === doc.id ? "..." : "✓ Approve"}
              </button>

              <button
                className="reject-btn"
                onClick={() => setRejectingDoc(doc.id)}
                disabled={processing === doc.id}
              >
                ✕ Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Reject confirmation dialog */}
      {rejectingDoc && (
        <div className="preview-overlay" onClick={() => setRejectingDoc(null)}>
          <div className="reject-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Reject document?</h3>
            <p>The document will be sent back to the uploader as rejected. The file is kept.</p>
            <textarea
              className="reject-note"
              placeholder="Reason for rejection (optional — not stored yet)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
            <div className="reject-dialog-actions">
              <button
                className="secondary-action"
                onClick={() => setRejectingDoc(null)}
              >
                Cancel
              </button>
              <button
                className="reject-btn"
                onClick={() => handleReject(rejectingDoc)}
                disabled={processing === rejectingDoc}
              >
                {processing === rejectingDoc ? "Rejecting..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File preview modal */}
      {previewURL && (
        <div className="preview-overlay" onClick={() => setPreviewURL(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <span>{previewName}</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <a className="secondary-action" href={previewURL} download={previewName}>
                  Download
                </a>
                <button className="toast-close" onClick={() => setPreviewURL(null)}>×</button>
              </div>
            </div>
            {previewMime === "application/pdf" ? (
              <iframe src={previewURL} title={previewName} className="preview-frame" />
            ) : (
              <MarkdownPreview url={previewURL} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MarkdownPreview({ url }) {
  const [text, setText] = useState("Loading...");
  useState(() => {
    fetch(url).then((r) => r.text()).then(setText).catch(() => setText("Could not load."));
  }, [url]);
  return <pre className="md-preview">{text}</pre>;
}