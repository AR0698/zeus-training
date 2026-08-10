import type { AppState, ExerciseTemplate, HistoryEntry, Program } from "./types.ts";

/**
 * Every number the Progrès screen shows is derived here from real history.
 * Nothing is hardcoded: an empty history must produce honest zeroes.
 */

const DAY_MS = 86_400_000;

/** Monday 00:00 of the ISO week containing `timestamp`, in local time. */
export function startOfWeek(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  const dayOffset = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dayOffset);
  return date.getTime();
}

export function sessionsThisWeek(history: HistoryEntry[], now: number): number {
  const weekStart = startOfWeek(now);
  return history.filter((entry) => entry.date >= weekStart).length;
}

/**
 * Consecutive weeks, counting back from the current one, that contain at least
 * one session. The current week does not break the streak while it is still
 * empty — you have not missed it yet.
 */
export function weeklyStreak(history: HistoryEntry[], now: number): number {
  if (history.length === 0) return 0;
  const weeks = new Set(history.map((entry) => startOfWeek(entry.date)));
  const currentWeek = startOfWeek(now);

  let streak = 0;
  let cursor = weeks.has(currentWeek) ? currentWeek : currentWeek - 7 * DAY_MS;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor -= 7 * DAY_MS;
  }
  return streak;
}

export type VolumeTrend = {
  /** Percentage change of the last block versus the previous one. */
  changePercent: number | null;
  direction: "up" | "down" | "flat" | "unknown";
  sampleSize: number;
};

/** Compares the average volume of the last `block` sessions with the block before. */
export function volumeTrend(history: HistoryEntry[], block = 4): VolumeTrend {
  const withVolume = history.filter((entry) => entry.volume > 0);
  if (withVolume.length < block * 2) {
    return { changePercent: null, direction: "unknown", sampleSize: withVolume.length };
  }

  const average = (entries: HistoryEntry[]) =>
    entries.reduce((total, entry) => total + entry.volume, 0) / entries.length;

  const recent = average(withVolume.slice(0, block));
  const previous = average(withVolume.slice(block, block * 2));
  if (previous === 0) return { changePercent: null, direction: "unknown", sampleSize: withVolume.length };

  const changePercent = Math.round(((recent - previous) / previous) * 100);
  const direction = changePercent > 2 ? "up" : changePercent < -2 ? "down" : "flat";
  return { changePercent, direction, sampleSize: withVolume.length };
}

export type PendingIncrease = {
  program: Program;
  exercise: ExerciseTemplate;
  from: number;
  to: number;
};

/** Exercises whose next target is above what was last lifted. */
export function pendingIncreases(programs: Program[]): PendingIncrease[] {
  const result: PendingIncrease[] = [];
  for (const program of programs) {
    for (const exercise of program.exercises) {
      const from = exercise.lastWeights.at(-1) ?? 0;
      const to = exercise.targetWeights.at(-1) ?? 0;
      if (to > from) result.push({ program, exercise, from, to });
    }
  }
  return result.sort((a, b) => b.to - b.from - (a.to - a.from));
}

export function lastSessionDate(history: HistoryEntry[]): number | null {
  return history[0]?.date ?? null;
}

export function totalVolume(history: HistoryEntry[]): number {
  return history.reduce((total, entry) => total + entry.volume, 0);
}

export type Overview = {
  sessions: number;
  completeSessions: number;
  thisWeek: number;
  streak: number;
  totalVolume: number;
  trend: VolumeTrend;
  records: number;
};

export function overview(state: AppState, now: number): Overview {
  return {
    sessions: state.history.length,
    completeSessions: state.history.filter(
      (entry) => entry.completedExercises === entry.totalExercises,
    ).length,
    thisWeek: sessionsThisWeek(state.history, now),
    streak: weeklyStreak(state.history, now),
    totalVolume: totalVolume(state.history),
    trend: volumeTrend(state.history),
    records: Object.keys(state.records).length,
  };
}
