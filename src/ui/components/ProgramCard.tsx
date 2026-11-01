import { circuitSummary } from "../../domain/circuit.ts";
import { formatMinutes, formatNumber, formatRepRange, unitLabel } from "../../domain/format.ts";
import type { Program } from "../../domain/types.ts";
import { IconArrowRight, IconPencil } from "../icons.tsx";
import { detailFromTemplate, type ExerciseDetail } from "../types.ts";

/** Une séance de la liste : ses exercices, ses cibles, et de quoi la lancer ou la modifier. */
export function ProgramCard({
  program,
  index,
  onStart,
  onEdit,
  onOpenDetail,
}: {
  program: Program;
  /** Place dans la liste affichée, numérotée à partir de 1. */
  index: number;
  onStart: (program: Program) => void;
  onEdit: (programId: string) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
}) {
  const circuit = circuitSummary(program);
  return (
    <article className={`card program-card accent-${program.accent}`}>
      <span className="program-card-bar" aria-hidden="true" />
      <div className="program-card-head">
        <span className="program-order tabular">{String(index + 1).padStart(2, "0")}</span>
        <div>
          <h2>{program.name}</h2>
          <p className="muted">
            {program.focus ? `${program.focus} · ` : ""}
            {formatMinutes(program.estimatedMinutes)}
          </p>
          {circuit && <p className="program-circuit tabular">{circuit}</p>}
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={() => onEdit(program.id)}
          aria-label={`Modifier ${program.name}`}
        >
          <IconPencil size={17} />
        </button>
      </div>

      {program.exercises.length === 0 ? (
        <p className="program-empty">
          Séance vide — ouvre-la pour ajouter des exercices.
        </p>
      ) : (
        <ul className="program-exercises">
          {program.exercises.map((exercise) => (
            <li key={exercise.id}>
              <button type="button" onClick={() => onOpenDetail(detailFromTemplate(exercise))}>
                <span className="program-exercise-name">{exercise.shortName}</span>
                <span className="program-exercise-reps tabular">
                  {exercise.sets}×{formatRepRange(exercise.repMin, exercise.repMax)}
                </span>
                {exercise.unit !== "reps" && (
                  <strong className="program-exercise-load tabular">
                    {exercise.targetWeights.map(formatNumber).join(" · ")}{" "}
                    {unitLabel(exercise.unit)}
                  </strong>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="button button-solid"
        onClick={() => onStart(program)}
        disabled={program.exercises.length === 0}
      >
        Démarrer maintenant
        <IconArrowRight size={18} />
      </button>
    </article>
  );
}
