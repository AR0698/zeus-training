import { useState } from "react";
import { formatRepRange, unitLabel } from "../../domain/format.ts";
import { ACCENT_LABELS, ACCENTS } from "../../domain/library.ts";
import type { ExerciseTemplate, Program } from "../../domain/types.ts";
import { Sheet } from "../components/Sheet.tsx";
import {
  IconAlert,
  IconArrowDown,
  IconArrowLeft,
  IconArrowRight,
  IconArrowUp,
  IconCopy,
  IconPencil,
  IconPlus,
  IconTrash,
} from "../icons.tsx";
import { ExerciseEditorSheet } from "./ExerciseEditorSheet.tsx";
import { ExercisePickerSheet } from "./ExercisePickerSheet.tsx";

export type ProgramEditorHandlers = {
  update: (patch: Partial<Pick<Program, "name" | "focus" | "warmup" | "accent" | "estimatedMinutes">>) => void;
  moveProgram: (direction: -1 | 1) => void;
  duplicate: () => void;
  remove: () => void;
  /** Adds a copy of the template and returns the id it actually received. */
  addExercise: (template: ExerciseTemplate) => string;
  createCustomExercise: () => string;
  removeExercise: (exerciseId: string) => void;
  moveExercise: (exerciseId: string, direction: -1 | 1) => void;
  patchExercise: (exerciseId: string, patch: Partial<ExerciseTemplate>) => void;
  start: () => void;
};

/**
 * Éditeur complet d'une séance : composition, ordre, contenu de chaque
 * exercice. Écran plein plutôt que feuille modale — on y passe du temps, et
 * une liste réordonnable a besoin de la hauteur.
 */
