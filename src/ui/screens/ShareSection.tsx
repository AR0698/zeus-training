import { useState } from "react";
import { buildShareMessage } from "../../domain/feedback.ts";
import { FeedbackSheet } from "../components/FeedbackSheet.tsx";
import { IconMail, IconShare } from "../icons.tsx";
import { appUrl, copyText, shareApp } from "../sharing.ts";

/**
 * Partager l'application, et faire remonter un avis.
 *
 * Partager, ici, c'est envoyer une adresse : l'app est un site statique, sans
 * compte ni invitation. L'adresse est affichée en clair sous le bouton, parce
 * que `navigator.share` n'existe pas sur ordinateur et que le presse-papiers
 * échoue silencieusement hors HTTPS — dans ces deux cas, il reste toujours
 * quelque chose à recopier à la main.
 */
export function ShareSection({
  displayName,
  notify,
}: {
  displayName: string;
  notify: (message: string, tone?: "success" | "warn" | "danger") => void;
}) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const url = appUrl();

  const handleShare = () => {
    void shareApp(buildShareMessage(url), url).then((outcome) => {
      if (outcome === "copied") notify("Lien copié — colle-le dans un message", "success");
      if (outcome === "failed") notify("Copie impossible : recopie le lien affiché", "warn");
    });
  };

  return (
    <>
      <section className="card panel">
        <span className="kicker">Partage</span>
        <h2 className="panel-title">Faire essayer l&apos;application</h2>
        <p className="lead">
          Envoie simplement l&apos;adresse. La personne l&apos;ouvre dans son navigateur, puis
          l&apos;ajoute à son écran d&apos;accueil : elle démarre avec ses propres séances, ses
          données restent sur son téléphone, et rien n&apos;est partagé entre vous.
        </p>

        <div className="button-row">
          <button type="button" className="button button-solid" onClick={handleShare}>
            <IconShare size={18} />
            Partager le lien
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              void copyText(url).then((copied) =>
                notify(copied ? "Adresse copiée" : "Copie impossible", copied ? "success" : "warn"),
              );
            }}
          >
            Copier l&apos;adresse
          </button>
        </div>

        <p className="share-url tabular">{url}</p>

        <details className="share-help">
          <summary>Comment l&apos;installer sur un téléphone</summary>
          <ol>
            <li>Ouvrir l&apos;adresse dans Safari (iPhone) ou Chrome (Android).</li>
            <li>
              <strong>Partager → Sur l&apos;écran d&apos;accueil</strong> sur iPhone,{" "}
              <strong>⋮ → Installer l&apos;application</strong> sur Android.
            </li>
            <li>
              L&apos;ouvrir depuis l&apos;icône : plein écran et hors ligne. Cette étape compte —
              une page seulement mise en favori peut voir son stockage effacé après quelques jours
              d&apos;inactivité sur iPhone.
            </li>
          </ol>
        </details>
      </section>

      <section className="card panel">
        <span className="kicker">Retour</span>
        <h2 className="panel-title">Un avis, une idée ?</h2>
        <p className="lead">
          Ce qui manque, ce qui gêne, ce qui mériterait d&apos;exister : le message part par ton
          application mail, après ta relecture.
        </p>
        <button type="button" className="button button-solid" onClick={() => setFeedbackOpen(true)}>
          <IconMail size={18} />
          Écrire un retour
        </button>
      </section>

      <FeedbackSheet
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        defaultName={displayName}
        notify={notify}
      />
    </>
  );
}
