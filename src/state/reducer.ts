import { clampLoad, applySessionToPrograms, weightStep } from "../domain/progression.ts";
import { createSession, beatsRecord, finishSession } from "../domain/session.ts";
import { createInitialState } from "../domain/seed.ts";
import { lastSessionDate } from "../domain/stats.ts";
import type { AppState, Session, SessionExercise } from "../domain/types.ts";
import type { Action } from "./actions.ts";

/** Keep the log readable; a year of 4 sessions a week is ~200 entries. */
const HISTORY_LIMIT = 400;

function mapExercise(
  session: Session,
  exerciseId: string,
  update: (entry: SessionExercise) => SessionExercise,
): Session {
  let changed = false;
  const exercises = session.exercises.map((entry) => {
    if (entry.exerciseId !== exerciseId) return entry;
    changed = true;
    return update(entry);
  });
  return changed ? { ...session, exercises } : session;
}

/** After finishing or skipping an exercise, land on the next unfinished one. */
function focusNextPending(session: Session, fromIndex: number): number {
  const forward = session.exercises.findIndex(
    (entry, index) => index > fromIndex && entry.status === "pending",
  );
  if (forward !== -1) return forward;
  const any = session.exercises.findIndex((entry) => entry.status === "pending");
  return any === -1 ? fromIndex : any;
}

function withSetsUpdated(
  entry: SessionExercise,
  setIndex: number,
  update: (set: SessionExercise["sets"][number]) => SessionExercise["sets"][number],
): SessionExercise {
  const sets = entry.sets.map((set, index) => (index === setIndex ? update(set) : set));
  return { ...entry, sets };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "state/replace":
      return action.state;

    case "state/reset":
      return createInitialState(action.now);

    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "program/setTarget":
    case "program/adjustTarget": {
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          return {
            ...program,
            exercises: program.exercises.map((exercise) => {
              if (exercise.id !== action.exerciseId) return exercise;
              const targetWeights = exercise.targetWeights.map((weight, index) => {
                if (index !== action.setIndex) return weight;
                return clampLoad(
                  action.type === "program/setTarget" ? action.value : weight + action.delta,
                );
              });
              return { ...exercise, targetWeights };
            }),
          };
        }),
      };
    }

    case "session/start": {
      const { session } = createSession({
        program: action.program,
        now: action.now,
        id: action.id,
        lastSessionDate: lastSessionDate(state.history),
      });
      return { ...state, session };
    }

    case "session/abandon":
      return { ...state, session: null };

    case "session/finish": {
      if (!state.session) return state;
      const { entry, records } = finishSession(state.session, state.records, action.now);
      const complete = entry.completedExercises === entry.totalExercises;
      return {
        ...state,
        session: null,
        programs: applySessionToPrograms(state.programs, state.session),
        history: [entry, ...state.history].slice(0, HISTORY_LIMIT),
        records,
        // Only a completed session advances the Upper/Lower rotation.
        lastCompletedProgramId: complete ? entry.programId : state.lastCompletedProgramId,
      };
    }

    case "session/focus": {
      if (!state.session) return state;
      const index = state.session.exercises.findIndex(
        (entry) => entry.exerciseId === action.exerciseId,
      );
      if (index === -1) return state;
      return { ...state, session: { ...state.session, currentIndex: index } };
    }

    case "session/setValue":
    case "session/adjust": {
      if (!state.session) return state;
      const session = mapExercise(state.session, action.exerciseId, (entry) =>
        withSetsUpdated(entry, action.setIndex, (set) => {
          if (action.field === "weight") {
            const next =
              action.type === "session/setValue" ? action.value : set.weight + action.delta;
            return { ...set, weight: clampLoad(next) };
          }
          const next = action.type === "session/setValue" ? action.value : set.reps + action.delta;
          return { ...set, reps: Math.max(0, Math.round(next)) };
        }),
      );
      return { ...state, session };
    }

    case "session/toggleSet": {
      if (!state.session) return state;
      const target = state.session.exercises.find(
        (entry) => entry.exerciseId === action.exerciseId,
      );
      if (!target) return state;

      const session = mapExercise(state.session, action.exerciseId, (entry) => {
        const updated = withSetsUpdated(entry, action.setIndex, (set) => {
          const done = !set.done;
          return {
            ...set,
            done,
            pr:
              done &&
              entry.unit === "kg" &&
              beatsRecord(state.records, entry.exerciseId, set),
          };
        });
        const everySetDone = updated.sets.every((set) => set.done);
        return {
          ...updated,
          status: everySetDone ? "done" : entry.status === "skipped" ? "skipped" : "pending",
        };
      });

      const index = session.exercises.findIndex((entry) => entry.exerciseId === action.exerciseId);
      const nowDone = session.exercises[index]?.status === "done";
      return {
        ...state,
        session: {
          ...session,
          currentIndex: nowDone ? focusNextPending(session, index) : index,
        },
      };
    }

    case "session/setEffort": {
      if (!state.session) return state;
      return {
        ...state,
        session: mapExercise(state.session, action.exerciseId, (entry) => ({
          ...entry,
          effort: entry.effort === action.effort ? null : action.effort,
        })),
      };
    }

    case "session/skip": {
      if (!state.session) return state;
      const session = mapExercise(state.session, action.exerciseId, (entry) => ({
        ...entry,
        status: "skipped",
      }));
      const index = session.exercises.findIndex((entry) => entry.exerciseId === action.exerciseId);
      return { ...state, session: { ...session, currentIndex: focusNextPending(session, index) } };
    }

    case "session/resume": {
      if (!state.session) return state;
      const session = mapExercise(state.session, action.exerciseId, (entry) => ({
        ...entry,
        status: entry.sets.every((set) => set.done) ? "done" : "pending",
      }));
      const index = session.exercises.findIndex((entry) => entry.exerciseId === action.exerciseId);
      return { ...state, session: { ...session, currentIndex: Math.max(0, index) } };
    }

    case "session/replace": {
      if (!state.session) return state;
      return {
        ...state,
        session: mapExercise(state.session, action.exerciseId, (entry) => ({
          ...entry,
          replacedBy: action.alternative,
          status: entry.status === "skipped" ? "pending" : entry.status,
        })),
      };
    }

    case "session/addSet": {
      if (!state.session) return state;
      return {
        ...state,
        session: mapExercise(state.session, action.exerciseId, (entry) => {
          const last = entry.sets.at(-1);
          const weight = last?.weight ?? 0;
          return {
            ...entry,
            status: "pending",
            sets: [...entry.sets, { weight, reps: entry.repMin, done: false, pr: false }],
          };
        }),
      };
    }

    case "session/removeSet": {
      if (!state.session) return state;
      return {
        ...state,
        session: mapExercise(state.session, action.exerciseId, (entry) => {
          if (entry.sets.length <= 1) return entry;
          const sets = entry.sets.slice(0, -1);
          return { ...entry, sets, status: sets.every((set) => set.done) ? "done" : "pending" };
        }),
      };
    }

    default: {
      // Exhaustiveness guard: adding an action without a case fails typecheck.
      const never: never = action;
      return never;
    }
  }
}

/** Step used by the +/− controls for a given set of an exercise. */
export function stepFor(entry: SessionExercise, setIndex: number): number {
  const weight = entry.sets[setIndex]?.weight ?? 0;
  return weightStep(entry.unit, entry.group, weight);
}
