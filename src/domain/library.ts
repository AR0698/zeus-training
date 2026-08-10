import { SEED_PROGRAMS } from "./seed.ts";
import type { ExerciseTemplate, MuscleGroup, Program, Unit } from "./types.ts";

/**
 * Catalogue d'exercices et fabriques utilisées par l'éditeur de programme.
 *
 * Le catalogue sert de point de départ : n'importe qui peut composer un
 * programme complet sans rien taper, puis ajuster. Un exercice absent du
 * catalogue se crée sur mesure — c'est le même type, sans traitement à part.
 */

type LibraryInput = Omit<
  ExerciseTemplate,
  "unit" | "lastWeights" | "restSeconds" | "targetWeights"
> & {
  unit?: Unit;
  restSeconds?: number;
  /** Charge de départ suggérée, volontairement prudente. */
  start?: number[];
};

function entry(input: LibraryInput): ExerciseTemplate {
  const unit = input.unit ?? "kg";
  const restSeconds =
    input.restSeconds ?? (input.group === "lower" ? 120 : input.group === "core" ? 45 : 90);
  const targetWeights =
    input.start ?? Array.from({ length: input.sets }, () => (unit === "sec" ? 30 : 0));
  return {
    ...input,
    unit,
    restSeconds,
    targetWeights,
    lastWeights: [...targetWeights],
  };
}

