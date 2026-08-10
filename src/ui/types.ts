import type { ExerciseTemplate, SessionExercise, Unit } from "../domain/types.ts";

/**
 * The shape the technique sheet needs, so it can be opened from a program card
 * and from a live session without either screen knowing about the other.
 */
export type ExerciseDetail = {
  name: string;
  shortName: string;
  cue: string;
  tip: string;
  videoUrl: string;
  alternatives: string[];
  unit: Unit;
  repMin: number;
  repMax: number;
  setCount: number;
  loads: number[];
};

export function detailFromTemplate(exercise: ExerciseTemplate): ExerciseDetail {
  return {
    name: exercise.name,
    shortName: exercise.shortName,
    cue: exercise.cue,
    tip: exercise.tip,
    videoUrl: exercise.videoUrl,
    alternatives: exercise.alternatives,
    unit: exercise.unit,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    setCount: exercise.sets,
    loads: exercise.targetWeights,
  };
}

export function detailFromSession(entry: SessionExercise): ExerciseDetail {
  return {
    name: entry.replacedBy ?? entry.name,
    shortName: entry.shortName,
    cue: entry.cue,
    tip: entry.tip,
    videoUrl: entry.videoUrl,
    alternatives: entry.alternatives,
    unit: entry.unit,
    repMin: entry.repMin,
    repMax: entry.repMax,
    setCount: entry.sets.length,
    loads: entry.sets.map((set) => set.weight),
  };
}

export function newId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.floor(Math.random() * 1e9).toString(36);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
