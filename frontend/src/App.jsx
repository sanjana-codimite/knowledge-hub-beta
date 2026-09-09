import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { useAuth }       from "./hooks/useAuth";
import { useUsers }      from "./hooks/useUsers";
import { useMyDocs, useDocsForReview } from "./hooks/useMyDocs";

// Static mock data — only used for Search view until real doc API is wired
import { docs as mockDocs } from "./data/mockData";

import { LoginScreen }   from "./components/LoginScreen";
import { Topbar }        from "./components/Topbar";
import { Sidebar }       from "./components/Sidebar";
import { SearchView }    from "./components/SearchView";
import { ThreadsView }   from "./components/ThreadsView";
import { SourcesView }   from "./components/SourcesView";
import { Panel }         from "./components/Panel";
import { Toast }         from "./components/Toast";
import { MyDocsView }    from "./components/MyDocsView";
import { ReviewView }    from "./components/MyDocsReview";

import { listProjects }  from "./api/projects";

function App() {
  const { user, session, saveSession, busy, error, signIn, signOut } = useAuth();
  const { users } = useUsers(session, saveSession);

  const [view,            setView]           = useState("search");
  const [query,           setQuery]          = useState("");
  const [project,         setProject]        = useState("All projects");
  const [projects,        setProjects]       = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [sidebar,         setSidebar]        = useState(false);
  const [panel,           setPanel]          = useState(null);
  const [toast,           setToast]          = useState("");

  // My Docs — only fetches when "mydocs" view is active
  const {
    myDocs,
    loading: myDocsLoading,
    error:   myDocsError,
    addDoc,
  } = useMyDocs(session, saveSession, view === "mydocs");

  // Review queue — only fetches when "my-reviews" view is active
  const {
    reviewDocs,
    loading: reviewLoading,
    error:   reviewError,
    removeDoc,
  } = useDocsForReview(session, saveSession, view === "my-reviews");

  // Load projects once when session is available
  useEffect(() => {
    if (!session) return;
    let active = true;
    setLoadingProjects(true);

    listProjects(session, saveSession)
      .then((items) => {
        if (active) setProjects(Array.isArray(items) ? items : []);
      })
      .catch((err) => console.error("Could not load projects:", err))
      .finally(() => { if (active) setLoadingProjects(false); });

    return () => { active = false; };
  }, [session]);

  // Filter mock docs for Search view
  // Uses mockDocs (renamed import) so it doesn't collide with reviewDocs
  const filteredDocs = useMemo(
    () =>
      mockDocs.filter((doc) => {
        const tags = Array.isArray(doc.tags) ? doc.tags.join(" ") : "";
        const text = `${doc.title} ${doc.excerpt} ${tags}`.toLowerCase();
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

  const handleProject = (selectedProject) => {
    setProject(selectedProject);
    setView("search");
    setSidebar(false);
  };

  const handleProjectCreated = (createdProject) => {
    setProjects((current) => [...current, createdProject]);
    setToast(`Project "${createdProject.name}" created`);
  };

  const handleDocUploaded = (doc) => {
    addDoc(doc);
    setToast(`"${doc.title || doc.filename}" uploaded successfully`);
  };

  const handleView = (v) => {
    setView(v);
    setSidebar(false);
  };

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
        onCreateProject={() => setPanel("createProject")}
        onSignOut={signOut}
        onMenuToggle={() => setSidebar((s) => !s)}
      />

      <div className="workspace">
        <Sidebar
          open={sidebar}
          view={view}
          project={project}
          projects={projects}
          loadingProjects={loadingProjects}
          myDocs={myDocs}
          reviewDocs={reviewDocs}
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

          {view === "mydocs" && (
            <MyDocsView
              myDocs={myDocs}
              loading={myDocsLoading}
              error={myDocsError}
              session={session}
              onSession={saveSession}
              users={users}
            />
          )}

          {view === "my-reviews" && (
            <ReviewView
              reviewDocs={reviewDocs}
              loading={reviewLoading}
              error={reviewError}
              session={session}
              onSession={saveSession}
              onDocActioned={removeDoc}
            />
          )}

          {view === "sources" && <SourcesView />}
        </main>
      </div>

      {panel && (
        <Panel
          data={panel}
          projects={projects}
          onProjectCreated={handleProjectCreated}
          onDocUploaded={handleDocUploaded}
          session={session}
          onSession={saveSession}
          close={() => setPanel(null)}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />

      <div className="user-status">Signed in as {user.email}</div>
    </div>
  );
}

export default App;
