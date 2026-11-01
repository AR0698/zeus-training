import { ACCENTS, SESSION_MINUTES, makeEmptyProgram, patchExercise } from "../domain/library.ts";
import { isInCircuit, nextCircuitIndex } from "../domain/circuit.ts";
import { completeOnboarding } from "../domain/onboarding.ts";
import { addPack } from "../domain/packs.ts";
import { clampLoad, applySessionToPrograms, openingReps, weightStep } from "../domain/progression.ts";
import { cleanReplacementName, keptSessionEntry, keptTemplate } from "../domain/replacement.ts";
import { NOTE_MAX_LENGTH, createSession, beatsRecord, finishSession } from "../domain/session.ts";
import { createInitialState } from "../domain/seed.ts";
import { lastSessionDate } from "../domain/stats.ts";
import type { AppState, Program, Session, SessionExercise } from "../domain/types.ts";
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

/**
 * Où se pose la mise au point après une série touchée. En circuit, chaque
 * série validée passe à l'exercice suivant du tour ; une fois le circuit fini,
 * la suite reprend exercice par exercice.
 */
function focusAfterToggle(session: Session, index: number, validated: boolean): number {
  if (validated && isInCircuit(session, index)) {
    return nextCircuitIndex(session, index) ?? focusNextPending(session, index);
  }
  return session.exercises[index]?.status === "done" ? focusNextPending(session, index) : index;
}

function withSetsUpdated(
  entry: SessionExercise,
  setIndex: number,
  update: (set: SessionExercise["sets"][number]) => SessionExercise["sets"][number],
): SessionExercise {
  const sets = entry.sets.map((set, index) => (index === setIndex ? update(set) : set));
  return { ...entry, sets };
}

/** Remplacement le temps d'une séance : le programme n'en saura rien. */
function replaceForSession(state: AppState, exerciseId: string, alternative: string): AppState {
  const name = cleanReplacementName(alternative);
  if (!state.session || name === null) return state;
  return {
    ...state,
    session: mapExercise(state.session, exerciseId, (entry) => ({
      ...entry,
      // Revenir au mouvement prévu n'est pas un remplacement.
      replacedBy: name === entry.name ? null : name,
      status: entry.status === "skipped" ? "pending" : entry.status,
    })),
  };
}

/**
 * Remplacement gardé : l'exercice du programme est échangé à sa place, et la
 * séance en cours bascule dessus. Si le programme ou l'exercice a disparu
 * entre-temps, il ne reste qu'un remplacement pour la séance.
 */
