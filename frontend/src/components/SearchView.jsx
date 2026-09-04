import { DocumentCard } from "./DocumentCard";

// SearchView renders the hero search panel and the filtered document list.
export function SearchView({ query, onQuery, project, docs, onDocClick }) {
  return (
    <>
      <section className="hero-panel">
        <span className="eyebrow">KNOWLEDGE HUB</span>
        <h1>{query ? `Results for "${query}"` : "What are you looking for?"}</h1>
        <p>Search across docs, READMEs, imported articles and accepted answers.</p>
        <div className="suggestions">
          {["payout retry window", "SSO onboarding", "parser plugin", "refund timeline EU"].map(
            (item) => (
              <button key={item} onClick={() => onQuery(item)}>
                {item}
              </button>
            )
          )}
        </div>
      </section>

      <div className="result-head">
        <span>
          {docs.length} results in <b>{project}</b>
        </span>
        <span className="filter-note">Current · Outdated · In review</span>
      </div>

      <div className="doc-list">
        {docs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} onClick={() => onDocClick(doc)} />
        ))}
      </div>
    </>
  );
}
