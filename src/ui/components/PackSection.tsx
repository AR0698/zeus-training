import { hasPack, PACKS, type PackId } from "../../domain/packs.ts";
import type { AppState } from "../../domain/types.ts";
import { IconPlus } from "../icons.tsx";

/**
 * Les programmes « poids du corps », proposés sous la liste des séances.
 *
 * Un paquet s'ajoute à la suite des séances existantes, qui tournent dans
 * l'ordre de la liste : le texte le dit, pour qu'on retire les séances de
 * transition en passant au programme principal plutôt que de s'étonner d'un
 * cycle à huit séances.
 */
export function PackSection({
  state,
  onAdd,
}: {
  state: AppState;
  onAdd: (packId: PackId) => void;
}) {
  return (
    <section className="pack-section" aria-labelledby="pack-section-title">
      <h2 id="pack-section-title" className="section-title">
        Sans salle
      </h2>
      <p className="muted">
        Des séances au poids du corps. Elles s&apos;ajoutent à la suite des tiennes ; en passant
        au programme principal, supprime celles de transition.
      </p>

      {PACKS.map((pack) => {
        const added = hasPack(state, pack.id);
        return (
          <article key={pack.id} className="card pack-card">
            <h3>{pack.name}</h3>
            <p className="muted">{pack.summary}</p>
            <p className="pack-equipment">
              <strong>À avoir :</strong> {pack.equipment}
            </p>
            <button
              type="button"
              className="button button-solid"
              onClick={() => onAdd(pack.id)}
              disabled={added}
            >
              {added ? (
                "Déjà ajouté"
              ) : (
                <>
                  <IconPlus size={18} />
                  Ajouter les 4 séances
                </>
              )}
            </button>
          </article>
        );
      })}
    </section>
  );
}
