import { useState, useMemo } from "react";
import { DocumentCard } from "./DocumentCard";
import { DocTypeFilter, filterDocsByType, getDocCategory } from "./DocTypeFilter";

export function SearchView({
  query,
  onQuery,
  project,
  docs = [],
  loading,
  error,
  onDocClick,
  session,
  onSession,
}) {
  const [typeFilter, setTypeFilter] = useState("all");

  const safeDocs = Array.isArray(docs) ? docs : [];

  const typeCounts = useMemo(() => {
    return {
      all: safeDocs.length,
      pdf: safeDocs.filter((d) => getDocCategory(d) === "pdf").length,
      readme: safeDocs.filter((d) => getDocCategory(d) === "readme").length,
      txt: safeDocs.filter((d) => getDocCategory(d) === "txt").length,
    };
  }, [safeDocs]);

  const filteredDocs = useMemo(() => {
    return filterDocsByType(safeDocs, typeFilter);
  }, [safeDocs, typeFilter]);

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

      {/* File type filter bar */}
      <div className="flex items-center justify-between gap-3 px-1 mt-1 flex-wrap">
        <DocTypeFilter
          selectedFilter={typeFilter}
          onFilterChange={setTypeFilter}
          counts={typeCounts}
        />
      </div>

      <div className="flex justify-between px-1 text-[rgba(238,240,255,0.6)] text-sm mt-1">
        <span>
          {loading ? "Searching..." : `${filteredDocs.length} results in `}
          {!loading && <b className="text-[#eef0ff]">{project}</b>}
        </span>
        
        <span className="filter-note text-[rgba(238,240,255,0.45)] text-[11.5px] [font-family:'DM_Mono',monospace]">
          Current · Outdated · In review
        </span>
      </div>

      <div className="flex flex-col gap-[10px] max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
        {error ? (
          <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">{error}</div>
        ) : (
          filteredDocs.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onClick={() => onDocClick(doc)}
              session={session}
              onSession={onSession}
            />
          ))
        )}
        {!loading && !error && !filteredDocs.length && (
          <div className="py-12 px-6 text-center text-[rgba(238,240,255,0.5)]">
            No matching documents found.
          </div>
        )}
      </div>
    </>
  );
}