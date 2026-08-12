import { useCallback, useEffect, useRef, useState } from "react";
import { formatNumber } from "../../domain/format.ts";
import { IconMinus, IconPlus } from "../icons.tsx";

const HOLD_DELAY_MS = 450;
const HOLD_REPEAT_MS = 90;

/**
 * The control used to correct a load or a rep count mid-set.
 *
 * Three affordances, in order of how often they are used in a gym:
 *  - tap − / + for one increment (48 px targets, reachable one-handed);
 *  - hold − / + to run through a big change without twenty taps;
 *  - tap the number itself to type an exact value on the numeric keypad.
 */
export function Stepper({
  value,
  unit,
  step,
  min = 0,
  onAdjust,
  onSet,
  label,
  tone = "default",
}: {
  value: number;
  unit: string;
  step: number;
  min?: number;
  onAdjust: (delta: number) => void;
  onSet: (value: number) => void;
  label: string;
  tone?: "default" | "quiet";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const pointerHandled = useRef(false);

  // The repeat interval outlives the render that started it. Calling the prop
  // captured back then would keep re-applying the delta to the *original*
  // value — a hold would add one increment and then do nothing. The ref always
  // points at the current handler.
  const adjustRef = useRef(onAdjust);
  useEffect(() => {
    adjustRef.current = onAdjust;
  }, [onAdjust]);

  const stopHold = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    if (holdInterval.current !== null) window.clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  }, []);

  useEffect(() => stopHold, [stopHold]);

  const startHold = (delta: number) => {
    pointerHandled.current = true;
    adjustRef.current(delta);
    stopHold();
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(
        () => adjustRef.current(delta),
        HOLD_REPEAT_MS,
      );
    }, HOLD_DELAY_MS);
  };

  // Pointer events drive the repeat; the click handler only serves keyboards.
  const keyboardFallback = (delta: number) => {
    if (pointerHandled.current) {
      pointerHandled.current = false;
      return;
    }
    adjustRef.current(delta);
  };

  const commitDraft = () => {
    setEditing(false);
    const parsed = Number.parseFloat(draft.replace(",", "."));
    if (Number.isFinite(parsed)) onSet(Math.max(min, parsed));
  };

  return (
    <div className={`stepper stepper-${tone}`}>
      <button
        type="button"
        className="stepper-button"
        aria-label={`${label} : retirer ${formatNumber(step)}`}
        onPointerDown={() => startHold(-step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onClick={() => keyboardFallback(-step)}
      >
        <IconMinus size={16} />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="stepper-input tabular"
          type="text"
          inputMode="decimal"
          autoFocus
          value={draft}
          aria-label={`${label} : valeur`}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitDraft();
            if (event.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          className="stepper-value"
          aria-label={`${label} : ${formatNumber(value)}${unit ? ` ${unit}` : ""}. Modifier la valeur`}
          onClick={() => {
            setDraft(formatNumber(value));
            setEditing(true);
          }}
        >
          <span className="tabular">{formatNumber(value)}</span>
          {unit && <small>{unit}</small>}
        </button>
      )}

      <button
        type="button"
        className="stepper-button"
        aria-label={`${label} : ajouter ${formatNumber(step)}`}
        onPointerDown={() => startHold(step)}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onClick={() => keyboardFallback(step)}
      >
        <IconPlus size={16} />
      </button>
    </div>
  );
}
