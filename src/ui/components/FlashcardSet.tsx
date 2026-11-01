import { useEffect, useRef, useState } from "react";
import { formatClock, formatRepRange } from "../../domain/format.ts";
import type { SessionExercise } from "../../domain/types.ts";
import { IconCheck, IconTimer } from "../icons.tsx";
import type { SessionHandlers } from "../screens/SessionScreen.tsx";
import { SetRow } from "./SetRow.tsx";

/**
 * La carte d'une séance à la maison : une seule série, celle qui reste à faire,
 * et un gros bouton sous le pouce. Pas de « + série » : le nombre de séries (ou
 * de tours) appartient au programme.
 *
 * Un exercice chronométré se lance d'un geste : le compte à rebours part de la
 * durée réglée et valide la série tout seul à zéro. « Fait » reste là pour
 * arrêter plus tôt, « Annuler » pour reprendre sans rien valider.
 *
 * Le parent la monte avec une `key` par série : le chrono repart de rien à
 * chaque nouvelle carte.
 */
export function FlashcardSet({
  entry,
  setIndex,
  className,
  next,
  now,
  handlers,
}: {
  entry: SessionExercise;
  setIndex: number;
  className: string;
  /** Nom de l'exercice qui suivra, ou `null` quand rien ne suit. */
  next: string | null;
  now: number;
  handlers: SessionHandlers;
}) {
  const [holdEndsAt, setHoldEndsAt] = useState<number | null>(null);
  const set = entry.sets[setIndex];
  const timed = entry.unit === "sec";
  const remaining = holdEndsAt === null ? null : Math.max(0, Math.ceil((holdEndsAt - now) / 1000));

  // La fin du chrono vient de l'horloge, pas d'un geste : c'est elle qui valide.
  // Une seule fois — la carte est ensuite remplacée par celle de la série
  // suivante (nouvelle `key`), qui repart sans chrono.
  const validated = useRef(false);
  useEffect(() => {
    if (remaining !== 0 || validated.current) return;
    validated.current = true;
    handlers.toggleSet(entry, setIndex);
  }, [remaining, handlers, entry, setIndex]);

  if (!set) return null;
  const validate = () => {
    setHoldEndsAt(null);
    handlers.toggleSet(entry, setIndex);
  };

  return (
    <div className={`${className} circuit-set`} role="group" aria-label="Série en cours">
      {remaining === null ? (
        <SetRow
          entry={entry}
          set={set}
          setIndex={setIndex}
          timed={timed}
          bodyweight={entry.unit === "reps"}
          handlers={handlers}
        />
      ) : (
        <strong className="hold-clock tabular" role="timer" aria-live="off">
          {formatClock(remaining)}
        </strong>
      )}
      <span className="set-range">
        Cible {formatRepRange(entry.repMin, entry.repMax)} {timed ? "s" : "reps"}
      </span>

      {timed && remaining === null ? (
        <button
          type="button"
          className="button button-accent button-lg circuit-done"
          onClick={() => setHoldEndsAt(now + set.weight * 1000)}
        >
          <IconTimer size={22} />
          Lancer le chrono
        </button>
      ) : (
        <button type="button" className="button button-accent button-lg circuit-done" onClick={validate}>
          <IconCheck size={22} />
          Fait
        </button>
      )}
      {remaining !== null && (
        <button type="button" className="button button-quiet" onClick={() => setHoldEndsAt(null)}>
          Annuler le chrono
        </button>
      )}

      {next && <p className="flashcard-next">Ensuite : {next}</p>}
    </div>
  );
}
