import { useEffect, useState, useMemo } from "react";
import { Status } from "./Status";
import { getDocumentFileURL } from "../api/documents";
import { ReviewerPicker } from "./ReviewerPicker";
import { DocTypeFilter, filterDocsByType, getDocCategory } from "./DocTypeFilter";

export function MyDocsView({
  myDocs,
  loading,
  error,
  session,
  onSession,
  users,
}) {
  const [docs, setDocs] = useState([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [previewURL, setPreviewURL] = useState(null);
  const [previewMime, setPreviewMime] = useState("");
  const [previewName, setPreviewName] = useState("");

  useEffect(() => {
    setDocs(myDocs || []);
  }, [myDocs]);

  const typeCounts = useMemo(() => {
    const list = docs || [];
    return {
      all: list.length,
      pdf: list.filter((d) => getDocCategory(d) === "pdf").length,
      readme: list.filter((d) => getDocCategory(d) === "readme").length,
      txt: list.filter((d) => getDocCategory(d) === "txt").length,
    };
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return filterDocsByType(docs || [], typeFilter);
  }, [docs, typeFilter]);

  const handlePreview = async (doc) => {
    try {
      const url = await getDocumentFileURL(doc.id, session, onSession);
      setPreviewURL(url);
      setPreviewMime(doc.mime_type);
      setPreviewName(doc.title || doc.filename);
    } catch {
      alert("Could not load file preview.");
    }
  };

  const handleDocUpdated = (updatedDoc) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === updatedDoc.id ? updatedDoc : d)),
    );
  };

  if (loading)
    return (
      <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
        Loading your documents...
      </div>
    );
  if (error)
    return (
      <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
        {error}
      </div>
    );
  if (!docs.length)
    return (
      <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
        <p>You haven&apos;t uploaded any documents yet.</p>
      </div>
    );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="m-0 text-[22px] font-bold tracking-[-0.02em] text-[#eef0ff]">
            My Documents
          </h2>
          <p className="mt-1.5 text-sm text-[rgba(238,240,255,0.6)]">
            Documents you have uploaded. Assign a reviewer to start the approval
            process.
          </p>
        </div>

        <DocTypeFilter
          selectedFilter={typeFilter}
          onFilterChange={setTypeFilter}
          counts={typeCounts}
        />
      </div>

      <div className="flex flex-col gap-3 mt-4 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-[20px] border border-white/[0.13] bg-gradient-to-br from-white/[0.12] to-white/[0.045] backdrop-blur-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_40px_rgba(0,0,0,0.26)]"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="doc-icon">
                {doc.mime_type === "application/pdf" ? "▤" : "›_"}
              </span>

              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <b className="text-[0.9rem] text-[#eef0ff] truncate">
                    {doc.title || doc.filename}
                  </b>
                  <Status label={doc.status} />
                </div>
                <small className="text-xs text-[rgba(238,240,255,0.5)] truncate">
                  {doc.filename} · {doc.mime_type}
                </small>
                {doc.tags && doc.tags.length > 0 && (
                  <span className="flex flex-wrap gap-[5px] mt-0.5">
                    {doc.tags.map((tag) => (
                      <span key={tag.id} className="doc-tag-chip">
                        #{tag.name}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <button
                className="secondary-action"
                onClick={() => handlePreview(doc)}
              >
                View
              </button>
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
        {!filteredDocs.length && (
          <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
            No matching documents found for this file type.
          </div>
        )}
      </div>

      {/* File preview modal — matches the app's slide-panel glass style */}
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
                <a
                  className="secondary-action"
                  href={previewURL}
                  download={previewName}
                >
                  Download
                </a>
                <button
                  className="bg-transparent border-0 text-[rgba(238,240,255,0.45)] text-[1.1rem] cursor-pointer leading-none p-0 flex-shrink-0 transition-colors hover:text-[#a9b4ff]"
                  onClick={() => setPreviewURL(null)}
                >
                  ×
                </button>
              </div>
            </div>

            {previewMime === "application/pdf" ? (
              <iframe
                src={previewURL}
                title={previewName}
                className="flex-1 w-full border-0 bg-white"
              />
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
  const [text, setText] = useState("");

  useEffect(() => {
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load file");
        return response.text();
      })
      .then(setText)
      .catch(() => setText("Could not load file."));
  }, [url]);

  return (
    <pre className="flex-1 p-6 overflow-auto text-[0.9rem] text-[rgba(238,240,255,0.65)] whitespace-pre-wrap break-words [font-family:'DM_Mono',monospace]">
      {text}
    </pre>
  );
}