import { API, request } from "./request";

export function getCurrentUser(session, onSession) {
  return request("/web/auth/me", {}, session, onSession);
}

export function getGoogleLoginUrl() {
  return `${API}/web/auth/google/login`;
}

export function logout(session, onSession) {
  return request("/web/auth/logout", { method: "POST" }, session, onSession);
}
