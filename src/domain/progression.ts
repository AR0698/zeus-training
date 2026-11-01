import { programPlace } from "./place.ts";
import type { ExerciseTemplate, MuscleGroup, Program, Session, SessionExercise, Unit } from "./types.ts";

/**
 * Double progression, on the cautious side — and never on the kilos.
 *
 * Every machine is set differently, so a load is only ever the one typed in
 * the last session: the app says when to go up or down, it never moves the
 * kilos itself. Held seconds still lengthen on their own; they are not a load.
 *
 * Everything here is a pure function of its arguments — no clock, no storage,
 * no React. That is what makes the rules testable and what keeps a UI bug from
 * silently corrupting training loads.
 */

export const LAYOFF_DAYS = 21;

/**
 * Smallest sensible adjustment for a given load.
 *
 * Light dumbbell work moves in 1 kg steps (a 6 kg curl does not jump to 8.5),
 * machines and lower body move in the usual plate increments.
 */
export function weightStep(unit: Unit, group: MuscleGroup, weight: number): number {
  if (unit === "sec") return 5;
  // Poids du corps : il n'y a pas de charge à régler, donc pas de pas.
  if (unit === "reps") return 0;
  if (weight < 12) return 1;
  if (group === "lower") return 5;
  return 2.5;
}

/** Rounds to the nearest half unit — the finest granularity a gym rack offers. */
export function roundLoad(value: number): number {
  return Math.round(value * 2) / 2;
}

export function clampLoad(value: number): number {
  return Math.max(0, roundLoad(value));
}

/** Reps, or seconds held for timed work — the number the rep range is about. */
function setPerformance(unit: Unit, set: { weight: number; reps: number }): number {
  return unit === "sec" ? set.weight : set.reps;
}

/** Timed work carries no reps: its sets start at zero so seconds never show as rounds. */
export function openingReps(unit: Unit, repMin: number): number {
  return unit === "sec" ? 0 : repMin;
}

export type ProgressionAction = "increase" | "hold";

export type ProgressionDecision = {
  action: ProgressionAction;
  reason: string;
  nextWeights: number[];
  lastWeights: number[];
};

/**
 * Decides the next targets for one exercise from how the session actually went.
 *
 * - increase: timed work only — every set held to the top of the range, and it
 *   did not feel hard.
 * - hold: everything else. A load in kilos always comes back as it was lifted;
 *   the reason says whether to go up or down by hand.
 */
export function decideProgression(entry: SessionExercise): ProgressionDecision {
  const completed = entry.sets.filter((set) => set.done);
  const lastWeights = entry.sets.map((set) => set.weight);
  const currentWeights = lastWeights;

  if (entry.status === "skipped" || completed.length === 0) {
    return {
      action: "hold",
      reason: "Exercice non réalisé — cible inchangée.",
      nextWeights: currentWeights,
      lastWeights,
    };
  }

  const timed = entry.unit === "sec";
  const bodyweight = entry.unit === "reps";
  const rangeUnit = timed ? "s" : "reps";
  const performance = (set: { weight: number; reps: number }) => setPerformance(entry.unit, set);

  const belowRange = completed.some((set) => performance(set) < entry.repMin);
  // Held seconds are both the load and the result: the next target is simply
  // what was held, never 10 % less on top of it.
  if (belowRange && timed) {
    return {
      action: "hold",
      reason: `Série sous ${entry.repMin} s — on repart de la durée tenue.`,
      nextWeights: currentWeights,
      lastWeights,
    };
  }
  // Sans charge, il n'y a rien à alléger : on garde la cible et on le dit.
  if (belowRange && bodyweight) {
    return {
      action: "hold",
      reason: `Série sous ${entry.repMin} reps — même exercice, on vise la fourchette.`,
      nextWeights: currentWeights,
      lastWeights,
    };
  }
  if (belowRange) {
    return {
      action: "hold",
      reason: `Série sous ${entry.repMin} reps — baisse la charge si tu veux retrouver la fourchette.`,
      nextWeights: currentWeights,
      lastWeights,
    };
  }

  const allSetsDone = completed.length === entry.sets.length;
  const atTopOfRange = completed.every((set) => performance(set) >= entry.repMax);
  const feltHard = entry.effort === "hard";

  // Sans charge à ajouter, la progression est une variante plus difficile : on
  // l'annonce plutôt que de proposer des kilos qui n'existent pas.
  if (bodyweight && allSetsDone && atTopOfRange && !feltHard) {
    return {
      action: "hold",
      reason: `Toutes les séries à ${entry.repMax} reps — passe à la variante plus difficile.`,
      nextWeights: currentWeights,
      lastWeights,
    };
  }

  if (allSetsDone && atTopOfRange && !feltHard && !timed) {
    return {
      action: "hold",
      reason: `Toutes les séries à ${entry.repMax} reps — monte la charge si tu te sens prêt.`,
      nextWeights: currentWeights,
      lastWeights,
    };
  }

  if (allSetsDone && atTopOfRange && !feltHard) {
    return {
      action: "increase",
      reason: `Toutes les séries à ${entry.repMax} ${rangeUnit} — on monte.`,
      nextWeights: currentWeights.map((weight) =>
        clampLoad(weight + weightStep(entry.unit, entry.group, weight)),
      ),
      lastWeights,
    };
  }

  const reason = feltHard
    ? timed
      ? "Ressenti difficile — on consolide avant d'allonger la durée."
      : bodyweight
        ? "Ressenti difficile — on consolide avant de durcir l'exercice."
        : "Ressenti difficile — on consolide avant d'ajouter du poids."
    : !allSetsDone
      ? "Séries incomplètes — cible maintenue."
      : `Reste à atteindre ${entry.repMax} ${rangeUnit} sur toutes les séries.`;

  return { action: "hold", reason, nextWeights: currentWeights, lastWeights };
}

