import type { CircuitGrid } from "../../domain/circuit.ts";

/**
 * La grille des tours : une ligne par tour, une case par exercice. Les cases
 * faites se remplissent, celle en cours est cerclée — on voit qu'on tourne en
 * boucle sans avoir à lire d'explication.
 */
export function RoundGrid({ grid }: { grid: CircuitGrid }) {
  const cells = grid.rows.flat();
  const done = cells.filter((cell) => cell === "done").length;
  const total = cells.filter((cell) => cell !== "skipped").length;

  return (
    <section className="round-grid" aria-label={`Tour ${grid.round} sur ${grid.rounds}, ${done} séries faites sur ${total}`}>
      <h2 className="round-grid-title" aria-hidden="true">
        Tour {grid.round} <span>sur {grid.rounds}</span>
      </h2>
      <div className="round-grid-rows" aria-hidden="true">
        {grid.rows.map((row, index) => (
          <div key={index} className={`round-grid-row ${index + 1 === grid.round ? "is-current" : ""}`}>
            <span className="round-grid-label tabular">T{index + 1}</span>
            {row.map((cell, column) => (
              <span key={column} className={`round-grid-cell is-${cell}`} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
