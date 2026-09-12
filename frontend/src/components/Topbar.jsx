import { useState, useRef, useEffect } from "react";

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
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!showProfileMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showProfileMenu]);

  return (
    <header className="topbar">
      <button
        className="icon-button menu grid place-items-center text-[15px] cursor-pointer hover:bg-white/[0.14] transition-colors"
        onClick={onMenuToggle}
        aria-label="Toggle navigation"
        title="Toggle sidebar"
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

        {/* User Profile Menu */}
        <div className="relative" ref={menuRef}>
          <button
            className={`w-10 h-10 rounded-full border-2 p-0 overflow-hidden cursor-pointer grid place-items-center bg-gradient-to-br from-[#a9b4ff] to-[#38d0d6] text-[#111426] text-[11px] font-bold flex-shrink-0 transition-all ${
              showProfileMenu
                ? "border-[#a9b4ff] shadow-[0_0_12px_rgba(169,180,255,0.45)] scale-105"
                : "border-transparent hover:brightness-110 hover:border-white/30"
            }`}
            onClick={() => setShowProfileMenu((prev) => !prev)}
            aria-label="User profile menu"
            aria-haspopup="true"
            aria-expanded={showProfileMenu}
            title={user.name || user.email || "Profile"}
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

          {showProfileMenu && (
            <div
              className="absolute right-0 top-[calc(100%+12px)] w-[250px] p-3.5 rounded-2xl border border-white/[0.16] bg-[linear-gradient(165deg,rgba(22,24,44,0.96),rgba(12,13,26,0.98))] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.2)] z-[100] flex flex-col gap-3"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-white/[0.1]">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#a9b4ff] to-[#38d0d6] flex items-center justify-center text-[#111426] text-xs font-bold flex-shrink-0 shadow-sm">
                  {user.picture_url ? (
                    <img
                      src={user.picture_url}
                      alt={user.name || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (user.name || user.email || "U").slice(0, 2).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13.5px] font-semibold text-[#eef0ff] truncate leading-tight">
                    {user.name || "User"}
                  </span>
                  <span className="text-[11px] text-[rgba(238,240,255,0.5)] truncate mt-0.5">
                    {user.email}
                  </span>
                  {user.role && (
                    <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-[#a9b4ff] font-medium [font-family:'DM_Mono',monospace]">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>

              <button
                className="w-full flex items-center justify-center gap-2 h-9 px-3 rounded-xl text-[12.5px] font-semibold text-[#ff8a8a] bg-[rgba(255,106,106,0.1)] hover:bg-[rgba(255,106,106,0.2)] border border-[rgba(255,106,106,0.25)] cursor-pointer transition-all duration-150"
                onClick={() => {
                  setShowProfileMenu(false);
                  onSignOut();
                }}
              >
                <span className="text-[14px]">⎋</span>
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}