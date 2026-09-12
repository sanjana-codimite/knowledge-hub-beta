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
import { useToast }      from "./components/Toast";
import { MyDocsView }    from "./components/MyDocsView";
import { ReviewView }    from "./components/MyDocsReview";
import { TagManagerModal } from "./components/TagManagerModal";

import { listProjects }  from "./api/projects";
import { useDocumentSearch, useDocumentCounts, useMyDocCounts } from "./hooks/useDocumentSearch";

function App() {
  const { showToast } = useToast();
  const { user, session, saveSession, busy, error, signIn, signOut } = useAuth();
  const { users } = useUsers(session, saveSession);

  const [view,            setView]           = useState("search");
  const [query,           setQuery]          = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projects,        setProjects]       = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [sidebar,         setSidebar]        = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth > 850;
    }
    return true;
  });
  const [panel,           setPanel]          = useState(null);
  const [showTagManager,  setShowTagManager] = useState(false);
  const { counts, total } = useDocumentCounts(session, saveSession);
  const {
    myDocsCount,
    myReviewsCount,
    refresh: refreshMyDocCounts,
  } = useMyDocCounts(session, saveSession);
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
  } = useDocumentSearch(session, saveSession, query, selectedProject?.id || "", view === "search");

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

  const handleProject = (projectItem) => {
    setSelectedProject(projectItem);
    setView("search");
    if (typeof window !== "undefined" && window.innerWidth <= 850) {
      setSidebar(false);
    }
  }; 

  const handleProjectCreated = (createdProject) => {
    setProjects((current) => [...current, createdProject]);
  };

  const handleDocUploaded = (doc) => {
    addDoc(doc);
    refreshMyDocCounts();
  };

  const handleView = (v) => {
    setView(v);
    if (typeof window !== "undefined" && window.innerWidth <= 850) {
      setSidebar(false);
    }
  };

  if (!session || !user) {
    return <LoginScreen busy={busy} error={error} onSignIn={signIn} />;
  }

  return (
    <div className="app-shell relative min-h-screen overflow-hidden bg-[#070812] text-[#eef0ff]">
      <Topbar
        user={user}
        query={query}
        onQuery={handleQuery}
        onUpload={() => setPanel("upload")}
        onCreateProject={() => setPanel("createProject")}
        onManageTags={() => setShowTagManager(true)}
        onSignOut={signOut}
        onMenuToggle={() => setSidebar((s) => !s)}
      />

      <div className="relative z-[1] flex gap-[clamp(12px,2vw,22px)] max-w-[1560px] mx-auto px-[clamp(14px,2.4vw,28px)] py-[22px] max-[850px]:pt-[14px]">
        <Sidebar
          counts={counts}
          totalCount={total}
          myDocsCount={myDocsCount}
          myReviewsCount={myReviewsCount}
          open={sidebar}
          view={view}
          selectedProject={selectedProject}
          projects={projects}
          loadingProjects={loadingProjects}
          myDocs={myDocs}
          reviewDocs={reviewDocs}
          publishedDocs={searchDocs}
          onView={handleView}
          onProject={handleProject}
        />

        <main className="flex-1 min-w-0 flex flex-col gap-4">
          {view === "search" && (
            <SearchView
              query={query}
              onQuery={handleQuery}
              project={selectedProject?.name || "All projects"} 
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

      {showTagManager && (
        <TagManagerModal
          session={session}
          onSession={saveSession}
          onClose={() => setShowTagManager(false)}
        />
      )}

     
    </div>
  );
}

export default App;