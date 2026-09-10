import { DocumentCard } from "./DocumentCard";

// SearchView renders the hero search panel and the filtered document list.
export function SearchView({
  query,
  onQuery,
  project,
  docs,
  loading,
  error,
  onDocClick,
  session,
  onSession,
}) {
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
          {loading ? "Searching..." : `${docs.length} results in `}
          {!loading && <b>{project}</b>}
        </span>
        <span className="filter-note">Current · Outdated · In review</span>
      </div>

      <div className="doc-list">
        {error ? (
          <div className="my-docs-empty">{error}</div>
        ) : (
          docs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => onDocClick(doc)}
              session={session}
              onSession={onSession}
            />
          ))
        )}
        {!loading && !error && !docs.length && (
          <div className="my-docs-empty">No matching documents found.</div>
        )}
      </div>
    </>
  );
}
