import { catalogTemplate } from "./catalog/index.ts";
import { patchExercise } from "./library.ts";
import type { AppState, ExerciseTemplate, Program } from "./types.ts";

/**
 * Les programmes « poids du corps » : de quoi quitter la salle sans perdre le fil.
 *
 * Deux paquets, qui s'ajoutent depuis l'écran Programmes :
 *
 * - **Transition** — aucun matériel, pour tenir en attendant d'avoir une barre
 *   de traction et des élastiques, et pour quelqu'un qui n'enchaîne pas encore
 *   plusieurs séries de pompes : les pompes partent d'un appui surélevé.
 * - **Principal** — barre de porte + élastiques (une cinquantaine d'euros), avec
 *   le tirage doublé, des ischios, du travail sur une jambe et plus de poussée
 *   que de dips sur chaise.
 *
 * Même règle que les séances d'exemple : tout vient du catalogue, rien n'est
 * dupliqué. Les fiches sont clonées, donc modifier un programme ajouté ne touche
 * jamais le paquet suivant.
 */

export type PackId = "bodyweight-transition" | "bodyweight";

export type Pack = {
  id: PackId;
  name: string;
  summary: string;
  /** Ce qu'il faut avoir sous la main, en une ligne. */
  equipment: string;
  programs: Program[];
};

type PackExercise = {
  id: string;
  sets?: number;
  repMin?: number;
  repMax?: number;
  rest?: number;
  tip?: string;
};

/** Repos par défaut des paquets : 75 s, plus court que la salle (90–120 s). */
const REST = 75;

/**
 * Un exercice du catalogue réglé pour le paquet.
 *
 * Un mouvement chronométré (`sec`) garde ses secondes comme charge : sa cible
 * de départ suit le bas de la fourchette, sinon le chrono afficherait 45 s pour
 * une fourchette de 15 à 30.
 */
function exercise(item: PackExercise): ExerciseTemplate | null {
  const base = catalogTemplate(item.id);
  if (!base) return null;
  const repMin = item.repMin ?? base.repMin;
  const repMax = item.repMax ?? base.repMax;
  const patched = patchExercise(base, {
    sets: item.sets ?? base.sets,
    repMin,
    repMax,
    restSeconds: item.rest ?? (base.group === "core" ? base.restSeconds : REST),
    tip: item.tip ?? base.tip,
  });
  if (patched.unit !== "sec") return patched;
  const held = Array.from({ length: patched.sets }, () => patched.repMin);
  return { ...patched, targetWeights: held, lastWeights: [...held] };
}

/**
 * Un identifiant inconnu est ignoré plutôt que de casser le module : un
 * paquet incomplet reste utilisable. `tests/packs.test.ts` vérifie qu'aucun
 * ne l'est en pratique.
 */
function exercises(items: PackExercise[]): ExerciseTemplate[] {
  return items.flatMap((item) => exercise(item) ?? []);
}

/** La vidéo de gainage de fin de séance, en deux exercices chronométrés. */
const CORE_FINISH: PackExercise[] = [
  { id: "plank", sets: 2, repMin: 45, repMax: 60 },
  { id: "side-plank", sets: 2, repMin: 30, repMax: 45, tip: "Compte chaque série par côté : une à gauche, une à droite." },
];

