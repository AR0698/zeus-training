import { normalise } from "../text.ts";
import type { ExerciseTemplate, MuscleGroup, Unit } from "../types.ts";

/**
 * Fabrique d'une fiche de catalogue.
 *
 * Le catalogue est la seule source de vérité des mouvements : les séances
 * d'exemple (`domain/seed.ts`) y piochent, l'éditeur y cherche, et l'écran de
 * remplacement s'en sert pour proposer une machine libre. Rien n'est dupliqué
 * ailleurs.
 *
 * Deux champs n'existent que dans le catalogue et ne sont jamais enregistrés
 * dans l'état : `equipment` et `haystack`. Le matériel sert à filtrer quand la
 * machine est prise, l'index de recherche à retrouver un mouvement par muscle
 * ou par synonyme. Les garder hors de `ExerciseTemplate` évite une migration de
 * schéma pour de la donnée que l'utilisateur ne modifie jamais.
 */

export type Equipment =
  | "machine"
  | "poulie"
  | "halteres"
  | "barre"
  | "poids-du-corps"
  | "elastique"
  | "kettlebell";

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  machine: "Machine",
  poulie: "Poulie",
  halteres: "Haltères",
  barre: "Barre",
  "poids-du-corps": "Poids du corps",
  elastique: "Élastique",
  kettlebell: "Kettlebell",
};

export const EQUIPMENTS: Equipment[] = [
  "machine",
  "poulie",
  "halteres",
  "barre",
  "poids-du-corps",
  "elastique",
  "kettlebell",
];

export type CatalogEntry = {
  template: ExerciseTemplate;
  equipment: Equipment;
  /** Texte normalisé sur lequel la recherche travaille. */
  haystack: string;
};

type CatalogInput = {
  id: string;
  name: string;
  shortName: string;
  group: MuscleGroup;
  equipment: Equipment;
  sets: number;
  repMin: number;
  repMax: number;
  /** Charge de départ par série, volontairement prudente : 0 = poids du corps. */
  start: number[];
  cue: string;
  tip: string;
  /** Mouvements de repli quand le matériel est pris. Trois, jamais moins. */
  alternatives: string[];
  /** Muscles travaillés et autres noms du mouvement, pour la recherche. */
  tags: string[];
  unit?: Unit;
  restSeconds?: number;
  /** Démonstration vérifiée à la main. Absente tant qu'aucune ne l'a été. */
  videoUrl?: string;
};

const DEFAULT_REST: Record<MuscleGroup, number> = { upper: 90, lower: 120, core: 45 };

/** Aligne la charge de départ sur le nombre de séries, quoi qu'on lui donne. */
function fitWeights(start: number[], sets: number, unit: Unit): number[] {
  const fallback = unit === "sec" ? 30 : 0;
  return Array.from({ length: sets }, (_, index) => start[index] ?? start.at(-1) ?? fallback);
}

export function entry(input: CatalogInput): CatalogEntry {
  const unit = input.unit ?? "kg";
  const targetWeights = fitWeights(input.start, input.sets, unit);

  const template: ExerciseTemplate = {
    id: input.id,
    name: input.name,
    shortName: input.shortName,
    group: input.group,
    unit,
    sets: input.sets,
    repMin: input.repMin,
    repMax: Math.max(input.repMin, input.repMax),
    targetWeights,
    lastWeights: [...targetWeights],
    cue: input.cue,
    tip: input.tip,
    // Vide plutôt qu'une recherche générée : une liste de résultats n'est pas
    // une démonstration. La fiche invite alors à renseigner sa propre source.
    videoUrl: input.videoUrl ?? "",
    alternatives: [...input.alternatives],
    restSeconds: input.restSeconds ?? DEFAULT_REST[input.group],
  };

  return {
    template,
    equipment: input.equipment,
    haystack: normalise(
      [
        input.name,
        input.shortName,
        EQUIPMENT_LABELS[input.equipment],
        ...input.tags,
        ...input.alternatives,
      ].join(" "),
    ),
  };
}
