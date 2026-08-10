import { catalogTemplate } from "./catalog/index.ts";
import type { AppState, ExerciseTemplate, Program, Settings } from "./types.ts";

/**
 * Les séances d'exemple.
 *
 * Elles ne sont **plus chargées au démarrage** : une nouvelle installation part
 * d'une bibliothèque vide, et l'écran d'accueil propose de créer sa première
 * séance, de charger ces exemples, ou d'importer une sauvegarde. Personne ne se
 * retrouve avec le programme de quelqu'un d'autre.
 *
 * La structure (Upper/Lower × A/B) vient du carnet ROADY TO ZEUS ; les charges
 * sont des repères volontairement prudents, puisque ce fichier est publié.
 */

type SeedExercise = {
  id: string;
  /** Consigne propre à cette séance, quand elle diffère de la fiche catalogue. */
  tip?: string;
};

/**
 * Un exercice inconnu du catalogue est ignoré plutôt que de faire échouer le
 * module : un exemple incomplet reste utilisable, un écran blanc au démarrage
 * ne l'est pas. Un test vérifie que rien n'est ignoré en pratique.
 */
function fromCatalog(entries: SeedExercise[]): ExerciseTemplate[] {
  const exercises: ExerciseTemplate[] = [];
  for (const { id, tip } of entries) {
    const template = catalogTemplate(id);
    if (!template) continue;
    exercises.push(tip ? { ...template, tip } : template);
  }
  return exercises;
}

const SUPERSET_START = "Superset avec les triceps : enchaîne sans pause.";
const SUPERSET_END = "Deuxième moitié du superset bras : à enchaîner après le curl.";

export const SEED_PROGRAMS: Program[] = [
  {
    id: "upper-a",
    name: "Haut du corps A",
    focus: "Poussée · Dos large",
    accent: "acid",
    warmup: "5 min rameur + rotations d'épaules",
    estimatedMinutes: 60,
    exercises: fromCatalog([
      { id: "chest-press" },
      { id: "lat-pulldown" },
      { id: "incline-db-press" },
      { id: "seated-row" },
      { id: "biceps-curl", tip: SUPERSET_START },
      { id: "triceps-rope", tip: SUPERSET_END },
      { id: "lateral-raise" },
    ]),
  },
  {
    id: "lower-a",
    name: "Bas du corps A",
    focus: "Quadriceps · Sangle abdo",
    accent: "orange",
    warmup: "5 min vélo + proprioception chevilles",
    estimatedMinutes: 55,
    exercises: fromCatalog([
      { id: "leg-press" },
      { id: "lunges" },
      { id: "leg-extension" },
      { id: "plank" },
      { id: "machine-crunch" },
    ]),
  },
  {
    id: "upper-b",
    name: "Haut du corps B",
    focus: "Épaules · Dos épais",
    accent: "sky",
    warmup: "5 min elliptique + mobilité épaules",
    estimatedMinutes: 55,
    exercises: fromCatalog([
      { id: "shoulder-press" },
      { id: "horizontal-row" },
      { id: "pec-deck" },
      { id: "rear-delt" },
      { id: "hammer-curl", tip: SUPERSET_START },
      { id: "triceps-bar", tip: SUPERSET_END },
    ]),
  },
  {
    id: "lower-b",
    name: "Bas du corps B",
    focus: "Ischios · Chaîne postérieure",
    accent: "violet",
    warmup: "5 min escalier + mobilité de hanches",
    estimatedMinutes: 50,
    exercises: fromCatalog([
      { id: "leg-curl" },
      { id: "high-leg-press" },
      { id: "abductor" },
      { id: "calf-raise" },
      { id: "mountain-climber" },
    ]),
  },
];

/** Une copie neuve des exemples, prête à être modifiée par son propriétaire. */
export function examplePrograms(): Program[] {
  return structuredClone(SEED_PROGRAMS);
}

/**
 * Version du schéma persisté.
 *
 * Déclarée ici, avec la fabrique d'état neuf, pour que les deux ne puissent pas
 * diverger : `state/schema.ts` la réexporte et l'utilise pour les migrations.
 */
export const CURRENT_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  theme: "auto",
  autoRest: true,
  defaultRestSeconds: 90,
  vibration: true,
  keepAwake: true,
  displayName: "",
};

/**
 * L'état d'une installation neuve : aucune séance, aucun historique.
 * `onboardedAt` à `null` est ce qui déclenche l'écran d'accueil.
 */
export function createInitialState(now: number): AppState {
  return {
    version: CURRENT_VERSION,
    createdAt: now,
    onboardedAt: null,
    lastBackupAt: null,
    backupPromptedAt: null,
    programs: [],
    session: null,
    history: [],
    records: {},
    lastCompletedProgramId: null,
    settings: { ...DEFAULT_SETTINGS },
  };
}
