import { useEffect, useRef, useState, type ReactNode } from "react";
import { EXERCISE_CATALOG } from "../../domain/catalog/index.ts";
import type { StarterChoice } from "../../domain/onboarding.ts";
import { BACKUP_INTERVAL_DAYS } from "../../domain/reminder.ts";
import type { AppState } from "../../domain/types.ts";
import { useInstallPrompt } from "../../hooks/useInstallPrompt.ts";
import { pickAndReadBackup } from "../../storage/backup.ts";
import { InstallGuide } from "../components/InstallGuide.tsx";
import {
  IconArrowLeft,
  IconArrowRight,
  IconDownload,
  IconHome,
  IconShield,
  IconWifiOff,
} from "../icons.tsx";
import { WelcomeStarter } from "./WelcomeStarter.tsx";

/**
 * Premier lancement, en cinq écrans.
 *
 * Quatre choses doivent être comprises avant que l'application serve à quelque
 * chose, et aucune ne se devine depuis l'interface :
 *
 * 1. **Ce que c'est** — un carnet, pas un coach.
 * 2. **Comment la mettre sur l'écran d'accueil.** Le geste diffère par
 *    plateforme, et sur iPhone il conditionne la survie du stockage.
 * 3. **Comment une séance se déroule**, y compris qui décide des hausses.
 * 4. **Où vivent les données**, et donc pourquoi exporter une sauvegarde.
 *
 * Le choix des séances vient en dernier : on décide mieux une fois qu'on sait
 * ce qu'on installe. Tout est sautable d'un lien — une explication imposée est
 * une explication lue en diagonale — mais rien n'est un défaut silencieux.
 */

const LAST_STEP = 4;

