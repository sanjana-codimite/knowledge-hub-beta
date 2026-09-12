import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { assignReviewer, removeReviewer } from "../api/documents";
import { useToast } from "./Toast";

export function ReviewerPicker({ doc, users, session, onSession, onUpdated }) {
  const { showToast } = useToast();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [dropPos, setDropPos] = useState({ top: 0, right: 0 });
  const triggerRef            = useRef(null);

  const currentReviewer = users.find((u) => u.id === doc.reviewer_id);

  const openDrop = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 8, right: window.innerWidth - r.right });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!e.target.closest("[data-reviewer-dropdown]") &&
          !e.target.closest("[data-reviewer-trigger]")) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleAssign = async (userId) => {
    setLoading(true);
    setError("");
    try {
      await assignReviewer(doc.id, userId, session, onSession);
      setOpen(false);
      onUpdated({ ...doc, reviewer_id: userId, status: "in_review" });
      const assignedUser = users.find((u) => u.id === userId);
      showToast(`Reviewer ${assignedUser?.name || assignedUser?.email || ""} assigned`);
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
      showToast("Reviewer removed");
    } catch (e) {
      setError(e.message || "Could not remove reviewer.");
    } finally {
      setLoading(false);
    }
  };

  const dropdown = open
    ? createPortal(
        <div
          data-reviewer-dropdown
          style={{ top: dropPos.top, right: dropPos.right }}
          className="fixed w-[280px] z-[9999] rounded-2xl overflow-hidden border border-white/[0.14] bg-gradient-to-b from-[rgba(22,24,44,0.97)] to-[rgba(12,13,26,0.99)] backdrop-blur-2xl backdrop-saturate-150 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
        >
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
        </div>,
        document.body
      )
    : null;

  return (
    <div className="relative flex items-center" data-reviewer-trigger ref={triggerRef}>
      {currentReviewer ? (
        <div className="flex items-center gap-2 h-[38px] bg-[rgba(95,227,161,0.12)] border border-[rgba(95,227,161,0.35)] rounded-xl py-1 px-3 pl-1.5">
          <UserAvatar user={currentReviewer} size={26} />
          <span className="text-[0.82rem] text-[#eef0ff] max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap font-medium">
            {currentReviewer.name || currentReviewer.email}
          </span>
          <button
            className="bg-transparent border-0 text-[rgba(238,240,255,0.65)] text-[0.78rem] cursor-pointer p-0 transition-colors hover:text-[#eef0ff] ml-0.5"
            onClick={openDrop}
            disabled={loading}
          >
            Change
          </button>
        </div>
      ) : (
        <button
          className="h-[38px] px-4 rounded-xl border border-[rgba(169,180,255,0.4)] bg-[linear-gradient(135deg,rgba(169,180,255,0.18),rgba(100,110,255,0.22))] hover:bg-[linear-gradient(135deg,rgba(169,180,255,0.28),rgba(100,110,255,0.32))] hover:border-[rgba(169,180,255,0.6)] text-[#dfe3ff] text-[13px] font-semibold transition-all inline-flex items-center justify-center cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.2)] disabled:opacity-50 whitespace-nowrap"
          onClick={openDrop}
          disabled={loading}
        >
          Assign reviewer
        </button>
      )}

      {dropdown}
    </div>
  );
}

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