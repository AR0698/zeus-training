import { formatLoad, formatRepRange } from "../../domain/format.ts";
import { IconExternal, IconTarget } from "../icons.tsx";
import type { ExerciseDetail } from "../types.ts";
import { Sheet } from "./Sheet.tsx";

/**
 * Technique reference for one movement.
 *
 * Deliberately text-first. The previous version leaned on generic stock photos
 * of a gym, which look decorative but tell you nothing about the movement — and
 * they were remote images, so they were blank exactly when you needed them: in
 * a basement with no signal.
 */
export function ExerciseSheet({
  detail,
  onClose,
}: {
  detail: ExerciseDetail | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={detail !== null} onClose={onClose} label={detail ? `Technique — ${detail.name}` : "Technique"}>
      {detail && (
        <>
          <span className="kicker">Technique</span>
          <h2 className="sheet-title">{detail.name}</h2>

          <div className="detail-targets">
            <div>
              <IconTarget size={16} />
              <span>
                {detail.setCount} séries × {formatRepRange(detail.repMin, detail.repMax)} reps
              </span>
            </div>
            <div className="detail-loads tabular">
              {detail.loads.map((load, index) => (
                <span key={index}>{formatLoad(load, detail.unit)}</span>
              ))}
            </div>
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

          {detail.videoUrl && (
            <a className="button button-primary" href={detail.videoUrl} target="_blank" rel="noreferrer">
              Voir la démonstration
              <IconExternal size={17} />
            </a>
          )}
          <p className="sheet-footnote">
            Les repères sont génériques : adapte toujours les réglages à la machine de ta salle.
          </p>
        </>
      )}
    </Sheet>
  );
}