function keepReplacement(state: AppState, exerciseId: string, alternative: string): AppState {
  const name = cleanReplacementName(alternative);
  const session = state.session;
  if (!session || name === null) return state;
  const entry = session.exercises.find((item) => item.exerciseId === exerciseId);
  const program = state.programs.find((item) => item.id === session.programId);
  const original = program?.exercises.find((item) => item.id === exerciseId);
  if (!entry || !program || !original || name === entry.name) {
    return replaceForSession(state, exerciseId, alternative);
  }

  const kept = keptTemplate(program, original, entry, name);
  return {
    ...state,
    programs: state.programs.map((item) =>
      item.id === program.id
        ? {
            ...item,
            exercises: item.exercises.map((exercise) =>
              exercise.id === exerciseId ? kept : exercise,
            ),
          }
        : item,
    ),
    session: mapExercise(session, exerciseId, (current) => keptSessionEntry(current, kept)),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "state/replace":
      return action.state;

    case "state/reset":
      return createInitialState(action.now);

    case "settings/update":
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case "onboarding/finish":
      return completeOnboarding(state, action.choice);

    // Un export réussi remet le compteur du rappel mensuel à zéro, et efface le
    // report en cours : la question suivante se posera dans un mois, pas dans
    // les sept jours restants du dernier « plus tard ».
    case "backup/exported":
      return { ...state, lastBackupAt: action.now, backupPromptedAt: null };

    case "backup/snooze":
      return { ...state, backupPromptedAt: action.now };

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

    case "program/create": {
      const accent = ACCENTS[state.programs.length % ACCENTS.length] ?? "acid";
      return { ...state, programs: [...state.programs, makeEmptyProgram(action.id, accent, action.place)] };
    }

    case "program/addPack":
      return addPack(state, action.packId);

    case "program/duplicate": {
      const source = state.programs.find((program) => program.id === action.programId);
      if (!source) return state;
      const copy: Program = {
        ...structuredClone(source),
        id: action.id,
        name: `${source.name} (copie)`,
      };
      const index = state.programs.indexOf(source);
      const programs = [...state.programs];
      programs.splice(index + 1, 0, copy);
      return { ...state, programs };
    }

    case "program/delete": {
      const programs = state.programs.filter((program) => program.id !== action.programId);
      if (programs.length === state.programs.length) return state;
      return {
        ...state,
        programs,
        // The rotation must not point at a program that no longer exists.
        lastCompletedProgramId:
          state.lastCompletedProgramId === action.programId ? null : state.lastCompletedProgramId,
      };
    }

    case "program/move": {
      const index = state.programs.findIndex((program) => program.id === action.programId);
      const target = index + action.direction;
      if (index === -1 || target < 0 || target >= state.programs.length) return state;
      const programs = [...state.programs];
      const [moved] = programs.splice(index, 1);
      if (!moved) return state;
      programs.splice(target, 0, moved);
      return { ...state, programs };
    }

    case "program/update": {
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          const patch = action.patch;
          return {
            ...program,
            ...patch,
            name: (patch.name ?? program.name).trim() || "Séance sans titre",
            estimatedMinutes: Math.max(
              SESSION_MINUTES.min,
              Math.min(
                SESSION_MINUTES.max,
                Math.round(patch.estimatedMinutes ?? program.estimatedMinutes),
              ),
            ),
          };
        }),
      };
    }

    case "program/addExercise": {
      return {
        ...state,
        programs: state.programs.map((program) =>
          program.id === action.programId
            ? { ...program, exercises: [...program.exercises, action.exercise] }
            : program,
        ),
      };
    }

    case "program/removeExercise": {
      return {
        ...state,
        programs: state.programs.map((program) =>
          program.id === action.programId
            ? {
                ...program,
                exercises: program.exercises.filter(
                  (exercise) => exercise.id !== action.exerciseId,
                ),
              }
            : program,
        ),
      };
    }

    case "program/moveExercise": {
      return {
        ...state,
        programs: state.programs.map((program) => {
          if (program.id !== action.programId) return program;
          const index = program.exercises.findIndex(
            (exercise) => exercise.id === action.exerciseId,
          );
          const target = index + action.direction;
          if (index === -1 || target < 0 || target >= program.exercises.length) return program;
          const exercises = [...program.exercises];
          const [moved] = exercises.splice(index, 1);
          if (!moved) return program;
          exercises.splice(target, 0, moved);
          return { ...program, exercises };
        }),
      };
    }

    case "program/updateExercise": {
      return {
        ...state,
        programs: state.programs.map((program) =>
          program.id === action.programId
            ? {
                ...program,
                exercises: program.exercises.map((exercise) =>
                  exercise.id === action.exerciseId
                    ? patchExercise(exercise, action.patch)
                    : exercise,
                ),
              }
            : program,
        ),
      };
    }

    case "session/start": {
      const { session } = createSession({
        program: action.program,
        now: action.now,
        id: action.id,
        lastSessionDate: lastSessionDate(state.history),
      });
      // Une nouvelle séance remplace celle qu'on aurait pu reprendre.
      return { ...state, session, abandonedSession: null };
    }

    // Abandonner met la séance de côté au lieu de l'effacer : elle reste
    // reprenable depuis l'accueil jusqu'au démarrage d'une autre.
    case "session/abandon":
      if (!state.session) return state;
      return { ...state, session: null, abandonedSession: state.session };

    case "session/restoreAbandoned":
      // Jamais par-dessus une séance en cours : elle serait perdue à son tour.
      if (state.session || !state.abandonedSession) return state;
      return { ...state, session: state.abandonedSession, abandonedSession: null };

    case "session/discardAbandoned":
      return { ...state, abandonedSession: null };

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
            // Un remplaçant d'un jour ne se mesure pas aux records d'une autre machine.
            pr:
              done &&
              entry.unit === "kg" &&
              entry.replacedBy === null &&
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
      const validated = session.exercises[index]?.sets[action.setIndex]?.done === true;
      return { ...state, session: { ...session, currentIndex: focusAfterToggle(session, index, validated) } };
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

    case "session/setNote": {
      if (!state.session) return state;
      return {
        ...state,
        session: mapExercise(state.session, action.exerciseId, (entry) => ({
          ...entry,
          note: action.note.slice(0, NOTE_MAX_LENGTH),
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

    case "session/replace":
      return replaceForSession(state, action.exerciseId, action.alternative);

    case "session/keepReplacement":
      return keepReplacement(state, action.exerciseId, action.alternative);

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
            sets: [...entry.sets, { weight, reps: openingReps(entry.unit, entry.repMin), done: false, pr: false }],
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
