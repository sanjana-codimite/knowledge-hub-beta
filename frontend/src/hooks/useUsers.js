import { useState, useEffect } from "react";
import { request } from "../api/request";

// Fetches all users once for the reviewer picker.
export function useUsers(session, saveSession) {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!session) return;
    request("/web/users", {}, session, saveSession)
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [session]);

  return { users };
}