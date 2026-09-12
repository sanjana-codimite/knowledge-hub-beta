

import { useMemo } from "react";

const PROJECT_DOT_COLORS = [
  "#38d0d6", // cyan
  "#f472b6", // pink
  "#fb923c", // orange
  "#4ade80", // emerald
  "#c084fc", // purple
  "#38bdf8", // sky blue
  "#facc15", // amber/yellow
  "#f87171", // coral
  "#2dd4bf", // teal
  "#a78bfa", // violet
  "#fb7185", // rose
  "#818cf8", // indigo
];

// NavButton is local to Sidebar — only Sidebar uses it.
function NavButton({ icon, label, count, active, onClick }) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      {label}
      <small>{count}</small>
    </button>
  );
}

// Sidebar renders the left navigation: view switcher, project list, sync card.
export function Sidebar({
  open,
  view,
  projects,
  loadingProjects,
  myDocs,
  reviewDocs,
  onView,
  onProject,
  selectedProject,
  publishedDocs,
  counts={},
  totalCount=0,
  myDocsCount,
  myReviewsCount,
}) {
  const close = (fn) => () => fn();

  const myDocsDisplay   = myDocsCount    ?? (Array.isArray(myDocs)    ? myDocs.length    : 0);
  const reviewDisplay   = myReviewsCount ?? (Array.isArray(reviewDocs) ? reviewDocs.length : 0);
  const publishedDocumentItems = Array.isArray(publishedDocs) ? publishedDocs : [];

  const sortedProjects = useMemo(() => {
    return [...(Array.isArray(projects) ? projects : [])].sort((a, b) => {
      const countA = counts[a.id] || 0;
      const countB = counts[b.id] || 0;
      if (countB !== countA) {
        return countB - countA; // most files to least files
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [projects, counts]);

  const projectItems = [
    { id: null, name: "All projects" },
    ...sortedProjects,
  ];

  return (
    <aside className={`sidebar ${open ? "open" : "collapsed"}`}>
      <nav>
        <NavButton
          icon="⌕"
          label="Search"
          count={publishedDocumentItems.length}
          active={view === "search"}
          onClick={close(() => onView("search"))}
        />
        <NavButton
          icon="◇"
          label="Threads"
          count={4}
          active={view === "threads"}
          onClick={close(() => onView("threads"))}
        />
        <NavButton
          icon="⧉"
          label="Sources"
          count="5"
          active={view === "sources"}
          onClick={close(() => onView("sources"))}
        />
        <NavButton
          icon="📄"
          label="My Docs"
          count={myDocsDisplay}
          active={view === "mydocs"}
          onClick={close(() => onView("mydocs"))}
        />
        <NavButton
          icon="✓"
          label="My Reviews"
          count={reviewDisplay}
          active={view === "my-reviews"}
          onClick={close(() => onView("my-reviews"))}
        />
      </nav>

      <div className="side-label">Projects</div>

      {loadingProjects ? (
        <p className="px-4 py-2 text-[0.82rem] text-[rgba(238,240,255,0.5)]">
          Loading projects...
        </p>
      ) : (
        <div className="overflow-y-auto max-h-[400px] pr-0.5">
          {projectItems.map((item, index) => {
            const dotColor = !item.id
              ? "#a9b4ff"
              : PROJECT_DOT_COLORS[(index - 1) % PROJECT_DOT_COLORS.length];

            return (
              <button
                key={item.id || "all"}
                className={`project-link ${
                  (selectedProject?.id || null) === item.id ? "active" : ""
                }`}
                onClick={close(() => onProject(item.id ? item : null))}
              >
                <span
                  className="project-dot"
                  data-project={item.name}
                  style={{
                    backgroundColor: dotColor,
                    boxShadow: `0 0 8px ${dotColor}99`,
                  }}
                />
                {item.name}
                <small>
                  {item.name === "All projects"
                    ? totalCount
                    : (counts[item.id] || 0)}
                </small>
              </button>
            );
          })}
        </div>
      )}

      <div className="sync-card">
        <div>
          <b>
            Drive sync <span className="online" />
          </b>
          <p>3 folders · last synced 12 min ago</p>
          <button onClick={() => onView("sources")}>Manage sources</button>
        </div>
      </div>
    </aside>
  );
}