export function ProgramEditorScreen({
  program,
  index,
  total,
  onBack,
  handlers,
}: {
  program: Program;
  index: number;
  total: number;
  onBack: () => void;
  handlers: ProgramEditorHandlers;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const editing = program.exercises.find((exercise) => exercise.id === editingId) ?? null;

  return (
    <>
      <div className={`editor accent-${program.accent}`}>
        <div className="editor-top">
          <button type="button" className="icon-button" onClick={onBack} aria-label="Retour aux programmes">
            <IconArrowLeft size={18} />
          </button>
          {/* L'écran n'avait pas de h1 : la hiérarchie des titres sautait
              directement au h2 des sections. */}
          <h1 className="visually-hidden">Édition de {program.name}</h1>
          <span className="kicker" aria-hidden="true">
            Séance {index + 1} sur {total}
          </span>
          <div className="editor-top-actions">
            <button
              type="button"
              className="icon-button"
              onClick={() => handlers.moveProgram(-1)}
              disabled={index === 0}
              aria-label="Avancer dans le cycle"
            >
              <IconArrowUp size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => handlers.moveProgram(1)}
              disabled={index === total - 1}
              aria-label="Reculer dans le cycle"
            >
              <IconArrowDown size={17} />
            </button>
          </div>
        </div>

        <section className="card panel">
          <label className="field editor-title-field">
            <span className="field-label">Nom de la séance</span>
            <input
              className="field-input field-input-large"
              type="text"
              value={program.name}
              onChange={(event) => handlers.update({ name: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">Objectif</span>
            <input
              className="field-input"
              type="text"
              value={program.focus}
              placeholder="Poussée · Dos large"
              onChange={(event) => handlers.update({ focus: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">Échauffement</span>
            <input
              className="field-input"
              type="text"
              value={program.warmup}
              placeholder="5 min rameur + rotations d'épaules"
              onChange={(event) => handlers.update({ warmup: event.target.value })}
            />
          </label>

          <label className="field">
            <span className="field-label">Durée estimée</span>
            <input
              className="field-input field-input-short tabular"
              type="number"
              inputMode="numeric"
              min={5}
              max={240}
              value={program.estimatedMinutes}
              onChange={(event) =>
                handlers.update({ estimatedMinutes: Number(event.target.value) || 5 })
              }
            />
            <span className="field-help">En minutes, échauffement compris.</span>
          </label>

          <div className="field" role="group" aria-labelledby="program-accent-label">
            <span className="field-label" id="program-accent-label">Couleur</span>
            <div className="chip-row">
              {ACCENTS.map((accent) => (
                <button
                  type="button"
                  key={accent}
                  className={`accent-chip accent-${accent} ${program.accent === accent ? "is-active" : ""}`}
                  aria-pressed={program.accent === accent}
                  onClick={() => handlers.update({ accent })}
                >
                  <span className="accent-dot" aria-hidden="true" />
                  {ACCENT_LABELS[accent]}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="card panel">
          <div className="editor-list-head">
            <div>
              <span className="kicker">Exercices</span>
              <h2 className="panel-title">
                {program.exercises.length === 0
                  ? "Séance vide"
                  : `${program.exercises.length} mouvement${program.exercises.length > 1 ? "s" : ""}`}
              </h2>
            </div>
            <button type="button" className="button button-accent" onClick={() => setPickerOpen(true)}>
              <IconPlus size={18} />
              Ajouter
            </button>
          </div>

          {program.exercises.length === 0 ? (
            <p className="lead">
              Ajoute des mouvements depuis le catalogue, ou crée les tiens. L&apos;ordre de la liste
              est l&apos;ordre de la séance.
            </p>
          ) : (
            <ul className="editor-list">
              {program.exercises.map((exercise, position) => (
                <li key={exercise.id}>
                  <div className="editor-row">
                    <div className="editor-order">
                      <button
                        type="button"
                        onClick={() => handlers.moveExercise(exercise.id, -1)}
                        disabled={position === 0}
                        aria-label={`Monter ${exercise.shortName}`}
                      >
                        <IconArrowUp size={15} />
                      </button>
                      <span className="tabular">{String(position + 1).padStart(2, "0")}</span>
                      <button
                        type="button"
                        onClick={() => handlers.moveExercise(exercise.id, 1)}
                        disabled={position === program.exercises.length - 1}
                        aria-label={`Descendre ${exercise.shortName}`}
                      >
                        <IconArrowDown size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="editor-row-main"
                      onClick={() => setEditingId(exercise.id)}
                    >
                      <strong>{exercise.name}</strong>
                      <span className="tabular">
                        {exercise.sets} × {formatRepRange(exercise.repMin, exercise.repMax)}
                        {exercise.unit === "sec" ? " s" : ""} ·{" "}
                        {exercise.targetWeights.join(" · ")} {unitLabel(exercise.unit)}
                      </span>
                    </button>

                    <span className="editor-row-actions">
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => setEditingId(exercise.id)}
                        aria-label={`Modifier ${exercise.shortName}`}
                      >
                        <IconPencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        onClick={() => handlers.removeExercise(exercise.id)}
                        aria-label={`Retirer ${exercise.shortName}`}
                      >
                        <IconTrash size={16} />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card panel">
          <span className="kicker">Cette séance</span>
          <h2 className="panel-title">Actions</h2>
          <div className="button-row">
            <button
              type="button"
              className="button button-solid"
              onClick={handlers.start}
              disabled={program.exercises.length === 0}
            >
              Démarrer maintenant
              <IconArrowRight size={18} />
            </button>
            <button type="button" className="button button-ghost" onClick={handlers.duplicate}>
              <IconCopy size={18} />
              Dupliquer
            </button>
            <button
              type="button"
              className="button button-danger-quiet"
              onClick={() => setConfirmDelete(true)}
            >
              <IconTrash size={18} />
              Supprimer
            </button>
          </div>
          {program.exercises.length === 0 && (
            <span className="field-help">
              Une séance sans exercice ne peut pas être démarrée.
            </span>
          )}
        </section>
      </div>

      <ExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(template) => {
          const id = handlers.addExercise(template);
          setPickerOpen(false);
          setEditingId(id);
        }}
        onCreate={() => {
          const id = handlers.createCustomExercise();
          setPickerOpen(false);
          setEditingId(id);
        }}
      />

      <ExerciseEditorSheet
        exercise={editing}
        onClose={() => setEditingId(null)}
        onPatch={(patch) => {
          if (editingId) handlers.patchExercise(editingId, patch);
        }}
        onDelete={() => {
          if (editingId) handlers.removeExercise(editingId);
          setEditingId(null);
        }}
      />

      <Sheet open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Supprimer la séance">
        <span className="kicker">Confirmation</span>
        <h2 className="sheet-title">Supprimer « {program.name} » ?</h2>
        <p className="lead">
          {program.exercises.length === 0
            ? "La séance disparaît du cycle."
            : program.exercises.length === 1
              ? "La séance et son exercice disparaissent du cycle."
              : `La séance et ses ${program.exercises.length} exercices disparaissent du cycle.`}{" "}
          L&apos;historique déjà enregistré est conservé.
        </p>
        <div className="banner banner-warn">
          <IconAlert size={18} />
          <p>Tu pourras annuler juste après, via « Annuler » dans la notification.</p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              setConfirmDelete(false);
              handlers.remove();
            }}
          >
            Supprimer
          </button>
          <button type="button" className="button button-ghost" onClick={() => setConfirmDelete(false)}>
            Garder
          </button>
        </div>
      </Sheet>
    </>
  );
}
