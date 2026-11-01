import type { Circuit, Program, Session, SessionExercise } from "./types.ts";

/**
 * Le mode « tours » : les premiers exercices d'une séance s'enchaînent, une
 * série de chacun, et le repos ne vient qu'à la fin du tour.
 *
 * Tout ce qui décide (quel exercice ensuite, repos ou pas, combien) vit ici,
 * en fonctions pures : le reducer et l'écran ne font qu'appliquer.
 */

/** En dessous de deux exercices, enchaîner n'a pas de sens. */
const MIN_CIRCUIT_SIZE = 2;

/** Repos proposé quand on active les tours dans l'éditeur, et son pas de réglage. */
export const CIRCUIT_REST = { initial: 60, step: 15, min: 15 } as const;

/** Les tailles de circuit qu'on peut choisir pour une séance : de 2 à tous ses exercices. */
export function circuitSizeOptions(exerciseCount: number): number[] {
  const count = Math.max(0, exerciseCount - MIN_CIRCUIT_SIZE + 1);
  return Array.from({ length: count }, (_, index) => index + MIN_CIRCUIT_SIZE);
}

/**
 * Le circuit tel qu'il s'applique à une liste de `exerciseCount` exercices :
 * borné à leur nombre, ou `null` quand il n'en reste pas assez pour tourner.
 */
export function fitCircuit(circuit: Circuit | undefined, exerciseCount: number): Circuit | null {
  if (!circuit) return null;
  const size = Math.min(Math.round(circuit.size), exerciseCount);
  if (!(size >= MIN_CIRCUIT_SIZE)) return null;
  return { size, restSeconds: Math.max(0, Math.round(circuit.restSeconds)) };
}

function circuitSize(session: Session): number {
  return fitCircuit(session.circuit, session.exercises.length)?.size ?? 0;
}

export function isInCircuit(session: Session, index: number): boolean {
  return index >= 0 && index < circuitSize(session);
}

/** Un exercice du circuit encore à faire : ni passé, ni fini. */
function hasSetToDo(entry: SessionExercise): boolean {
  return entry.status === "pending" && entry.sets.some((set) => !set.done);
}

/**
 * L'exercice suivant du circuit qui a encore une série à faire, après
 * `fromIndex`, en rebouclant sur le premier pour le tour suivant. Les
 * exercices passés sont sautés. `null` quand le circuit est fini.
 */
export function nextCircuitIndex(session: Session, fromIndex: number): number | null {
  const size = circuitSize(session);
  for (let offset = 1; offset <= size; offset += 1) {
    const index = (fromIndex + offset) % size;
    const entry = session.exercises[index];
    if (entry && hasSetToDo(entry)) return index;
  }
  return null;
}

export type CircuitPosition = { round: number; rounds: number; step: number; steps: number };

/** « Tour 2/3 · exercice 3/5 » pour l'exercice `index`, ou `null` hors circuit. */
export function circuitPosition(session: Session, index: number): CircuitPosition | null {
  if (!isInCircuit(session, index)) return null;
  const entry = session.exercises[index];
  if (!entry) return null;
  const rounds = entry.sets.length;
  const done = entry.sets.filter((set) => set.done).length;
  return {
    round: Math.min(done + 1, rounds),
    rounds,
    step: index + 1,
    steps: circuitSize(session),
  };
}

export type GridCell = "done" | "current" | "todo" | "skipped";

export type CircuitGrid = {
  /** Le tour en cours, à partir de 1. */
  round: number;
  rounds: number;
  /** Une ligne par tour, une case par exercice du circuit. */
  rows: GridCell[][];
};

/**
 * La grille des tours affichée pendant la séance : on voit d'un coup d'œil
 * qu'on tourne, où l'on en est et ce qui reste. `null` hors circuit, et une
 * fois le circuit fini — la suite se fait en séries classiques.
 */
