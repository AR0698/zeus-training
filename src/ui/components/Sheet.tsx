import { useEffect, useRef, type ReactNode } from "react";
import { IconClose } from "../icons.tsx";

/**
 * Bottom sheet built on the native `<dialog>` element.
 *
 * Using the platform primitive gives focus trapping, Escape-to-close, inert
 * background content and top-layer stacking for free — all things a hand-rolled
 * div gets wrong. We only add the gestures a phone user expects: tap the
 * backdrop, or pull the grabber down.
 */
export function Sheet({
  open,
  onClose,
  label,
  children,
  size = "default",
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  size?: "default" | "wide";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={`sheet ${size === "wide" ? "sheet-wide" : ""}`}
      aria-label={label}
      onClick={(event) => {
        // A click that lands on the dialog itself is a click on the backdrop:
        // the panel inside stops propagation of its own clicks.
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="sheet-panel" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="sheet-grabber"
          onClick={onClose}
          aria-label="Fermer"
        />
        <button type="button" className="sheet-close" onClick={onClose} aria-label="Fermer">
          <IconClose size={18} />
        </button>
        <div className="sheet-body">{children}</div>
      </div>
    </dialog>
  );
}
