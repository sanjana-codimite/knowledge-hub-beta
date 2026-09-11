import { useState } from "react";
import { approveDocument, rejectDocument, getDocumentFileURL } from "../api/documents";
import { Status } from "./Status";

export function ReviewView({ reviewDocs, loading, error, session, onSession, onDocActioned }) {
  const [processing, setProcessing] = useState(null);
  const [actionError, setActionError] = useState("");
  const [previewURL, setPreviewURL]   = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [previewMime, setPreviewMime] = useState("");
  const [rejectNote, setRejectNote]   = useState("");
  const [rejectingDoc, setRejectingDoc] = useState(null);

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
      onDocActioned(docId);
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
      onDocActioned(docId);
      setRejectingDoc(null);
      setRejectNote("");
    } catch (e) {
      setActionError(e.message || "Could not reject document.");
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">Loading review queue...</div>;
  if (error)   return <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">{error}</div>;
  if (!reviewDocs.length) return (
    <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
      <p>No documents assigned to you for review.</p>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-[#eef0ff]">Review Queue</h2>
          <p className="mt-1.5 text-sm text-[rgba(238,240,255,0.6)]">
            Documents assigned to you. Review and approve or reject each one.
          </p>
        </div>
      </div>

      {/* error-message kept in CSS — matches the app's amber warning treatment */}
      {actionError && <div className="error-message">{actionError}</div>}

      <div className="flex flex-col gap-3 mt-4">
        {reviewDocs.map((doc) => (
          // row styled to match the app's glass-card system (same gradient/blur/shadow as .document-card)
          <div
            key={doc.id}
            className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[20px] border border-white/[0.13] bg-gradient-to-br from-white/[0.12] to-white/[0.045] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_40px_rgba(0,0,0,0.26)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="doc-icon">
                {doc.mime_type === "application/pdf" ? "▤" : "›_"}
              </span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <b className="text-[0.9rem] text-[#eef0ff] truncate">{doc.title || doc.filename}</b>
                <small className="text-xs text-[rgba(238,240,255,0.5)] truncate">
                  {doc.filename} · uploaded by {doc.uploaded_by}
                </small>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Status label={doc.status} />
              <button className="secondary-action" onClick={() => handlePreview(doc)}>View</button>
              {/* approve-btn / reject-btn kept in CSS — semantic dark colors */}
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

      {/* Reject confirmation dialog — themed to match the app's glass-panel system */}
      {rejectingDoc && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center"
          onClick={() => setRejectingDoc(null)}
        >
          <div
            className="bg-gradient-to-br from-white/[0.14] to-white/[0.05] backdrop-blur-2xl border border-white/[0.17] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_30px_70px_rgba(0,0,0,0.5)] rounded-2xl p-6 w-[400px] flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[#eef0ff] text-base font-semibold m-0">Reject document?</h3>
            <p className="text-[rgba(238,240,255,0.6)] text-[0.88rem] m-0">
              The document will be sent back to the uploader as rejected. The file is kept.
            </p>
            <textarea
              className="bg-white/[0.06] border border-white/[0.12] rounded-lg text-[#eef0ff] p-2.5 text-[0.88rem] resize-y w-full box-border outline-none placeholder:text-[rgba(238,240,255,0.35)] focus:border-[rgba(169,180,255,0.4)]"
              placeholder="Reason for rejection (optional)"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <button className="secondary-action" onClick={() => setRejectingDoc(null)}>Cancel</button>
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
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9000] flex items-center justify-center"
          onClick={() => setPreviewURL(null)}
        >
          <div
            className="bg-gradient-to-b from-[rgba(22,24,44,0.94)] to-[rgba(12,13,26,0.97)] backdrop-blur-2xl backdrop-saturate-150 border border-white/[0.14] shadow-[0_30px_80px_rgba(0,0,0,0.55)] rounded-2xl w-[80vw] h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.12] text-[0.9rem] text-[#eef0ff]">
              <span>{previewName}</span>
              <div className="flex gap-2">
                <a className="secondary-action" href={previewURL} download={previewName}>Download</a>
                <button
                  className="bg-transparent border-0 text-[rgba(238,240,255,0.45)] text-[1.1rem] cursor-pointer leading-none p-0 flex-shrink-0 transition-colors hover:text-[#a9b4ff]"
                  onClick={() => setPreviewURL(null)}
                >
                  ×
                </button>
              </div>
            </div>
            {previewMime === "application/pdf" ? (
              <iframe src={previewURL} title={previewName} className="flex-1 w-full border-0 bg-white" />
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
  return (
    <pre className="flex-1 p-6 overflow-auto text-[0.9rem] text-[rgba(238,240,255,0.65)] whitespace-pre-wrap break-words [font-family:'DM_Mono',monospace]">
      {text}
    </pre>
  );
}