import { useState, useEffect } from "react";
import { listMyDocuments, listForReview } from "../api/documents";

// useMyDocs — fetches the current user's uploaded documents.
// Only calls the API when enabled is true (i.e. My Docs tab is open).
export function useMyDocs(session, saveSession, enabled) {
  const [myDocs,  setMyDocs]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!session || !enabled) return;

    let active = true;
    setLoading(true);
    setError("");

    listMyDocuments(session, saveSession)
      .then((docs) => { if (active) setMyDocs(Array.isArray(docs) ? docs : []); })
      .catch(() => { if (active) setError("Could not load your documents."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [session, enabled]);

  // Add a doc to the top of the list without re-fetching —
  // called after a successful upload so the list updates immediately.
  const addDoc = (doc) => setMyDocs((prev) => [doc, ...prev]);

  return { myDocs, loading, error, addDoc };
}

// useDocsForReview — fetches documents assigned to the current user for review.
// Only calls the API when enabled is true (i.e. My Reviews tab is open).
export function useDocsForReview(session, saveSession, enabled) {
  const [reviewDocs, setReviewDocs] = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  useEffect(() => {
    if (!session || !enabled) return;

    let active = true;
    setLoading(true);
    setError("");

    listForReview(session, saveSession)
      .then((docs) => { if (active) setReviewDocs(Array.isArray(docs) ? docs : []); })
      .catch(() => { if (active) setError("Could not load review queue."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [session, enabled]);

  // Remove a doc from the list after approve or reject —
  // avoids a full re-fetch just to remove one item.
  const removeDoc = (docId) => {
    setReviewDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  return { reviewDocs, loading, error, removeDoc };
}