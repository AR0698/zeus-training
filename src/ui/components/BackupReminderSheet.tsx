import { BACKUP_SNOOZE_DAYS, daysSinceBackup } from "../../domain/reminder.ts";
import type { AppState } from "../../domain/types.ts";
import { IconDownload, IconWifiOff } from "../icons.tsx";
import { Sheet } from "./Sheet.tsx";

/**
 * Rappel mensuel de sauvegarde.
 *
 * Le texte est long à dessein. Un bandeau « pense à sauvegarder » se balaie sans
 * réfléchir ; ce qu'il faut faire comprendre, c'est qu'il n'existe pas de
 * deuxième copie et que personne ne pourra rien restaurer — y compris l'auteur
 * de l'application. Il apparaît au maximum une fois par mois, et jamais tant
 * qu'il n'y a rien à perdre.
 */
export function BackupReminderSheet({
  state,
  open,
  now,
  onExport,
  onLater,
}: {
  state: AppState;
  open: boolean;
  now: number;
  onExport: () => void;
  onLater: () => void;
}) {
  const days = daysSinceBackup(state, now);

  return (
    <Sheet open={open} onClose={onLater} label="Rappel de sauvegarde">
      <span className="kicker">Sauvegarde mensuelle</span>
      <h2 className="sheet-title">
        {days === null ? "Tu n'as jamais sauvegardé" : `Dernière sauvegarde il y a ${days} jours`}
      </h2>

      <div className="banner banner-warn" role="note">
        <IconWifiOff size={18} />
        <p>
          <strong>Tout est stocké sur ce téléphone, et nulle part ailleurs.</strong> Téléphone perdu
          ou cassé, application désinstallée, données du navigateur effacées : ton historique (
          {state.history.length} séance{state.history.length > 1 ? "s" : ""}), tes programmes et tes
          records disparaissent définitivement. Personne ne peut les restaurer.
        </p>
      </div>

      <ol className="technique-steps">
        <li>
          <span className="step-index">01</span>
          <p>
            <strong>Exporter</strong> télécharge un fichier <span className="tabular">.json</span> —
            l&apos;intégralité de tes programmes, séances et records.
          </p>
        </li>
        <li>
          <span className="step-index">02</span>
          <p>
            Dépose-le là où il survivra au téléphone : <strong>Google Drive</strong>,{" "}
            <strong>iCloud</strong>, ou un mail que tu t&apos;envoies à toi-même.
          </p>
        </li>
        <li>
          <span className="step-index">03</span>
          <p>
            Sur un nouveau téléphone, <strong>Réglages → Importer</strong> relit ce fichier et tout
            revient à l&apos;identique.
          </p>
        </li>
      </ol>

      <div className="stack">
        <button type="button" className="button button-accent" onClick={onExport}>
          <IconDownload size={18} />
          Exporter ma sauvegarde
        </button>
        <button type="button" className="button button-ghost" onClick={onLater}>
          Plus tard — me le rappeler dans {BACKUP_SNOOZE_DAYS} jours
        </button>
      </div>
    </Sheet>
  );
}