export function WelcomeScreen({
  onChoose,
  onImport,
  notify,
}: {
  onChoose: (starter: StarterChoice, displayName: string) => void;
  onImport: (state: AppState, issues: string[]) => void;
  notify: (message: string, tone?: "success" | "warn" | "danger") => void;
}) {
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const install = useInstallPrompt();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Changer d'écran sans bouger le focus laisse un lecteur d'écran sur le
  // bouton « Suivant » d'un contenu qui n'existe plus. On l'amène au titre.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [step]);

  const handleImport = async () => {
    const result = await pickAndReadBackup(Date.now());
    if (result === null) return;
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    onImport(result.state, result.issues);
  };

  const steps: { eyebrow: string; title: ReactNode; body: ReactNode }[] = [
    {
      eyebrow: "Bienvenue",
      title: (
        <>
          Zeus <b>Training</b>
        </>
      ),
      body: (
        <>
          <p className="lead">
            Un carnet de musculation qui tient dans une main, entre deux séries. Pas de compte, pas
            de publicité, pas de connexion nécessaire.
          </p>
          <p className="welcome-note">
            Quatre écrans pour savoir ce que tu installes : comment la garder sous la main, comment
            elle se sert en salle, et où atterrissent tes données.
          </p>
          {/* Hors installation, l'écran suivant ne parle que de ça : le répéter
              ici volerait la vedette au bouton « Commencer ». */}
          {install.isStandalone && (
            <p className="welcome-installed-hint">
              <IconHome size={14} />
              Ouverte depuis ton écran d&apos;accueil.
            </p>
          )}
        </>
      ),
    },
    {
      eyebrow: "Installation",
      title: "La mettre sur ton écran d'accueil",
      body: <InstallGuide install={install} onInstalled={() => setStep(2)} />,
    },
    {
      eyebrow: "En salle",
      title: "Comment une séance se déroule",
      body: (
        <ol className="welcome-how">
          <li>
            <span className="welcome-how-index tabular" aria-hidden="true">
              1
            </span>
            <span>
              <strong>Tu composes une séance</strong>
              <small>
                Tu la nommes, puis tu pioches dans un catalogue de {EXERCISE_CATALOG.length}{" "}
                mouvements — séries, répétitions et consignes déjà remplies — ou tu crées les
                tiens. L&apos;ordre de la liste est l&apos;ordre de la séance.
              </small>
            </span>
          </li>
          <li>
            <span className="welcome-how-index tabular" aria-hidden="true">
              2
            </span>
            <span>
              <strong>Tu valides chaque série pendant l&apos;entraînement</strong>
              <small>
                Charge et répétitions s&apos;ajustent au doigt, un bouton par série. Le repos
                démarre tout seul, l&apos;écran reste allumé, et une séance interrompue se retrouve
                telle quelle au retour.
              </small>
            </span>
          </li>
          <li>
            <span className="welcome-how-index tabular" aria-hidden="true">
              3
            </span>
            <span>
              <strong>L&apos;app propose la charge suivante</strong>
              <small>
                Quand toutes les séries atteignent le haut de la fourchette, elle propose une
                hausse — une proposition, jamais une modification faite dans ton dos. Records et
                volume se calculent au passage.
              </small>
            </span>
          </li>
        </ol>
      ),
    },
    {
      eyebrow: "Tes données",
      title: "Tout est écrit sur ce téléphone",
      body: (
        <>
          <p className="lead">
            Rien n&apos;est envoyé sur un serveur, et personne d&apos;autre n&apos;y a accès. Pas de
            compte à créer, donc rien à supprimer un jour.
          </p>

          <div className="welcome-facts">
            <p className="welcome-fact">
              <IconWifiOff size={16} />
              <span>
                <strong>La contrepartie est réelle</strong>
                Il n&apos;existe aucune copie ailleurs. Téléphone perdu, application désinstallée ou
                données du navigateur effacées : l&apos;historique part avec.
              </span>
            </p>
            <p className="welcome-fact">
              <IconDownload size={16} />
              <span>
                <strong>D&apos;où la sauvegarde, de temps en temps</strong>
                Réglages → Sauvegarde → Exporter écrit un fichier <code>.json</code> à déposer sur
                Drive, iCloud, ou à t&apos;envoyer par mail. Le réimporter restaure tout.
              </span>
            </p>
            <p className="welcome-fact">
              <IconShield size={16} />
              <span>
                <strong>L&apos;app te le rappellera</strong>
                Tous les {BACKUP_INTERVAL_DAYS} jours, et jamais tant qu&apos;il n&apos;y a rien à
                perdre. Tu peux reporter d&apos;une semaine.
              </span>
            </p>
          </div>
        </>
      ),
    },
    {
      eyebrow: "Dernière étape",
      title: "Par où commences-tu ?",
      body: (
        <WelcomeStarter
          displayName={displayName}
          onNameChange={setDisplayName}
          onChoose={(starter) => onChoose(starter, displayName)}
          onImport={() => void handleImport()}
        />
      ),
    },
  ];

  const current = steps[step];
  if (!current) return null;

  return (
    <div className="welcome">
      <header className="welcome-bar">
        <span className="brand-mark" aria-hidden="true">
          Z
        </span>
        <ol className="welcome-progress" aria-hidden="true">
          {steps.map((item, index) => (
            <li
              key={item.eyebrow}
              className={index === step ? "is-current" : index < step ? "is-done" : ""}
            />
          ))}
        </ol>
        {step < LAST_STEP && (
          <button type="button" className="mini-button" onClick={() => setStep(LAST_STEP)}>
            Passer
          </button>
        )}
      </header>

      <section className="welcome-step" aria-labelledby="welcome-title">
        <span className="eyebrow">{current.eyebrow}</span>
        <h1
          className={step === 0 ? "display" : "welcome-title"}
          id="welcome-title"
          ref={headingRef}
          tabIndex={-1}
        >
          {current.title}
        </h1>
        <p className="visually-hidden">
          Étape {step + 1} sur {steps.length}
        </p>
        {current.body}
      </section>

      {step < LAST_STEP && (
        <div className="welcome-nav">
          {step > 0 && (
            <button
              type="button"
              className="button button-ghost"
              onClick={() => setStep((value) => value - 1)}
            >
              <IconArrowLeft size={18} />
              Retour
            </button>
          )}
          <button
            type="button"
            className="button button-accent"
            onClick={() => setStep((value) => value + 1)}
          >
            {step === 0 ? "Commencer" : step === 1 && !install.isStandalone ? "Plus tard" : "Suivant"}
            <IconArrowRight size={18} />
          </button>
        </div>
      )}

      {step === LAST_STEP && (
        <p className="app-footnote">
          Les propositions de charge sont un outil de suivi, pas une prescription médicale. En cas de
          douleur inhabituelle, arrête la série.
        </p>
      )}
    </div>
  );
}
