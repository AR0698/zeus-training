import { formatLoad, formatNumber, formatRepRange, unitLabel } from "../../domain/format.ts";
import { weightStep } from "../../domain/progression.ts";
import type { AppState, Program } from "../../domain/types.ts";
import { IconArrowRight, IconSettings } from "../icons.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { detailFromTemplate, type ExerciseDetail } from "../types.ts";

export function ProgramsScreen({
  state,
  onStart,
  onEdit,
  onOpenDetail,
}: {
  state: AppState;
  onStart: (program: Program) => void;
  onEdit: (programId: string) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
}) {
  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Programmes</span>
        <h1 className="display">Ton cycle Upper / Lower</h1>
        <p className="lead">
          Quatre séances qui tournent en boucle. Les cibles se recalculent seules après chaque
          séance, et restent modifiables à la main.
        </p>
      </header>

      <div className="program-list">
        {state.programs.map((program, index) => (
          <article key={program.id} className={`card program-card accent-${program.accent}`}>
            <span className="program-card-bar" aria-hidden="true" />
            <div className="program-card-head">
              <span className="program-order tabular">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{program.name}</h2>
                <p className="muted">
                  {program.focus} · {program.estimatedMinutes} min
                </p>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => onEdit(program.id)}
                aria-label={`Modifier les charges de ${program.name}`}
              >
                <IconSettings size={18} />
              </button>
            </div>

            <ul className="program-exercises">
              {program.exercises.map((exercise) => (
                <li key={exercise.id}>
                  <button type="button" onClick={() => onOpenDetail(detailFromTemplate(exercise))}>
                    <span className="program-exercise-name">{exercise.shortName}</span>
                    <span className="program-exercise-reps tabular">
                      {exercise.sets}×{formatRepRange(exercise.repMin, exercise.repMax)}
                    </span>
                    <strong className="program-exercise-load tabular">
                      {exercise.targetWeights.map(formatNumber).join(" · ")}{" "}
                      {unitLabel(exercise.unit)}
                    </strong>
                  </button>
                </li>
              ))}
            </ul>

            <button type="button" className="button button-solid" onClick={() => onStart(program)}>
              Démarrer maintenant
              <IconArrowRight size={18} />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

export function EditProgramSheet({
  program,
  onClose,
  onAdjust,
  onSet,
}: {
  program: Program | null;
  onClose: () => void;
  onAdjust: (exerciseId: string, setIndex: number, delta: number) => void;
  onSet: (exerciseId: string, setIndex: number, value: number) => void;
}) {
  return (
    <Sheet
      open={program !== null}
      onClose={onClose}
      size="wide"
      label={program ? `Modifier ${program.name}` : "Modifier le programme"}
    >
      {program && (
        <>
          <span className="kicker">Charges cibles</span>
          <h2 className="sheet-title">{program.name}</h2>
          <p className="lead">
            Ce sont les charges proposées au démarrage. Tu pourras encore les corriger série par
            série pendant la séance.
          </p>

          <div className="edit-list">
            {program.exercises.map((exercise) => (
              <section key={exercise.id} className="edit-exercise">
                <header>
                  <strong>{exercise.shortName}</strong>
                  <span className="muted tabular">
                    {exercise.sets} × {formatRepRange(exercise.repMin, exercise.repMax)}
                    {exercise.unit === "sec" ? " s" : ""}
                  </span>
                </header>
                <div className="edit-sets">
                  {exercise.targetWeights.map((weight, index) => (
                    <div className="edit-set" key={index}>
                      <span className="edit-set-index">Série {index + 1}</span>
                      <Stepper
                        tone="quiet"
                        value={weight}
                        unit={unitLabel(exercise.unit)}
                        step={weightStep(exercise.unit, exercise.group, weight)}
                        label={`${exercise.shortName} série ${index + 1}`}
                        onAdjust={(delta) => onAdjust(exercise.id, index, delta)}
                        onSet={(value) => onSet(exercise.id, index, value)}
                      />
                      {exercise.lastWeights[index] !== undefined &&
                        exercise.lastWeights[index] !== weight && (
                          <span className="edit-set-last">
                            dernier : {formatLoad(exercise.lastWeights[index], exercise.unit)}
                          </span>
                        )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button type="button" className="button button-accent" onClick={onClose}>
            Terminé
          </button>
        </>
      )}
    </Sheet>
  );
}
