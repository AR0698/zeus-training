import { packPrograms } from "./packs.ts";
import { examplePrograms } from "./seed.ts";
import type { AppState } from "./types.ts";

/**
 * Premier lancement.
 *
 * L'application se partage : chaque personne qui l'installe doit démarrer avec
 * *ses* séances, pas avec celles de la personne qui a construit l'app. D'où un
 * état neuf sans aucun programme, et un choix explicite au démarrage.
 *
 * `onboardedAt` porte ce choix. Il vaut `null` tant qu'il n'a pas été fait, ce
 * qui rend la question impossible à sauter par accident : aucun écran de
 * l'application n'est atteignable avant.
 */

export type StarterChoice = "blank" | "examples" | "bodyweight";

export type OnboardingChoice = {
  now: number;
  starter: StarterChoice;
  displayName: string;
};

function starterPrograms(starter: StarterChoice, state: AppState): AppState["programs"] {
  if (starter === "examples") return examplePrograms();
  if (starter === "bodyweight") return packPrograms("bodyweight-transition");
  return state.programs;
}

export function isOnboarded(state: AppState): boolean {
  return state.onboardedAt !== null;
}

export function completeOnboarding(state: AppState, choice: OnboardingChoice): AppState {
  return {
    ...state,
    onboardedAt: choice.now,
    // « Repartir de zéro » ne doit pas effacer un programme déjà commencé :
    // seuls les choix d'exemples ajoutent quelque chose. Le poids du corps
    // charge la transition, qui ne demande aucun matériel ; le programme
    // principal s'ajoute ensuite depuis l'écran Programmes.
    programs: starterPrograms(choice.starter, state),
    settings: { ...state.settings, displayName: choice.displayName.trim().slice(0, 40) },
  };
}

/**
 * Une sauvegarde importée depuis l'écran d'accueil vaut choix : la personne a
 * ses données, la question ne se repose pas au prochain lancement.
 */
export function markOnboarded(state: AppState, now: number): AppState {
  return state.onboardedAt === null ? { ...state, onboardedAt: now } : state;
}