export function circuitGrid(session: Session): CircuitGrid | null {
  const size = circuitSize(session);
  if (!isInCircuit(session, session.currentIndex)) return null;
  const zone = session.exercises.slice(0, size);
  if (!zone.some(hasSetToDo)) return null;

  const rounds = Math.max(...zone.map((entry) => entry.sets.length));
  const doneCounts = zone.map((entry) => entry.sets.filter((set) => set.done).length);
  const active = zone.flatMap((entry, index) => (entry.status === "skipped" ? [] : [doneCounts[index] ?? 0]));
  const round = Math.min(rounds, 1 + Math.min(...active, rounds - 1));

  const rows = Array.from({ length: rounds }, (_, row) =>
    zone.map((entry, column): GridCell => {
      const done = doneCounts[column] ?? 0;
      if (row < done) return "done";
      if (entry.status === "skipped" || row >= entry.sets.length) return "skipped";
      if (column === session.currentIndex && row === done) return "current";
      return "todo";
    }),
  );
  return { round, rounds, rows };
}

export type RestDecision =
  /** Lancer le minuteur pour autant de secondes. */
  | { kind: "start"; seconds: number }
  /** Couper un minuteur éventuel : on enchaîne. */
  | { kind: "stop" }
  /** Ne toucher à rien. */
  | { kind: "none" };

export type RestSettings = { autoRest: boolean; defaultRestSeconds: number };

/**
 * Que faire du minuteur quand la série `setIndex` de `exerciseId` vient d'être
 * touchée. `session` est l'état *avant* le geste.
 *
 * - Annuler une série ne change rien au repos.
 * - Hors circuit : repos de l'exercice entre ses séries, arrêt après la dernière.
 * - En circuit : rien entre deux exercices d'un tour, le repos du circuit après
 *   le dernier, et plus rien une fois le dernier tour bouclé.
 */
export function restAfterValidation(
  session: Session,
  exerciseId: string,
  setIndex: number,
  settings: RestSettings,
): RestDecision {
  const index = session.exercises.findIndex((entry) => entry.exerciseId === exerciseId);
  const entry = session.exercises[index];
  const set = entry?.sets[setIndex];
  if (!entry || !set || set.done) return { kind: "none" };

  if (isInCircuit(session, index)) {
    return circuitRest(session, index, setIndex, settings);
  }

  if (setIndex === entry.sets.length - 1) return { kind: "stop" };
  if (!settings.autoRest) return { kind: "none" };
  const seconds = entry.restSeconds > 0 ? entry.restSeconds : settings.defaultRestSeconds;
  return { kind: "start", seconds };
}

function circuitRest(
  session: Session,
  index: number,
  setIndex: number,
  settings: RestSettings,
): RestDecision {
  const after = withSetDone(session, index, setIndex);
  const next = nextCircuitIndex(after, index);
  // Circuit fini, ou on passe à l'exercice suivant du même tour.
  if (next === null || next > index) return { kind: "stop" };
  if (!settings.autoRest) return { kind: "none" };
  const seconds = session.circuit?.restSeconds ?? 0;
  return { kind: "start", seconds: seconds > 0 ? seconds : settings.defaultRestSeconds };
}

/** La séance telle qu'elle sera une fois la série validée, statut compris. */
export function withSetDone(session: Session, index: number, setIndex: number): Session {
  return {
    ...session,
    exercises: session.exercises.map((entry, position) => {
      if (position !== index) return entry;
      const sets = entry.sets.map((set, i) => (i === setIndex ? { ...set, done: true } : set));
      return { ...entry, sets, status: sets.every((set) => set.done) ? "done" : entry.status };
    }),
  };
}

/**
 * Le repos que propose le bouton « Repos » de la carte : celui d'entre les
 * tours en circuit, celui de l'exercice sinon, et le réglage par défaut quand
 * l'exercice n'en a pas.
 */
export function manualRestSeconds(session: Session, index: number, defaultRestSeconds: number): number {
  const circuit = fitCircuit(session.circuit, session.exercises.length);
  if (circuit && index < circuit.size && circuit.restSeconds > 0) return circuit.restSeconds;
  const own = session.exercises[index]?.restSeconds ?? 0;
  return own > 0 ? own : defaultRestSeconds;
}

/** « 3 tours · repos 60 s » pour la carte du programme, ou `null` sans circuit. */
export function circuitSummary(program: Program): string | null {
  const circuit = fitCircuit(program.circuit, program.exercises.length);
  if (!circuit) return null;
  const rounds = Math.max(...program.exercises.slice(0, circuit.size).map((exercise) => exercise.sets));
  return `${rounds} tour${rounds > 1 ? "s" : ""} · repos ${circuit.restSeconds} s`;
}
