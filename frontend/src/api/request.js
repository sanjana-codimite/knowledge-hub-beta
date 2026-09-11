export const API = import.meta.env.VITE_API_URL || "";

export async function request(path, options = {}, session, onSession) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  let response = await fetch(`${API}${path}`, { ...options, headers });

  // Access token expired — try to silently refresh then retry once
  if (response.status === 401 && session?.refresh_token) {
    const refreshResp = await fetch(`${API}/web/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token }),
    });

    if (refreshResp.ok) {
      const newTokens = await refreshResp.json();
      onSession({ ...session, ...newTokens });
      headers.Authorization = `Bearer ${newTokens.access_token}`;
      response = await fetch(`${API}${path}`, { ...options, headers });
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }

  return response.status === 204 ? null : response.json();
}

