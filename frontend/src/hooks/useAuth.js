import { useEffect, useState } from "react";
import { API, request } from "../api/request";

const SESSION_KEY = "atlas.session";
const POPUP_TIMEOUT_MS = 120_000; // 2 minutes

// useAuth manages the full authentication lifecycle:
//   - Loading/persisting the session from localStorage
//   - Fetching the user profile on mount
//   - Google OAuth popup flow (signIn)
//   - Logout
//
// Returns { user, session, busy, error, signIn, signOut }
// which App.jsx spreads to child components as needed.
export function useAuth() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem(SESSION_KEY) || "null")
  );
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Persist session to localStorage whenever it changes
  const saveSession = (next) => {
    setSession(next);
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  };

  // Load user profile whenever the session changes
  useEffect(() => {
    if (!session) return;
    request("/web/auth/me", {}, session, saveSession)
      .then(setUser)
      .catch(() => {
        saveSession(null);
        setUser(null);
      });
  }, [session]);

  // signIn opens a Google OAuth popup, polls until it returns to our
  // origin, reads the JSON response, and saves the session.
  const signIn = () => {
    setError("");
    setBusy(true);

    const popup = window.open(
      `${API}/web/auth/google/login`,
      "khub-google-login",
      "popup,width=520,height=680"
    );

    if (!popup) {
      setBusy(false);
      setError("Please allow popups for this site and try again.");
      return;
    }

    const started = Date.now();

    const timer = window.setInterval(() => {
      if (Date.now() - started > POPUP_TIMEOUT_MS) {
        window.clearInterval(timer);
        if (!popup.closed) popup.close();
        setBusy(false);
        setError("Login timed out. Please try again.");
        return;
      }

      if (popup.closed) {
        window.clearInterval(timer);
        setBusy(false);
        return;
      }

      try {
        // popup.location throws a cross-origin DOMException while on
        // Google's domain. Once it's back on our origin we can read it.
        const href = popup.location.href;
        if (!href.startsWith(window.location.origin)) return;

        const raw = popup.document.body?.innerText || "";
        if (!raw) return;

        if (!raw.includes("access_token")) {
          window.clearInterval(timer);
          popup.close();
          setBusy(false);
          try {
            setError(JSON.parse(raw).error || "Login failed. Please try again.");
          } catch {
            setError("Login failed. Please try again.");
          }
          return;
        }

        const result = JSON.parse(raw);
        window.clearInterval(timer);
        popup.close();
        saveSession(result.tokens);
        setUser(result.user);
        setBusy(false);
      } catch {
        // Still on Google's domain — keep polling
      }
    }, 500);
  };

  const signOut = async () => {
    try {
      await request("/web/auth/logout", { method: "POST" }, session, saveSession);
    } catch {
      // Clear locally even if the server call fails
    }
    saveSession(null);
    setUser(null);
  };

  return { user, session, saveSession, busy, error, signIn, signOut };
}
