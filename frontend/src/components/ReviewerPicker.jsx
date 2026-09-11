import { useState } from "react";
import { assignReviewer, removeReviewer } from "../api/documents";

export function ReviewerPicker({ doc, users, session, onSession, onUpdated }) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const currentReviewer = users.find((u) => u.id === doc.reviewer_id);

  const handleAssign = async (userId) => {
    setLoading(true);
    setError("");
    try {
      await assignReviewer(doc.id, userId, session, onSession);
      setOpen(false);
      onUpdated({ ...doc, reviewer_id: userId, status: "in_review" });
    } catch (e) {
      setError(e.message || "Could not assign reviewer.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    setError("");
    try {
      await removeReviewer(doc.id, session, onSession);
      setOpen(false);
      onUpdated({ ...doc, reviewer_id: "", status: "draft" });
    } catch (e) {
      setError(e.message || "Could not remove reviewer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Show current reviewer or assign button — retheme to the app's success-green,
          matching the "current" status pill instead of the old unrelated dark-green/slate */}
      {currentReviewer ? (
        <div className="flex items-center gap-2 bg-[rgba(95,227,161,0.12)] border border-[rgba(95,227,161,0.35)] rounded-full py-1 px-2.5 pl-1">
          <UserAvatar user={currentReviewer} size={28} />
          <span className="text-[0.82rem] text-[#eef0ff] max-w-[100px] overflow-hidden text-ellipsis whitespace-nowrap">
            {currentReviewer.name || currentReviewer.email}
          </span>
          <button
            className="bg-transparent border-0 text-[rgba(238,240,255,0.65)] text-[0.78rem] cursor-pointer p-0 transition-colors hover:text-[#eef0ff]"
            onClick={() => setOpen((o) => !o)}
            disabled={loading}
          >
            Change
          </button>
        </div>
      ) : (
        <button
          className="primary-action"
          onClick={() => setOpen((o) => !o)}
          disabled={loading}
        >
          Assign reviewer
        </button>
      )}

      {/* Dropdown picker — rebuilt as a glass panel matching the app's detail-panel /
          preview-modal system instead of the old flat slate .reviewer-dropdown CSS */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[280px] z-[500] rounded-2xl overflow-hidden border border-white/[0.14] bg-gradient-to-b from-[rgba(22,24,44,0.94)] to-[rgba(12,13,26,0.97)] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="flex justify-between items-center px-4 py-3 border-b border-white/[0.12] text-[0.82rem] font-semibold text-[rgba(238,240,255,0.55)]">
            <span>Select reviewer</span>
            <button
              className="bg-transparent border-0 text-[rgba(238,240,255,0.45)] text-[1.1rem] cursor-pointer leading-none p-0 flex-shrink-0 transition-colors hover:text-[#a9b4ff]"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto p-2 flex flex-col gap-1">
            {users.map((user) => (
              <button
                key={user.id}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border-0 cursor-pointer w-full text-left transition-colors duration-150 disabled:opacity-50 ${
                  user.id === doc.reviewer_id
                    ? "bg-[rgba(95,227,161,0.12)] cursor-default"
                    : "bg-transparent hover:bg-white/[0.08]"
                }`}
                onClick={() => handleAssign(user.id)}
                disabled={loading || user.id === doc.reviewer_id}
              >
                <UserAvatar user={user} size={32} />
                <div className="flex flex-col gap-px min-w-0">
                  <span className="text-[0.85rem] text-[#eef0ff] font-medium">
                    {user.name || "Unknown"}
                  </span>
                  <span className="text-xs text-[rgba(238,240,255,0.5)] overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.email}
                  </span>
                </div>
                {user.id === doc.reviewer_id && (
                  <span className="ml-auto text-[0.7rem] text-[#8ff0c0] border border-[rgba(95,227,161,0.4)] rounded-[10px] px-1.5 py-px flex-shrink-0">
                    Current
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Remove reviewer option */}
          {doc.reviewer_id && (
            <button
              className="w-full px-4 py-2.5 bg-transparent border-0 border-t border-white/[0.12] text-[#ff8a8a] text-[0.82rem] cursor-pointer text-left transition-colors hover:bg-[rgba(255,106,106,0.1)]"
              onClick={handleRemove}
              disabled={loading}
            >
              Remove reviewer
            </button>
          )}

          {error && <div className="error-message mx-3 mb-3">{error}</div>}
        </div>
      )}
    </div>
  );
}

// UserAvatar shows picture if available, initials otherwise
export function UserAvatar({ user, size = 32 }) {
  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return user.picture_url ? (
    <img
      src={user.picture_url}
      alt={user.name}
      className="object-cover flex-shrink-0"
      style={{ width: size, height: size, borderRadius: "50%" }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  ) : (
    <div
      className="rounded-full bg-white/[0.08] border border-white/[0.14] text-[rgba(238,240,255,0.75)] flex items-center justify-center font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}