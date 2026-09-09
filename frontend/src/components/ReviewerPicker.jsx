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
      // Tell parent to update this doc's status + reviewer
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
    <div className="reviewer-picker-wrapper">
      {/* Show current reviewer or assign button */}
      {currentReviewer ? (
        <div className="current-reviewer">
          <UserAvatar user={currentReviewer} size={28} />
          <span className="reviewer-name">{currentReviewer.name || currentReviewer.email}</span>
          <button
            className="reviewer-change-btn"
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

      {/* Dropdown picker */}
      {open && (
        <div className="reviewer-dropdown">
          <div className="reviewer-dropdown-header">
            <span>Select reviewer</span>
            <button className="toast-close" onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="reviewer-list">
            {users.map((user) => (
              <button
                key={user.id}
                className={`reviewer-item ${user.id === doc.reviewer_id ? "active" : ""}`}
                onClick={() => handleAssign(user.id)}
                disabled={loading || user.id === doc.reviewer_id}
              >
                <UserAvatar user={user} size={32} />
                <div className="reviewer-item-info">
                  <span className="reviewer-item-name">{user.name || "Unknown"}</span>
                  <span className="reviewer-item-email">{user.email}</span>
                </div>
                {user.id === doc.reviewer_id && (
                  <span className="reviewer-current-badge">Current</span>
                )}
              </button>
            ))}
          </div>

          {/* Remove reviewer option — only shown if reviewer assigned */}
          {doc.reviewer_id && (
            <button
              className="reviewer-remove-btn"
              onClick={handleRemove}
              disabled={loading}
            >
              Remove reviewer
            </button>
          )}

          {error && <div className="error-message">{error}</div>}
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
      className="user-avatar"
      style={{ width: size, height: size, borderRadius: "50%" }}
      onError={(e) => { e.target.style.display = "none"; }}
    />
  ) : (
    <div
      className="user-avatar-initials"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
}