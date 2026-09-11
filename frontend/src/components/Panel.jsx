import { useEffect, useState } from "react";
import { Status } from "./Status";
import { uploadProjectDocument } from "../api/documents";
import { createProject as createProjectRequest, listProjects } from "../api/projects";
import { listTags, createTag } from "../api/tags";
import { TagPicker } from "./TagPicker";

// --- shared style tokens (kept as constants so every panel stays consistent) ---
const KICKER = "font-['DM_Mono',monospace] text-[11.5px] text-[rgba(238,240,255,0.5)]";
const SECTION_HEADING = "m-0 mt-[30px] text-[11px] font-normal tracking-[0.12em] uppercase text-[rgba(238,240,255,0.46)]";
const FIELD_LABEL = "block mt-[17px] mb-2 text-[11px] tracking-[0.12em] uppercase text-[rgba(238,240,255,0.48)]";
const PANEL_INPUT =
  "w-full h-11 px-4 rounded-xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.07)] outline-none text-[color:var(--ink)] text-[13.5px] placeholder:text-[rgba(238,240,255,0.42)] focus:border-[rgba(169,180,255,0.55)] focus:bg-[rgba(255,255,255,0.11)] transition-colors";
const TEXTAREA =
  "w-full mt-[10px] px-4 py-[14px] rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.07)] outline-none text-[13.5px] leading-[1.6] resize-y placeholder:text-[rgba(238,240,255,0.42)] focus:border-[rgba(169,180,255,0.55)] focus:bg-[rgba(255,255,255,0.11)] transition-colors";
const ERROR_MSG = "mt-3 p-[10px] rounded-[10px] border border-[rgba(255,176,88,0.3)] text-[#ffd19d] text-[12px]";
const PRIMARY_BTN =
  "h-[42px] px-[19px] rounded-[14px] border border-[rgba(255,255,255,0.2)] bg-[linear-gradient(145deg,#fff,#dfe2ef)] text-[#141629] text-[13px] font-semibold whitespace-nowrap hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed transition";
const SECONDARY_BTN =
  "h-[42px] px-[19px] rounded-[14px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.07)] text-[13.5px] font-semibold hover:bg-[rgba(255,255,255,0.12)] transition-colors";
const ACTIONS_ROW = "flex justify-end gap-[10px] mt-[22px]";

