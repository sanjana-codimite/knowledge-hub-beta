import { useState } from "react";

/**
 * TagPicker — reusable tag selector with multi-select chips and inline create.
 *
 * Props:
 *   allTags        — array of { id, name } from the backend
 *   selectedNames  — array of selected tag name strings
 *   onChange        — (newSelectedNames: string[]) => void
 *   onCreateTag    — (name: string) => Promise<Tag>
 *   loading        — boolean, true while tags are being fetched
 */
export function TagPicker({
  allTags = [],
  selectedNames = [],
  onChange,
  onCreateTag,
  loading = false,
}) {
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const toggleTag = (name) => {
    if (selectedNames.includes(name)) {
      onChange(selectedNames.filter((n) => n !== name));
    } else {
      onChange([...selectedNames, name]);
    }
  };

  const handleCreate = async () => {
    const trimmed = newTagName.trim().toLowerCase();
    if (!trimmed || creating) return;

    if (allTags.some((t) => t.name.toLowerCase() === trimmed)) {
      if (!selectedNames.includes(trimmed)) {
        onChange([...selectedNames, trimmed]);
      }
      setNewTagName("");
      return;
    }

    setCreating(true);
    setError("");
    try {
      await onCreateTag(trimmed);
      if (!selectedNames.includes(trimmed)) {
        onChange([...selectedNames, trimmed]);
      }
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
    // tag-picker kept in CSS — has margin-top; tag-chip kept in CSS — complex rgba states
    <div className="tag-picker">
      {loading ? (
        <div className="p-3 text-[rgba(238,240,255,0.6)] text-xs text-center">
          Loading tags...
        </div>
      ) : (
        <>
        <div className="flex gap-1.5 pb-2 mb-2 border-b border-[rgba(238,240,255,0.12)]">
            <input
              className="tag-picker-input"
              value={newTagName}
              onChange={(e) => {
                setNewTagName(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyDown}
              placeholder="New tag name..."
              maxLength={30}
            />
            <button
              type="button"
              className="tag-picker-add-btn"
              onClick={handleCreate}
              disabled={!newTagName.trim() || creating}
            >
              {creating ? "..." : "+ Add"}
            </button>
          </div>

          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className={`tag-chip${selectedNames.includes(tag.name) ? " selected" : ""}`}
                  onClick={() => toggleTag(tag.name)}
                >
                  <span className="tag-chip-icon">
                    {selectedNames.includes(tag.name) ? "✓" : "#"}
                  </span>
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          

          {error && (
            <div className="mt-1.5 text-[#ffcf94] text-[11.5px]">{error}</div>
          )}
        </>
      )}
    </div>
  );
}