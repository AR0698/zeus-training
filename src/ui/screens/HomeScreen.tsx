import { packOf, PACKS, type PackId } from "../../domain/packs.ts";
import { programsAt } from "../../domain/place.ts";
import type { AppState, Place, Program } from "../../domain/types.ts";
import { ProgramCard } from "../components/ProgramCard.tsx";
import { IconPlus } from "../icons.tsx";
import type { ExerciseDetail } from "../types.ts";

/**
 * L'onglet Maison : deux programmes au choix, Sport hôtel (zéro accessoire) et
 * Sport maison (barre et élastiques), puis les séances composées pour chez soi.
 *
 * Choisir un programme l'ajoute à la bibliothèque — l'ajout est idempotent,
 * donc toucher de nouveau la carte ne coûte rien et n'écrase aucun réglage.
 */
export function HomeScreen({
  state,
  picked,
  onStart,
  onEdit,
  onCreate,
  onChoosePack,
  onOpenDetail,
}: {
  state: AppState;
  /** Le programme affiché, gardé par l'app d'un onglet à l'autre. */
  picked: PackId | null;
  onStart: (program: Program) => void;
  onEdit: (programId: string) => void;
  onCreate: (place: Place) => void;
  onChoosePack: (packId: PackId) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
}) {
  const home = programsAt(state.programs, "home");
  const sessions = home.filter((program) => picked !== null && packOf(program.id) === picked);
  const own = home.filter((program) => packOf(program.id) === null);

  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Maison</span>
        <h1 className="display">Sport à la maison</h1>
        <p className="lead">
          Choisis ton programme. Les séances se font carte par carte : une série à la fois, un
          gros bouton « Fait », et le repos seulement entre les tours.
        </p>
      </header>

      <div className="home-choice" role="group" aria-label="Programme à la maison">
        {PACKS.map((pack) => (
          <button
            type="button"
            key={pack.id}
            className={`card home-choice-card ${picked === pack.id ? "is-active" : ""}`}
            aria-pressed={picked === pack.id}
            onClick={() => onChoosePack(pack.id)}
          >
            <strong>{pack.name}</strong>
            <span className="home-choice-equipment">{pack.equipment}</span>
          </button>
        ))}
      </div>

      {picked === null ? (
        <p className="muted home-choice-hint">
          Sport hôtel se fait sans rien, dans une chambre. Sport maison demande une barre de
          traction de porte et des élastiques.
        </p>
      ) : (
        <div className="program-list">
          {sessions.map((program, index) => (
            <ProgramCard
              key={program.id}
              program={program}
              index={index}
              onStart={onStart}
              onEdit={onEdit}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      )}

      <section className="home-own" aria-labelledby="home-own-title">
        <h2 id="home-own-title" className="section-title">
          Mes séances à la maison
        </h2>
        <div className="program-list">
          {own.map((program, index) => (
            <ProgramCard
              key={program.id}
              program={program}
              index={index}
              onStart={onStart}
              onEdit={onEdit}
              onOpenDetail={onOpenDetail}
            />
          ))}
          <button type="button" className="card program-add" onClick={() => onCreate("home")}>
            <IconPlus size={22} />
            <strong>Nouvelle séance</strong>
            <small>Une séance à toi, à faire chez toi, en cartes elle aussi</small>
          </button>
        </div>
      </section>
    </>
  );
}