export function Panel({ data, projects, onProjectCreated, close, session, onSession, onDocUploaded }) {
  const isDoc = Boolean(data.type);
  const isThread = Boolean(data.title) && !isDoc;
  const isModal = !isDoc && !isThread;

  const layerClass = isModal
    ? "fixed inset-0 z-50 grid place-items-center p-5 overflow-y-auto bg-[rgba(4,5,12,0.6)] backdrop-blur-[8px]"
    : "fixed inset-0 z-50 bg-[rgba(4,5,12,0.58)] backdrop-blur-[6px]";

  const panelClass = isModal
    ? "relative overflow-y-auto w-[min(520px,100%)] max-h-[calc(100vh-40px)] p-[clamp(20px,3vw,30px)] border border-[rgba(255,255,255,0.17)] rounded-[28px] bg-[linear-gradient(160deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_34px_80px_rgba(0,0,0,0.6)] backdrop-blur-[34px] backdrop-saturate-[180%]"
    : "absolute top-0 right-0 bottom-0 overflow-y-auto w-[min(560px,100%)] p-[clamp(18px,3vw,30px)] border-l border-[color:var(--line)] bg-[linear-gradient(180deg,rgba(22,24,44,0.92),rgba(12,13,26,0.96))] shadow-[-30px_0_80px_rgba(0,0,0,0.55)] backdrop-blur-[34px] backdrop-saturate-[180%]";

  const closeButtonClass = isModal
    ? "hidden"
    : "float-right w-[34px] h-[34px] border border-[color:var(--line)] rounded-[11px] bg-[rgba(255,255,255,0.08)] text-lg leading-none transition-all duration-[180ms] hover:bg-[rgba(255,255,255,0.16)] hover:rotate-[4deg]";

  return (
    <div className={layerClass} onClick={close}>
      <section className={panelClass} onClick={(e) => e.stopPropagation()}>
        <button className={closeButtonClass} onClick={close} aria-label="Close panel">×</button>

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
      <div className="flex items-center gap-[10px] min-h-[34px]">
        <Status label={doc.status} />
        <span className={KICKER}>{doc.type} · {doc.project}</span>
      </div>
      <h2 className="m-0 mt-4 text-[clamp(20px,3vw,26px)] font-bold tracking-[-0.025em] leading-[1.25] text-pretty">{doc.title}</h2>
      <p className="m-0 mt-[10px] text-[13.5px] leading-[1.65] text-[rgba(238,240,255,0.66)] text-pretty">{doc.excerpt}</p>

      <div className="flex flex-wrap gap-2 mt-[18px]">
        <button className="h-[38px] px-[15px] rounded-xl border border-[rgba(255,176,88,0.4)] bg-[rgba(255,176,88,0.16)] text-[#ffcf94] text-[13px] font-semibold hover:brightness-110 transition">
          Mark as outdated
        </button>
        <button className="h-[38px] px-[15px] rounded-xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.08)] text-[13px] font-semibold hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.28)] hover:-translate-y-px transition-all duration-[180ms]">
          Open source
        </button>
        <button className="h-[38px] px-[15px] rounded-xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.08)] text-[13px] font-semibold hover:bg-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.28)] hover:-translate-y-px transition-all duration-[180ms]">
          Ask about this
        </button>
      </div>

      <h3 className={SECTION_HEADING}>Version history</h3>
      <div className="mt-3 flex flex-col gap-2">
        {versions.map((version) => (
          <div
            key={`${version.version}-${version.date}`}
            className="flex gap-3 px-[15px] py-[13px] rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.11)]"
          >
            <b className="shrink-0 font-normal font-['DM_Mono',monospace] text-[12.5px] text-[color:var(--violet)]">{version.version}</b>
            <span className="flex-1 min-w-0 text-[13.5px] leading-[1.5]">
              {version.note}
              <small className="block mt-1 font-['DM_Mono',monospace] text-[11.5px] text-[rgba(238,240,255,0.45)]">{version.author} · {version.date}</small>
            </span>
            {version.tag && <em className="self-center not-italic text-[11.5px] text-[rgba(238,240,255,0.5)]">{version.tag}</em>}
          </div>
        ))}
      </div>

      <h3 className={SECTION_HEADING}>Linked threads</h3>
      <div className="mt-3 flex flex-col gap-2">
        <div className="px-[15px] py-[13px] rounded-2xl bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.11)] text-[13.5px] leading-[1.5]">
          Why do payouts stall at &apos;pending_capture&apos;?
          <small className="block mt-1 font-['DM_Mono',monospace] text-[11.5px] text-[rgba(238,240,255,0.45)]">answered · 6 replies</small>
        </div>
      </div>
    </>
  );
}

function ThreadPanel({ thread }) {
  const answer = thread.answer || "Replay the pending work using the current runbook. Anything older than the supported window needs a manual review in the provider console.";

  return (
    <>
      <div className="flex items-center gap-[10px] min-h-[34px]">
        <Status label={thread.status} />
        <span className={KICKER}>Thread · {thread.project}</span>
      </div>
      <h2 className="m-0 mt-4 text-[clamp(19px,3vw,25px)] font-bold tracking-[-0.025em] leading-[1.3] text-pretty">{thread.title}</h2>
      <span className={`block mt-2 ${KICKER}`}>{thread.meta}</span>
      <p className="m-0 mt-[14px] text-[13.5px] leading-[1.65] text-[rgba(238,240,255,0.66)] text-pretty">
        {thread.preview} The team is collecting the confirmed answer here so it can be found again later.
      </p>

      <div className="mt-[22px] p-[18px] rounded-[20px] bg-[linear-gradient(160deg,rgba(95,227,161,0.16),rgba(255,255,255,0.04))] border border-[rgba(95,227,161,0.32)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24)]">
        <b className="flex items-center gap-2 text-[12px] font-semibold text-[#8ff0c0]">✓ Accepted answer</b>
        <p className="m-0 mt-[10px] text-[14px] leading-[1.65]">{answer}</p>
        <small className="block mt-3 font-['DM_Mono',monospace] text-[11.5px] text-[rgba(238,240,255,0.5)]">Nadia R. · accepted by Tom B. · 12 upvotes</small>
      </div>

      <h3 className={SECTION_HEADING}>Replies</h3>
      <div className="flex gap-2 mt-[18px] items-center">
        <input
          placeholder="Write an answer..."
          className="flex-1 h-[44px] px-4 rounded-2xl border border-[color:var(--line)] bg-[rgba(255,255,255,0.07)] outline-none text-[13.5px] placeholder:text-[rgba(238,240,255,0.42)] focus:border-[rgba(169,180,255,0.55)] transition-colors"
        />
        <button className="h-[44px] px-[18px] rounded-2xl border border-[rgba(255,255,255,0.22)] bg-[linear-gradient(160deg,rgba(255,255,255,0.9),rgba(255,255,255,0.7))] text-[#12142a] font-semibold text-[13.5px] hover:brightness-105 transition">
          Post
        </button>
      </div>
    </>
  );
}

