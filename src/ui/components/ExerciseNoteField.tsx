import { useState } from "react";
import { formatRelativeDay } from "../../domain/format.ts";
import { NOTE_MAX_LENGTH } from "../../domain/session.ts";
import { IconPencil } from "../icons.tsx";

/**
 * Une note courte par exercice (« siège cran 4 », « douleur épaule »).
 *
 * Repliée par défaut : un seul petit bouton sous les séries, pour ne rien
 * pousser entre le pouce et le bouton Valider. Le champ reste ouvert dès
 * qu'il contient du texte. Chaque frappe part dans le store, qui écrit sur
 * disque à la fermeture de la page : rien n'est perdu si l'app est tuée.
 */
export function ExerciseNoteField({
  exerciseId,
  note,
  hasPrevious,
  onChange,
}: {
  exerciseId: string;
  note: string;
  hasPrevious: boolean;
  onChange: (note: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const fieldId = `note-${exerciseId}`;
  const isShown = isOpen || note !== "";

  return (
    <div className="exercise-note">
      {isShown ? (
        <>
          <label className="field-label exercise-note-label" htmlFor={fieldId}>
            Note sur l&apos;exercice
          </label>
          <textarea
            id={fieldId}
            className="field-input field-textarea exercise-note-input"
            rows={2}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            placeholder="Réglage, sensation, douleur…"
            autoFocus={isOpen && note === ""}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => setIsOpen(false)}
          />
        </>
      ) : (
        <button type="button" className="mini-button exercise-note-toggle" onClick={() => setIsOpen(true)}>
          <IconPencil size={14} />
          {hasPrevious ? "Nouvelle note" : "Ajouter une note"}
        </button>
      )}
    </div>
  );
}

/**
 * La dernière note laissée sur cet exercice, en tête de carte : un réglage de
 * siège sert avant la première série, pas après la dernière.
 */
export function ExerciseNoteRecall({
  previous,
  now,
}: {
  previous: { note: string; date: number };
  now: number;
}) {
  return (
    <p className="exercise-note-recall">
      <IconPencil size={13} />
      <span>
        Dernière note ({formatRelativeDay(previous.date, now)}) : « {previous.note} »
      </span>
    </p>
  );
}
