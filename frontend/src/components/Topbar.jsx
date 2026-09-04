// Topbar renders the top navigation bar: brand, search, upload button, avatar.
export function Topbar({ user, query, onQuery, onUpload, onSignOut, onMenuToggle }) {
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

      <button className="upload-button" onClick={onUpload}>
        ＋ Upload
      </button>

      <button className="avatar" onClick={onSignOut} title="Sign out">
        {(user.name || user.email || "U").slice(0, 2).toUpperCase()}
      </button>
    </header>
  );
}
