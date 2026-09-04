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
        {isAsk ? "Post question" : "Add to hub"}
      </button>
    </>
  );
}
