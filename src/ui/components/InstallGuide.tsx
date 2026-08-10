import { installReason, installSteps, platformLabel } from "../../domain/install.ts";
import type { InstallPrompt } from "../../hooks/useInstallPrompt.ts";
import { IconCheck, IconDownload, IconShare } from "../icons.tsx";

/**
 * Comment mettre l'app sur l'écran d'accueil.
 *
 * Trois situations, jamais mélangées : c'est déjà fait, le navigateur sait
 * l'installer d'un bouton, ou il faut passer par son menu. Dans le dernier cas
 * les étapes sont nommées comme les boutons réels — les consignes vagues ne se
 * suivent pas sur un téléphone qu'on tient d'une main.
 */
export function InstallGuide({
  install,
  onInstalled,
}: {
  install: InstallPrompt;
  onInstalled?: () => void;
}) {
  if (install.isStandalone) {
    return (
      <div className="install-done">
        <span className="install-done-icon" aria-hidden="true">
          <IconCheck size={18} />
        </span>
        <div>
          <strong>C&apos;est déjà fait</strong>
          <p>
            Tu as ouvert Zeus depuis son icône : elle tourne en plein écran, hors ligne, et son
            stockage est à l&apos;abri des nettoyages du navigateur.
          </p>
        </div>
      </div>
    );
  }

  const steps = installSteps(install.platform);

  return (
    <>
      <p className="install-reason">{installReason(install.platform)}</p>

      {install.canPrompt && (
        <button
          type="button"
          className="button button-accent install-now"
          onClick={() => {
            void install.prompt().then((outcome) => {
              if (outcome === "accepted") onInstalled?.();
            });
          }}
        >
          <IconDownload size={18} />
          Installer maintenant
        </button>
      )}

      <ol className="install-steps">
        {steps.map((step, index) => (
          <li key={step.action}>
            <span className="install-step-index tabular" aria-hidden="true">
              {index + 1}
            </span>
            <span>
              <strong>{step.action}</strong>
              {step.detail && <small>{step.detail}</small>}
            </span>
          </li>
        ))}
      </ol>

      <p className="install-platform">
        {install.platform === "ios" && <IconShare size={14} />}
        Consignes pour {platformLabel(install.platform)}. Sur un autre appareil, cherche « ajouter à
        l&apos;écran d&apos;accueil » dans le menu du navigateur.
      </p>
    </>
  );
}
