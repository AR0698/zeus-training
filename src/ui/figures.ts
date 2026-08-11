import { illustrationFor, type Illustration } from "../domain/catalog/index.ts";

/**
 * Les illustrations, côté interface : adresses et mise en cache.
 *
 * Le domaine ne connaît que des noms de fichiers ; c'est ici qu'ils deviennent
 * des URL, parce que le préfixe dépend du déploiement (`BASE_URL` vaut `/` en
 * local et `/zeus-training/` sur GitHub Pages) et qu'un module de domaine
 * testé sous `node --test` n'a pas d'`import.meta.env`.
 */

export type Figure = {
  readonly start: string;
  readonly end: string;
  readonly caveat: string | null;
};

const url = (file: string): string => `${import.meta.env.BASE_URL}exercises/${file}`;

const toFigure = (illustration: Illustration): Figure => ({
  start: url(illustration.frames[0]),
  end: url(illustration.frames[1]),
  caveat: illustration.caveat,
});

/** L'illustration d'un mouvement, ou `null` s'il n'en a pas. */
export function figureFor(exerciseId: string | null): Figure | null {
  if (!exerciseId) return null;
  const illustration = illustrationFor(exerciseId);
  return illustration ? toFigure(illustration) : null;
}

/**
 * Met les illustrations d'une séance en cache avant d'en avoir besoin.
 *
 * Le service worker met en cache tout ce qui passe par le réseau sur cette
 * origine : il suffit donc de demander les images une fois, au démarrage de la
 * séance, pour qu'elles soient disponibles au sous-sol trois exercices plus
 * tard. Une vingtaine de fichiers de 8 Ko — c'est moins qu'une icône.
 *
 * Silencieux par construction : un préchargement raté n'est pas une erreur,
 * l'image sera simplement demandée à l'ouverture de la fiche.
 */
export function preloadFigures(exerciseIds: readonly string[]): void {
  if (typeof fetch !== "function") return;

  for (const id of exerciseIds) {
    const figure = figureFor(id);
    if (!figure) continue;
    for (const href of [figure.start, figure.end]) {
      void fetch(href, { cache: "force-cache" }).catch(() => undefined);
    }
  }
}
