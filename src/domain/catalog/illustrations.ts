/**
 * Les mouvements qui ont une illustration, et rien de plus.
 *
 * Deux poses par exercice — départ et arrivée — que l'interface fait alterner :
 * c'est l'animation, sans vidéo ni moteur 3D. Les dessins viennent
 * d'everkinetic (CC-BY-SA 4.0) et vivent dans `public/exercises/`, nommés
 * d'après l'identifiant du mouvement.
 *
 * Comme `equipment` et `haystack`, cette donnée reste **hors de**
 * `ExerciseTemplate` : l'utilisateur ne la modifie jamais, elle se déduit de
 * l'identifiant. Pas de migration de schéma, et les programmes déjà
 * enregistrés héritent des illustrations sans qu'on touche à leurs données.
 *
 * Un exercice créé sur mesure n'est pas illustré, et c'est le comportement
 * voulu : mieux vaut aucune image que l'image d'un autre mouvement.
 */

/** Identifiant → réserve à afficher, ou `null` quand le dessin est exact. */
const CAVEATS = new Map<string, string | null>([
  ["biceps-curl", null],
  ["hammer-curl", null],
  ["cable-curl", null],
  ["rope-curl", null],
  ["preacher-curl", null],
  ["machine-curl", null],
  ["reverse-curl", "haltères, pas barre"],
  ["triceps-rope", null],
  ["triceps-bar", null],
  ["overhead-triceps-extension", null],
  ["skull-crusher", null],
  ["bench-dips", null],
  ["lat-pulldown", null],
  ["close-grip-pulldown", null],
  ["pull-up", null],
  ["chin-up", null],
  ["inverted-row", null],
  ["seated-row", null],
  ["barbell-row", "prise supination seulement"],
  ["db-row", null],
  ["pullover", "haltère, pas poulie"],
  ["straight-arm-pulldown", null],
  ["shrug", null],
  ["barbell-shrug", null],
  ["chest-press", null],
  ["bench-press", null],
  ["db-bench-press", null],
  ["incline-db-press", null],
  ["incline-barbell-press", null],
  ["machine-incline-press", null],
  ["decline-bench-press", null],
  ["pec-deck", null],
  ["cable-fly", null],
  ["db-fly", null],
  ["push-up", null],
  ["diamond-push-up", null],
  ["dips", null],
  ["smith-bench", null],
  ["side-plank", null],
  ["cable-crunch", null],
  ["reverse-crunch", null],
  ["lying-leg-raise", null],
  ["ab-wheel", "rollout à la barre, même geste que la roue"],
  ["bicycle-crunch", null],
  ["sit-up", "crunch, amplitude plus courte qu'un sit-up"],
  ["back-extension", null],
  ["superman", null],
  ["leg-press", null],
  ["hack-squat", null],
  ["back-squat", null],
  ["front-squat", null],
  ["smith-squat", null],
  ["lunges", null],
  ["reverse-lunge", null],
  ["walking-lunge", null],
  ["step-up", null],
  ["leg-extension", null],
  ["sissy-squat", null],
  ["leg-curl", null],
  ["lying-leg-curl", null],
  ["romanian-deadlift", null],
  ["deadlift", null],
  ["good-morning", null],
  ["glute-bridge", null],
  ["cable-kickback", null],
  ["abductor", null],
  ["adductor", null],
  ["calf-raise", null],
  ["standing-calf-raise", null],
  ["seated-calf-raise", null],
  ["leg-press-calf", null],
  ["shoulder-press", null],
  ["overhead-press", null],
  ["military-press", null],
  ["arnold-press", null],
  ["lateral-raise", null],
  ["front-raise", null],
  ["upright-row", null],
  ["rear-delt-fly-db", null],
  ["band-pull-apart", null],
]);

export type Illustration = {
  /** Noms de fichiers : pose de départ, puis pose d'arrivée. */
  readonly frames: readonly [string, string];
  /** Écart connu entre le dessin et le mouvement, ou `null` s'il est exact. */
  readonly caveat: string | null;
};

/** L'illustration d'un mouvement, ou `null` s'il n'en a pas. */
export function illustrationFor(exerciseId: string): Illustration | null {
  if (!CAVEATS.has(exerciseId)) return null;
  return {
    frames: [`${exerciseId}-1.webp`, `${exerciseId}-2.webp`],
    caveat: CAVEATS.get(exerciseId) ?? null,
  };
}

/** Tous les identifiants illustrés — préchargement et tests. */
export function illustratedIds(): string[] {
  return [...CAVEATS.keys()];
}
