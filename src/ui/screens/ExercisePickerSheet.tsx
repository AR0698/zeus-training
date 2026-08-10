import { useMemo, useState } from "react";
import { formatRepRange } from "../../domain/format.ts";
import {
  EQUIPMENTS,
  EQUIPMENT_LABELS,
  EXERCISE_LIBRARY,
  GROUP_LABELS,
  searchLibrary,
  type Equipment,
} from "../../domain/library.ts";
import type { ExerciseTemplate, MuscleGroup } from "../../domain/types.ts";
import { Sheet } from "../components/Sheet.tsx";
import { IconPlus, IconSearch } from "../icons.tsx";

const GROUP_ORDER: MuscleGroup[] = ["upper", "lower", "core"];

/**
 * Choix d'un mouvement à ajouter.
 *
 * Le catalogue est là pour que composer une séance ne demande aucune saisie :
 * on cherche, on tape, c'est ajouté avec ses consignes et son temps de repos.
 * La recherche porte aussi sur les muscles et le matériel — « pecs », « poulie »
 * ou « maison » sont des requêtes valides — et le filtre matériel sert le jour
 * où la moitié de la salle est prise. « Créer sur mesure » couvre tout le reste.
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
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const results = useMemo(() => searchLibrary(query, { equipment }), [query, equipment]);

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
          placeholder="Nom, muscle, matériel…"
          aria-label="Chercher un exercice"
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="field" role="group" aria-labelledby="picker-equipment-label">
        <span className="field-label" id="picker-equipment-label">
          Matériel disponible
        </span>
        <div className="chip-row chip-row-scroll">
          <button
            type="button"
            className={`chip ${equipment === null ? "is-active" : ""}`}
            aria-pressed={equipment === null}
            onClick={() => setEquipment(null)}
          >
            Tout
          </button>
          {EQUIPMENTS.map((value) => (
            <button
              type="button"
              key={value}
              className={`chip ${equipment === value ? "is-active" : ""}`}
              aria-pressed={equipment === value}
              onClick={() => setEquipment(equipment === value ? null : value)}
            >
              {EQUIPMENT_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="button button-accent" onClick={onCreate}>
        <IconPlus size={18} />
        Créer un exercice sur mesure
      </button>

      {grouped.length === 0 ? (
        <p className="lead">
          Aucun mouvement ne correspond{query ? ` à « ${query} »` : ""}
          {equipment ? ` avec le filtre ${EQUIPMENT_LABELS[equipment]}` : ""}. Élargis la recherche,
          ou crée-le sur mesure : nom, séries, répétitions et charges, rien d&apos;autre n&apos;est
          obligatoire.
        </p>
      ) : (
        <>
          <p className="picker-count" aria-live="polite">
            {results.length} mouvement{results.length > 1 ? "s" : ""} sur{" "}
            {EXERCISE_LIBRARY.length}
          </p>
          {grouped.map(({ group, items }) => (
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
          ))}
        </>
      )}
    </Sheet>
  );
}
