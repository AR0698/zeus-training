import type { AppState, Effort, Program, Settings } from "../domain/types.ts";

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
  | { type: "program/setTarget"; programId: string; exerciseId: string; setIndex: number; value: number }
  | { type: "program/adjustTarget"; programId: string; exerciseId: string; setIndex: number; delta: number }
  | { type: "session/start"; program: Program; now: number; id: string }
  | { type: "session/abandon" }
  | { type: "session/finish"; now: number }
  | { type: "session/focus"; exerciseId: string }
  | { type: "session/setValue"; exerciseId: string; setIndex: number; field: "weight" | "reps"; value: number }
  | { type: "session/adjust"; exerciseId: string; setIndex: number; field: "weight" | "reps"; delta: number }
  | { type: "session/toggleSet"; exerciseId: string; setIndex: number; now: number }
  | { type: "session/setEffort"; exerciseId: string; effort: Effort }
  | { type: "session/skip"; exerciseId: string }
  | { type: "session/resume"; exerciseId: string }
  | { type: "session/replace"; exerciseId: string; alternative: string }
  | { type: "session/addSet"; exerciseId: string }
  | { type: "session/removeSet"; exerciseId: string };

/** Actions worth offering an "Annuler" for: they destroy or commit something. */
export const UNDOABLE: ReadonlySet<Action["type"]> = new Set([
  "session/skip",
  "session/finish",
  "session/abandon",
  "session/removeSet",
  "state/reset",
  "state/replace",
]);
