import { useEffect, useRef, useState } from "react";
import {
  formatClock,
  formatDuration,
  formatLoad,
  formatRepRange,
  unitLabel,
} from "../../domain/format.ts";
import { weightStep } from "../../domain/progression.ts";
import { elapsedSeconds, sessionProgress } from "../../domain/session.ts";
import type { Effort, Session, SessionExercise, Settings } from "../../domain/types.ts";
import { useBottomChrome } from "../../hooks/useBottomChrome.ts";
import { RestTimerBar } from "../components/RestTimer.tsx";
import { Sheet } from "../components/Sheet.tsx";
import { Stepper } from "../components/Stepper.tsx";
import {
  IconCheck,
  IconChevronRight,
  IconClose,
  IconInfo,
  IconSkip,
  IconSwap,
  IconTimer,
  IconTrophy,
} from "../icons.tsx";
import type { ExerciseDetail } from "../types.ts";
import { detailFromSession } from "../types.ts";

const EFFORTS: { value: Effort; label: string; hint: string }[] = [
  { value: "easy", label: "Facile", hint: "hausse possible" },
  { value: "good", label: "Bien", hint: "on garde le cap" },
  { value: "hard", label: "Dur", hint: "on consolide" },
];

export type SessionHandlers = {
  adjust: (exerciseId: string, setIndex: number, field: "weight" | "reps", delta: number) => void;
  setValue: (exerciseId: string, setIndex: number, field: "weight" | "reps", value: number) => void;
  toggleSet: (entry: SessionExercise, setIndex: number) => void;
  setEffort: (exerciseId: string, effort: Effort) => void;
  skip: (entry: SessionExercise) => void;
  resume: (exerciseId: string) => void;
  focus: (exerciseId: string) => void;
  addSet: (exerciseId: string) => void;
  removeSet: (exerciseId: string) => void;
  replace: (entry: SessionExercise) => void;
  openDetail: (detail: ExerciseDetail) => void;
  finish: () => void;
  abandon: () => void;
  /** Leaves the session running and returns to the rest of the app. */
  minimize: () => void;
  startRest: (seconds: number) => void;
};

