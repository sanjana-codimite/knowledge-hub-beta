import { useState } from "react";
import { Status } from "./Status";

// Panel is the slide-over detail panel. It handles four content types:
//   - A document (has doc.type)
//   - A thread (has thread.title, no type)
//   - "ask"    — ask the team form
//   - "upload" — add a source form
export function Panel({ data, close }) {
  const isDoc = Boolean(data.type);
  const isThread = Boolean(data.title) && !isDoc;
  const isModal = !isDoc && !isThread;

  return (
    <div className={`panel-layer${isModal ? " modal-layer" : ""}`} onClick={close}>
      <section className={`detail-panel${isModal ? " modal-panel" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={close} aria-label="Close panel">×</button>

        {isDoc && <DocPanel doc={data} />}
        {isThread && <ThreadPanel thread={data} />}
        {!isDoc && !isThread && <FormPanel type={data} close={close} />}
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

function FormPanel({ type, close }) {
  const isAsk = type === "ask";

  if (!isAsk) return <UploadPanel close={close} />;

  return (
    <div className="form-panel">
      <div className="form-heading">
        <h2>Ask the team</h2>
        <span className="upload-status" aria-label="Ask service ready" />
      </div>
      <p>
        Once an answer is accepted, the thread becomes searchable alongside the docs.
      </p>
      <input
        className="panel-input"
        placeholder="Question - e.g. Why do payouts stall at 'pending_capture'?"
      />
      <textarea placeholder="Add context: what you tried, error messages, which environment..." rows="5" />
      <div className="upload-field-label">Project</div>
      <div className="project-chips">
        {['Platform', 'Payments', 'People', 'Design'].map((name) => (
          <button className="project-chip" key={name} type="button">{name}</button>
        ))}
      </div>
      <div className="form-note"><span className="online" /> 3 docs look related - they&apos;ll be suggested to responders.</div>
      <button className="primary-action" onClick={close}>Post to Platform</button>
    </div>
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
          <p>Upload files or paste a link - Medium, dev.to and Drive URLs are indexed automatically.</p>
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
        placeholder="https://medium.com/@team/post..."
        type="url"
      />

      <div className="project-chips" role="group" aria-label="Choose a project">
        {["Platform", "Payments", "People", "Design"].map((name) => (
          <button
            className={`project-chip${project === name ? " active" : ""}`}
            key={name}
            type="button"
            onClick={() => setProject(name)}
          >
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
