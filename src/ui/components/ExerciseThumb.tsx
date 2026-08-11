import { figureFor } from "../figures.ts";

/**
 * La pose de départ d'un mouvement, en vignette.
 *
 * Le catalogue est l'endroit où l'on choisit un exercice qu'on ne connaît pas :
 * une liste de noms nus y demande de deviner. Une seule pose suffit ici — pas
 * d'alternance, pas d'animation dans une liste qu'on fait défiler.
 *
 * Décorative par construction : le nom du mouvement est juste à côté, un
 * lecteur d'écran qui annoncerait les deux dirait deux fois la même chose.
 *
 * Un mouvement sans dessin garde une case vide plutôt que rien : sans elle les
 * noms de la liste ne s'alignent plus les uns sous les autres.
 */
export function ExerciseThumb({ exerciseId }: { exerciseId: string }) {
  const figure = figureFor(exerciseId);

  return (
    <span className="exercise-thumb" aria-hidden="true">
      {figure && (
        <img
          className="thumb-frame"
          src={figure.start}
          alt=""
          width={358}
          height={420}
          loading="lazy"
          decoding="async"
        />
      )}
    </span>
  );
}
