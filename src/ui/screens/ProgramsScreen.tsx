import { programsAt } from "../../domain/place.ts";
import type { AppState, Place, Program } from "../../domain/types.ts";
import { ProgramCard } from "../components/ProgramCard.tsx";
import { IconPlus } from "../icons.tsx";
import type { ExerciseDetail } from "../types.ts";

/** L'onglet Salle : les séances faites en tableau de séries, dans l'ordre de la rotation. */
export function ProgramsScreen({
  state,
  onStart,
  onEdit,
  onCreate,
  onOpenDetail,
}: {
  state: AppState;
  onStart: (program: Program) => void;
  onEdit: (programId: string) => void;
  onCreate: (place: Place) => void;
  onOpenDetail: (detail: ExerciseDetail) => void;
}) {
  const programs = programsAt(state.programs, "gym");

  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Salle</span>
        <h1 className="display">Ton cycle, à ta façon</h1>
        <p className="lead">
          Les séances tournent en boucle dans l&apos;ordre de cette liste. Ajoute, retire et
          réordonne les exercices ; les cibles se recalculent seules après chaque séance.
        </p>
      </header>

      {programs.length === 0 ? (
        <div className="card empty-state">
          <IconPlus size={26} />
          <h2>Aucune séance pour l&apos;instant</h2>
          <p className="lead">
            Crée ta première séance : nomme-la, ajoute des exercices depuis le catalogue, et elle
            apparaîtra sur l&apos;accueil.
          </p>
          <button type="button" className="button button-accent" onClick={() => onCreate("gym")}>
            <IconPlus size={18} />
            Créer une séance
          </button>
        </div>
      ) : (
        <div className="program-list">
          {programs.map((program, index) => (
            <ProgramCard
              key={program.id}
              program={program}
              index={index}
              onStart={onStart}
              onEdit={onEdit}
              onOpenDetail={onOpenDetail}
            />
          ))}

          <button type="button" className="card program-add" onClick={() => onCreate("gym")}>
            <IconPlus size={22} />
            <strong>Nouvelle séance</strong>
            <small>Repartir d&apos;une page blanche ou dupliquer une séance existante</small>
          </button>
        </div>
      )}

    </>
  );
}
