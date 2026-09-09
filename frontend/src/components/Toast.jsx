import { useEffect } from "react";

export function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="toast-card">
      <div className="toast-icon">✦</div>
      <div className="toast-body">
        <div className="toast-title">Atlas</div>
        <div className="toast-message">{message}</div>
        <div className="toast-source">knowledge-hub</div>
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">×</button>
    </div>
  );
}