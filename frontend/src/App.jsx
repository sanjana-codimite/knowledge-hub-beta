import { useEffect, useState } from "react";
import "./App.css";

import { useAuth }       from "./hooks/useAuth";
import { useUsers }      from "./hooks/useUsers";
import { useMyDocs, useDocsForReview } from "./hooks/useMyDocs";

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
import { useDocumentSearch } from "./hooks/useDocumentSearch";

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

  const {
    docs: searchDocs,
    loading: searchLoading,
    error: searchError,
  } = useDocumentSearch(session, saveSession, query, view === "search");

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
              docs={searchDocs}
              loading={searchLoading}
              error={searchError}
              onDocClick={setPanel}
              session={session}
              onSession={saveSession}
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
