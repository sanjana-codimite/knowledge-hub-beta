import { useState } from "react";
import { Status } from "./Status";

// Panel is the slide-over detail panel. It handles four content types:
//   - A document (has doc.type)
//   - A thread (has thread.title, no type)
//   - "ask"    — ask the team form
//   - "upload" — add a source form
export function Panel({ data, close }) {
  const isDoc    = Boolean(data.type);
  const isThread = data.title && !isDoc;

  return (
    <div className="panel-layer" onClick={close}>
      <section className="detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={close}>×</button>

        {isDoc && <DocPanel doc={data} />}
        {isThread && <ThreadPanel thread={data} />}
        {!isDoc && !isThread && <FormPanel type={data} close={close} />}
      </section>
    </div>
  );
}

function DocPanel({ doc }) {
  return (
    <>
      <Status label={doc.status} />
      <span className="panel-kicker">{doc.type} · {doc.project}</span>
      <h2>{doc.title}</h2>
      <p>{doc.excerpt}</p>
      <div className="panel-actions">
        <button>Mark as outdated</button>
        <button>Open source</button>
      </div>
      <h3>Version history</h3>
      <div className="history">
        <div>
          <b>v4.2</b>
          <span>
            Added the latest operational guidance
            <small>Nadia R. · 12 Aug 2026</small>
          </span>
        </div>
        <div>
          <b>v4.1</b>
          <span>
            Escalation ladder updated
            <small>Tom B. · 27 Jun 2026</small>
          </span>
        </div>
      </div>
    </>
  );
}

function ThreadPanel({ thread }) {
  return (
    <>
      <Status label={thread.status} />
      <span className="panel-kicker">Thread · {thread.project}</span>
      <h2>{thread.title}</h2>
      <span className="mono">{thread.meta}</span>
      <p>
        {thread.preview} The team is collecting the confirmed answer here so it
        can be found again later.
      </p>
      <div className="answer">
        <b>✓ Accepted answer</b>
        <p>
          Replay the pending work using the current runbook. Anything older than
          the supported window needs a manual review in the provider console.
        </p>
      </div>
      <div className="reply">
        <input placeholder="Write an answer..." />
        <button>Post</button>
      </div>
    </>
  );
}

function FormPanel({ type, close }) {
  const isAsk = type === "ask";

  if (!isAsk) return <UploadPanel close={close} />;

  return (
    <>
      <h2>{isAsk ? "Ask the team" : "Add to the hub"}</h2>
      <p>
        Share a question or source with the team and keep the knowledge
        searchable.
      </p>
      <input
        className="panel-input"
        placeholder={
          isAsk
            ? "Question — e.g. Why do payouts stall?"
            : "Paste a document URL..."
        }
      />
      <textarea placeholder="Add context..." rows="5" />
      <button className="primary-action" onClick={close}>
        Post question
      </button>
    </>
  );
}

function UploadPanel({ close }) {
  const [files, setFiles] = useState([]);
  const [link, setLink] = useState("");
  const [project, setProject] = useState("Platform");
  const [dragging, setDragging] = useState(false);

  const addFiles = (incoming) => {
    setFiles(Array.from(incoming));
  };

  return (
    <div className="upload-modal">
      <div className="upload-heading">
        <div>
          <h2>Add to the hub</h2>
          <p>Upload files or paste a link. We index the text and tag it to a project.</p>
        </div>
        <span className="upload-status" aria-label="Upload service ready" />
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

      <label className="upload-field-label" htmlFor="source-link">Or add a source link</label>
      <input
        id="source-link"
        className="panel-input"
        value={link}
        onChange={(event) => setLink(event.target.value)}
        placeholder="https://medium.com/@team/post..."
        type="url"
      />

      <div className="upload-field-label">Project</div>
      <div className="project-chips" role="group" aria-label="Choose a project">
        {["Platform", "Payments", "People", "Design"].map((name) => (
          <button
            className={`project-chip${project === name ? " active" : ""}`}
            key={name}
            type="button"
            onClick={() => setProject(name)}
          >
            <span className={`project-chip-dot project-chip-dot-${name.toLowerCase()}`} />
            {name}
          </button>
        ))}
      </div>

      <div className="upload-actions">
        <button className="secondary-action" onClick={close}>Cancel</button>
        <button className="primary-action" onClick={close} disabled={!files.length && !link.trim()}>
          Add to {project}
        </button>
      </div>
    </div>
  );
}
