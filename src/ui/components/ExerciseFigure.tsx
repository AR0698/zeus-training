import type { Figure } from "../figures.ts";

/**
 * Le mouvement en deux poses qui alternent.
 *
 * Deux dessins au trait, départ et arrivée, superposés et croisés en CSS : pas
 * de vidéo, pas de GIF, pas de JavaScript qui tourne pendant qu'on soulève.
 * Les deux images pèsent ensemble une quinzaine de kilo-octets.
 *
 * Le trait est noir sur fond blanc à la source. En thème sombre il est inversé
 * puis fondu en `screen`, ce qui efface le fond et ne laisse que le trait
 * blanc — une seule image sert donc les deux thèmes.
 */
export function ExerciseFigure({ figure, name }: { figure: Figure; name: string }) {
  return (
    <figure className="exercise-figure">
      <div className="figure-frames">
        <img
          className="figure-frame"
          src={figure.start}
          alt={`${name} : position de départ, en alternance avec la position d'arrivée`}
          width={420}
          height={505}
          decoding="async"
        />
        <img
          className="figure-frame figure-frame-end"
          src={figure.end}
          alt=""
          aria-hidden="true"
          width={420}
          height={505}
          decoding="async"
        />
      </div>
      {figure.caveat && <figcaption className="figure-caveat">Dessin approchant — {figure.caveat}.</figcaption>}
    </figure>
  );
}
