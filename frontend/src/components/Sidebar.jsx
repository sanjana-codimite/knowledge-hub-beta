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
  project,
  projects,
  loadingProjects,
  myDocs,
  reviewDocs,
  onView,
  onProject,
}) {
  const close = (fn) => () => fn();

  // Safe fallbacks so counts never crash on first render before data loads
  const myDocsCount    = Array.isArray(myDocs)    ? myDocs.length    : 0;
  const reviewCount    = Array.isArray(reviewDocs) ? reviewDocs.length : 0;
  const projectItems   = [{ id: "all", name: "All projects" }, ...(projects || [])];

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
        <p style={{ padding: "8px 16px", color: "#64748b", fontSize: "0.82rem" }}>
          Loading projects...
        </p>
      ) : (
        projectItems.map((item) => (
          <button
            key={item.id}
            className={`project-link ${project === item.name ? "active" : ""}`}
            onClick={close(() => onProject(item.name))}
          >
            <span className="project-dot" data-project={item.name} />
            {item.name}
            <small>
              {item.name === "All projects"
                ? mockDocs.length
                : mockDocs.filter((d) => d.project === item.name).length}
            </small>
          </button>
        ))
      )}

      <div className="sync-card">
        <div>
          <b>Drive sync <span className="online" /></b>
          <p>3 folders · last synced 12 min ago</p>
          <button onClick={() => onView("sources")}>Manage sources</button>
        </div>
      </div>
    </aside>
  );
}
