import { useMemo, useState } from "react";
import { searchLibrary, suggestAlternatives } from "../../domain/library.ts";
import type { SessionExercise } from "../../domain/types.ts";
import { IconArrowRight, IconSearch } from "../icons.tsx";
import { Sheet } from "./Sheet.tsx";

/** Nombre de propositions avant d'obliger à chercher : une liste courte se lit debout. */
const SUGGESTION_LIMIT = 8;

/**
 * Machine occupée : échanger le mouvement sans perdre les séries déjà validées.
 *
 * Les équivalents de la fiche passent en premier — ce sont ceux qui ont été
 * choisis pour cet exercice. Le catalogue complète avec des mouvements du même
 * groupe musculaire, ce qui garantit qu'un exercice créé sur mesure, sans
 * équivalent renseigné, propose quand même une solution. Et si rien ne
 * convient, la recherche donne accès à tout le catalogue.
 */
export function ReplaceSheet({
  entry,
  onClose,
  onChoose,
}: {
  entry: SessionExercise | null;
  onClose: () => void;
  onChoose: (alternative: string) => void;
}) {
  const [query, setQuery] = useState("");

  const suggestions = useMemo(
    () => (entry ? suggestAlternatives(entry, SUGGESTION_LIMIT) : []),
    [entry],
  );

  const searched = useMemo(
    () =>
      query.trim().length === 0
        ? []
        : searchLibrary(query)
            .filter((exercise) => exercise.name !== entry?.name)
            .slice(0, 12),
    [query, entry],
  );

  const close = () => {
    setQuery("");
    onClose();
  };

  const choose = (alternative: string) => {
    setQuery("");
    onChoose(alternative);
  };

  return (
    <Sheet open={entry !== null} onClose={close} label="Remplacer l'exercice">
      {entry && (
        <>
          <span className="kicker">Machine occupée</span>
          <h2 className="sheet-title">Remplacer {entry.shortName}</h2>
          <p className="lead">
            Choisis un mouvement proche. Les séries déjà validées et les charges sont conservées.
          </p>

          <div className="alternative-list">
            {suggestions.map((alternative, index) => (
              <button type="button" key={alternative} onClick={() => choose(alternative)}>
                <span className="alternative-index tabular">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{alternative}</strong>
                <IconArrowRight size={18} />
              </button>
            ))}
          </div>

          <div className="search-field">
            <IconSearch size={18} />
            <input
              type="search"
              value={query}
              placeholder="Chercher un autre mouvement…"
              aria-label="Chercher un mouvement de remplacement"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {query.trim().length > 0 && (
            <div className="alternative-list">
              {searched.length === 0 ? (
                <p className="lead">Aucun mouvement ne correspond à « {query} ».</p>
              ) : (
                searched.map((exercise) => (
                  <button
                    type="button"
                    key={exercise.id}
                    onClick={() => choose(exercise.name)}
                  >
                    <span className="alternative-index tabular">→</span>
                    <strong>{exercise.name}</strong>
                    <IconArrowRight size={18} />
                  </button>
                ))
              )}
            </div>
          )}

          {entry.replacedBy && (
            <button type="button" className="button button-ghost" onClick={() => choose(entry.name)}>
              Revenir à {entry.name}
            </button>
          )}
          <button type="button" className="button button-ghost" onClick={close}>
            Attendre la machine
          </button>
        </>
      )}
    </Sheet>
  );
}
