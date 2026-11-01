import { unitLabel } from "../../domain/format.ts";
import { weightStep } from "../../domain/progression.ts";
import type { SessionExercise, SetEntry } from "../../domain/types.ts";
import { IconTrophy } from "../icons.tsx";
import type { SessionHandlers } from "../screens/SessionScreen.tsx";
import { Stepper } from "./Stepper.tsx";

/**
 * Une ligne de série : son numéro, la charge (ou la durée) et les reps.
 * La validation est passée en `children` : une coche dans le tableau, rien
 * dans la carte du circuit qui a son propre gros bouton.
 */
export function SetRow({
  entry,
  set,
  setIndex,
  timed,
  bodyweight,
  handlers,
  children,
}: {
  entry: SessionExercise;
  set: SetEntry;
  setIndex: number;
  timed: boolean;
  bodyweight: boolean;
  handlers: SessionHandlers;
  children?: React.ReactNode;
}) {
  return (
    <div className={`set-row ${set.done ? "is-done" : ""}`}>
      <span className="set-index tabular">
        {setIndex + 1}
        {set.pr && (
          // Toutes les icônes sont `aria-hidden`, et un `title` ne se
          // montre pas au doigt : sans ce mot, le record n'existe que
          // pour qui voit la coupe.
          <span className="pr-flag">
            <IconTrophy size={11} />
            <span className="visually-hidden">Record personnel</span>
          </span>
        )}
      </span>

      {!bodyweight && (
        <div className="set-cell set-cell-weight">
          <span className="set-cell-label">{timed ? "Durée" : "Charge"}</span>
          <Stepper
            value={set.weight}
            unit={unitLabel(entry.unit)}
            step={weightStep(entry.unit, entry.group, set.weight)}
            label={`Série ${setIndex + 1} ${timed ? "durée" : "charge"}`}
            onAdjust={(delta) => handlers.adjust(entry.exerciseId, setIndex, "weight", delta)}
            onSet={(value) => handlers.setValue(entry.exerciseId, setIndex, "weight", value)}
          />
        </div>
      )}

      {!timed && (
        <div className="set-cell set-cell-reps">
          <span className="set-cell-label">Reps</span>
          <Stepper
            value={set.reps}
            unit=""
            step={1}
            label={`Série ${setIndex + 1} répétitions`}
            onAdjust={(delta) => handlers.adjust(entry.exerciseId, setIndex, "reps", delta)}
            onSet={(value) => handlers.setValue(entry.exerciseId, setIndex, "reps", value)}
          />
        </div>
      )}

      {children}
    </div>
  );
}
