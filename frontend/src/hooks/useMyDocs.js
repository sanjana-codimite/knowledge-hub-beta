import { useState, useEffect } from "react";
import { listMyDocuments, listForReview } from "../api/documents";


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


  const addDoc = (doc) => setMyDocs((prev) => [doc, ...prev]);

  return { myDocs, loading, error, addDoc };
}


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


  const removeDoc = (docId) => {
    setReviewDocs((prev) => prev.filter((d) => d.id !== docId));
  };

  return { reviewDocs, loading, error, removeDoc };
}