/** Mouvements courants qui ne sont pas déjà dans les quatre séances de base. */
const EXTRA_EXERCISES: ExerciseTemplate[] = [
  entry({
    id: "bench-press",
    name: "Développé couché barre",
    shortName: "Développé couché",
    group: "upper",
    sets: 4,
    repMin: 6,
    repMax: 10,
    start: [20, 30, 40, 40],
    cue: "Omoplates serrées, pieds ancrés, barre au niveau du sternum.",
    tip: "Garde les poignets dans l'axe des avant-bras et ne rebondis pas sur la poitrine.",
    videoUrl: "https://musclewiki.com/exercise/barbell-bench-press",
    alternatives: ["Chest Press (machine)", "Développé haltères", "Pompes lestées"],
  }),
  entry({
    id: "pull-up",
    name: "Tractions",
    shortName: "Tractions",
    group: "upper",
    sets: 4,
    repMin: 4,
    repMax: 10,
    start: [0, 0, 0, 0],
    cue: "Épaules basses avant de tirer, menton au-dessus de la barre.",
    tip: "Charge à 0 pour le poids du corps ; note le lest ajouté le cas échéant.",
    videoUrl: "https://musclewiki.com/exercise/bodyweight-pullup",
    alternatives: ["Tirage vertical", "Tractions assistées", "Rowing inversé"],
  }),
  entry({
    id: "dips",
    name: "Dips",
    shortName: "Dips",
    group: "upper",
    sets: 3,
    repMin: 6,
    repMax: 12,
    start: [0, 0, 0],
    cue: "Buste légèrement penché, coudes proches du corps.",
    tip: "Descends jusqu'à ce que les bras forment un angle droit, pas plus bas.",
    videoUrl: "https://musclewiki.com/exercise/bodyweight-dip",
    alternatives: ["Dips assistés", "Extension triceps poulie", "Pompes serrées"],
  }),
  entry({
    id: "face-pull",
    name: "Face pull",
    shortName: "Face pull",
    group: "upper",
    sets: 3,
    repMin: 15,
    repMax: 20,
    start: [10, 15, 15],
    restSeconds: 60,
    cue: "Corde à hauteur du visage, coudes hauts, rotation externe en fin de mouvement.",
    tip: "Le meilleur assureur d'épaules : léger, propre, sans à-coups.",
    videoUrl: "https://musclewiki.com/exercise/cable-face-pull",
    alternatives: ["Oiseau / deltoïdes arrière", "Band pull-apart", "Rowing menton"],
  }),
  entry({
    id: "overhead-press",
    name: "Développé militaire haltères",
    shortName: "Dév. militaire",
    group: "upper",
    sets: 3,
    repMin: 8,
    repMax: 12,
    start: [8, 10, 12],
    cue: "Côtes basses, fessiers serrés, haltères au-dessus des épaules.",
    tip: "Ne cambre pas le bas du dos pour finir la répétition.",
    videoUrl: "https://musclewiki.com/exercise/dumbbell-shoulder-press",
    alternatives: ["Shoulder Press (machine)", "Landmine press", "Élévations frontales"],
  }),
  entry({
    id: "barbell-row",
    name: "Rowing barre",
    shortName: "Rowing barre",
    group: "upper",
    sets: 4,
    repMin: 8,
    repMax: 12,
    start: [20, 30, 40, 40],
    cue: "Dos plat, buste à 45°, tire vers le nombril.",
    tip: "Si le dos s'arrondit, la charge est trop lourde.",
    videoUrl: "https://musclewiki.com/exercise/barbell-bentover-row",
    alternatives: ["Rowing assis", "Rowing haltère", "T-bar row"],
  }),
  entry({
    id: "back-squat",
    name: "Squat barre",
    shortName: "Squat",
    group: "lower",
    sets: 4,
    repMin: 6,
    repMax: 10,
    start: [20, 30, 40, 40],
    cue: "Pieds largeur d'épaules, genoux dans l'axe, descente contrôlée.",
    tip: "Descends jusqu'où tu gardes le dos neutre, pas plus bas.",
    videoUrl: "https://musclewiki.com/exercise/barbell-squat",
    alternatives: ["Presse à cuisses", "Hack squat", "Goblet squat"],
  }),
  entry({
    id: "romanian-deadlift",
    name: "Soulevé de terre roumain",
    shortName: "SDT roumain",
    group: "lower",
    sets: 3,
    repMin: 8,
    repMax: 12,
    start: [20, 30, 40],
    cue: "Jambes quasi tendues, bassin en arrière, barre le long des cuisses.",
    tip: "L'étirement se sent dans les ischios, jamais dans le bas du dos.",
    videoUrl: "https://musclewiki.com/exercise/barbell-romanian-deadlift",
    alternatives: ["Leg Curl", "Good morning", "Hip thrust"],
  }),
  entry({
    id: "hip-thrust",
    name: "Hip thrust",
    shortName: "Hip thrust",
    group: "lower",
    sets: 4,
    repMin: 10,
    repMax: 15,
    start: [20, 30, 40, 40],
    cue: "Omoplates sur le banc, menton rentré, poussée par les talons.",
    tip: "Marque une seconde en haut en serrant les fessiers.",
    videoUrl: "https://musclewiki.com/exercise/barbell-hip-thrust",
    alternatives: ["Pont fessier", "Leg Press — pieds hauts", "Fentes arrière"],
  }),
  entry({
    id: "bulgarian-split-squat",
    name: "Split squat bulgare",
    shortName: "Split squat",
    group: "lower",
    sets: 3,
    repMin: 8,
    repMax: 12,
    start: [6, 8, 10],
    cue: "Pied arrière sur le banc, descente verticale sur la jambe avant.",
    tip: "Excellent pour corriger un déséquilibre entre les deux jambes.",
    videoUrl: "https://musclewiki.com/exercise/dumbbell-bulgarian-split-squat",
    alternatives: ["Fentes avec haltères", "Step-up", "Fentes arrière"],
  }),
  entry({
    id: "standing-calf-raise",
    name: "Mollets debout",
    shortName: "Mollets debout",
    group: "lower",
    sets: 4,
    repMin: 12,
    repMax: 20,
    start: [20, 30, 40, 40],
    restSeconds: 60,
    cue: "Amplitude complète, montée explosive, descente lente.",
    tip: "Deux secondes en bas pour étirer le tendon d'Achille.",
    videoUrl: "https://musclewiki.com/exercise/machine-calf-raise",
    alternatives: ["Extensions mollets", "Mollets presse", "Mollets unilatéraux"],
  }),
  entry({
    id: "side-plank",
    name: "Gainage latéral",
    shortName: "Planche latérale",
    group: "core",
    unit: "sec",
    sets: 3,
    repMin: 30,
    repMax: 60,
    start: [30, 30, 30],
    restSeconds: 20,
    cue: "Coude sous l'épaule, hanches hautes, corps aligné.",
    tip: "Compte les séries par côté : trois à gauche, trois à droite.",
    videoUrl: "https://musclewiki.com/exercise/side-plank",
    alternatives: ["Gainage planche", "Pallof press", "Dead bug"],
  }),
  entry({
    id: "hanging-leg-raise",
    name: "Relevés de jambes suspendu",
    shortName: "Relevés jambes",
    group: "core",
    sets: 3,
    repMin: 8,
    repMax: 15,
    start: [0, 0, 0],
    restSeconds: 60,
    cue: "Bassin rétroversé, montée sans balancement.",
    tip: "Genoux fléchis d'abord ; jambes tendues quand le contrôle est acquis.",
    videoUrl: "https://musclewiki.com/exercise/bodyweight-hanging-leg-raise",
    alternatives: ["Reverse crunch", "Crunch machine", "Dead bug"],
  }),
  entry({
    id: "pallof-press",
    name: "Pallof press",
    shortName: "Pallof press",
    group: "core",
    sets: 3,
    repMin: 10,
    repMax: 15,
    start: [10, 10, 15],
    restSeconds: 45,
    cue: "Poulie sur le côté, bras tendus devant, buste immobile.",
    tip: "Le travail consiste à résister à la rotation, pas à la produire.",
    videoUrl: "https://musclewiki.com/exercise/cable-pallof-press",
    alternatives: ["Gainage latéral", "Dead bug", "Bird dog"],
  }),
];

/** Tous les exercices proposables : ceux des séances de base, puis les autres. */
export const EXERCISE_LIBRARY: ExerciseTemplate[] = (() => {
  const seen = new Set<string>();
  const all: ExerciseTemplate[] = [];
  for (const exercise of [...SEED_PROGRAMS.flatMap((p) => p.exercises), ...EXTRA_EXERCISES]) {
    if (seen.has(exercise.id)) continue;
    seen.add(exercise.id);
    all.push(exercise);
  }
  return all;
})();

export const GROUP_LABELS: Record<MuscleGroup, string> = {
  upper: "Haut du corps",
  lower: "Bas du corps",
  core: "Gainage / abdos",
};

/** Recherche insensible à la casse et aux accents. */
export function searchLibrary(query: string): ExerciseTemplate[] {
  const needle = normalise(query);
  if (!needle) return EXERCISE_LIBRARY;
  return EXERCISE_LIBRARY.filter((exercise) =>
    `${normalise(exercise.name)} ${normalise(exercise.shortName)} ${exercise.alternatives
      .map(normalise)
      .join(" ")}`.includes(needle),
  );
}

function normalise(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function slugify(value: string): string {
  return (
    normalise(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "exercice"
  );
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
