// Topbar renders the top navigation bar: brand, search, upload button, avatar.
export function Topbar({
  user,
  query,
  onQuery,
  onUpload,
  onCreateProject,
  onManageTags,
  onSignOut,
  onMenuToggle,
}) {
  return (
    <header className="topbar">
      {/* icon-button has size/border/background in CSS but no centering, so the
          glyph wasn't actually centered inside the square — added via Tailwind */}
      <button
        className="icon-button menu grid place-items-center text-[15px]"
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

        <button className="upload-button" onClick={onManageTags}>
          ＋ Tags
        </button>

        <button className="upload-button" onClick={onCreateProject}>
          ＋ Project
        </button>

        {/* .avatar in App.css is missing centering, the gradient background, and initials
            styling that an earlier (commented-out) version of that rule had — and
            .avatar-image was never defined at all, so the photo had no sizing. Rebuilt
            here in Tailwind instead of patching a CSS rule two other things may depend on. */}
        <button
          className="w-10 h-10 rounded-full border-0 p-0 overflow-hidden cursor-pointer grid place-items-center bg-gradient-to-br from-[#a9b4ff] to-[#38d0d6] text-[#111426] text-[11px] font-bold flex-shrink-0 transition-[filter] hover:brightness-110"
          onClick={onSignOut}
          title="Sign out"
        >
          {user.picture_url ? (
            <img
              src={user.picture_url}
              alt={user.name || "User"}
              className="w-full h-full object-cover"
            />
          ) : (
            (user.name || user.email || "U").slice(0, 2).toUpperCase()
          )}
        </button>
      </div>
    </header>
  );
}