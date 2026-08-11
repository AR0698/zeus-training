import { useState } from "react";
import { sourceFor } from "../../domain/source.ts";
import { IconExternal, IconPlay } from "../icons.tsx";

/**
 * La démonstration du mouvement, lue sur place quand c'est possible.
 *
 * Le lecteur ne se charge pas tout seul. Tant qu'on n'a pas appuyé sur lecture,
 * il n'y a qu'un bouton : aucune requête vers YouTube, aucun script tiers, rien
 * qui parte sur le réseau d'une salle où l'on capte mal. C'est l'appui qui
 * insère l'iframe — et `youtube-nocookie` fait le reste.
 *
 * Un article ne s'embarque pas et sort donc vers un onglet, en le disant : le
 * bouton nomme le site plutôt que de laisser croire qu'on reste ici.
 */
export function ExerciseSource({ url, name }: { url: string; name: string }) {
  const [lecture, setLecture] = useState(false);
  const source = sourceFor(url);

  if (!source) return null;

  if (source.kind === "article") {
    return (
      <a className="button button-solid" href={source.url} target="_blank" rel="noreferrer noopener">
        Voir la démonstration
        <span className="source-host">{source.host}</span>
        <IconExternal size={17} />
      </a>
    );
  }

  if (!lecture) {
    return (
      <button type="button" className="source-facade" onClick={() => setLecture(true)}>
        <span className="source-play">
          <IconPlay size={22} />
        </span>
        <span className="source-label">
          Lire la démonstration
          <span className="source-note">La vidéo se charge ici, sans quitter l&apos;application.</span>
        </span>
      </button>
    );
  }

  return (
    <div className="source-frame">
      <iframe
        src={source.embedUrl}
        title={`Démonstration : ${name}`}
        loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </div>
  );
}
