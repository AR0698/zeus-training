import { isInCircuit, nextCircuitIndex, withSetDone } from "./circuit.ts";
import type { Place, Program, Session, SessionExercise } from "./types.ts";

/**
 * Salle ou maison : chaque séance a son onglet, et une séance à la maison se
 * fait en cartes, une série à la fois.
 */

export function programPlace(program: Program): Place {
  return program.place ?? "gym";
}

/** Les séances d'un onglet, dans l'ordre de la liste — celui de la rotation. */
export function programsAt(programs: readonly Program[], place: Place): Program[] {
  return programs.filter((program) => programPlace(program) === place);
}

/** Une série encore à faire, sur un exercice ni fini ni passé. */
function isPending(entry: SessionExercise): boolean {
  return entry.status === "pending" && entry.sets.some((set) => !set.done);
}

/**
 * L'exercice qui suivra celui de la carte, pour le « Ensuite : … ».
 *
 * En circuit : le suivant du tour une fois la série en cours faite — le premier
 * du tour suivant en fin de tour, la première série classique après le dernier
 * tour. Hors circuit : le prochain exercice à faire plus loin dans la séance.
 * `null` quand plus rien ne suit.
 */
export function upNext(session: Session): SessionExercise | null {
  const index = session.currentIndex;
  const current = session.exercises[index];
  if (!current) return null;

  if (isInCircuit(session, index)) {
    const setIndex = current.sets.findIndex((set) => !set.done);
    const after = setIndex === -1 ? session : withSetDone(session, index, setIndex);
    const next = nextCircuitIndex(after, index);
    if (next !== null && next !== index) return session.exercises[next] ?? null;
  }

  return session.exercises.find((entry, position) => position > index && isPending(entry)) ?? null;
}
