import { PageTitle } from "./PageTitle";
import { sources } from "../data/mockData";

// SourcesView renders the connected data sources grid.
export function SourcesView() {
  return (
    <>
      <PageTitle
        title="Sources"
        subtitle="Manage the places Atlas keeps in sync."
      />
      <div className="source-grid">
        {sources.map((source) => (
          <div className="source-card" key={source.name}>
            <span className="source-icon">{source.icon}</span>
            <div>
              <b>{source.name}</b>
              <p>{source.meta}</p>
            </div>
            <span className="online" />
          </div>
        ))}
      </div>
    </>
  );
}