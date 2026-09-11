import { request } from "./request";

// Fetch all tags
export function listTags(session, onSession) {
  return request("/web/tags", {}, session, onSession);
}

// Create a new tag
export function createTag(name, session, onSession) {
  return request(
    "/web/tags",
    {
      method: "POST",
      body: JSON.stringify({ name }),
    },
    session,
    onSession
  );
}

// Add tags to a document by tag names
export function addTagsToDocument(docId, tagNames, session, onSession) {
  return request(
    `/web/documents/${docId}/tags`,
    {
      method: "POST",
      body: JSON.stringify({ tags: tagNames }),
    },
    session,
    onSession
  );
}