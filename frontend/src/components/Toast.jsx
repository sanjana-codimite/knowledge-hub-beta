import { createContext, useContext, useState, useCallback, useEffect } from "react";

const ToastContext = createContext({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "success") => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="toast-card pointer-events-auto"
            style={{ position: "static", transform: "none" }}
          >
            <div className="text-[1.1rem] text-[#8ff0c0] flex-shrink-0 mt-0.5">✦</div>
            <div className="flex-1 min-w-0">
              <div className="text-[0.82rem] font-semibold text-[#eef0ff] mb-0.5">Knowledge Hub</div>
              <div className="text-[0.88rem] text-[rgba(238,240,255,0.7)] leading-[1.4] break-words">
                {toast.message}
              </div>
            </div>
            <button
              className="bg-transparent border-0 text-[rgba(238,240,255,0.45)] text-[1.1rem] cursor-pointer leading-none p-0 flex-shrink-0 transition-colors hover:text-[#a9b4ff]"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function Toast({ message, onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  if (!message) return null;

  return (
    <div className="toast-card">
      <div className="text-[1.1rem] text-[#8ff0c0] flex-shrink-0 mt-0.5">✦</div>
      <div className="flex-1 min-w-0">
        <div className="text-[0.82rem] font-semibold text-[#eef0ff] mb-0.5">Knowledge Hub</div>
        <div className="text-[0.88rem] text-[rgba(238,240,255,0.7)] leading-[1.4] break-words">{message}</div>
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