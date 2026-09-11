import { useEffect, useState } from "react";
import { getCurrentUser, getGoogleLoginUrl, logout } from "../api/auth";

const SESSION_KEY = "atlas.session";
const POPUP_TIMEOUT_MS = 120_000; 

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
    getCurrentUser(session, saveSession)
      .then(setUser)
      .catch(() => {
        saveSession(null);
        setUser(null);
      });
  }, [session]);


  const signIn = () => {
    setError("");
    setBusy(true);

    const popup = window.open(
      getGoogleLoginUrl(),
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
      await logout(session, saveSession);
    } catch {
      // Clear locally even if the server call fails
    }
    saveSession(null);
    setUser(null);
  };

  return { user, session, saveSession, busy, error, signIn, signOut };
}
