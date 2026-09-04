import { Status } from "./Status";

// ThreadCard renders a single thread in the threads grid.
export function ThreadCard({ thread, onClick }) {
  return (
    <button className="thread-card" onClick={onClick}>
      <span className="thread-meta">
        <Status label={thread.status} />
        <small>{thread.project}</small>
      </span>
      <b>{thread.title}</b>
      <p>{thread.preview}</p>
      <small className="mono">{thread.meta}</small>
    </button>
  );
}
