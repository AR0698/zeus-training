import { useCallback, useEffect, useRef, useState } from "react";
import { IconUndo } from "../icons.tsx";

export type ToastTone = "neutral" | "success" | "warn" | "danger";

export type ToastRequest = {
  message: string;
  tone?: ToastTone;
  action?: { label: string; run: () => void };
};

type ActiveToast = ToastRequest & { id: number };

const VISIBLE_MS = 3400;
const ACTIONABLE_MS = 6000;

/** One toast at a time, announced politely, never stealing focus. */
export function useToaster() {
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const timer = useRef<number | null>(null);
  const counter = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((request: ToastRequest) => {
    counter.current += 1;
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast({ ...request, id: counter.current });
    timer.current = window.setTimeout(
      () => setToast(null),
      request.action ? ACTIONABLE_MS : VISIBLE_MS,
    );
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return { toast, show, dismiss };
}

export function Toaster({ toast, onDismiss }: { toast: ActiveToast | null; onDismiss: () => void }) {
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className={`toast toast-${toast.tone ?? "neutral"}`} key={toast.id}>
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.run();
                onDismiss();
              }}
            >
              <IconUndo size={16} />
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
