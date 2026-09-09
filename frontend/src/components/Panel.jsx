import { useEffect, useState } from "react";
import { Status } from "./Status";
import { uploadProjectDocument } from "../api/documents";
import { createProject as createProjectRequest, listProjects } from "../api/projects";

// Panel is the slide-over detail panel. It handles four content types:
//   - A document (has doc.type)
//   - A thread (has thread.title, no type)
//   - "ask"    — ask the team form
//   - "upload" — add a source form
export function Panel({ data, projects, onProjectCreated, close, session, onSession,onDocUploaded }) {
  const isDoc = Boolean(data.type);
  const isThread = Boolean(data.title) && !isDoc;
  const isModal = !isDoc && !isThread;

  return (
    <div className={`panel-layer${isModal ? " modal-layer" : ""}`} onClick={close}>
      <section className={`detail-panel${isModal ? " modal-panel" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={close} aria-label="Close panel">×</button>

        {isDoc && <DocPanel doc={data} />}
        {isThread && <ThreadPanel thread={data} />}
        {!isDoc && !isThread && (
          <FormPanel type={data} projects={projects} onProjectCreated={onProjectCreated} close={close} session={session} onSession={onSession} onDocUploaded={onDocUploaded} />
        )}
      </section>
    </div>
  );
}

function DocPanel({ doc }) {
  const versions = doc.versions || [
    { version: "v4.2", note: "Added the latest operational guidance", author: "Nadia R.", date: "12 Aug 2026", tag: "current" },
    { version: "v4.1", note: "Escalation ladder updated", author: "Tom B.", date: "27 Jun 2026", tag: "" },
  ];

  return (
    <>
      <div className="panel-meta-row">
        <Status label={doc.status} />
        <span className="panel-kicker">{doc.type} · {doc.project}</span>
      </div>
      <h2>{doc.title}</h2>
      <p>{doc.excerpt}</p>
      <div className="panel-actions">
        <button className="warning-action">Mark as outdated</button>
        <button>Open source</button>
        <button>Ask about this</button>
      </div>
      <h3>Version history</h3>
      <div className="history">
        {versions.map((version) => (
          <div key={`${version.version}-${version.date}`}>
            <b>{version.version}</b>
            <span>
              {version.note}
              <small>{version.author} · {version.date}</small>
            </span>
            {version.tag && <em>{version.tag}</em>}
          </div>
        ))}
      </div>
      <h3>Linked threads</h3>
      <div className="linked-items">
        <div>
          Why do payouts stall at &apos;pending_capture&apos;?
          <small>answered · 6 replies</small>
        </div>
      </div>
    </>
  );
}

function ThreadPanel({ thread }) {
  const answer = thread.answer || "Replay the pending work using the current runbook. Anything older than the supported window needs a manual review in the provider console.";

  return (
    <>
      <div className="panel-meta-row">
        <Status label={thread.status} />
        <span className="panel-kicker">Thread · {thread.project}</span>
      </div>
      <h2>{thread.title}</h2>
      <span className="mono">{thread.meta}</span>
      <p>{thread.preview} The team is collecting the confirmed answer here so it can be found again later.</p>
      <div className="answer">
        <b>✓ Accepted answer</b>
        <p>{answer}</p>
        <small>Nadia R. · accepted by Tom B. · 12 upvotes</small>
      </div>
      <h3>Replies</h3>
      <div className="reply">
        <input placeholder="Write an answer..." />
        <button>Post</button>
      </div>
    </>
  );
}

function FormPanel({ type,projects, onProjectCreated, close, session, onSession,onDocUploaded }) {
  // Ask the team panel
  if (type === "ask") {
    return (
      <div className="form-panel">
        <div className="form-heading">
          <h2>Ask the team</h2>
          <span
            className="upload-status"
            aria-label="Ask service ready"
          />
        </div>

        <p>
          Once an answer is accepted, the thread becomes searchable
          alongside the docs.
        </p>

        <input
          className="panel-input"
          placeholder="Question - e.g. Why do payouts stall at 'pending_capture'?"
        />

        <textarea
          placeholder="Add context: what you tried, error messages, which environment..."
          rows="5"
        />

        <div className="upload-field-label">
          Project
        </div>

        <div className="project-chips">
          {["Platform", "Payments", "People", "Design"].map((name) => (
            <button
              className="project-chip"
              key={name}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="form-note">
          <span className="online" />
          3 docs look related - they'll be suggested to responders.
        </div>

        <button
          className="primary-action"
          onClick={close}
        >
          Post to Platform
        </button>
      </div>
    );
  }

  // Upload panel
  if (type === "upload") {
    return (
      <UploadPanel
        projects={projects}
        onProjectCreated={onProjectCreated}
        close={close}
        session={session}
        onSession={onSession}
      />
    );
  }

  // Create project panel
  if (type === "createProject") {
    return (
      <CreateProjectPanel
        close={close}
        onProjectCreated={onProjectCreated}
        session={session}
        onSession={onSession}
      />
    );
  }

  // Unknown panel type
  return null;
}
function UploadPanel({ close, session, onSession,projects, onProjectCreated ,onDocUploaded}) {
  const [files, setFiles] = useState([]);
  const [link, setLink] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  useEffect(() => {
  if (!projectId && projects.length > 0) {
    setProjectId(projects[0].id);
  }
}, [projects, projectId]);


  const addFiles = (incoming) => {
    setError("");
    setFiles(Array.from(incoming));
  };

  const submitUpload = async () => {
    if (!files.length || !projectId || uploading) return;
    setUploading(true);
    setError("");

    try {
      for (const file of files) {
        const uploaded = await uploadProjectDocument(
        file,
        { project_id: projectId },
        session,
        onSession
      );
      if (onDocUploaded) onDocUploaded(uploaded); 
      }
      close();
    } catch (reason) {
      setError(reason.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const createProject = async (event) => {
    event.preventDefault();
    const name = projectName.trim();
    if (!name || creatingProject) return;

    setCreatingProject(true);
    setError("");
    try {
      const created = await createProjectRequest(
        {
          name,
          description: projectDescription.trim(),
        },
        session,
        onSession
      );

      if (!created?.id) throw new Error("Project was created without an id.");
      onProjectCreated(created);
      setProjectId(created.id);
      setProjectName("");
      setProjectDescription("");
      setShowCreateProject(false);
    } catch (reason) {
      setError(reason.message || "Could not create project.");
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="upload-modal">
      <div className="upload-heading">
        <div>
          <h2>Add to the hub</h2>
          <p>Upload files and tag them to a project. Files are saved to the knowledge hub for review.</p>
        </div>
      </div>

      <label
        className={`upload-dropzone${dragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
      >
        <input
          className="upload-file-input"
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt"
          onChange={(event) => addFiles(event.target.files)}
        />
        <span className="upload-icon" aria-hidden="true">⤒</span>
        <strong>{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Drop PDFs, .md or README files"}</strong>
        <span>{files.length ? files.map((file) => file.name).join(", ") : "or click to browse - up to 50 MB each"}</span>
      </label>

      <input
        id="source-link"
        className="panel-input"
        value={link}
        onChange={(event) => setLink(event.target.value)}
          placeholder="Source link (not supported for file upload yet)"
        type="url"
      />

      <div className="project-picker-heading">
        <span>Project</span>
        <button
          className="create-project-button"
          type="button"
          onClick={() => {
            setError("");
            setShowCreateProject((visible) => !visible);
          }}
        >
          {showCreateProject ? "Cancel" : "+ New project"}
        </button>
      </div>

      {showCreateProject && (
        <form className="create-project-form" onSubmit={createProject}>
          <input
            className="panel-input"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            maxLength={30}
            autoFocus
          />
          <input
            className="panel-input"
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Description (optional)"
            maxLength={240}
          />
          <button className="secondary-action create-project-submit" type="submit" disabled={!projectName.trim() || creatingProject}>
            {creatingProject ? "Creating..." : "Create project"}
          </button>
        </form>
      )}

      <div className="project-chips" role="group" aria-label="Choose a project">
        {projects.map((project) => (
          <button
            className={`project-chip${project.id === projectId ? " active" : ""}`}
            key={project.id}
            type="button"
            onClick={() => setProjectId(project.id)}
          >
            {project.name}
          </button>
        ))}
      </div>

      <div className="upload-actions">
        <button className="secondary-action" onClick={close}>Cancel</button>
        <button className="primary-action" onClick={submitUpload} disabled={!files.length || !projectId || uploading}>
          {uploading ? "Uploading..." : `Add to ${projects.find((project) => project.id === projectId)?.name || "project"}`}
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

function CreateProjectPanel({ close, session, onSession ,onProjectCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const createProject = async (event) => {
    event.preventDefault();

    const projectName = name.trim();

    if (!projectName || creating) {
      return;
    }

    setCreating(true);
    setError("");

    try {
     const created = await createProjectRequest(
        {
          name: projectName,
          description: description.trim(),
        },
        session,
        onSession
      );
      onProjectCreated(created);
      close();
    } catch (reason) {
      setError(
        reason.message || "Could not create project."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="form-panel">
      <div className="form-heading">
        <h2>Create project</h2>
      </div>

      <p>
        Create a project to organize documents and knowledge
        in the hub.
      </p>

      <form onSubmit={createProject}>
        <div className="upload-field-label">
          Project name
        </div>

        <input
          className="panel-input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Payments"
          maxLength={30}
          autoFocus
        />

        <div className="upload-field-label">
          Description
        </div>

        <textarea
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Describe this project..."
          rows="5"
          maxLength={500}
        />

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="upload-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={close}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-action"
            disabled={!name.trim() || creating}
          >
            {creating ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}