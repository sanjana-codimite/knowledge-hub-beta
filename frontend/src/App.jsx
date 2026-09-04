import { useMemo, useState } from "react";
import "./App.css";

import { useAuth }       from "./hooks/useAuth";
import { docs }          from "./data/mockData";

import { LoginScreen }   from "./components/LoginScreen";
import { Topbar }        from "./components/Topbar";
import { Sidebar }       from "./components/Sidebar";
import { SearchView }    from "./components/SearchView";
import { ThreadsView }   from "./components/ThreadsView";
import { SourcesView }   from "./components/SourcesView";
import { Panel }         from "./components/Panel";

// App is the root component. Its only job is:
//   - Owning UI state (view, query, project, sidebar, panel)
//   - Filtering docs based on search query and project
//   - Rendering the correct view and passing handlers down
// All auth logic lives in useAuth(). All data lives in mockData.js.
function App() {
  const { user, session, saveSession, busy, error, signIn, signOut } = useAuth();

  const [view,    setView]    = useState("search");
  const [query,   setQuery]   = useState("");
  const [project, setProject] = useState("All projects");
  const [sidebar, setSidebar] = useState(false);
  const [panel,   setPanel]   = useState(null);

  const filteredDocs = useMemo(
    () =>
      docs.filter((doc) => {
        const text = `${doc.title} ${doc.excerpt} ${doc.tags.join(" ")}`.toLowerCase();
        return (
          (project === "All projects" || doc.project === project) &&
          (!query || text.includes(query.toLowerCase()))
        );
      }),
    [project, query]
  );

  const handleQuery = (q) => {
    setQuery(q);
    setView("search");
  };

  const handleProject = (name) => {
    setProject(name);
    setView("search");
    setSidebar(false);
  };

  const handleView = (v) => {
    setView(v);
    setSidebar(false);
  };

  // Show login screen if not authenticated
  if (!session || !user) {
    return <LoginScreen busy={busy} error={error} onSignIn={signIn} />;
  }

  return (
    <div className="app-shell">
      <Topbar
        user={user}
        query={query}
        onQuery={handleQuery}
        onUpload={() => setPanel("upload")}
        onSignOut={signOut}
        onMenuToggle={() => setSidebar((s) => !s)}
      />

      <div className="workspace">
        <Sidebar
          open={sidebar}
          view={view}
          project={project}
          onView={handleView}
          onProject={handleProject}
        />

        <main className="main-content">
          {view === "search" && (
            <SearchView
              query={query}
              onQuery={handleQuery}
              project={project}
              docs={filteredDocs}
              onDocClick={setPanel}
            />
          )}
          {view === "threads" && (
            <ThreadsView
              onAsk={() => setPanel("ask")}
              onThreadClick={setPanel}
            />
          )}
          {view === "sources" && <SourcesView />}
        </main>
      </div>

      {panel && <Panel data={panel} close={() => setPanel(null)} />}

      <div className="user-status">Signed in as {user.email}</div>
    </div>
  );
}

export default App;
