import { useMemo, useState } from "react";
import { formatRepRange } from "../../domain/format.ts";
import { GROUP_LABELS, searchLibrary } from "../../domain/library.ts";
import type { ExerciseTemplate, MuscleGroup } from "../../domain/types.ts";
import { Sheet } from "../components/Sheet.tsx";
import { IconPlus, IconSearch } from "../icons.tsx";

const GROUP_ORDER: MuscleGroup[] = ["upper", "lower", "core"];

/**
 * Choix d'un mouvement à ajouter.
 *
 * Le catalogue est là pour que composer une séance ne demande aucune saisie :
 * on cherche, on tape, c'est ajouté avec ses consignes et son temps de repos.
 * « Créer sur mesure » couvre tout le reste sans traitement particulier.
 */
export function ExercisePickerSheet({
  open,
  onClose,
  onPick,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: ExerciseTemplate) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchLibrary(query), [query]);

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((group) => ({
        group,
        items: results.filter((exercise) => exercise.group === group),
      })).filter((section) => section.items.length > 0),
    [results],
  );

  return (
    <Sheet open={open} onClose={onClose} size="wide" label="Ajouter un exercice">
      <span className="kicker">Catalogue</span>
      <h2 className="sheet-title">Ajouter un exercice</h2>

      <div className="search-field">
        <IconSearch size={18} />
        <input
          type="search"
          value={query}
          placeholder="Chercher un mouvement…"
          aria-label="Chercher un exercice"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <button type="button" className="button button-accent" onClick={onCreate}>
        <IconPlus size={18} />
        Créer un exercice sur mesure
      </button>

      {grouped.length === 0 ? (
        <p className="lead">
          Aucun mouvement ne correspond à « {query} ». Crée-le sur mesure : nom, séries,
          répétitions et charges, rien d&apos;autre n&apos;est obligatoire.
        </p>
      ) : (
        grouped.map(({ group, items }) => (
          <section key={group} className="picker-group">
            <span className="kicker">{GROUP_LABELS[group]}</span>
            <ul className="picker-list">
              {items.map((exercise) => (
                <li key={exercise.id}>
                  <button type="button" onClick={() => onPick(exercise)}>
                    <span className="picker-name">{exercise.name}</span>
                    <span className="picker-meta tabular">
                      {exercise.sets} × {formatRepRange(exercise.repMin, exercise.repMax)}
                      {exercise.unit === "sec" ? " s" : ""}
                    </span>
                    <IconPlus size={17} />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </Sheet>
  );
}
