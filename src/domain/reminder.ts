import type { AppState } from "./types.ts";

/**
 * Rappel de sauvegarde.
 *
 * Une application locale n'a qu'une seule copie des données. Le téléphone
 * perdu, l'app désinstallée ou le stockage du navigateur nettoyé, et
 * l'historique disparaît sans récupération possible. Le seul filet est un
 * export manuel — donc l'app doit le réclamer d'elle-même, régulièrement.
 *
 * Fonction pure du couple (état, instant) : aucune horloge lue ici, ce qui rend
 * les quatre cas ci-dessous testables sans attendre un mois.
 */

const DAY_MS = 86_400_000;

/** Une fois par mois : assez pour ne rien perdre, assez rare pour ne pas lasser. */
export const BACKUP_INTERVAL_DAYS = 30;

/** Report quand on répond « plus tard ». */
export const BACKUP_SNOOZE_DAYS = 7;

/** Point de départ du décompte : dernière sauvegarde, ou premier lancement. */
function lastBackupAnchor(state: AppState): number {
  return state.lastBackupAt ?? state.createdAt;
}

export function shouldPromptBackup(state: AppState, now: number): boolean {
  // Rien à perdre : ni séance enregistrée, ni programme composé.
  if (state.history.length === 0 && state.programs.length === 0) return false;
  // L'écran d'accueil parle déjà de la sauvegarde ; deux messages d'affilée
  // sur le même sujet ne se lisent pas.
  if (state.onboardedAt === null) return false;

  const backedUpAt = lastBackupAnchor(state);
  const snoozedAt = state.backupPromptedAt ?? 0;
  const postponed = snoozedAt > backedUpAt;
  const anchor = postponed ? snoozedAt : backedUpAt;
  const delay = (postponed ? BACKUP_SNOOZE_DAYS : BACKUP_INTERVAL_DAYS) * DAY_MS;

  return now - anchor >= delay;
}

/** Nombre de jours depuis le dernier export, ou `null` s'il n'y en a jamais eu. */
export function daysSinceBackup(state: AppState, now: number): number | null {
  if (state.lastBackupAt === null) return null;
  return Math.max(0, Math.floor((now - state.lastBackupAt) / DAY_MS));
}
