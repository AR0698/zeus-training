import { layoffAdjustment, openingWeights } from "./progression.ts";
import type {
  HistoryEntry,
  PersonalRecord,
  Program,
  Session,
  SessionExercise,
  SetEntry,
} from "./types.ts";

/** A session left running for longer than this is almost certainly forgotten. */
export const STALE_SESSION_HOURS = 5;

export type SessionSeed = {
  program: Program;
  now: number;
  /** Caller-supplied id, so the domain stays free of randomness. */
  id: string;
  lastSessionDate: number | null;
};

export function createSession({ program, now, id, lastSessionDate }: SessionSeed): {
  session: Session;
  layoff: { applied: boolean; days: number };
} {
  const { applied, days, factor } = layoffAdjustment(lastSessionDate, now);

  const exercises: SessionExercise[] = program.exercises.map((exercise) => ({
    exerciseId: exercise.id,
    name: exercise.name,
    shortName: exercise.shortName,
    group: exercise.group,
    unit: exercise.unit,
    repMin: exercise.repMin,
    repMax: exercise.repMax,
    cue: exercise.cue,
    tip: exercise.tip,
    videoUrl: exercise.videoUrl,
    alternatives: [...exercise.alternatives],
    restSeconds: exercise.restSeconds,
    effort: null,
    status: "pending",
    replacedBy: null,
    sets: openingWeights(exercise, factor).map((weight) => ({
      weight,
      reps: exercise.repMin,
      done: false,
      pr: false,
    })),
  }));

  return {
    session: {
      id,
      programId: program.id,
      programName: program.name,
      accent: program.accent,
      startedAt: now,
      currentIndex: 0,
      exercises,
    },
    layoff: { applied, days },
  };
}

export function elapsedSeconds(session: Session, now: number): number {
  return Math.max(0, Math.floor((now - session.startedAt) / 1000));
}

export function isSessionStale(session: Session, now: number): boolean {
  return now - session.startedAt > STALE_SESSION_HOURS * 3_600_000;
}

export type SessionProgress = {
  doneExercises: number;
  totalExercises: number;
  doneSets: number;
  totalSets: number;
  /** 0 → 1, driven by sets so the bar moves inside a long exercise too. */
  ratio: number;
};

export function sessionProgress(session: Session): SessionProgress {
  let doneSets = 0;
  let totalSets = 0;
  let doneExercises = 0;

  for (const entry of session.exercises) {
    totalSets += entry.sets.length;
    doneSets += entry.sets.filter((set) => set.done).length;
    if (entry.status === "done" || entry.status === "skipped") doneExercises += 1;
  }

  return {
    doneExercises,
    totalExercises: session.exercises.length,
    doneSets,
    totalSets,
    ratio: totalSets === 0 ? 0 : doneSets / totalSets,
  };
}

/** Weight × reps over validated sets. Timed work carries no tonnage. */
export function sessionVolume(session: Session): number {
  let volume = 0;
  for (const entry of session.exercises) {
    if (entry.unit !== "kg") continue;
    for (const set of entry.sets) {
      if (set.done) volume += set.weight * set.reps;
    }
  }
  return Math.round(volume);
}

/** The best validated set of an exercise, or null when nothing was validated. */
export function bestSet(entry: SessionExercise): SetEntry | null {
  let best: SetEntry | null = null;
  for (const set of entry.sets) {
    if (!set.done) continue;
    if (best === null || set.weight > best.weight || (set.weight === best.weight && set.reps > best.reps)) {
      best = set;
    }
  }
  return best;
}

export function beatsRecord(
  records: Record<string, PersonalRecord>,
  exerciseId: string,
  set: { weight: number; reps: number },
): boolean {
  const record = records[exerciseId];
  if (!record) return false;
  if (set.weight > record.weight) return true;
  return set.weight === record.weight && set.reps > record.reps;
}

/**
 * Closes a session: builds the history entry and the updated record book.
 *
 * A partial session is a first-class outcome — it is saved exactly like a
 * complete one, only the note differs.
 */
export function finishSession(
  session: Session,
  records: Record<string, PersonalRecord>,
  now: number,
): { entry: HistoryEntry; records: Record<string, PersonalRecord>; complete: boolean } {
  const progress = sessionProgress(session);
  const completedExercises = session.exercises.filter((entry) => entry.status === "done").length;
  const complete = completedExercises === session.exercises.length;
  const nextRecords = { ...records };
  const personalRecords: string[] = [];

  for (const entry of session.exercises) {
    // A one-off substitute counts in the volume, never in the record book.
    if (entry.unit !== "kg" || entry.replacedBy !== null) continue;
    const best = bestSet(entry);
    if (!best) continue;
    const previous = nextRecords[entry.exerciseId];
    const isBetter =
      !previous ||
      best.weight > previous.weight ||
      (best.weight === previous.weight && best.reps > previous.reps);
    if (isBetter) {
      if (previous) personalRecords.push(entry.shortName);
      nextRecords[entry.exerciseId] = { weight: best.weight, reps: best.reps, date: now };
    }
  }

  const durationMinutes = Math.max(1, Math.round((now - session.startedAt) / 60_000));
  const missing = session.exercises.length - completedExercises;

  const entry: HistoryEntry = {
    id: session.id,
    date: now,
    programId: session.programId,
    programName: session.programName,
    durationMinutes,
    completedExercises,
    totalExercises: session.exercises.length,
    completedSets: progress.doneSets,
    volume: sessionVolume(session),
    note: complete
      ? "Séance complète — cibles recalculées."
      : `${missing} exercice${missing > 1 ? "s" : ""} à reprendre la prochaine fois.`,
    personalRecords,
  };

  return { entry, records: nextRecords, complete };
}
