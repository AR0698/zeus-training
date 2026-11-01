import { formatMinutes, formatNumber, formatRepRange, unitLabel } from "../../domain/format.ts";
import type { PackId } from "../../domain/packs.ts";
import type { AppState, Program } from "../../domain/types.ts";
import { PackSection } from "../components/PackSection.tsx";
import { IconArrowRight, IconPencil, IconPlus } from "../icons.tsx";
import { detailFromTemplate, type ExerciseDetail } from "../types.ts";

export function ProgramsScreen({
  state,
  onStart,
  onEdit,
  onCreate,
  onAddPack,
  onOpenDetail,
}: {
  state: AppState;
  onStart: (program: Program) => void;
  onEdit: (programId: string) => void;
  onCreate: () => void;
  onAddPack: (packId: PackId) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
}) {
  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Programmes</span>
        <h1 className="display">Ton cycle, à ta façon</h1>
        <p className="lead">
          Les séances tournent en boucle dans l&apos;ordre de cette liste. Ajoute, retire et
          réordonne les exercices ; les cibles se recalculent seules après chaque séance.
        </p>
      </header>

      {state.programs.length === 0 ? (
        <div className="card empty-state">
          <IconPlus size={26} />
          <h2>Aucune séance pour l&apos;instant</h2>
          <p className="lead">
            Crée ta première séance : nomme-la, ajoute des exercices depuis le catalogue, et elle
            apparaîtra sur l&apos;accueil.
          </p>
          <button type="button" className="button button-accent" onClick={onCreate}>
            <IconPlus size={18} />
            Créer une séance
          </button>
        </div>
      ) : (
        <div className="program-list">
          {state.programs.map((program, index) => (
            <article key={program.id} className={`card program-card accent-${program.accent}`}>
              <span className="program-card-bar" aria-hidden="true" />
              <div className="program-card-head">
                <span className="program-order tabular">{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{program.name}</h2>
                  <p className="muted">
                    {program.focus ? `${program.focus} · ` : ""}
                    {formatMinutes(program.estimatedMinutes)}
                  </p>
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
                        <strong className="program-exercise-load tabular">
                          {exercise.targetWeights.map(formatNumber).join(" · ")}{" "}
                          {unitLabel(exercise.unit)}
                        </strong>
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
          ))}

          <button type="button" className="card program-add" onClick={onCreate}>
            <IconPlus size={22} />
            <strong>Nouvelle séance</strong>
            <small>Repartir d&apos;une page blanche ou dupliquer une séance existante</small>
          </button>
        </div>
      )}

      <PackSection state={state} onAdd={onAddPack} />
    </>
  );
}
