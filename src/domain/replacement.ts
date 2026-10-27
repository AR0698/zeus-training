import { catalogIdByName, catalogTemplate } from "./catalog/index.ts";
import { resizeExercise, uniqueExerciseId } from "./library.ts";
import { normalise, slugify } from "./text.ts";
import type { ExerciseTemplate, Program, SessionExercise } from "./types.ts";

/**
 * Machine occupée : échanger un mouvement, pour une séance ou pour de bon.
 *
 * Le remplaçant reprend toujours le plan de l'exercice d'origine — groupe,
 * unité, séries, fourchette de répétitions, repos. Seul le mouvement change ;
 * la séance prévue reste la même.
 */

/** Assez long pour « Presse Hammer salle 2 du fond », assez court pour un titre. */
export const REPLACEMENT_NAME_MAX = 60;

/** Un nom saisi à la main, nettoyé ; `null` s'il ne reste rien. */
export function cleanReplacementName(raw: string): string | null {
  const name = raw.replace(/\s+/g, " ").trim().slice(0, REPLACEMENT_NAME_MAX).trim();
  return name.length === 0 ? null : name;
}

/**
 * L'exercice du programme une fois le remplaçant gardé.
 *
 * Il prend un **nouvel identifiant**. Records et progression sont rangés par
 * identifiant : garder l'ancien ferait comparer la nouvelle machine aux charges
 * de l'autre (un 40 kg sur une presse Hammer jugé contre 90 kg sur la Chest
 * Press). L'ancien identifiant garde son historique, intact.
 *
 * Les charges de départ sont celles affichées en séance au moment du choix, et
 * servent aussi de « dernière fois » : aucune hausse fictive n'apparaît par
 * rapport à l'autre machine. À la fin de la séance, la progression écrit les
 * charges réellement soulevées sur la nouvelle machine.
 */
export function keptTemplate(
  program: Program,
  original: ExerciseTemplate,
  entry: SessionExercise,
  name: string,
): ExerciseTemplate {
  const catalogId = catalogIdByName(name);
  const fromCatalog = catalogId ? catalogTemplate(catalogId) : null;
  const loads = entry.sets.map((set) => set.weight);
  const alternatives = [original.name, ...original.alternatives].filter(
    (alternative, index, list) =>
      normalise(alternative) !== normalise(name) &&
      list.findIndex((other) => normalise(other) === normalise(alternative)) === index,
  );

  return resizeExercise(
    {
      ...original,
      id: uniqueExerciseId(program, catalogId ?? slugify(name)),
      name: fromCatalog?.name ?? name,
      shortName: fromCatalog?.shortName ?? name,
      cue: fromCatalog?.cue ?? "",
      tip: fromCatalog?.tip ?? "",
      videoUrl: fromCatalog?.videoUrl ?? "",
      alternatives,
      targetWeights: loads,
      lastWeights: loads,
    },
    original.sets,
  );
}

/** La séance en cours bascule sur l'exercice gardé, séries comprises. */
export function keptSessionEntry(entry: SessionExercise, kept: ExerciseTemplate): SessionExercise {
  return {
    ...entry,
    exerciseId: kept.id,
    name: kept.name,
    shortName: kept.shortName,
    cue: kept.cue,
    tip: kept.tip,
    videoUrl: kept.videoUrl,
    alternatives: [...kept.alternatives],
    replacedBy: null,
    status: entry.status === "skipped" ? "pending" : entry.status,
  };
}
