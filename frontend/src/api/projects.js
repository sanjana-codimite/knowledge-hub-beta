import { request } from "./request";

export function listProjects(session, onSession) {
  return request("/web/projects", {}, session, onSession);
}

export function createProject(project, session, onSession) {
  return request(
    "/web/projects",
    {
      method: "POST",
      body: JSON.stringify(project),
    },
    session,
    onSession
  );
}
