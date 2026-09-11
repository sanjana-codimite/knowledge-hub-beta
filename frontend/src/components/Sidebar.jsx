import { docs as mockDocs } from "../data/mockData";

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
   selectedProject,   // ← add
  publishedDocs,     // ← add
}) {
  const close = (fn) => () => fn();

  // Safe fallbacks so counts never crash on first render before data loads
  const myDocsCount = Array.isArray(myDocs) ? myDocs.length : 0;
  const reviewCount = Array.isArray(reviewDocs) ? reviewDocs.length : 0;
   const publishedDocumentItems = Array.isArray(publishedDocs) ? publishedDocs : [];
   const projectItems = [
     { id: null, name: "All projects" },
     ...(Array.isArray(projects) ? projects : []),
  ];

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <nav>
        <NavButton
          icon="⌕"
          label="Search"
          count={mockDocs.length}
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
          count={myDocsCount}
          active={view === "mydocs"}
          onClick={close(() => onView("mydocs"))}
        />
        <NavButton
          icon="✓"
          label="My Reviews"
          count={reviewCount}
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
        projectItems.map((item) => (
          <button
            key={item.id || "all"}
            className={`project-link ${
              (selectedProject?.id || null) === item.id ? "active" : ""
            }`}
            onClick={close(() => onProject(item.id ? item : null))}
          >
            <span className="project-dot" data-project={item.name} />
            {item.name}
            <small>
              {item.name === "All projects"
                ? publishedDocumentItems.length
                : publishedDocumentItems.filter((d) => d.project_id === item.id).length}
            </small>
          </button>
        ))
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
