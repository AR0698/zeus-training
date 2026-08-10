import { useState } from "react";
import {
  formatDayMonth,
  formatLoad,
  formatRelativeDay,
  formatVolume,
} from "../../domain/format.ts";
import { overview, pendingIncreases } from "../../domain/stats.ts";
import type { AppState, HistoryEntry } from "../../domain/types.ts";
import { IconFlame, IconTrend, IconTrophy } from "../icons.tsx";

const CHART_SIZE = 8;

export function ProgressScreen({ state, now }: { state: AppState; now: number }) {
  const stats = overview(state, now);
  const increases = pendingIncreases(state.programs);
  const recent = state.history.slice(0, CHART_SIZE).reverse();
  const records = Object.entries(state.records)
    .map(([id, record]) => ({ id, record, name: exerciseName(state, id) }))
    .sort((a, b) => b.record.date - a.record.date);

  if (state.history.length === 0) {
    return (
      <>
        <header className="screen-head">
          <span className="eyebrow">Progrès</span>
          <h1 className="display">Rien à montrer. Encore.</h1>
        </header>
        <div className="card empty-state">
          <IconTrend size={26} />
          <h2>Ton premier graphique arrive après ta première séance</h2>
          <p className="lead">
            Volume, records personnels et propositions de hausse se calculent uniquement à partir de
            séances réelles. Aucun chiffre n&apos;est inventé ici.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Progrès</span>
        <h1 className="display">Les chiffres utiles.</h1>
      </header>

      <div className="stat-grid">
        <StatTile value={String(stats.sessions)} label="séances tracées" />
        <StatTile value={String(stats.thisWeek)} label="cette semaine" />
        <StatTile
          value={String(stats.streak)}
          label={stats.streak > 1 ? "semaines d'affilée" : "semaine d'affilée"}
          icon={stats.streak > 1 ? <IconFlame size={15} /> : null}
        />
        <StatTile value={formatVolume(stats.totalVolume)} label="volume cumulé" />
      </div>

      <VolumeChart entries={recent} trendLabel={trendLabel(stats.trend)} />

      <div className="progress-columns">
        <article className="card panel">
          <span className="kicker">Prochaines hausses</span>
          <h2 className="panel-title">Propositions automatiques</h2>
          {increases.length > 0 ? (
            <ul className="panel-list">
              {increases.slice(0, 5).map(({ exercise, program, from, to }) => (
                <li key={`${program.id}-${exercise.id}`}>
                  <div>
                    <strong>{exercise.shortName}</strong>
                    <span className="muted">{program.name}</span>
                  </div>
                  <b className="delta-chip tabular">
                    {formatLoad(from, exercise.unit)} → {formatLoad(to, exercise.unit)}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lead">
              Aucune hausse en attente. Atteins le haut de la fourchette sur toutes les séries d&apos;un
              exercice pour en déclencher une.
            </p>
          )}
        </article>

        <article className="card panel">
          <span className="kicker">Records</span>
          <h2 className="panel-title">Meilleures séries</h2>
          {records.length > 0 ? (
            <ul className="panel-list">
              {records.slice(0, 5).map(({ id, record, name }) => (
                <li key={id}>
                  <div>
                    <strong>{name}</strong>
                    <span className="muted">{formatRelativeDay(record.date, now)}</span>
                  </div>
                  <b className="record-chip tabular">
                    <IconTrophy size={13} />
                    {record.weight} kg × {record.reps}
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lead">Les records apparaissent dès la deuxième séance d&apos;un exercice.</p>
          )}
        </article>
      </div>

      <article className="card panel">
        <span className="kicker">Historique</span>
        <h2 className="panel-title">Toutes tes séances</h2>
        <ul className="history-list">
          {state.history.slice(0, 20).map((entry) => (
            <li key={entry.id}>
              <time dateTime={new Date(entry.date).toISOString()} className="tabular">
                {formatDayMonth(entry.date)}
              </time>
              <div>
                <strong>{entry.programName}</strong>
                <span className="muted">{entry.note}</span>
              </div>
              <span className="history-score tabular">
                {entry.completedExercises}/{entry.totalExercises}
              </span>
            </li>
          ))}
        </ul>
      </article>
    </>
  );
}

function exerciseName(state: AppState, exerciseId: string): string {
  for (const program of state.programs) {
    const match = program.exercises.find((exercise) => exercise.id === exerciseId);
    if (match) return match.shortName;
  }
  return exerciseId;
}

function trendLabel(trend: ReturnType<typeof overview>["trend"]): string {
  if (trend.changePercent === null) return "tendance après 8 séances";
  const sign = trend.changePercent > 0 ? "+" : "";
  return `${sign}${trend.changePercent} % sur 4 séances`;
}

function StatTile({
  value,
  label,
  icon = null,
}: {
  value: string;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card stat-tile">
      <strong className="tabular">
        {icon}
        {value}
      </strong>
      <span>{label}</span>
    </div>
  );
}

/**
 * Session volume, one bar per session.
 *
 * Built from HTML rather than SVG on purpose: each bar is a real `<button>`, so
 * it is focusable, hoverable and tappable with no extra plumbing. A single
 * series needs no legend — the title names it — and the readout below the plot
 * has reserved height so selecting a bar never shifts the layout.
 */
function VolumeChart({ entries, trendLabel: trend }: { entries: HistoryEntry[]; trendLabel: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...entries.map((entry) => entry.volume), 1);
  const active = selected === null ? entries.length - 1 : selected;
  const current = entries[active];

  return (
    <article className="card chart-card">
      <header className="chart-head">
        <div>
          <span className="kicker">Volume par séance</span>
          <h2 className="panel-title">Charge × répétitions</h2>
        </div>
        <span className="trend-pill">
          <IconTrend size={14} />
          {trend}
        </span>
      </header>

      <div className="chart-plot">
        {entries.map((entry, index) => {
          const height = entry.volume === 0 ? 2 : Math.max(6, (entry.volume / max) * 100);
          return (
            <button
              type="button"
              key={entry.id}
              className={`chart-bar ${index === active ? "is-active" : ""}`}
              onClick={() => setSelected(index)}
              onMouseEnter={() => setSelected(index)}
              onFocus={() => setSelected(index)}
              aria-label={`${formatDayMonth(entry.date)}, ${entry.programName}, ${formatVolume(entry.volume)}`}
            >
              <span className="chart-bar-fill" style={{ height: `${height}%` }} />
              <span className="chart-bar-label tabular">{formatDayMonth(entry.date).split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      <p className="chart-readout">
        {current ? (
          <>
            <strong className="tabular">{formatVolume(current.volume)}</strong>
            <span className="muted">
              {current.programName} · {formatDayMonth(current.date)} · {current.completedSets} séries
            </span>
          </>
        ) : (
          <span className="muted">Aucune donnée</span>
        )}
      </p>

      <details className="chart-table">
        <summary>Voir les valeurs</summary>
        <table>
          <caption className="visually-hidden">Volume des dernières séances</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Séance</th>
              <th scope="col">Volume</th>
            </tr>
          </thead>
          <tbody>
            {[...entries].reverse().map((entry) => (
              <tr key={entry.id}>
                <td className="tabular">{formatDayMonth(entry.date)}</td>
                <td>{entry.programName}</td>
                <td className="tabular">{formatVolume(entry.volume)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}