const TRANSITION: Pack = {
  id: "bodyweight-transition",
  name: "Transition sans matériel",
  summary:
    "Quatre séances de 30 minutes avec ce qu'il y a à la maison, en attendant la barre et les élastiques. Les pompes partent d'un appui surélevé.",
  equipment: "Une table solide, une chaise, une serviette",
  programs: [
    {
      id: "bw-transition-1",
      name: "Transition · Haut du corps",
      focus: "Pompes inclinées · Rowing",
      accent: "acid",
      warmup: "4 min : cercles de poignets, rotations d'épaules, 10 scapula push-ups, quelques pompes au mur",
      estimatedMinutes: 30,
      exercises: exercises([
        {
          id: "incline-push-up",
          repMin: 8,
          repMax: 12,
          tip: "Mains sur le mur, une table ou une chaise : choisis la hauteur qui te donne 8 à 12 pompes propres. À 3×12, descends d'un cran.",
        },
        {
          id: "inverted-row",
          repMin: 8,
          repMax: 12,
          tip: "Sous une table lourde et stable qui ne glisse pas. Plus tu écartes les pieds, plus c'est facile.",
        },
        {
          id: "diamond-push-up",
          repMin: 6,
          repMax: 10,
          tip: "Mains sur un support surélevé au début : la même règle de hauteur que pour les pompes.",
        },
        { id: "pike-hold", repMin: 15, repMax: 20 },
        { id: "towel-row", repMin: 8, repMax: 12 },
      ]),
    },
    {
      id: "bw-transition-2",
      name: "Transition · Jambes",
      focus: "Quadriceps · Ischios · Fessiers",
      accent: "orange",
      warmup: "4 min : squats lents, rotations de hanches, fentes dynamiques",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "bodyweight-squat", repMin: 12, repMax: 15, tip: "Descente en 3 secondes, 1 seconde de pause en bas." },
        { id: "bodyweight-bulgarian-split-squat", repMin: 6, repMax: 10 },
        { id: "slider-leg-curl", repMin: 6, repMax: 10 },
        { id: "glute-bridge", repMin: 15, repMax: 15 },
        {
          id: "single-leg-calf-raise",
          repMin: 12,
          repMax: 15,
          tip: "À deux jambes si une seule est trop dur. Une main au mur pour l'équilibre.",
        },
        { id: "wall-sit", sets: 1, repMin: 45, repMax: 60 },
        ...CORE_FINISH,
      ]),
    },
    {
      id: "bw-transition-3",
      name: "Transition · Dos et abdos",
      focus: "Rowing · Gainage",
      accent: "sky",
      warmup: "4 min : dead bug, cat-cow, rotations du buste",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "inverted-row", repMin: 8, repMax: 12, tip: "Sous une table lourde et stable. Pieds rapprochés pour durcir." },
        { id: "superman", repMin: 20, repMax: 30 },
        { id: "dead-bug", repMin: 8, repMax: 10, tip: "Les reps se comptent par côté. Bas du dos plaqué au sol." },
        { id: "hollow-hold", repMin: 15, repMax: 25 },
        { id: "bird-dog", repMin: 8, repMax: 10, tip: "Les reps se comptent par côté. Pause de 2 secondes bras et jambe tendus." },
      ]),
    },
    {
      id: "bw-transition-4",
      name: "Transition · Full body",
      focus: "Pousser · Tirer · Jambes",
      accent: "violet",
      warmup: "4 min : marche rapide, montées de genoux, squats, pompes au mur",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "incline-push-up", repMin: 8, repMax: 12 },
        { id: "inverted-row", repMin: 8, repMax: 12, tip: "Sous une table lourde et stable, ou avec la serviette sur une porte fermée à clé." },
        { id: "bodyweight-squat", repMin: 12, repMax: 15 },
        { id: "bodyweight-lunge", repMin: 8, repMax: 10 },
        { id: "mountain-climber", sets: 3, repMin: 30, repMax: 30, tip: "Lents et contrôlés : le bassin ne monte pas." },
        ...CORE_FINISH,
      ]),
    },
  ],
};

