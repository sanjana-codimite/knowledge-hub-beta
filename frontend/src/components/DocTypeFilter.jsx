export function getDocCategory(doc) {
  if (!doc) return "other";
  const mime = (doc.mime_type || "").toLowerCase();
  const fn = (doc.filename || doc.title || "").toLowerCase();

  if (mime === "application/pdf" || fn.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    mime === "text/markdown" ||
    mime === "text/x-markdown" ||
    fn.endsWith(".md") ||
    fn.endsWith(".markdown") ||
    fn.includes("readme")
  ) {
    return "readme";
  }
  if (
    mime === "text/plain" ||
    fn.endsWith(".txt")
  ) {
    return "txt";
  }
  return "other";
}

export function filterDocsByType(docs, filter) {
  if (!Array.isArray(docs)) return [];
  if (!filter || filter === "all") return docs;
  return docs.filter((doc) => getDocCategory(doc) === filter);
}

export function DocTypeFilter({ selectedFilter = "all", onFilterChange }) {
  const filterOptions = [
    { id: "all", label: "All" },
    { id: "pdf", label: "PDF" },
    { id: "readme", label: "README" },
    { id: "txt", label: "TXT" },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filter by document type">
      {filterOptions.map((item) => {
        const isActive = selectedFilter === item.id;

        return (
          <button
            key={item.id}
            type="button"
            className={`h-[34px] px-[18px] rounded-[11px] text-[12px] font-bold tracking-[0.02em] border cursor-pointer transition-all duration-150 select-none ${
              isActive
                ? "bg-[rgba(255,255,255,0.2)] border-[rgba(255,255,255,0.4)] text-[#ffffff] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
                : "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.13)] text-[rgba(238,240,255,0.72)] hover:bg-[rgba(255,255,255,0.12)] hover:border-[rgba(255,255,255,0.25)] hover:text-[#ffffff]"
            }`}
            onClick={() => onFilterChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}