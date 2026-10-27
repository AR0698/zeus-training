import type { ExerciseTemplate, MuscleGroup, Program, Session, SessionExercise, Unit } from "./types.ts";

/**
 * Double progression, on the cautious side.
 *
 * Everything here is a pure function of its arguments — no clock, no storage,
 * no React. That is what makes the rules testable and what keeps a UI bug from
 * silently corrupting training loads.
 */

export const LAYOFF_DAYS = 21;
export const LAYOFF_FACTOR = 0.9;
export const DELOAD_FACTOR = 0.9;

/**
 * Smallest sensible adjustment for a given load.
 *
 * Light dumbbell work moves in 1 kg steps (a 6 kg curl does not jump to 8.5),
 * machines and lower body move in the usual plate increments.
 */
export function weightStep(unit: Unit, group: MuscleGroup, weight: number): number {
  if (unit === "sec") return 5;
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

export type ProgressionAction = "increase" | "hold" | "deload";

export type ProgressionDecision = {
  action: ProgressionAction;
  reason: string;
  nextWeights: number[];
  lastWeights: number[];
};

/**
 * Decides the next targets for one exercise from how the session actually went.
 *
 * - increase: every set completed at the top of the rep range, and it did not
 *   feel hard.
 * - deload: at least one completed set fell below the bottom of the range.
 * - hold: everything else, including a skipped or partial exercise.
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
  if (belowRange) {
    return {
      action: "deload",
      reason: `Série sous ${entry.repMin} reps — charge allégée de 10 % pour retrouver la fourchette.`,
      nextWeights: currentWeights.map((weight) =>
        clampLoad(Math.min(weight, weight * DELOAD_FACTOR)),
      ),
      lastWeights,
    };
  }

  const allSetsDone = completed.length === entry.sets.length;
  const atTopOfRange = completed.every((set) => performance(set) >= entry.repMax);
  const feltHard = entry.effort === "hard";

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

/** After a long break the first session comes back 10 % lighter. */
export function layoffAdjustment(
  lastSessionDate: number | null,
  now: number,
): { applied: boolean; days: number; factor: number } {
  if (lastSessionDate === null) return { applied: false, days: 0, factor: 1 };
  const days = daysBetween(lastSessionDate, now);
  const applied = days >= LAYOFF_DAYS;
  return { applied, days, factor: applied ? LAYOFF_FACTOR : 1 };
}

/** Loads to propose for an exercise at the start of a session. */
export function openingWeights(exercise: ExerciseTemplate, factor: number): number[] {
  return Array.from({ length: exercise.sets }, (_, index) => {
    const target =
      exercise.targetWeights[index] ?? exercise.targetWeights.at(-1) ?? 0;
    return factor === 1 ? clampLoad(target) : clampLoad(target * factor);
  });
}

/**
 * Writes a finished session back into the programs.
 *
 * Matching is by `exerciseId`, never by position, so a program edited during
 * the session cannot shift a log onto the wrong movement.
 */
export function applySessionToPrograms(programs: Program[], session: Session): Program[] {
  const decisions = new Map<string, ProgressionDecision>();
  for (const entry of session.exercises) {
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
 */
export function nextProgram(
  programs: Program[],
  lastCompletedProgramId: string | null,
): Program | null {
  const fallback = programs[0];
  if (!fallback) return null;
  if (lastCompletedProgramId === null) return fallback;
  const index = programs.findIndex((program) => program.id === lastCompletedProgramId);
  if (index === -1) return fallback;
  return programs[(index + 1) % programs.length] ?? fallback;
}
