import type { SessionExercise } from "../../domain/types.ts";
import { IconArrowRight } from "../icons.tsx";
import { Sheet } from "./Sheet.tsx";

/** Machine taken: swap the movement without losing the sets already logged. */
export function ReplaceSheet({
  entry,
  onClose,
  onChoose,
}: {
  entry: SessionExercise | null;
  onClose: () => void;
  onChoose: (alternative: string) => void;
}) {
  return (
    <Sheet open={entry !== null} onClose={onClose} label="Remplacer l'exercice">
      {entry && (
        <>
          <span className="kicker">Machine occupée</span>
          <h2 className="sheet-title">Remplacer {entry.shortName}</h2>
          <p className="lead">
            Choisis un mouvement proche. Les séries déjà validées et les charges sont conservées.
          </p>

          <div className="alternative-list">
            {entry.alternatives.map((alternative, index) => (
              <button type="button" key={alternative} onClick={() => onChoose(alternative)}>
                <span className="alternative-index tabular">{String(index + 1).padStart(2, "0")}</span>
                <strong>{alternative}</strong>
                <IconArrowRight size={18} />
              </button>
            ))}
          </div>

          {entry.replacedBy && (
            <button type="button" className="button button-ghost" onClick={() => onChoose(entry.name)}>
              Revenir à {entry.name}
            </button>
          )}
          <button type="button" className="button button-ghost" onClick={onClose}>
            Attendre la machine
          </button>
        </>
      )}
    </Sheet>
  );
}
