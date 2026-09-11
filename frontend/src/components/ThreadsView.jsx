import { PageTitle } from "./PageTitle";
import { ThreadCard } from "./ThreadCard";
import { threads } from "../data/mockData";

// ThreadsView renders the threads grid with a page title and ask button.
export function ThreadsView({ onAsk, onThreadClick }) {
  return (
    <>
      <PageTitle
        title="Threads"
        subtitle="Ask the team. Accepted answers become searchable docs."
        action="＋ Ask a question"
        onAction={onAsk}
      />
      <div className="thread-grid">
        {threads.map((thread) => (
          <ThreadCard
            key={thread.id}
            thread={thread}
            onClick={() => onThreadClick(thread)}
          />
        ))}
      </div>
    </>
  );
}