/** Days elapsed between two epoch timestamps, floored. */
export function daysBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / 86_400_000));
}

/**
 * A long break is noticed and announced — the loads stay what they were:
 * the user lightens them by hand if needed.
 */
export function layoffAdjustment(
  lastSessionDate: number | null,
  now: number,
): { applied: boolean; days: number } {
  if (lastSessionDate === null) return { applied: false, days: 0 };
  const days = daysBetween(lastSessionDate, now);
  return { applied: days >= LAYOFF_DAYS, days };
}

/** Loads to propose for an exercise at the start of a session: the last ones. */
export function openingWeights(exercise: ExerciseTemplate): number[] {
  return Array.from({ length: exercise.sets }, (_, index) =>
    clampLoad(exercise.targetWeights[index] ?? exercise.targetWeights.at(-1) ?? 0),
  );
}

/**
 * Writes a finished session back into the programs.
 *
 * Matching is by `exerciseId`, never by position, so a program edited during
 * the session cannot shift a log onto the wrong movement. A movement replaced
 * for this session only is left untouched.
 */
export function applySessionToPrograms(programs: Program[], session: Session): Program[] {
  const decisions = new Map<string, ProgressionDecision>();
  for (const entry of session.exercises) {
    // Charges soulevées sur une autre machine : elles ne disent rien de celle
    // du programme, qui garde ses cibles telles quelles.
    if (entry.replacedBy !== null) continue;
    decisions.set(entry.exerciseId, decideProgression(entry));
  }

  return programs.map((program) => {
    if (program.id !== session.programId) return program;
    return {
      ...program,
      exercises: program.exercises.map((exercise) => {
        const decision = decisions.get(exercise.id);
        if (!decision) return exercise;
        return {
          ...exercise,
          lastWeights: decision.lastWeights,
          targetWeights: decision.nextWeights,
        };
      }),
    };
  });
}

/**
 * The next program in the rotation, or null when the user has deleted them all.
 * Returning null rather than throwing keeps an empty library a normal state the
 * UI can render, not a crash.
 *
 * Salle et maison tournent chacune de leur côté : après une séance à la maison
 * vient la séance maison suivante, jamais une séance de salle intercalée.
 */
export function nextProgram(
  programs: Program[],
  lastCompletedProgramId: string | null,
): Program | null {
  const fallback = programs[0];
  if (!fallback) return null;
  const last = programs.find((program) => program.id === lastCompletedProgramId);
  if (!last) return fallback;
  const cycle = programs.filter((program) => programPlace(program) === programPlace(last));
  const index = cycle.indexOf(last);
  return cycle[(index + 1) % cycle.length] ?? fallback;
}
