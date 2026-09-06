// LoginScreen is shown when no session exists.
// It renders the two-column layout: marketing intro + Google sign-in card.
import { FcGoogle } from "react-icons/fc";

export function LoginScreen({ onSignIn, busy, error }) {
  return (
    <div className="login-screen">
      <div className="login-glow" />
      <div className="login-layout">
        <section className="intro">
          <div className="brand">
            <span className="brand-mark">✦</span>
            <strong>Atlas</strong>
          </div>
          <h1>Every answer your team already wrote down.</h1>
          <p>
            Atlas indexes uploads, Drive folders, READMEs and saved articles,
            plus the threads your colleagues have already answered.
          </p>
          <div className="feature-list">
            <div>
              <span>⌕</span>
              <b>One search box</b>
              <small>Docs, articles and accepted answers in one place.</small>
            </div>
            <div>
              <span>◇</span>
              <b>Ask when search fails</b>
              <small>Route questions to the people who own the area.</small>
            </div>
            <div>
              <span>⧗</span>
              <b>Trust what you find</b>
              <small>Version history makes stale knowledge visible.</small>
            </div>
          </div>
        </section>

        <section className="login-card">
          {/* <span className="eyebrow">WORKSPACE ACCESS</span> */}
          <h2>Sign in</h2>
          <p>Use your work Google account. Access follows your existing project groups.</p>
          <button
            className="google-button"
            onClick={onSignIn}
            disabled={busy}
          >
            <FcGoogle className="google-icon" aria-hidden="true" />
            {busy ? "Waiting for Google..." : "Continue with Google"}
          </button>
          {error && <div className="error-message">{error}</div>}
          <div className="secure-note">
            <span className="online" />Drive stays read-only until you choose folders to sync.
          </div>
          <small className="policy">
            By continuing you agree to the internal usage policy. Trouble signing in? Ask IT.
          </small>
        </section>
      </div>
    </div>
  );
}
