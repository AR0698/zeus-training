import type { OnboardingChoice } from "../domain/onboarding.ts";
import type { PackId } from "../domain/packs.ts";
import type { AppState, Circuit, Effort, ExerciseTemplate, Place, Program, Settings } from "../domain/types.ts";

/**
 * Every state change in the app is one of these actions.
 *
 * Nothing mutates `AppState` outside the reducer, so any bug is reproducible
 * from a state plus a list of actions — no hidden setState scattered in views.
 */
export type Action =
  | { type: "state/replace"; state: AppState }
  | { type: "state/reset"; now: number }
  | { type: "settings/update"; patch: Partial<Settings> }
  | { type: "onboarding/finish"; choice: OnboardingChoice }
  | { type: "backup/exported"; now: number }
  | { type: "backup/snooze"; now: number }
  | { type: "program/setTarget"; programId: string; exerciseId: string; setIndex: number; value: number }
  | { type: "program/adjustTarget"; programId: string; exerciseId: string; setIndex: number; delta: number }
  /** `place` absent : une séance de salle. */
  | { type: "program/create"; id: string; place?: Place }
  /** Ajoute les séances d'un paquet (poids du corps) à la suite des siennes. */
  | { type: "program/addPack"; packId: PackId }
  | { type: "program/duplicate"; programId: string; id: string }
  | { type: "program/delete"; programId: string }
  | { type: "program/move"; programId: string; direction: -1 | 1 }
  | {
      type: "program/update";
      programId: string;
      patch: Partial<Pick<Program, "name" | "focus" | "warmup" | "accent" | "estimatedMinutes">>;
    }
  /** Règle le mode tours d'une séance ; `null` le retire. */
  | { type: "program/setCircuit"; programId: string; circuit: Circuit | null }
  | { type: "program/addExercise"; programId: string; exercise: ExerciseTemplate }
  | { type: "program/removeExercise"; programId: string; exerciseId: string }
  | { type: "program/moveExercise"; programId: string; exerciseId: string; direction: -1 | 1 }
  | {
      type: "program/updateExercise";
      programId: string;
      exerciseId: string;
      patch: Partial<ExerciseTemplate>;
    }
  | { type: "session/start"; program: Program; now: number; id: string }
  | { type: "session/abandon" }
  | { type: "session/restoreAbandoned" }
  | { type: "session/discardAbandoned" }
  | { type: "session/finish"; now: number }
  | { type: "session/focus"; exerciseId: string }
  | { type: "session/setValue"; exerciseId: string; setIndex: number; field: "weight" | "reps"; value: number }
  | { type: "session/adjust"; exerciseId: string; setIndex: number; field: "weight" | "reps"; delta: number }
  | { type: "session/toggleSet"; exerciseId: string; setIndex: number; now: number }
  | { type: "session/setEffort"; exerciseId: string; effort: Effort }
  | { type: "session/setNote"; exerciseId: string; note: string }
  | { type: "session/skip"; exerciseId: string }
  | { type: "session/resume"; exerciseId: string }
  | { type: "session/replace"; exerciseId: string; alternative: string }
  /** Le remplaçant devient l'exercice du programme, dès la prochaine séance. */
  | { type: "session/keepReplacement"; exerciseId: string; alternative: string }
  | { type: "session/addSet"; exerciseId: string }
  | { type: "session/removeSet"; exerciseId: string };

/** Actions worth offering an "Annuler" for: they destroy or commit something. */
/**
 * Écrits sans attendre : une série validée ne doit pas dépendre de la page qui
 * reste ouverte 400 ms de plus. Le reste (une charge réglée au pas-à-pas, une
 * note tapée) se regroupe sans risque.
 */
export const SAVE_NOW: ReadonlySet<Action["type"]> = new Set([
  "session/start",
  "session/toggleSet",
  "session/finish",
  "session/abandon",
]);

export const UNDOABLE: ReadonlySet<Action["type"]> = new Set([
  "session/skip",
  "session/finish",
  "session/abandon",
  "session/discardAbandoned",
  "session/removeSet",
  "state/reset",
  "state/replace",
  "program/delete",
  "program/removeExercise",
  "session/keepReplacement",
]);
