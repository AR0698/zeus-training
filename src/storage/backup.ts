import { parseAppState } from "../state/schema.ts";
import type { AppState } from "../domain/types.ts";

/**
 * Export / import is the safety net of a local-first app: it is the only way to
 * move data to a new phone, and the only thing standing between the user and a
 * cleared browser storage. It is deliberately a plain, readable JSON file.
 */

export type BackupFile = {
  app: "zeus-training";
  exportedAt: string;
  state: AppState;
};

export function buildBackup(state: AppState, now: number): BackupFile {
  return { app: "zeus-training", exportedAt: new Date(now).toISOString(), state };
}

export function backupFilename(now: number): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `zeus-training-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

export function downloadBackup(state: AppState, now: number): void {
  const blob = new Blob([JSON.stringify(buildBackup(state, now), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = backupFilename(now);
  document.body.append(link);
  link.click();
  link.remove();
  // Give Safari a tick before revoking, otherwise the download can be dropped.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type ImportResult =
  | { ok: true; state: AppState; issues: string[] }
  | { ok: false; error: string };

/** Accepts both a full backup envelope and a bare state object. */
export function readBackup(text: string, now: number): ImportResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "Le fichier n'est pas un JSON valide." };
  }

  const candidate =
    typeof raw === "object" && raw !== null && "state" in raw
      ? (raw as { state: unknown }).state
      : raw;

  const parsed = parseAppState(candidate, now);
  if (parsed.fresh) {
    return { ok: false, error: "Le fichier ne contient aucune donnée Zeus Training." };
  }
  return { ok: true, state: parsed.state, issues: parsed.issues };
}

/**
 * Choix d'un fichier puis relecture, en une étape.
 * `null` quand la personne a fermé le sélecteur sans rien choisir — ce n'est
 * pas une erreur et l'appelant ne doit rien afficher.
 */
export async function pickAndReadBackup(now: number): Promise<ImportResult | null> {
  const text = await pickBackupFile();
  if (text === null) return null;
  return readBackup(text, now);
}

export async function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      file
        .text()
        .then(resolve)
        .catch(() => resolve(null));
    });
    input.click();
  });
}
