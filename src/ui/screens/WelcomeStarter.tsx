import type { StarterChoice } from "../../domain/onboarding.ts";
import { IconArrowRight, IconCopy, IconDumbbell, IconHome, IconUpload } from "../icons.tsx";

/**
 * Le dernier écran de l'accueil : à qui sont les séances.
 *
 * Une installation neuve n'hérite d'aucun programme — c'est la condition pour
 * qu'une app se donne à quelqu'un d'autre sans lui imposer le cycle de son
 * auteur. Le choix est donc explicite, et aucun des trois n'est un défaut
 * silencieux.
 */
export function WelcomeStarter({
  displayName,
  onNameChange,
  onChoose,
  onImport,
}: {
  displayName: string;
  onNameChange: (value: string) => void;
  onChoose: (starter: StarterChoice) => void;
  onImport: () => void;
}) {
  return (
    <>
      <label className="field">
        <span className="field-label">Ton prénom</span>
        <input
          className="field-input"
          type="text"
          autoComplete="given-name"
          placeholder="Optionnel"
          value={displayName}
          onChange={(event) => onNameChange(event.target.value)}
        />
        <span className="field-help">Sert uniquement à te saluer sur l&apos;accueil.</span>
      </label>

      <div className="welcome-choices">
        <button
          type="button"
          className="welcome-choice is-primary"
          onClick={() => onChoose("blank")}
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

        <button type="button" className="welcome-choice" onClick={() => onChoose("examples")}>
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

        <button type="button" className="welcome-choice" onClick={() => onChoose("bodyweight")}>
          <span className="welcome-choice-icon">
            <IconHome size={20} />
          </span>
          <span>
            <strong>Partir du poids du corps</strong>
            <small>
              Quatre séances de 30 minutes sans salle ni matériel. Le programme avec barre et
              élastiques s&apos;ajoute plus tard depuis l&apos;écran Programmes.
            </small>
          </span>
          <IconArrowRight size={18} />
        </button>

        <button type="button" className="welcome-choice" onClick={onImport}>
          <span className="welcome-choice-icon">
            <IconUpload size={20} />
          </span>
          <span>
            <strong>J&apos;ai déjà une sauvegarde</strong>
            <small>
              Le fichier .json exporté depuis un autre téléphone : programmes, historique et records
              reviennent tels quels.
            </small>
          </span>
          <IconArrowRight size={18} />
        </button>
      </div>
    </>
  );
}
