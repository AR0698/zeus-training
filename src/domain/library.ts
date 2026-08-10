import { EXERCISE_CATALOG, type CatalogEntry, type Equipment } from "./catalog/index.ts";
import { normalise } from "./text.ts";
import type { ExerciseTemplate, MuscleGroup, Program } from "./types.ts";

/**
 * Recherche dans le catalogue et fabriques utilisées par l'éditeur.
 *
 * Le catalogue lui-même vit dans `catalog/` : ce module n'expose que les
 * opérations. Un exercice absent du catalogue se crée sur mesure — c'est le
 * même type, sans traitement à part.
 */

export {
  EXERCISE_CATALOG,
  EXERCISE_LIBRARY,
  EQUIPMENTS,
  EQUIPMENT_LABELS,
  catalogEntry,
  catalogTemplate,
} from "./catalog/index.ts";
export type { CatalogEntry, Equipment } from "./catalog/index.ts";
export { slugify } from "./text.ts";

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  upper: "Haut du corps",
  lower: "Bas du corps",
  core: "Gainage / abdos",
};

export type SearchFilters = {
  /** Restreint au matériel disponible. `null` = tout le catalogue. */
  equipment?: Equipment | null;
  group?: MuscleGroup | null;
};

/**
 * Recherche insensible à la casse et aux accents, sur le nom, les muscles
 * travaillés, le matériel et les équivalents. Chercher « pecs », « machine » ou
 * « developpe » ramène donc les mêmes fiches qu'un nom exact.
 */
export function searchLibrary(query: string, filters: SearchFilters = {}): ExerciseTemplate[] {
  const needle = normalise(query);
  const words = needle.split(" ").filter(Boolean);

  return EXERCISE_CATALOG.filter((item) => matches(item, words, filters)).map(
    (item) => item.template,
  );
}

function matches(item: CatalogEntry, words: string[], filters: SearchFilters): boolean {
  if (filters.equipment && item.equipment !== filters.equipment) return false;
  if (filters.group && item.template.group !== filters.group) return false;
  return words.every((word) => item.haystack.includes(word));
}

/**
 * Mouvements de repli pour un exercice, machine prise ou absente.
 *
 * Les équivalents saisis sur la fiche passent d'abord — ce sont ceux que
 * l'utilisateur a choisis. Le catalogue complète avec des mouvements du même
 * groupe musculaire, pour qu'un exercice créé sur mesure, sans équivalent
 * renseigné, propose quand même quelque chose plutôt qu'une liste vide.
 */
export function suggestAlternatives(
  exercise: { name: string; group: MuscleGroup; alternatives: string[] },
  limit = 8,
): string[] {
  const suggestions: string[] = [];
  const seen = new Set([normalise(exercise.name)]);

  const push = (name: string) => {
    const key = normalise(name);
    if (!key || seen.has(key) || suggestions.length >= limit) return;
    seen.add(key);
    suggestions.push(name);
  };

  for (const alternative of exercise.alternatives) push(alternative);
  for (const item of EXERCISE_CATALOG) {
    if (item.template.group === exercise.group) push(item.template.name);
  }
  return suggestions;
}

/**
 * Rend un identifiant unique dans un programme donné.
 * Ajouter deux fois le même mouvement est légitime (pré-fatigue, back-off) et
 * ne doit pas faire fusionner leurs séries.
 */
export function uniqueExerciseId(program: Program, baseId: string): string {
  const taken = new Set(program.exercises.map((exercise) => exercise.id));
  if (!taken.has(baseId)) return baseId;
  for (let suffix = 2; suffix < 100; suffix += 1) {
    const candidate = `${baseId}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${baseId}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Exercice vierge, pour un mouvement absent du catalogue. */
export function makeCustomExercise(id: string): ExerciseTemplate {
  return {
    id,
    name: "Nouvel exercice",
    shortName: "Nouvel exercice",
    group: "upper",
    unit: "kg",
    sets: 3,
    repMin: 8,
    repMax: 12,
    targetWeights: [0, 0, 0],
    lastWeights: [0, 0, 0],
    cue: "",
    tip: "",
    videoUrl: "",
    alternatives: [],
    restSeconds: 90,
  };
}

export function makeEmptyProgram(id: string, accent: Program["accent"]): Program {
  return {
    id,
    name: "Nouvelle séance",
    focus: "",
    accent,
    warmup: "",
    estimatedMinutes: 45,
    exercises: [],
  };
}

export const ACCENTS: Program["accent"][] = ["acid", "orange", "sky", "violet"];

export const ACCENT_LABELS: Record<Program["accent"], string> = {
  acid: "Citron",
  orange: "Orange",
  sky: "Bleu",
  violet: "Violet",
};

/**
 * Aligne la longueur des tableaux de charges sur le nombre de séries.
 * Une incohérence ici produirait des séries sans charge au démarrage — c'est la
 * seule invariante que l'éditeur peut casser, donc elle est centralisée.
 */
export function resizeExercise(exercise: ExerciseTemplate, sets: number): ExerciseTemplate {
  const count = Math.max(1, Math.min(12, Math.round(sets)));
  const fit = (values: number[]) =>
    Array.from({ length: count }, (_, index) => values[index] ?? values.at(-1) ?? 0);
  return {
    ...exercise,
    sets: count,
    targetWeights: fit(exercise.targetWeights),
    lastWeights: fit(exercise.lastWeights),
  };
}

/** Applique une modification partielle en réparant les invariantes au passage. */
export function patchExercise(
  exercise: ExerciseTemplate,
  patch: Partial<ExerciseTemplate>,
): ExerciseTemplate {
  const merged: ExerciseTemplate = { ...exercise, ...patch };
  const repMin = Math.max(1, Math.round(merged.repMin));
  const repMax = Math.max(repMin, Math.round(merged.repMax));
  const name = merged.name.trim() || exercise.name;
  const shortName = merged.shortName.trim() || name;

  return resizeExercise(
    {
      ...merged,
      name,
      shortName,
      repMin,
      repMax,
      restSeconds: Math.max(0, Math.min(600, Math.round(merged.restSeconds))),
      alternatives: merged.alternatives.map((item) => item.trim()).filter(Boolean),
    },
    merged.sets,
  );
}
