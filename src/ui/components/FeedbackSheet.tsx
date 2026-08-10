import { useState } from "react";
import { FEEDBACK_EMAIL } from "../../config.ts";
import {
  FEEDBACK_KINDS,
  FEEDBACK_LABELS,
  buildFeedbackEmail,
  feedbackMailto,
  type FeedbackKind,
} from "../../domain/feedback.ts";
import { IconMail } from "../icons.tsx";
import { copyText, openMail } from "../sharing.ts";
import { Sheet } from "./Sheet.tsx";

/**
 * Donner son avis, proposer une fonctionnalité.
 *
 * Le message part par l'application mail du téléphone, pas par un formulaire :
 * l'app n'a pas de serveur, et surtout rien ne doit pouvoir être envoyé sans un
 * geste explicite. Deux conséquences assumées :
 *
 * - hors ligne, le brouillon attend simplement dans la boîte d'envoi ;
 * - si aucun client mail n'est configuré — le cas sur beaucoup d'ordinateurs —
 *   le bouton de copie donne le message entier à coller ailleurs, plutôt que de
 *   laisser un lien `mailto:` échouer en silence.
 */
export function FeedbackSheet({
  open,
  onClose,
  defaultName,
  notify,
}: {
  open: boolean;
  onClose: () => void;
  defaultName: string;
  notify: (message: string, tone?: "success" | "warn" | "danger") => void;
}) {
  const [kind, setKind] = useState<FeedbackKind>("idea");
  const [message, setMessage] = useState("");

  const draft = {
    kind,
    message,
    from: defaultName,
    context: typeof navigator === "undefined" ? "" : navigator.userAgent,
  };
  const ready = message.trim().length > 0;

  const handleSend = () => {
    if (!ready) return;
    openMail(feedbackMailto(draft));
    setMessage("");
    onClose();
    notify("Message ouvert dans ton application mail", "success");
  };

  const handleCopy = () => {
    const email = buildFeedbackEmail(draft);
    void copyText(`${email.subject}\n\n${email.body}`).then((copied) => {
      notify(
        copied ? `Message copié — envoie-le à ${FEEDBACK_EMAIL}` : "La copie a échoué",
        copied ? "success" : "warn",
      );
    });
  };

  return (
    <Sheet open={open} onClose={onClose} label="Donner mon avis">
      <span className="kicker">Retour</span>
      <h2 className="sheet-title">Ton avis, tes idées</h2>
      <p className="lead">
        Qu&apos;est-ce qui manque, qu&apos;est-ce qui gêne ? Tout est lu, et les demandes qui
        reviennent finissent dans l&apos;application.
      </p>

      <div className="field" role="group" aria-labelledby="feedback-kind-label">
        <span className="field-label" id="feedback-kind-label">
          De quoi s&apos;agit-il ?
        </span>
        <div className="chip-row">
          {FEEDBACK_KINDS.map((value) => (
            <button
              type="button"
              key={value}
              className={`chip ${kind === value ? "is-active" : ""}`}
              aria-pressed={kind === value}
              onClick={() => setKind(value)}
            >
              {FEEDBACK_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">Ton message</span>
        <textarea
          className="field-input field-textarea"
          rows={5}
          value={message}
          placeholder="Par exemple : j'aimerais pouvoir noter mes sensations à la fin de la séance…"
          onChange={(event) => setMessage(event.target.value)}
        />
        <span className="field-help">
          Rien n&apos;est envoyé automatiquement : ton application mail s&apos;ouvre avec le message
          pré-rempli, et c&apos;est toi qui appuies sur Envoyer.
        </span>
      </label>

      <div className="stack">
        <button type="button" className="button button-accent" onClick={handleSend} disabled={!ready}>
          <IconMail size={18} />
          Ouvrir dans mon application mail
        </button>
        <button type="button" className="button button-ghost" onClick={handleCopy} disabled={!ready}>
          Copier le message à la place
        </button>
      </div>

      <p className="sheet-footnote">
        Destinataire : {FEEDBACK_EMAIL}. Le message contient la version de l&apos;application et le
        navigateur utilisé, deux lignes que tu peux supprimer avant d&apos;envoyer.
      </p>
    </Sheet>
  );
}
