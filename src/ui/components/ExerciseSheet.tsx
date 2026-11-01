import { formatLoad, formatRepRange } from "../../domain/format.ts";
import { figureFor } from "../figures.ts";
import { IconTarget } from "../icons.tsx";
import type { ExerciseDetail } from "../types.ts";
import { ExerciseFigure } from "./ExerciseFigure.tsx";
import { ExerciseSource } from "./ExerciseSource.tsx";
import { Sheet } from "./Sheet.tsx";

/**
 * Technique reference for one movement.
 *
 * Text first, dessin ensuite quand il en existe un. La version précédente
 * s'appuyait sur des photos de salle génériques : décoratives, muettes sur le
 * mouvement, et distantes — donc blanches exactement quand on en avait besoin,
 * au sous-sol sans réseau. Les dessins d'ici sont embarqués dans
 * l'application, et un mouvement sans dessin n'en affiche aucun.
 */
export function ExerciseSheet({
  detail,
  onClose,
}: {
  detail: ExerciseDetail | null;
  onClose: () => void;
}) {
  const figure = figureFor(detail?.figureId ?? null);

  return (
    <Sheet open={detail !== null} onClose={onClose} label={detail ? `Technique — ${detail.name}` : "Technique"}>
      {detail && (
        <>
          <span className="kicker">Technique</span>
          <h2 className="sheet-title">{detail.name}</h2>

          {figure && <ExerciseFigure figure={figure} name={detail.name} />}

          <div className="detail-targets">
            <div>
              <IconTarget size={16} />
              <span>
                {detail.setCount} séries × {formatRepRange(detail.repMin, detail.repMax)} reps
              </span>
            </div>
            {detail.unit !== "reps" && (
              <div className="detail-loads tabular">
                {detail.loads.map((load, index) => (
                  <span key={index}>{formatLoad(load, detail.unit)}</span>
                ))}
              </div>
            )}
          </div>

          <ol className="technique-steps">
            <li>
              <span className="step-index">01</span>
              <p>{detail.cue}</p>
            </li>
            <li>
              <span className="step-index">02</span>
              <p>{detail.tip}</p>
            </li>
            <li>
              <span className="step-index">03</span>
              <p>
                Arrête la série si la technique se dégrade ou si une douleur inhabituelle apparaît.
                Une série propre vaut mieux qu&apos;une répétition de plus.
              </p>
            </li>
          </ol>

          {detail.alternatives.length > 0 && (
            <div className="detail-alternatives">
              <span className="kicker">Équivalents</span>
              <ul>
                {detail.alternatives.map((alternative) => (
                  <li key={alternative}>{alternative}</li>
                ))}
              </ul>
            </div>
          )}

          {detail.videoUrl ? (
            <ExerciseSource url={detail.videoUrl} name={detail.name} />
          ) : (
            /* Pas de source vérifiée pour ce mouvement. On le dit, plutôt que
               de renvoyer vers une recherche : une liste de résultats n'est pas
               une démonstration, et le carnet appartient à celui qui le tient. */
            <p className="sheet-footnote">
              Aucune démonstration vérifiée pour ce mouvement. Ajoute la tienne — vidéo ou article —
              depuis l&apos;édition de l&apos;exercice.
            </p>
          )}
          <p className="sheet-footnote">
            Les repères sont génériques : adapte toujours les réglages à la machine de ta salle.
          </p>
        </>
      )}
    </Sheet>
  );
}