export function SessionScreen({
  session,
  settings,
  now,
  rest,
  handlers,
}: {
  session: Session;
  settings: Settings;
  now: number;
  rest: { remaining: number | null; total: number; add: (s: number) => void; stop: () => void };
  handlers: SessionHandlers;
}) {
  const [quitOpen, setQuitOpen] = useState(false);
  const progress = sessionProgress(session);
  const elapsed = elapsedSeconds(session, now);
  const current = session.exercises[session.currentIndex] ?? session.exercises[0];
  const cardRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const previousId = useRef<string | null>(null);
  const currentId = current?.exerciseId;

  useBottomChrome(footerRef);

  // Switching exercise brings the card into view. The first render is skipped
  // on purpose: scrolling the page the instant a session opens would hide the
  // header the user just landed on.
  useEffect(() => {
    if (!currentId) return;
    const changed = previousId.current !== null && previousId.current !== currentId;
    previousId.current = currentId;
    if (!changed) return;
    // `scroll-behavior: auto` in the reduced-motion block cannot win against an
    // explicit `behavior` here — the option always takes precedence over the
    // stylesheet, so the preference has to be read rather than declared.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
  }, [currentId]);

  if (!current) return null;
  const allDone = progress.doneSets === progress.totalSets;

  return (
    <main className={`session accent-${session.accent}`}>
      <header className="session-header">
        <div className="session-header-row">
          <div className="session-identity">
            <span className="session-live">
              <span className="live-dot" aria-hidden="true" />
              En cours
            </span>
            <h1>{session.programName}</h1>
          </div>
          <div className="session-timer">
            <span className="kicker">Durée</span>
            <strong className="tabular">{formatClock(elapsed)}</strong>
          </div>
          <button
            type="button"
            className="icon-button session-quit"
            onClick={() => setQuitOpen(true)}
            aria-label="Quitter la séance"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div
          className="session-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.totalSets}
          aria-valuenow={progress.doneSets}
          aria-label="Séries validées"
        >
          <span style={{ transform: `scaleX(${progress.ratio})` }} />
        </div>

        <nav className="session-rail" aria-label="Exercices de la séance">
          {session.exercises.map((entry, index) => (
            <button
              type="button"
              key={entry.exerciseId}
              className={`rail-chip ${entry.status} ${index === session.currentIndex ? "is-current" : ""}`}
              onClick={() => handlers.focus(entry.exerciseId)}
              aria-current={index === session.currentIndex ? "step" : undefined}
            >
              <span className="rail-index tabular">{String(index + 1).padStart(2, "0")}</span>
              <span className="rail-name">{entry.replacedBy ?? entry.shortName}</span>
              {entry.status === "done" && <IconCheck size={13} />}
              {entry.status === "skipped" && <IconSkip size={13} />}
            </button>
          ))}
        </nav>
      </header>

      <div className="session-body">
        <ExerciseCard ref={cardRef} entry={current} index={session.currentIndex} total={session.exercises.length} settings={settings} handlers={handlers} />

        {session.exercises.some((entry) => entry.status === "pending" && entry !== current) && (
          <section className="up-next">
            <h2 className="kicker">À suivre</h2>
            <ul>
              {session.exercises
                .filter((entry) => entry.status === "pending" && entry.exerciseId !== current.exerciseId)
                .map((entry) => (
                  <li key={entry.exerciseId}>
                    <button type="button" onClick={() => handlers.focus(entry.exerciseId)}>
                      <span className="up-next-name">{entry.replacedBy ?? entry.shortName}</span>
                      <span className="up-next-target tabular">
                        {entry.sets.length} × {formatRepRange(entry.repMin, entry.repMax)} ·{" "}
                        {formatLoad(entry.sets.at(-1)?.weight ?? 0, entry.unit)}
                      </span>
                      <IconChevronRight size={16} />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {session.exercises.some((entry) => entry.status === "skipped") && (
          <section className="up-next up-next-skipped">
            <h2 className="kicker">Passés</h2>
            <ul>
              {session.exercises
                .filter((entry) => entry.status === "skipped")
                .map((entry) => (
                  <li key={entry.exerciseId}>
                    <button type="button" onClick={() => handlers.resume(entry.exerciseId)}>
                      <span className="up-next-name">{entry.replacedBy ?? entry.shortName}</span>
                      <span className="up-next-target">Reprendre</span>
                      <IconChevronRight size={16} />
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="session-footer" ref={footerRef}>
        {rest.remaining !== null && (
          <RestTimerBar
            remaining={rest.remaining}
            total={rest.total}
            onAdd={rest.add}
            onStop={rest.stop}
          />
        )}
        <div className="session-footer-row">
          <div className="session-footer-text">
            <strong>
              {allDone ? "Séance complète" : `${progress.doneSets}/${progress.totalSets} séries`}
            </strong>
            <span>{allDone ? "Beau travail." : "Tu peux t'arrêter quand tu veux."}</span>
          </div>
          <button type="button" className="button button-accent button-lg" onClick={handlers.finish}>
            {allDone ? "Terminer" : "Enregistrer"}
          </button>
        </div>
      </footer>

      <Sheet open={quitOpen} onClose={() => setQuitOpen(false)} label="Quitter la séance">
        <span className="kicker">Séance en cours</span>
        <h2 className="sheet-title">Que veux-tu faire ?</h2>
        <p className="lead">
          {progress.doneSets} série{progress.doneSets > 1 ? "s" : ""} déjà validée
          {progress.doneSets > 1 ? "s" : ""}. Rien n&apos;est perdu si tu reviens plus tard.
        </p>
        <div className="stack">
          <button type="button" className="button button-solid" onClick={() => setQuitOpen(false)}>
            Continuer la séance
          </button>
          <button
            type="button"
            className="button button-accent"
            onClick={() => {
              setQuitOpen(false);
              handlers.finish();
            }}
          >
            Arrêter et enregistrer
          </button>
          <button
            type="button"
            className="button button-ghost"
            onClick={() => {
              setQuitOpen(false);
              handlers.minimize();
            }}
          >
            Sortir sans fermer la séance
          </button>
          <button
            type="button"
            className="button button-danger-quiet"
            onClick={() => {
              setQuitOpen(false);
              handlers.abandon();
            }}
          >
            Abandonner sans enregistrer
          </button>
        </div>
      </Sheet>
    </main>
  );
}

function ExerciseCard({
  ref,
  entry,
  index,
  total,
  settings,
  handlers,
}: {
  ref: React.Ref<HTMLElement>;
  entry: SessionExercise;
  index: number;
  total: number;
  settings: Settings;
  handlers: SessionHandlers;
}) {
  const allSetsDone = entry.sets.every((set) => set.done);
  const timed = entry.unit === "sec";
  const restSeconds = entry.restSeconds > 0 ? entry.restSeconds : settings.defaultRestSeconds;

  return (
    <article ref={ref} className="exercise-card" aria-labelledby={`exercise-${entry.exerciseId}`}>
      <header className="exercise-card-head">
        <div>
          <span className="kicker">
            Exercice {index + 1}/{total}
          </span>
          <h2 id={`exercise-${entry.exerciseId}`}>{entry.replacedBy ?? entry.name}</h2>
          {entry.replacedBy && <span className="swap-note">remplace {entry.name}</span>}
          <p className="exercise-cue">{entry.cue}</p>
        </div>
        {/* Le mot compte autant que l'icône : c'est la seule porte vers le
            dessin du mouvement, et un (i) seul ne dit pas ce qu'il y a
            derrière. L'`aria-label` reprend le libellé visible puis nomme
            l'exercice — sinon toutes les cartes d'une séance offrent le même
            « Technique » à qui navigue de bouton en bouton. */}
        <button
          type="button"
          className="technique-button"
          onClick={() => handlers.openDetail(detailFromSession(entry))}
          aria-label={`Technique de ${entry.name}`}
        >
          <IconInfo size={16} />
          Technique
        </button>
      </header>

      {/* Un exercice chronométré ne se compte qu'en secondes : pas de colonne
          reps, sinon la cible en secondes s'y retrouvait en « Tours 45 ». */}
      <div className={`set-table ${timed ? "is-timed" : ""}`} role="group" aria-label="Séries">
        <div className="set-head">
          <span>Série</span>
          <span>{timed ? "Durée" : "Charge"}</span>
          {!timed && <span>Reps</span>}
          <span className="visually-hidden">Validation</span>
        </div>

        {entry.sets.map((set, setIndex) => (
          <div className={`set-row ${set.done ? "is-done" : ""}`} key={setIndex}>
            <span className="set-index tabular">
              {setIndex + 1}
              {set.pr && (
                // Toutes les icônes sont `aria-hidden`, et un `title` ne se
                // montre pas au doigt : sans ce mot, le record n'existe que
                // pour qui voit la coupe.
                <span className="pr-flag">
                  <IconTrophy size={11} />
                  <span className="visually-hidden">Record personnel</span>
                </span>
              )}
            </span>

            <div className="set-cell set-cell-weight">
              <span className="set-cell-label">{timed ? "Durée" : "Charge"}</span>
              <Stepper
                value={set.weight}
                unit={unitLabel(entry.unit)}
                step={weightStep(entry.unit, entry.group, set.weight)}
                label={`Série ${setIndex + 1} ${timed ? "durée" : "charge"}`}
                onAdjust={(delta) => handlers.adjust(entry.exerciseId, setIndex, "weight", delta)}
                onSet={(value) => handlers.setValue(entry.exerciseId, setIndex, "weight", value)}
              />
            </div>

            {!timed && (
              <div className="set-cell set-cell-reps">
                <span className="set-cell-label">Reps</span>
                <Stepper
                  value={set.reps}
                  unit=""
                  step={1}
                  label={`Série ${setIndex + 1} répétitions`}
                  onAdjust={(delta) => handlers.adjust(entry.exerciseId, setIndex, "reps", delta)}
                  onSet={(value) => handlers.setValue(entry.exerciseId, setIndex, "reps", value)}
                />
              </div>
            )}

            <button
              type="button"
              className="validate-button"
              aria-pressed={set.done}
              aria-label={`${set.done ? "Annuler la" : "Valider la"} série ${setIndex + 1}`}
              onClick={() => handlers.toggleSet(entry, setIndex)}
            >
              <IconCheck size={22} />
            </button>
          </div>
        ))}

        <div className="set-tools">
          <span className="set-range">
            Cible {formatRepRange(entry.repMin, entry.repMax)}{" "}
            {timed ? "s" : "reps"}
          </span>
          <div>
            <button type="button" className="mini-button" onClick={() => handlers.removeSet(entry.exerciseId)}>
              − série
            </button>
            <button type="button" className="mini-button" onClick={() => handlers.addSet(entry.exerciseId)}>
              + série
            </button>
          </div>
        </div>
      </div>

      {/* La zone vit dès le montage de la carte : un `role="status"` inséré en
          même temps que son texte n'est pas annoncé de façon fiable. */}
      <p className="visually-hidden" role="status">
        {allSetsDone
          ? `${entry.replacedBy ?? entry.name} terminé. Indique la difficulté ressentie.`
          : ""}
      </p>

      {allSetsDone && (
        <div className="effort-block">
          <span className="field-label">Comment c&apos;était ?</span>
          <div className="effort-options">
            {EFFORTS.map((effort) => (
              <button
                type="button"
                key={effort.value}
                className={`effort-button ${entry.effort === effort.value ? "is-active" : ""}`}
                aria-pressed={entry.effort === effort.value}
                onClick={() => handlers.setEffort(entry.exerciseId, effort.value)}
              >
                <strong>{effort.label}</strong>
                <small>{effort.hint}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="exercise-actions">
        <button type="button" className="button button-quiet" onClick={() => handlers.replace(entry)}>
          <IconSwap size={17} />
          Machine occupée
        </button>
        <button
          type="button"
          className="button button-quiet"
          onClick={() => handlers.startRest(restSeconds)}
        >
          <IconTimer size={17} />
          Repos {formatDuration(restSeconds)}
        </button>
        {!allSetsDone && (
          <button type="button" className="button button-quiet" onClick={() => handlers.skip(entry)}>
            <IconSkip size={17} />
            Passer
          </button>
        )}
      </div>
    </article>
  );
}
