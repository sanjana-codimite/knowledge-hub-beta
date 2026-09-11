import { API, request } from "./request";

export async function uploadProjectDocument(file, fields, session, onSession) {
  const send = async (accessToken) => {
    const body = new FormData();
    body.append("file", file, file.name);
    Object.entries(fields).forEach(([key, value]) => {
      if (value != null && value !== "") body.append(key, value);
    });

    return fetch(`${API}/web/documents/upload`, {
      method: "POST",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body,
    });
  };

  let response = await send(session?.access_token);
  if (response.status === 401 && session?.refresh_token) {
    const refreshResp = await fetch(`${API}/web/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (refreshResp.ok) {
      const newTokens = await refreshResp.json();
      onSession({ ...session, ...newTokens });
      response = await send(newTokens.access_token);
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Upload failed (${response.status})`);
  }

  return response.json();
}

// Get current user's uploaded documents
export function listMyDocuments(session, onSession) {
  return request("/web/documents/mine", {}, session, onSession);
}

// Get all documents for the search/browse view
export function listPublishedDocuments(projectID, session, onSession) {
  const params = new URLSearchParams();
  if (projectID) params.set("project_id", projectID);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return request(`/web/documents/published${qs}`, {}, session, onSession);
}

export function listForReview(session, onSession) {
  return request("/web/documents/review", {}, session, onSession);
}

export function approveDocument(docId, session, onSession) {
  return request(
    `/web/documents/${docId}/approve`,
    { method: "PATCH" },
    session,
    onSession
  );
}

export function rejectDocument(docId, session, onSession) {
  return request(
    `/web/documents/${docId}/reject`,
    { method: "PATCH" },
    session,
    onSession
  );
}

// Get raw file for preview
export function getDocumentFile(docId, session, onSession) {
  return request(`/web/documents/${docId}/file`, {}, session, onSession);
}

// Assign a reviewer
export function assignReviewer(docId, reviewerId, session, onSession) {
  return request(
    `/web/documents/${docId}/reviewer`,
    {
      method: "PATCH",
      body: JSON.stringify({ reviewer_id: reviewerId }),
    },
    session,
    onSession
  );
}

export function removeReviewer(docId, session, onSession) {
  return request(
    `/web/documents/${docId}/reviewer`,
    { method: "DELETE" },
    session,
    onSession
  );
}

// documents.js — file preview needs raw response not JSON
export async function getDocumentFileURL(docId, session, onSession) {
  const send = async (accessToken) => {
    return fetch(`${API}/web/documents/${docId}/file`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  };

  let response = await send(session?.access_token);

  if (response.status === 401 && session?.refresh_token) {
    const refreshResp = await fetch(`${API}/web/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });
    if (refreshResp.ok) {
      const newTokens = await refreshResp.json();
      onSession({ ...session, ...newTokens });
      response = await send(newTokens.access_token);
    }
  }

  if (!response.ok) throw new Error("Could not load file");

  // Return a blob URL the browser can display directly
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// Search documents by keyword using vector similarity
export function searchDocuments(query, projectID, session, onSession) {
  const params = new URLSearchParams({ q: query });
  if (projectID) params.set("project_id", projectID);
  return request(
    `/web/documents/search?${params.toString()}`,
    {},
    session,
    onSession
  );
}
