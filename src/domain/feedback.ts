import { APP_NAME, APP_VERSION, FEEDBACK_EMAIL } from "../config.ts";

/**
 * Message de retour, en `mailto:`.
 *
 * L'application n'a pas de serveur : pas de formulaire posté, pas d'endpoint à
 * maintenir, rien qui parte à l'insu de qui écrit. Le lien ouvre l'application
 * mail du téléphone avec le message pré-rempli, et c'est un geste explicite qui
 * l'envoie. Hors ligne, le brouillon attend simplement dans la boîte d'envoi.
 *
 * Tout est construit ici, en fonction pure, pour que l'encodage du sujet et du
 * corps soit testable sans navigateur — un `&` mal encodé tronque le message
 * sans le moindre message d'erreur.
 */

export type FeedbackKind = "idea" | "bug" | "other";

export const FEEDBACK_KINDS: FeedbackKind[] = ["idea", "bug", "other"];

export const FEEDBACK_LABELS: Record<FeedbackKind, string> = {
  idea: "Une idée de fonctionnalité",
  bug: "Quelque chose ne marche pas",
  other: "Autre chose",
};

const SUBJECTS: Record<FeedbackKind, string> = {
  idea: "Idée de fonctionnalité",
  bug: "Bug",
  other: "Retour",
};

export type FeedbackDraft = {
  kind: FeedbackKind;
  message: string;
  /** Prénom de l'expéditeur, facultatif. */
  from?: string;
  /** Contexte technique fourni par l'interface (navigateur, appareil). */
  context?: string;
};

export type FeedbackEmail = {
  to: string;
  subject: string;
  body: string;
};

export function buildFeedbackEmail(draft: FeedbackDraft): FeedbackEmail {
  const from = draft.from?.trim();
  const signature = from ? `\n\n— ${from}` : "";
  const context = draft.context?.trim();

  const lines = [
    draft.message.trim(),
    signature,
    "\n\n---",
    `${APP_NAME} ${APP_VERSION}`,
    context ? `Contexte : ${context}` : null,
    "(Ces deux dernières lignes aident au diagnostic, tu peux les supprimer.)",
  ].filter((line): line is string => line !== null);

  return {
    to: FEEDBACK_EMAIL,
    subject: `${APP_NAME} — ${SUBJECTS[draft.kind]}`,
    body: lines.join("\n"),
  };
}

export function feedbackMailto(draft: FeedbackDraft): string {
  const email = buildFeedbackEmail(draft);
  const query = `subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
  return `mailto:${email.to}?${query}`;
}

/** Message pré-rempli quand on partage l'application à quelqu'un. */
export function buildShareMessage(url: string): string {
  return [
    `${APP_NAME} — carnet de musculation, à ouvrir dans le navigateur puis à ajouter à l'écran d'accueil.`,
    "Aucun compte, aucune donnée envoyée : tout reste sur le téléphone.",
    url,
  ].join("\n");
}
