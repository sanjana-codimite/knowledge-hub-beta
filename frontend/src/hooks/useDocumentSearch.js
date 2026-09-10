import { useEffect, useState } from "react";
import { listAllDocuments, searchDocuments } from "../api/documents";

const SEARCH_DEBOUNCE_MS = 350;

// Loads the browse list immediately and debounces requests made for a query.
export function useDocumentSearch(session, onSession, query, enabled) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session || !enabled) return;

    let active = true;
    const trimmedQuery = query.trim();
    setLoading(true);
    setError("");

    const timeoutId = setTimeout(() => {
      const request = trimmedQuery
        ? searchDocuments(trimmedQuery, session, onSession)
        : listAllDocuments(session, onSession);

      request
        .then((results) => {
          if (active) setDocs(Array.isArray(results) ? results : []);
        })
        .catch(() => {
          if (active) setError("Could not load documents.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, trimmedQuery ? SEARCH_DEBOUNCE_MS : 0);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [session, query, enabled]);

  return { docs, loading, error };
}
