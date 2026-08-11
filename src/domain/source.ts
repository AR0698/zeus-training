/**
 * La source d'un mouvement : une vidéo qu'on regarde sur place, ou un article
 * qu'on va lire ailleurs.
 *
 * Deux natures, deux traitements. Une vidéo YouTube se lit dans l'application —
 * sortir vers l'app YouTube au milieu d'une séance, c'est perdre le carnet, le
 * chrono et sa place dans la série. Un article ne s'embarque pas : MuscleWiki
 * refuse l'iframe comme tout site sérieux, donc il s'ouvre dans un onglet.
 *
 * Le champ est modifiable par l'utilisateur, ce qui en fait une entrée non
 * fiable : tout ce qui n'est pas une URL `https` explicitement reconnue est
 * refusé. `javascript:` collé dans un carnet reste du code exécutable.
 */

export type Source =
  | { readonly kind: "video"; readonly embedUrl: string; readonly watchUrl: string }
  | { readonly kind: "article"; readonly url: string; readonly host: string };

/** Les 11 caractères d'un identifiant YouTube, et rien d'autre. */
const VIDEO_ID = /^[\w-]{11}$/;

function youtubeId(url: URL): string | null {
  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.slice(1);
    return VIDEO_ID.test(id) ? id : null;
  }

  if (host !== "youtube.com" && host !== "m.youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }

  const [segment, tail] = url.pathname.split("/").filter(Boolean);
  if (segment === "watch") {
    const id = url.searchParams.get("v") ?? "";
    return VIDEO_ID.test(id) ? id : null;
  }
  if ((segment === "shorts" || segment === "embed" || segment === "live") && tail) {
    return VIDEO_ID.test(tail) ? tail : null;
  }
  return null;
}

/**
 * `youtube-nocookie.com` plutôt que `youtube.com` : le lecteur ne dépose rien
 * tant que personne n'a appuyé sur lecture. `rel=0` garde les suggestions de
 * fin dans la même chaîne, `playsinline` empêche iOS de passer en plein écran
 * — on veut la vidéo à côté des séries, pas à la place.
 */
function embedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`;
}

/** La source d'un mouvement, ou `null` si le champ est vide ou illisible. */
export function sourceFor(raw: string): Source | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  // Seul `https` passe : `javascript:` et `data:` exécutent, `http:` fuite.
  if (url.protocol !== "https:") return null;

  const id = youtubeId(url);
  if (id) {
    return { kind: "video", embedUrl: embedUrl(id), watchUrl: `https://www.youtube.com/watch?v=${id}` };
  }

  return { kind: "article", url: url.toString(), host: url.hostname.replace(/^www\./, "") };
}
