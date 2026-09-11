// LoginScreen is shown when no session exists.
// It renders the two-column layout: marketing intro + Google sign-in card.
import { FcGoogle } from "react-icons/fc";

const FEATURES = [
  { icon: "⌕", title: "One search box", desc: "Docs, articles and accepted answers in one place." },
  { icon: "◇", title: "Ask when search fails", desc: "Route questions to the people who own the area." },
  { icon: "⧗", title: "Trust what you find", desc: "Version history makes stale knowledge visible." },
];

export function LoginScreen({ onSignIn, busy, error }) {
  return (
    // login-screen kept in CSS — anchors the fixed radial-gradient background layers (::before/::after)
    <div className="login-screen grid place-items-center min-h-screen relative overflow-hidden bg-[#070812] text-[#eef0ff] p-[clamp(20px,5vw,60px)]">
      {/* login-glow kept in CSS — animated blurred blobs (keyframes drift-one/drift-two) */}
      <div className="login-glow" />

      <div className="login-layout relative z-[1] flex items-stretch gap-[clamp(18px,3vw,32px)] w-[min(1080px,100%)] flex-col md:flex-row">
        <section className="flex-1 self-center">
          <div className="flex items-center gap-2.5 text-base whitespace-nowrap">
            <span className="brand-mark grid place-items-center w-8 h-8 rounded-[11px] border border-white/25 bg-gradient-to-br from-white/40 to-white/[0.06]">
              ✦
            </span>
            <strong>Atlas</strong>
          </div>

          <h1 className="max-w-[600px] mt-6 mb-3.5 text-[clamp(30px,4.6vw,46px)] leading-[1.08] tracking-[-0.04em] font-bold">
            Every answer your team already wrote down.
          </h1>

          <p className="max-w-[48ch] text-[rgba(238,240,255,0.6)] text-[15px] leading-[1.6]">
            Atlas indexes uploads, Drive folders, READMEs and saved articles,
            plus the threads your colleagues have already answered.
          </p>

          <div className="grid gap-3.5 mt-[30px]">
            {FEATURES.map((f) => (
              <div key={f.title} className="grid grid-cols-[34px_1fr] gap-x-3">
                <span className="row-span-2 grid place-items-center w-[34px] h-[34px] rounded-[11px] border border-white/[0.13] bg-white/[0.08]">
                  {f.icon}
                </span>
                <b className="text-sm">{f.title}</b>
                <small className="mt-0.5 text-[rgba(238,240,255,0.6)] text-[12.5px]">{f.desc}</small>
              </div>
            ))}
          </div>
        </section>

        {/* login-card kept in CSS — glass panel gradient + backdrop-blur + inset shadow + animated sheen (::after) */}
        <section className="login-card flex-[0_1_400px] self-center relative overflow-hidden rounded-[30px] border border-white/[0.18] py-[clamp(25px,8vw,75px)] px-[clamp(22px,4vw,34px)]">
          <h2 className="mt-3 mb-1.5 text-[23px] font-bold">Sign in</h2>
          <p className="text-[rgba(238,240,255,0.6)] text-[13.5px] leading-[1.55]">
            Use your work Google account. Access follows your existing project groups.
          </p>

          <button
            className="flex items-center justify-center gap-[11px] w-full h-[52px] mt-6 rounded-2xl bg-gradient-to-br from-white to-[#dfe2ef] text-[#141629] text-sm font-semibold transition-[filter] hover:enabled:brightness-[1.06] disabled:cursor-wait disabled:opacity-70"
            onClick={onSignIn}
            disabled={busy}
          >
            <FcGoogle className="w-[23px] h-[23px] flex-shrink-0" aria-hidden="true" />
            {busy ? "Waiting for Google..." : "Continue with Google"}
          </button>

          {error && (
            <div className="mt-3 p-2.5 rounded-[10px] border border-[rgba(255,176,88,0.3)] text-[#ffd19d] text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 mt-[22px] text-[rgba(238,240,255,0.6)] text-xs">
            <span className="inline-block w-[7px] h-[7px] rounded-full bg-[#5fe3a1] shadow-[0_0_9px_#5fe3a1]" />
            Drive stays read-only until you choose folders to sync.
          </div>

          <small className="block mt-[18px] text-[rgba(238,240,255,0.4)] text-[11.5px] leading-[1.5]">
            By continuing you agree to the internal usage policy. Trouble signing in? Ask IT.
          </small>
        </section>
      </div>
    </div>
  );
}