const MAIN: Pack = {
  id: "bodyweight",
  name: "Poids du corps — barre et élastiques",
  summary:
    "Quatre séances de 30 minutes avec une barre de traction de porte et des élastiques. Plus de 18 séries de tirage par semaine, avec ischios et travail sur une jambe.",
  equipment: "Barre de traction de porte, élastiques, sac à dos",
  programs: [
    {
      id: "bw-main-1",
      name: "Poids du corps · Haut du corps",
      focus: "Poussée · Tirage",
      accent: "acid",
      warmup: "4 min : cercles de poignets, 10 scapula push-ups, rotations d'épaules, 5 pompes faciles",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "band-assisted-pull-up", repMin: 5, repMax: 8 },
        { id: "push-up", repMin: 8, repMax: 15, tip: "Descente en 3 secondes. Au-delà de 15 propres, passe aux pompes déclinées." },
        { id: "inverted-row", repMin: 10, repMax: 15, tip: "Pieds rapprochés ou surélevés pour durcir." },
        { id: "diamond-push-up", repMin: 8, repMax: 12 },
        { id: "pike-push-up", repMin: 5, repMax: 10 },
        { id: "band-face-pull", sets: 2, repMin: 12, repMax: 15 },
      ]),
    },
    {
      id: "bw-main-2",
      name: "Poids du corps · Jambes",
      focus: "Unilatéral · Ischios · Fessiers",
      accent: "orange",
      warmup: "4 min : squats lents, rotations de hanches, fentes dynamiques",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "bodyweight-bulgarian-split-squat", repMin: 8, repMax: 12 },
        { id: "slider-leg-curl", repMin: 8, repMax: 12 },
        { id: "single-leg-glute-bridge", repMin: 10, repMax: 12 },
        {
          id: "bodyweight-squat",
          repMin: 12,
          repMax: 15,
          tip: "Tempo 4-0-1 : quatre secondes à la descente. Sac à dos chargé quand 15 passent facilement.",
        },
        { id: "single-leg-calf-raise", repMin: 12, repMax: 15 },
        { id: "wall-sit", sets: 1, repMin: 45, repMax: 60 },
        ...CORE_FINISH,
      ]),
    },
    {
      id: "bw-main-3",
      name: "Poids du corps · Dos et abdos",
      focus: "Tractions · Rowing · Gainage",
      accent: "sky",
      warmup: "4 min : dead bug, cat-cow, rotations du buste, scapula pulls",
      estimatedMinutes: 30,
      exercises: exercises([
        { id: "band-assisted-pull-up", repMin: 5, repMax: 8 },
        { id: "inverted-row", repMin: 10, repMax: 15 },
        { id: "hanging-leg-raise", repMin: 6, repMax: 10 },
        { id: "hollow-hold", repMin: 20, repMax: 30 },
        { id: "bird-dog", repMin: 8, repMax: 12, tip: "Les reps se comptent par côté. Pause de 2 secondes bras et jambe tendus." },
        { id: "band-face-pull", sets: 2, repMin: 12, repMax: 15 },
      ]),
    },
    {
      id: "bw-main-4",
      name: "Poids du corps · Full body",
      focus: "Tractions · Pompes · Jambes",
      accent: "violet",
      warmup: "4 min : marche rapide, montées de genoux, squats, 5 pompes faciles",
      estimatedMinutes: 30,
      exercises: exercises([
        {
          id: "chin-up",
          repMin: 5,
          repMax: 8,
          tip: "Élastique d'assistance au début. Descente en 3 secondes, menton au-dessus de la barre.",
        },
        { id: "decline-push-up", repMin: 8, repMax: 12 },
        {
          id: "bodyweight-squat",
          repMin: 10,
          repMax: 15,
          tip: "Sac à dos chargé de livres ou de bouteilles d'eau pour durcir.",
        },
        { id: "nordic-curl", repMin: 5, repMax: 8, tip: "Négatif seulement : pieds calés sous le canapé, descends le plus lentement possible." },
        { id: "inverted-row", repMin: 10, repMax: 15 },
        { id: "mountain-climber", sets: 3, repMin: 30, repMax: 30, tip: "Lents et contrôlés : le bassin ne monte pas." },
        ...CORE_FINISH,
      ]),
    },
  ],
};

export const PACKS: readonly Pack[] = [TRANSITION, MAIN];

export function findPack(id: string): Pack | null {
  return PACKS.find((pack) => pack.id === id) ?? null;
}

/** Une copie neuve des séances du paquet, prête à être modifiée par son propriétaire. */
export function packPrograms(id: PackId): Program[] {
  const pack = findPack(id);
  return pack ? structuredClone(pack.programs) : [];
}

/** Le paquet est-il déjà dans la bibliothèque ? Il suffit qu'une de ses séances y soit. */
export function hasPack(state: AppState, id: PackId): boolean {
  const pack = findPack(id);
  if (!pack) return false;
  const owned = new Set(state.programs.map((program) => program.id));
  return pack.programs.some((program) => owned.has(program.id));
}

/**
 * Ajoute les séances du paquet à la suite des siennes.
 *
 * Idempotent : une séance déjà là — même renommée ou modifiée — n'est jamais
 * remplacée ni dupliquée. Un double appui sur « Ajouter » ne coûte rien, et
 * personne ne perd ses réglages en ré-ajoutant un paquet.
 */
export function addPack(state: AppState, id: PackId): AppState {
  const owned = new Set(state.programs.map((program) => program.id));
  const fresh = packPrograms(id).filter((program) => !owned.has(program.id));
  if (fresh.length === 0) return state;
  return { ...state, programs: [...state.programs, ...fresh] };
}