function FormPanel({ type, projects, onProjectCreated, close, session, onSession, onDocUploaded }) {
  // Ask the team panel
  if (type === "ask") {
    return (
      <div className="pt-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="m-0 text-[20px] font-bold tracking-[-0.02em]">Ask the team</h2>
          <span
            className="flex-shrink-0 w-[9px] h-[9px] mt-[10px] rounded-full bg-[color:var(--green)] shadow-[0_0_10px_var(--green)]"
            aria-label="Ask service ready"
          />
        </div>

        <p className="m-0 mt-[6px] text-[13.5px] leading-[1.55] text-[rgba(238,240,255,0.62)]">
          Once an answer is accepted, the thread becomes searchable
          alongside the docs.
        </p>

        <input
          className={`mt-[18px] ${PANEL_INPUT}`}
          placeholder="Question - e.g. Why do payouts stall at 'pending_capture'?"
        />

        <textarea
          className={TEXTAREA}
          placeholder="Add context: what you tried, error messages, which environment..."
          rows="5"
        />

        <div className="mt-4 text-[11px] tracking-[0.12em] uppercase text-[rgba(238,240,255,0.42)]">
          Project
        </div>

        <div className="mt-2 flex gap-2 flex-wrap">
          {["Platform", "Payments", "People", "Design"].map((name) => (
            <button
              className="h-[32px] px-3 rounded-[11px] border border-[color:var(--line)] bg-[rgba(255,255,255,0.06)] text-[rgba(238,240,255,0.72)] text-[12.5px] hover:bg-[rgba(255,255,255,0.12)] transition-colors"
              key={name}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-[9px] mt-[14px] text-[rgba(238,240,255,0.6)] text-xs">
          <span className="w-2 h-2 rounded-full bg-[color:var(--green)] shadow-[0_0_8px_var(--green)]" />
          3 docs look related - they'll be suggested to responders.
        </div>

        <button
          className={`w-full mt-4 ${PRIMARY_BTN}`}
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
        onDocUploaded={onDocUploaded}
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

function UploadPanel({ close, session, onSession, projects, onProjectCreated, onDocUploaded }) {
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
  const [selectedTags, setSelectedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [tagsLoading, setTagsLoading] = useState(true);

  useEffect(() => {
    if (!projectId && projects.length > 0) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Fetch available tags
  useEffect(() => {
    let active = true;
    setTagsLoading(true);
    listTags(session, onSession)
      .then((items) => {
        if (active) setAllTags(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setTagsLoading(false);
      });
    return () => { active = false; };
  }, [session]);

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
          {
            project_id: projectId,
            tags: selectedTags.length > 0 ? selectedTags.join(",") : undefined,
          },
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
    <div className="pt-2">
      <div className="flex items-start gap-4 justify-between">
        <div>
          <h2 className="m-0 text-[20px] font-bold tracking-[-0.02em]">Add to the hub</h2>
          <p className="m-0 mt-[6px] text-[13.5px] leading-[1.55] text-[rgba(238,240,255,0.62)]">
            Upload files and tag them to a project. Files are saved to the knowledge hub for review.
          </p>
        </div>
      </div>

      <label
        className={`flex flex-col items-center gap-[7px] min-h-[145px] mt-[18px] px-5 py-[28px] border border-dashed rounded-[20px] text-center cursor-pointer transition-all duration-[180ms] ${
          dragging
            ? "border-[rgba(169,180,255,0.7)] bg-[rgba(169,180,255,0.1)] -translate-y-px"
            : "border-[rgba(255,255,255,0.26)] bg-[rgba(255,255,255,0.05)] hover:border-[rgba(169,180,255,0.7)] hover:bg-[rgba(169,180,255,0.1)] hover:-translate-y-px"
        }`}
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
          className="absolute w-px h-px opacity-0 pointer-events-none"
          type="file"
          multiple
          accept=".pdf,.md,.markdown,.txt"
          onChange={(event) => addFiles(event.target.files)}
        />
        <span className="text-[color:var(--violet)] text-[27px] leading-none" aria-hidden="true">⤒</span>
        <strong className="text-[14px]">{files.length ? `${files.length} file${files.length === 1 ? "" : "s"} selected` : "Drop PDFs, .md or README files"}</strong>
        <span className="max-w-[34ch] text-[color:var(--muted)] text-[12px] leading-[1.5]">{files.length ? files.map((file) => file.name).join(", ") : "or click to browse - up to 50 MB each"}</span>
      </label>

      {/* Tag Picker */}
      <div className="mt-4 flex items-center justify-between text-[11px] tracking-[0.12em] uppercase text-[rgba(238,240,255,0.42)]">
        <span>Tags</span>
        <span className="normal-case tracking-normal text-[rgba(238,240,255,0.35)]">optional</span>
      </div>
      <TagPicker
        allTags={allTags}
        selectedNames={selectedTags}
        onChange={setSelectedTags}
        onCreateTag={async (name) => {
          const tag = await createTag(name, session, onSession);
          setAllTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
          return tag;
        }}
        loading={tagsLoading}
      />


      <div className="flex items-center justify-between gap-3 mt-4 text-[rgba(238,240,255,0.48)] text-[11px] tracking-[0.12em] uppercase">
        <span>Project</span>
        <button
          className="h-[30px] px-[10px] rounded-[10px] border border-[rgba(169,180,255,0.28)] bg-[rgba(169,180,255,0.1)] text-[#dfe3ff] text-[11.5px] normal-case tracking-normal hover:bg-[rgba(169,180,255,0.2)] transition-colors"
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
        <form className="grid gap-2 mt-[10px] p-3 border border-[rgba(255,255,255,0.12)] rounded-2xl bg-[rgba(255,255,255,0.05)]" onSubmit={createProject}>
          <input
            className="tag-picker-input"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="Project name"
            maxLength={30}
            autoFocus
          />
          <input
            className="tag-picker-input"
            value={projectDescription}
            onChange={(event) => setProjectDescription(event.target.value)}
            placeholder="Description (optional)"
            maxLength={240}
          />
          <button className={`w-full h-9 mt-0.5 ${SECONDARY_BTN}`} type="submit" disabled={!projectName.trim() || creatingProject}>
            {creatingProject ? "Creating..." : "Create project"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Choose a project">
        {projects.map((project) => (
          <button
            className={`h-[34px] px-[14px] rounded-[11px] text-[12.5px] border transition-colors ${
              project.id === projectId
                ? "border-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.2)] text-[color:var(--ink)]"
                : "border-[color:var(--line)] bg-[rgba(255,255,255,0.06)] text-[rgba(238,240,255,0.72)] hover:bg-[rgba(255,255,255,0.12)]"
            }`}
            key={project.id}
            type="button"
            onClick={() => setProjectId(project.id)}
          >
            {project.name}
          </button>
        ))}
      </div>

      <div className={ACTIONS_ROW}>
        <button className={SECONDARY_BTN} onClick={close}>Cancel</button>
        <button className={PRIMARY_BTN} onClick={submitUpload} disabled={!files.length || !projectId || uploading}>
          {uploading ? "Uploading..." : `Add to ${projects.find((project) => project.id === projectId)?.name || "project"}`}
        </button>
      </div>
      {error && <div className={ERROR_MSG}>{error}</div>}
    </div>
  );
}

function CreateProjectPanel({ close, session, onSession, onProjectCreated }) {
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
    <div className="pt-2">
      <div className="flex items-start justify-between gap-4">
        <h2 className="m-0 text-[20px] font-bold tracking-[-0.02em]">Create project</h2>
      </div>

      <p className="m-0 mt-[6px] text-[13.5px] leading-[1.55] text-[rgba(238,240,255,0.62)]">
        Create a project to organize documents and knowledge
        in the hub.
      </p>

      <form onSubmit={createProject}>
        <div className={FIELD_LABEL}>
          Project name
        </div>

        <input
          className={PANEL_INPUT}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Payments"
          maxLength={30}
          autoFocus
        />

        <div className={FIELD_LABEL}>
          Description
        </div>

        <textarea
          className={TEXTAREA}
          value={description}
          onChange={(event) =>
            setDescription(event.target.value)
          }
          placeholder="Describe this project..."
          rows="5"
          maxLength={500}
        />

        {error && (
          <div className={ERROR_MSG}>
            {error}
          </div>
        )}

        <div className={ACTIONS_ROW}>
          <button
            type="button"
            className={SECONDARY_BTN}
            onClick={close}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="primary-action tag-manager-create-btn"
            disabled={!name.trim() || creating}
          >
            {creating ? "Creating..." : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}