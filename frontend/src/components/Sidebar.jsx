import { docs, projects } from "../data/mockData";

// NavButton is local to Sidebar — only Sidebar uses it.
function NavButton({ icon, label, count, active, onClick }) {
  return (
    <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>
      <span>{icon}</span>
      {label}
      <small>{count}</small>
    </button>
  );
}

// Sidebar renders the left navigation: view switcher, project list, sync card.
export function Sidebar({ open, view, project, onView, onProject }) {
  const close = (fn) => () => { fn(); };

  return (
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <nav>
        <NavButton
          icon="⌕" label="Search" count={docs.length}
          active={view === "search"}
          onClick={close(() => onView("search"))}
        />
        <NavButton
          icon="◇" label="Threads" count={4}
          active={view === "threads"}
          onClick={close(() => onView("threads"))}
        />
        <NavButton
          icon="⧉" label="Sources" count="5"
          active={view === "sources"}
          onClick={close(() => onView("sources"))}
        />
      </nav>

      <div className="side-label">Projects</div>
      {projects.map((name) => (
        <button
          key={name}
          className={`project-link ${project === name ? "active" : ""}`}
          onClick={close(() => onProject(name))}
        >
          <span className="project-dot" data-project={name} />
          {name}
          <small>
            {name === "All projects"
              ? docs.length
              : docs.filter((d) => d.project === name).length}
          </small>
        </button>
      ))}

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
