import { useEffect, useState } from "react";
import { listTags, createTag } from "../api/tags";
import { useToast } from "./Toast";

export function TagManagerModal({ session, onSession, onClose }) {
  const { showToast } = useToast();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);

    listTags(session, onSession)
      .then((items) => {
        if (active) setTags(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load tags");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [session]);

  const handleCreate = async () => {
    const trimmed = newTagName.trim().toLowerCase();
    if (!trimmed || creating) return;

    if (tags.some((t) => t.name.toLowerCase() === trimmed)) {
      setError(`Tag "${trimmed}" already exists`);
      return;
    }

    setCreating(true);
    setError("");
    try {
      const tag = await createTag(trimmed, session, onSession);
      setTags((prev) =>
        [...prev, tag].sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        )
      );
      showToast(`Tag "#${trimmed}" created successfully`);
      setNewTagName("");
    } catch (err) {
      setError(err.message || "Could not create tag");
    } finally {
      setCreating(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="panel-layer modal-layer" onClick={onClose}>
      
      <section
        className="detail-panel modal-panel tag-manager-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-button" onClick={onClose} aria-label="Close">
          ×
        </button>

        <div className="form-panel">
          <div className="flex items-start justify-between gap-4">
            <h2>Manage Tags</h2>
          </div>

           <p className="m-0 mt-[6px] text-[13.5px] leading-[1.55] text-[rgba(238,240,255,0.62)]">
            Create and manage tags for your documents. Tags help categorize and
            find documents faster.
          </p>

          {/* Create new tag */}
          <div className="tag-manager-create-row flex gap-2 mt-4">
            <input
              className="panel-input flex-1"
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter tag name..."
              maxLength={30}
              autoFocus
            />
            <button
              className="primary-action tag-manager-create-btn"
              onClick={handleCreate}
              disabled={!newTagName.trim() || creating}
            >
              {creating ? "Creating..." : "Create tag"}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}

         
          <div className="mt-6 mb-2 text-[11px] tracking-[0.12em] uppercase text-[rgba(238,240,255,0.42)]">
            Existing tags ({tags.length})
          </div>

          {loading ? (
            <div className="py-5 text-[rgba(238,240,255,0.6)] text-sm text-center">
              Loading tags...
            </div>
          ) : tags.length === 0 ? (
            <div className="py-5 text-[rgba(238,240,255,0.6)] text-sm text-center">
              No tags yet. Create your first tag above.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
              {tags.map((tag) => (
                /* tag-manager-item kept in CSS — has rgba hover transition */
                <div key={tag.id} className="tag-manager-item">
                  <span className="tag-chip readonly">
                    <span className="tag-chip-icon">#</span>
                    {tag.name}
                  </span>
                  {/* tag-manager-date kept in CSS — uses DM Mono font */}
                  <span className="tag-manager-date">
                    {new Date(tag.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}