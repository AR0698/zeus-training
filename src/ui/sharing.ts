import { APP_NAME } from "../config.ts";

/**
 * Partage et presse-papiers : les deux seules API navigateur touchées par
 * l'écran de partage.
 *
 * Isolées ici parce qu'elles échouent de façons variées et silencieuses —
 * `navigator.share` absent sur ordinateur, `navigator.clipboard` indisponible
 * hors HTTPS, et un partage annulé qui lève une exception comme s'il s'agissait
 * d'une panne. Chaque cas remonte comme une valeur, jamais comme un throw : un
 * bouton de partage ne doit pas pouvoir casser un écran.
 */

/** L'adresse de l'application telle qu'elle est servie, sans query ni ancre. */
export function appUrl(): string {
  const { origin, pathname } = window.location;
  return `${origin}${pathname}`;
}

export type ShareOutcome = "shared" | "cancelled" | "copied" | "failed";

export async function copyText(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export async function shareApp(text: string, url: string): Promise<ShareOutcome> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: APP_NAME, text, url });
      return "shared";
    } catch (error) {
      // Fermer la feuille de partage lève une AbortError : ce n'est pas un
      // échec, et proposer une copie de repli à ce moment-là serait insistant.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(`${text}`)) ? "copied" : "failed";
}

/**
 * Ouvre un lien `mailto:`. Passe par un `<a>` plutôt que `location.href` :
 * dans une PWA installée, changer `location` peut faire disparaître l'app le
 * temps que le client mail s'ouvre.
 */
export function openMail(href: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.rel = "noreferrer";
  document.body.append(link);
  link.click();
  link.remove();
}
