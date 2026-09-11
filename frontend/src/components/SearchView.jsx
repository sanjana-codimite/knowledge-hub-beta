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
      {/* hero-panel kept in CSS — glassmorphism + sheen animation.
          eyebrow kept in CSS — used here, so it's not dead code (it only looked
          unused in LoginScreen, where it was commented out). */}
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

      <div className="flex justify-between px-1 text-[rgba(238,240,255,0.6)] text-sm">
        <span>
          {loading ? "Searching..." : `${docs.length} results in `}
          {!loading && <b className="text-[#eef0ff]">{project}</b>}
        </span>
        {/* filter-note: hidden below 520px via the existing App.css media query;
            base typography added here since it previously had none */}
        <span className="filter-note text-[rgba(238,240,255,0.45)] text-[11.5px] [font-family:'DM_Mono',monospace]">
          Current · Outdated · In review
        </span>
      </div>

      <div className="flex flex-col gap-[10px]">
        {error ? (
          <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">{error}</div>
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
          <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
            No matching documents found.
          </div>
        )}
      </div>
    </>
  );
}