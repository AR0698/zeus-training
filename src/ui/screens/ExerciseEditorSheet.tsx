import { useEffect, useState } from "react";
import { formatDuration, unitLabel } from "../../domain/format.ts";
import { GROUP_LABELS } from "../../domain/library.ts";
import { weightStep } from "../../domain/progression.ts";
import type { ExerciseTemplate, MuscleGroup, Unit } from "../../domain/types.ts";
import { Segmented } from "../components/Segmented.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { Stepper } from "../components/Stepper.tsx";
import { IconTrash } from "../icons.tsx";

const REST_CHOICES = [30, 45, 60, 90, 120, 180];

/**
 * Édition d'un exercice.
 *
 * Les champs numériques et les choix s'appliquent immédiatement ; le texte est
 * tenu en brouillon local et validé à la sortie du champ, sinon le nettoyage
 * fait par le domaine (nom vide → nom précédent) rendrait la saisie impossible.
 */
export function ExerciseEditorSheet({
  exercise,
  onClose,
  onPatch,
  onDelete,
}: {
  exercise: ExerciseTemplate | null;
  onClose: () => void;
  onPatch: (patch: Partial<ExerciseTemplate>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState({
    name: "",
    shortName: "",
    cue: "",
    tip: "",
    videoUrl: "",
    alternatives: "",
  });

  const exerciseId = exercise?.id ?? null;

  useEffect(() => {
    if (!exercise) return;
    setDraft({
      name: exercise.name,
      shortName: exercise.shortName,
      cue: exercise.cue,
      tip: exercise.tip,
      videoUrl: exercise.videoUrl,
      alternatives: exercise.alternatives.join(", "),
    });
    // Re-seeded only when a different exercise opens, never on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId]);

  if (!exercise) {
    return <Sheet open={false} onClose={onClose} label="Modifier l'exercice" size="wide" children={null} />;
  }

  const step = (index: number) =>
    weightStep(exercise.unit, exercise.group, exercise.targetWeights[index] ?? 0);

  return (
    <Sheet open onClose={onClose} size="wide" label={`Modifier ${exercise.name}`}>
      <span className="kicker">Exercice</span>
      <h2 className="sheet-title">{exercise.name}</h2>

      <label className="field">
        <span className="field-label">Nom</span>
        <input
          className="field-input"
          type="text"
          value={draft.name}
          onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
          onBlur={() => onPatch({ name: draft.name })}
        />
      </label>

      <label className="field">
        <span className="field-label">Nom court</span>
        <input
          className="field-input"
          type="text"
          value={draft.shortName}
          placeholder={draft.name}
          onChange={(event) => setDraft((d) => ({ ...d, shortName: event.target.value }))}
          onBlur={() => onPatch({ shortName: draft.shortName })}
        />
        <span className="field-help">Affiché dans les listes et pendant la séance.</span>
      </label>

      <div className="field">
        <span className="field-label">Zone travaillée</span>
        <Segmented
          name={`group-${exercise.id}`}
          legend="Zone travaillée"
          value={exercise.group}
          onChange={(group: MuscleGroup) => onPatch({ group })}
          options={[
            { value: "upper", label: "Haut" },
            { value: "lower", label: "Bas" },
            { value: "core", label: "Gainage" },
          ]}
        />
        <span className="field-help">
          {GROUP_LABELS[exercise.group]} — détermine le pas de progression et le repos par défaut.
        </span>
      </div>

      <div className="field">
        <span className="field-label">Unité</span>
        <Segmented
          name={`unit-${exercise.id}`}
          legend="Unité de charge"
          value={exercise.unit}
          onChange={(unit: Unit) => onPatch({ unit })}
          options={[
            { value: "kg", label: "Kilos" },
            { value: "sec", label: "Secondes" },
          ]}
        />
        <span className="field-help">
          « Secondes » pour le gainage : la durée remplace la charge et ne compte pas dans le volume.
        </span>
      </div>

      <div className="editor-grid">
        <div className="field">
          <span className="field-label">Séries</span>
          <Stepper
            tone="quiet"
            value={exercise.sets}
            unit=""
            step={1}
            min={1}
            label="Nombre de séries"
            onAdjust={(delta) => onPatch({ sets: exercise.sets + delta })}
            onSet={(value) => onPatch({ sets: value })}
          />
        </div>
        <div className="field">
          <span className="field-label">Reps mini</span>
          <Stepper
            tone="quiet"
            value={exercise.repMin}
            unit=""
            step={1}
            min={1}
            label="Répétitions minimum"
            onAdjust={(delta) => onPatch({ repMin: exercise.repMin + delta })}
            onSet={(value) => onPatch({ repMin: value })}
          />
        </div>
        <div className="field">
          <span className="field-label">Reps maxi</span>
          <Stepper
            tone="quiet"
            value={exercise.repMax}
            unit=""
            step={1}
            min={1}
            label="Répétitions maximum"
            onAdjust={(delta) => onPatch({ repMax: exercise.repMax + delta })}
            onSet={(value) => onPatch({ repMax: value })}
          />
        </div>
      </div>
      <span className="field-help">
        La charge monte quand toutes les séries atteignent {exercise.repMax} répétitions sans être
        difficiles.
      </span>

      <div className="field">
        <span className="field-label">Charges cibles</span>
        <div className="edit-sets">
          {exercise.targetWeights.map((weight, index) => (
            <div className="edit-set" key={index}>
              <span className="edit-set-index">Série {index + 1}</span>
              <Stepper
                tone="quiet"
                value={weight}
                unit={unitLabel(exercise.unit)}
                step={step(index)}
                label={`Charge série ${index + 1}`}
                onAdjust={(delta) =>
                  onPatch({
                    targetWeights: exercise.targetWeights.map((value, i) =>
                      i === index ? Math.max(0, value + delta) : value,
                    ),
                  })
                }
                onSet={(value) =>
                  onPatch({
                    targetWeights: exercise.targetWeights.map((current, i) =>
                      i === index ? value : current,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">Repos entre les séries</span>
        <div className="chip-row">
          {REST_CHOICES.map((seconds) => (
            <button
              type="button"
              key={seconds}
              className={`chip ${exercise.restSeconds === seconds ? "is-active" : ""}`}
              onClick={() => onPatch({ restSeconds: seconds })}
            >
              {formatDuration(seconds)}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">Consigne principale</span>
        <textarea
          className="field-input field-textarea"
          rows={2}
          value={draft.cue}
          placeholder="Ce qu'il faut garder en tête pendant la série"
          onChange={(event) => setDraft((d) => ({ ...d, cue: event.target.value }))}
          onBlur={() => onPatch({ cue: draft.cue })}
        />
      </label>

      <label className="field">
        <span className="field-label">Détail technique</span>
        <textarea
          className="field-input field-textarea"
          rows={2}
          value={draft.tip}
          placeholder="Le piège à éviter, le réglage à vérifier"
          onChange={(event) => setDraft((d) => ({ ...d, tip: event.target.value }))}
          onBlur={() => onPatch({ tip: draft.tip })}
        />
      </label>

      <label className="field">
        <span className="field-label">Lien vidéo</span>
        <input
          className="field-input"
          type="url"
          inputMode="url"
          value={draft.videoUrl}
          placeholder="https://…"
          onChange={(event) => setDraft((d) => ({ ...d, videoUrl: event.target.value }))}
          onBlur={() => onPatch({ videoUrl: draft.videoUrl.trim() })}
        />
      </label>

      <label className="field">
        <span className="field-label">Équivalents</span>
        <input
          className="field-input"
          type="text"
          value={draft.alternatives}
          placeholder="Séparés par des virgules"
          onChange={(event) => setDraft((d) => ({ ...d, alternatives: event.target.value }))}
          onBlur={() => onPatch({ alternatives: draft.alternatives.split(",") })}
        />
        <span className="field-help">
          Proposés en séance quand la machine est occupée.
        </span>
      </label>

      <div className="button-row editor-actions">
        <button type="button" className="button button-accent" onClick={onClose}>
          Terminé
        </button>
        <button type="button" className="button button-danger-quiet" onClick={onDelete}>
          <IconTrash size={17} />
          Retirer de la séance
        </button>
      </div>
    </Sheet>
  );
}
