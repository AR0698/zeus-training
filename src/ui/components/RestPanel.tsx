import { formatClock } from "../../domain/format.ts";
import type { CircuitPosition } from "../../domain/circuit.ts";
import { IconArrowRight } from "../icons.tsx";

/**
 * Le repos d'une séance à la maison, en plein écran à la place de la carte :
 * entre deux tours, c'est le seul moment où l'on s'arrête, et la suite doit se
 * lire d'un coup d'œil.
 *
 * `position` est celle de l'exercice qui a la mise au point : au premier
 * exercice d'un tour au-delà du premier, le repos est celui de fin de tour.
 */
export function RestPanel({
  remaining,
  total,
  position,
  nextName,
  onAdd,
  onStop,
}: {
  remaining: number;
  total: number;
  position: CircuitPosition | null;
  /** L'exercice qui attend après le repos. */
  nextName: string;
  onAdd: (seconds: number) => void;
  onStop: () => void;
}) {
  const betweenRounds = position !== null && position.step === 1 && position.round > 1;
  const ratio = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;

  return (
    <section className="exercise-card rest-panel" aria-labelledby="rest-panel-title">
      <span className="kicker">
        {betweenRounds ? `Fin du tour ${position.round - 1}/${position.rounds}` : "Repos"}
      </span>
      <h2 id="rest-panel-title" className="visually-hidden">
        Repos
      </h2>
      <strong className="rest-panel-clock tabular" role="timer" aria-live="off">
        {formatClock(remaining)}
      </strong>
      <div className="rest-panel-progress" aria-hidden="true">
        <span style={{ transform: `scaleX(${ratio})` }} />
      </div>
      <div className="rest-panel-chips">
        <button type="button" className="rest-chip" onClick={() => onAdd(30)}>
          +30 s
        </button>
        <button type="button" className="rest-chip" onClick={onStop}>
          Passer
        </button>
      </div>

      <p className="rest-panel-next">
        {betweenRounds ? `Le tour ${position.round} commence par` : "Ensuite"}
        <strong>{nextName}</strong>
      </p>
      <button type="button" className="button button-accent button-lg circuit-done" onClick={onStop}>
        {betweenRounds ? `Commencer le tour ${position.round}` : "Reprendre"}
        <IconArrowRight size={20} />
      </button>
    </section>
  );
}
