import { type FormEvent, useMemo, useState } from "react";
import { searchLibrary, suggestAlternatives } from "../../domain/library.ts";
import { REPLACEMENT_NAME_MAX, cleanReplacementName } from "../../domain/replacement.ts";
import { normalise } from "../../domain/text.ts";
import type { SessionExercise } from "../../domain/types.ts";
import { IconArrowRight, IconPlus, IconSearch } from "../icons.tsx";
import { Sheet } from "./Sheet.tsx";
import { ToggleRow } from "./ToggleRow.tsx";

/** Nombre de propositions avant d'obliger à chercher : une liste courte se lit debout. */
const SUGGESTION_LIMIT = 8;

/**
 * Machine occupée : échanger le mouvement sans perdre les séries déjà validées.
 *
 * Les équivalents de la fiche passent en premier — ce sont ceux qui ont été
 * choisis pour cet exercice. Le catalogue complète avec des mouvements du même
 * groupe musculaire, ce qui garantit qu'un exercice créé sur mesure, sans
 * équivalent renseigné, propose quand même une solution. La recherche donne
 * accès à tout le catalogue, et si la machine de la salle n'y est pas, le nom
 * tapé sert tel quel.
 *
 * « Garder pour les prochaines séances » écrit le choix dans le programme ;
 * sans lui, le remplacement s'arrête avec la séance.
 */
export function ReplaceSheet({
  entry,
  canKeep,
  onClose,
  onChoose,
}: {
  entry: SessionExercise | null;
  /** Faux quand l'exercice n'est plus dans son programme : rien à mettre à jour. */
  canKeep: boolean;
  onClose: () => void;
  onChoose: (alternative: string, keep: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [keep, setKeep] = useState(false);

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

  const customName = cleanReplacementName(query);
  const exactMatch = customName
    ? searched.find((exercise) => normalise(exercise.name) === normalise(customName))
    : undefined;
  const offersCustom =
    customName !== null && !exactMatch && normalise(customName) !== normalise(entry?.name ?? "");

  const reset = () => {
    setQuery("");
    setKeep(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const choose = (alternative: string, keepIt = keep) => {
    reset();
    onChoose(alternative, canKeep && keepIt);
  };

  // « Entrée » sur le clavier du téléphone : le mouvement du catalogue s'il
  // porte exactement ce nom, sinon le nom tapé.
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (exactMatch) choose(exactMatch.name);
    else if (offersCustom && customName) choose(customName);
  };

  return (
    <Sheet open={entry !== null} onClose={close} label="Remplacer l'exercice">
      {entry && (
        <>
          <span className="kicker">Machine occupée</span>
          <h2 className="sheet-title">Remplacer {entry.shortName}</h2>
          <p className="lead">
            Choisis un mouvement proche, ou tape le nom de la machine. Les séries déjà validées sont
            conservées.
          </p>

          {canKeep && (
            <ToggleRow
              label="Garder pour les prochaines séances"
              help={`Le programme passe à cette machine, avec sa propre progression. Sinon, ${entry.name} reste prévu.`}
              checked={keep}
              onChange={setKeep}
            />
          )}

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

          <form className="search-field" onSubmit={submit} role="search">
            <IconSearch size={18} />
            <input
              type="search"
              value={query}
              maxLength={REPLACEMENT_NAME_MAX}
              enterKeyHint="done"
              placeholder="Chercher ou nommer une machine…"
              aria-label="Chercher un mouvement, ou nommer la machine de remplacement"
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>

          {customName !== null && (
            <div className="alternative-list">
              {offersCustom && (
                <button type="button" onClick={() => choose(customName)}>
                  <span className="alternative-index">
                    <IconPlus size={17} />
                  </span>
                  <span>
                    <strong>Utiliser « {customName} »</strong>
                    <span className="field-help">
                      Même cible : {entry.sets.length} séries, {entry.repMin}–{entry.repMax}
                      {entry.unit === "sec" ? " s" : " reps"}
                    </span>
                  </span>
                  <IconArrowRight size={18} />
                </button>
              )}
              {searched.length === 0 && !offersCustom ? (
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

          {entry.replacedBy && canKeep && (
            <button
              type="button"
              className="button button-quiet button-wrap"
              onClick={() => choose(entry.replacedBy ?? entry.name, true)}
            >
              Garder {entry.replacedBy} pour les prochaines séances
            </button>
          )}
          {entry.replacedBy && (
            <button
              type="button"
              className="button button-ghost button-wrap"
              onClick={() => choose(entry.name, false)}
            >
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
