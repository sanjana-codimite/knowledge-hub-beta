// useDocumentSearch.js
import { useCallback, useEffect, useState } from "react";
import { listPublishedDocuments, searchDocuments, getDocumentCounts, getMyDocCounts } from "../api/documents";

const SEARCH_DEBOUNCE_MS = 350;

export function useDocumentSearch(session, onSession, query, projectID, enabled) {
  const [docs, setDocs]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!session || !enabled) return;

    let active = true;
    const trimmedQuery = query.trim();
    setLoading(true);
    setError("");

    const timeoutId = setTimeout(() => {
      let apiCall;

      if (trimmedQuery) {
        // Vector search — pass project_id as query param
        const params = new URLSearchParams({ q: trimmedQuery });
        if (projectID) params.set("project_id", projectID);
        apiCall = searchDocuments(trimmedQuery, projectID, session, onSession);
      } else {
        // Browse published docs — pass project_id as query param
        apiCall = listPublishedDocuments(projectID, session, onSession);
      }

      apiCall
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

  }, [session, query, projectID, enabled]); // ← projectID in deps

  return { docs, loading, error };
}

export function useDocumentCounts(session, saveSession) {
  const [counts, setCounts] = useState({});
  const [total, setTotal]   = useState(0);

  useEffect(() => {
    if (!session) return;
    getDocumentCounts(session, saveSession)
      .then((data) => {
        setCounts(data || {});
        setTotal(Object.values(data || {}).reduce((a, b) => a + b, 0));
      })
      .catch(console.error);
  }, [session]);

  return { counts, total };
}

export function useMyDocCounts(session, saveSession) {
  const [myDocsCount,    setMyDocsCount]    = useState(0);
  const [myReviewsCount, setMyReviewsCount] = useState(0);

  const refresh = useCallback(() => {
    if (!session) return;
    getMyDocCounts(session, saveSession)
      .then((data) => {
        setMyDocsCount(data?.my_docs ?? 0);
        setMyReviewsCount(data?.my_reviews ?? 0);
      })
      .catch(console.error);
  }, [session, saveSession]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { myDocsCount, myReviewsCount, refresh };
}