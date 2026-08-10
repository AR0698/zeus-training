import { formatClock } from "../../domain/format.ts";
import { IconClose, IconTimer } from "../icons.tsx";

/**
 * The rest countdown. It sits above the session footer rather than in a modal:
 * resting is not a mode, you still need to read the next target and correct a
 * load while it runs.
 */
export function RestTimerBar({
  remaining,
  total,
  onAdd,
  onStop,
}: {
  remaining: number;
  total: number;
  onAdd: (seconds: number) => void;
  onStop: () => void;
}) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const nearlyDone = remaining <= 10;

  return (
    <div className={`rest-bar ${nearlyDone ? "rest-bar-ending" : ""}`}>
      <div className="rest-progress" style={{ transform: `scaleX(${ratio})` }} aria-hidden="true" />
      <div className="rest-content">
        <span className="rest-label">
          <IconTimer size={16} />
          Repos
        </span>
        <strong className="rest-time tabular" aria-live="off">
          {formatClock(remaining)}
        </strong>
        <div className="rest-actions">
          <button type="button" className="rest-chip" onClick={() => onAdd(30)}>
            +30 s
          </button>
          <button type="button" className="rest-chip" onClick={onStop} aria-label="Arrêter le repos">
            <IconClose size={15} />
            Passer
          </button>
        </div>
      </div>
      <p className="visually-hidden" aria-live="polite">
        {remaining <= 3 ? "Repos terminé, série suivante." : ""}
      </p>
    </div>
  );
}
