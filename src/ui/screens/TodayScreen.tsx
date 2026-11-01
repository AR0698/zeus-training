import { formatLoad, formatMinutes, formatRelativeDay, formatRepRange } from "../../domain/format.ts";
import { LAYOFF_DAYS, daysBetween, nextProgram } from "../../domain/progression.ts";
import { sessionProgress } from "../../domain/session.ts";
import { lastSessionDate, overview, pendingIncreases } from "../../domain/stats.ts";
import type { AppState, Program, Session } from "../../domain/types.ts";
import {
  IconAlert,
  IconArrowRight,
  IconDumbbell,
  IconChevronRight,
  IconClock,
  IconFlame,
  IconTrend,
  IconTrophy,
  IconUndo,
} from "../icons.tsx";
import { detailFromTemplate, type ExerciseDetail } from "../types.ts";

const WEEKLY_TARGET = 4;

export function TodayScreen({
  state,
  now,
  onStart,
  onOpenDetail,
  onOpenPrograms,
  onRestoreAbandoned,
  onDiscardAbandoned,
}: {
  state: AppState;
  now: number;
  onStart: (program: Program) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
  onOpenPrograms: () => void;
  onRestoreAbandoned: () => void;
  onDiscardAbandoned: () => void;
}) {
  const recommended = nextProgram(state.programs, state.lastCompletedProgramId);
  const stats = overview(state, now);
  const last = state.history[0];
  const increases = pendingIncreases(state.programs);
  const nextIncrease = increases[0];
  const lastDate = lastSessionDate(state.history);
  const restDays = lastDate === null ? null : daysBetween(lastDate, now);
  const layoff = restDays !== null && restDays >= LAYOFF_DAYS;
  const others = state.programs.filter((program) => program.id !== recommended?.id);
  const firstName = state.settings.displayName.trim().split(" ")[0] ?? "";

  return (
    <>
      <header className="today-head">
        <div>
          <p className="today-hello">{firstName ? `Salut ${firstName},` : "Salut,"}</p>
          <h1 className="display">
            {last ? "Prêt pour le prochain round ?" : "On commence ?"}
          </h1>
        </div>
        <WeekRing done={stats.thisWeek} target={WEEKLY_TARGET} streak={stats.streak} />
      </header>

      {layoff && (
        <div className="banner banner-warn" role="status">
          <IconAlert size={18} />
          <p>
            <strong>Reprise après {restDays} jours.</strong> Les charges de cette séance sont
            proposées 10&nbsp;% en dessous de tes cibles, le temps de retrouver la technique.
          </p>
        </div>
      )}

      {state.abandonedSession && (
        <AbandonedSessionCard
          session={state.abandonedSession}
          now={now}
          onRestore={onRestoreAbandoned}
          onDiscard={onDiscardAbandoned}
        />
      )}

      {recommended === null ? (
        <section className="card empty-state">
          <IconDumbbell size={26} />
          <h2>Aucune séance dans ton cycle</h2>
          <p className="lead">
            Crée ta première séance depuis l&apos;onglet Programmes : nomme-la, ajoute des
            exercices depuis le catalogue, et elle apparaîtra ici.
          </p>
          <button type="button" className="button button-accent" onClick={onOpenPrograms}>
            Créer une séance
            <IconArrowRight size={18} />
          </button>
        </section>
      ) : (
      <section className={`hero-card accent-${recommended.accent}`} aria-labelledby="hero-title">
        <div className="hero-top">
          <span className="hero-chip">Recommandé</span>
          <span className="hero-duration">
            <IconClock size={15} />
            {formatMinutes(recommended.estimatedMinutes)}
          </span>
        </div>

        <h2 id="hero-title" className="hero-title">
          {recommended.name}
        </h2>
        <p className="hero-focus">{recommended.focus}</p>

        <ul className="hero-exercises">
          {recommended.exercises.map((exercise, index) => (
            <li key={exercise.id}>
              <button type="button" onClick={() => onOpenDetail(detailFromTemplate(exercise))}>
                <span className="hero-index tabular">{String(index + 1).padStart(2, "0")}</span>
                <span className="hero-name">{exercise.shortName}</span>
                <span className="hero-target tabular">
                  {exercise.sets} × {formatRepRange(exercise.repMin, exercise.repMax)}
                </span>
                <IconChevronRight size={16} className="hero-chevron" />
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          className="button button-accent button-xl"
          onClick={() => onStart(recommended)}
          disabled={recommended.exercises.length === 0}
        >
          {recommended.exercises.length === 0 ? "Séance vide" : "Commencer la séance"}
          <IconArrowRight size={20} />
        </button>
        {recommended.warmup && <p className="hero-warmup">Échauffement · {recommended.warmup}</p>}
      </section>
      )}

      <section className="insight-grid">
        <article className="card insight">
          <span className="insight-icon">
            <IconTrend size={18} />
          </span>
          <div>
            <span className="kicker">Progression</span>
            <h3>
              {nextIncrease
                ? `Tu peux monter sur ${nextIncrease.exercise.shortName}`
                : "Stabilise tes charges"}
            </h3>
            <p>
              {nextIncrease
                ? `${formatLoad(nextIncrease.from, nextIncrease.exercise.unit)} → ${formatLoad(nextIncrease.to, nextIncrease.exercise.unit)} sur la dernière série.`
                : "Atteins le haut de la fourchette sur toutes les séries pour déclencher une hausse."}
            </p>
          </div>
        </article>

        <article className="card insight">
          <span className="insight-icon insight-icon-alt">
            {last ? <IconClock size={18} /> : <IconTrophy size={18} />}
          </span>
          <div>
            <span className="kicker">Dernière séance</span>
            <h3>{last ? last.programName : "Aucune séance"}</h3>
            <p>
              {last
                ? `${formatRelativeDay(last.date, now)} · ${formatMinutes(last.durationMinutes)} · ${last.completedExercises}/${last.totalExercises} exercices`
                : "Ton historique et tes records apparaîtront ici après la première séance."}
            </p>
          </div>
        </article>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <span className="eyebrow">Ton cycle</span>
            <h2 className="section-title">Le reste du programme</h2>
          </div>
          <button type="button" className="link-button" onClick={onOpenPrograms}>
            Tout voir
            <IconArrowRight size={16} />
          </button>
        </div>

        <div className="program-strip">
          {others.map((program, index) => (
            <button
              type="button"
              key={program.id}
              className={`program-tile accent-${program.accent}`}
              onClick={() => onStart(program)}
            >
              <span className="program-tile-bar" aria-hidden="true" />
              <span className="program-tile-index tabular">{String(index + 2).padStart(2, "0")}</span>
              <strong>{program.name}</strong>
              <small>{program.focus}</small>
              <span className="program-tile-meta tabular">
                {program.exercises.length} exercices · {formatMinutes(program.estimatedMinutes)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function AbandonedSessionCard({
  session,
  now,
  onRestore,
  onDiscard,
}: {
  session: Session;
  now: number;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  const { doneSets, totalSets } = sessionProgress(session);
  const plural = doneSets > 1 ? "s" : "";

  return (
    <section className="banner banner-accent abandoned-card" aria-labelledby="abandoned-title">
      <IconUndo size={18} />
      <div className="abandoned-body">
        <p>
          <strong id="abandoned-title">{session.programName} a été abandonnée.</strong>{" "}
          Commencée {formatRelativeDay(session.startedAt, now)} · {doneSets}/
          {totalSets} série{plural} validée{plural}. Tu peux la reprendre là où tu l&apos;as
          laissée.
        </p>
        <div className="abandoned-actions">
          <button type="button" className="button button-accent" onClick={onRestore}>
            Reprendre la séance
          </button>
          <button type="button" className="button button-ghost" onClick={onDiscard}>
            Oublier
          </button>
        </div>
      </div>
    </section>
  );
}

function WeekRing({ done, target, streak }: { done: number; target: number; streak: number }) {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, target === 0 ? 0 : done / target);

  return (
    <div className="week-ring">
      <svg viewBox="0 0 72 72" width="72" height="72" role="img" aria-label={`${done} séance${done > 1 ? "s" : ""} sur ${target} cette semaine`}>
        <circle cx="36" cy="36" r={radius} className="week-ring-track" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          className="week-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
        />
      </svg>
      <div className="week-ring-label">
        <strong className="tabular">{done}</strong>
        <small>/{target} sem.</small>
      </div>
      {streak > 1 && (
        <span className="streak-badge">
          <IconFlame size={13} />
          <span className="tabular">{streak}</span>
          {/* Même défaut que la coupe du record : la flamme est `aria-hidden`
              et un `title` ne se montre pas au doigt, donc le nombre était
              annoncé seul — « 4 », sans dire 4 de quoi. */}
          <span className="visually-hidden">semaines d&apos;affilée</span>
        </span>
      )}
    </div>
  );
}
