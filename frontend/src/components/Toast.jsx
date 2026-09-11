import { useEffect } from "react";

export function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    // toast-card kept in CSS for position/@keyframes/shadow, but its own background
    // (#1c1f26 flat slate) doesn't match the app's glass system — see note below.
    <div className="toast-card">
      <div className="text-[1.1rem] text-[#a9b4ff] flex-shrink-0 mt-0.5">✦</div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.82rem] font-semibold text-[#eef0ff] mb-0.5">Atlas</div>
        <div className="text-[0.88rem] text-[rgba(238,240,255,0.6)] leading-[1.4] break-words">{message}</div>
        <div className="text-[0.75rem] text-[rgba(238,240,255,0.4)] mt-1">knowledge-hub</div>
      </div>
      <button
        className="bg-transparent border-0 text-[rgba(238,240,255,0.45)] text-[1.1rem] cursor-pointer leading-none p-0 flex-shrink-0 transition-colors hover:text-[#a9b4ff]"
        onClick={onClose}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}