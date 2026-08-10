import type { ExerciseTemplate } from "../types.ts";
import { ARMS } from "./arms.ts";
import { BACK } from "./back.ts";
import { CHEST } from "./chest.ts";
import { CORE } from "./core.ts";
import type { CatalogEntry } from "./entry.ts";
import { LEGS } from "./legs.ts";
import { SHOULDERS } from "./shoulders.ts";

export { EQUIPMENTS, EQUIPMENT_LABELS } from "./entry.ts";
export type { CatalogEntry, Equipment } from "./entry.ts";

/**
 * Le catalogue complet, dans l'ordre où il s'affiche.
 *
 * Un identifiant en double serait invisible à l'œil et casserait la recherche
 * comme l'ajout dans un programme : le premier gagne, silencieusement mais de
 * façon déterministe, et un test vérifie qu'il n'y en a aucun.
 */
export const EXERCISE_CATALOG: CatalogEntry[] = (() => {
  const seen = new Set<string>();
  const all: CatalogEntry[] = [];
  for (const item of [...CHEST, ...BACK, ...SHOULDERS, ...ARMS, ...LEGS, ...CORE]) {
    if (seen.has(item.template.id)) continue;
    seen.add(item.template.id);
    all.push(item);
  }
  return all;
})();

export const EXERCISE_LIBRARY: ExerciseTemplate[] = EXERCISE_CATALOG.map((item) => item.template);

const BY_ID = new Map(EXERCISE_CATALOG.map((item) => [item.template.id, item]));

export function catalogEntry(id: string): CatalogEntry | null {
  return BY_ID.get(id) ?? null;
}

/**
 * Le modèle d'un mouvement, ou `null` s'il n'est pas au catalogue.
 * Renvoie une copie : l'appelant est libre de la modifier.
 */
export function catalogTemplate(id: string): ExerciseTemplate | null {
  const found = BY_ID.get(id);
  return found ? structuredClone(found.template) : null;
}
