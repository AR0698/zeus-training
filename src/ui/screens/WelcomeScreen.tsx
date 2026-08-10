import { useState } from "react";
import type { StarterChoice } from "../../domain/onboarding.ts";
import type { AppState } from "../../domain/types.ts";
import { pickAndReadBackup } from "../../storage/backup.ts";
import { IconArrowRight, IconCopy, IconDumbbell, IconShield, IconUpload, IconWifiOff } from "../icons.tsx";

/**
 * Premier lancement.
 *
 * Trois choses doivent être réglées avant que l'application serve à quelque
 * chose, et elles le sont ici plutôt que par un défaut silencieux :
 *
 * 1. **À qui sont les séances.** Une installation neuve n'hérite d'aucun
 *    programme. C'est le point de départ d'une app qui se partage : chacun
 *    compose le sien, ou charge des exemples en connaissance de cause.
 * 2. **Où vivent les données.** Dit une fois, en toutes lettres, au moment où
 *    la personne peut encore décider de ne pas l'utiliser.
 * 3. **Qu'il existe une sauvegarde à importer**, pour qui arrive depuis un
 *    autre téléphone.
 */
export function WelcomeScreen({
  onChoose,
  onImport,
  notify,
}: {
  onChoose: (starter: StarterChoice, displayName: string) => void;
  onImport: (state: AppState, issues: string[]) => void;
  notify: (message: string, tone?: "success" | "warn" | "danger") => void;
}) {
  const [displayName, setDisplayName] = useState("");

  const handleImport = async () => {
    const result = await pickAndReadBackup(Date.now());
    if (result === null) return;
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    onImport(result.state, result.issues);
  };

  return (
    <div className="welcome">
      <header className="welcome-head">
        <span className="brand-mark" aria-hidden="true">
          Z
        </span>
        <h1 className="display">
          Zeus <b>Training</b>
        </h1>
        <p className="lead">
          Un carnet de musculation qui tient dans une main, entre deux séries. Pas de compte, pas de
          publicité, pas de connexion nécessaire.
        </p>
      </header>

      <section className="card welcome-privacy">
        <span className="welcome-privacy-icon" aria-hidden="true">
          <IconWifiOff size={18} />
        </span>
        <div>
          <h2 className="panel-title">Tes données restent sur ce téléphone</h2>
          <p>
            Rien n&apos;est envoyé sur un serveur, et personne d&apos;autre n&apos;y a accès. La
            contrepartie est réelle : <strong>il n&apos;existe aucune copie ailleurs</strong>. Si tu
            perds le téléphone, désinstalles l&apos;application ou effaces les données du navigateur,
            l&apos;historique part avec.
          </p>
          <p className="welcome-privacy-note">
            <IconShield size={15} />
            L&apos;app te rappellera une fois par mois d&apos;exporter une sauvegarde à déposer sur
            Drive, iCloud ou dans un mail à toi-même.
          </p>
        </div>
      </section>

      <label className="field">
        <span className="field-label">Ton prénom</span>
        <input
          className="field-input"
          type="text"
          autoComplete="given-name"
          placeholder="Optionnel"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <span className="field-help">Sert uniquement à te saluer sur l&apos;accueil.</span>
      </label>

      <h2 className="welcome-question">Par où commences-tu ?</h2>

      <div className="welcome-choices">
        <button
          type="button"
          className="welcome-choice is-primary"
          onClick={() => onChoose("blank", displayName)}
        >
          <span className="welcome-choice-icon">
            <IconDumbbell size={20} />
          </span>
          <span>
            <strong>Composer mes séances</strong>
            <small>
              Page blanche. Tu nommes ta séance et tu pioches dans un catalogue de mouvements dont
              les séries, répétitions et consignes sont déjà remplies.
            </small>
          </span>
          <IconArrowRight size={18} />
        </button>

        <button
          type="button"
          className="welcome-choice"
          onClick={() => onChoose("examples", displayName)}
        >
          <span className="welcome-choice-icon">
            <IconCopy size={20} />
          </span>
          <span>
            <strong>Partir de quatre séances d&apos;exemple</strong>
            <small>
              Un cycle haut / bas du corps prêt à démarrer, entièrement modifiable ensuite. Les
              charges proposées sont volontairement basses.
            </small>
          </span>
          <IconArrowRight size={18} />
        </button>

        <button type="button" className="welcome-choice" onClick={() => void handleImport()}>
          <span className="welcome-choice-icon">
            <IconUpload size={20} />
          </span>
          <span>
            <strong>J&apos;ai déjà une sauvegarde</strong>
            <small>
              Le fichier .json exporté depuis un autre téléphone : programmes, historique et
              records reviennent tels quels.
            </small>
          </span>
          <IconArrowRight size={18} />
        </button>
      </div>

      <p className="app-footnote">
        Les propositions de charge sont un outil de suivi, pas une prescription médicale. En cas de
        douleur inhabituelle, arrête la série.
      </p>
    </div>
  );
}
