// Topbar renders the top navigation bar: brand, search, upload button, avatar.
export function Topbar({
  user,
  query,
  onQuery,
  onUpload,
  onCreateProject,
  onSignOut,
  onMenuToggle,
}) {
  return (
    <header className="topbar">
      <button
        className="icon-button menu"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <div className="brand">
        <span className="brand-mark">✦</span>
        <strong>Atlas</strong>
      </div>

      <div className="search">
        <span>⌕</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search docs, READMEs, threads..."
        />
        <kbd>⌘ K</kbd>
      </div>

      <div className="topbar-actions">
        <button className="upload-button" onClick={onUpload}>
          ＋ Upload
        </button>

        <button className="upload-button" onClick={onCreateProject}>
          ＋ Project
        </button>

        <button className="avatar" onClick={onSignOut} title="Sign out">
          {user.picture_url ? (
            <img
              src={user.picture_url}
              alt={user.name || "User"}
              className="avatar-image"
            />
          ) : (
            (user.name || user.email || "U").slice(0, 2).toUpperCase()
          )}
        </button>
      </div>
    </header>
  );
}
