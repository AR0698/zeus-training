/**
 * Normalisation de texte partagée par le catalogue et la recherche.
 *
 * Isolée ici pour une raison précise : la chaîne indexée à la construction du
 * catalogue et la chaîne saisie dans le champ de recherche doivent passer par
 * *exactement* la même fonction. Deux implémentations qui divergent d'un accent
 * produisent une recherche qui ne trouve rien sans jamais lever d'erreur.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;

/** Minuscules, sans accents, sans espaces superflus. */
export function normalise(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(COMBINING_MARKS, "").replace(/\s+/g, " ").trim();
}

export function slugify(value: string): string {
  return (
    normalise(value)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "exercice"
  );
}
