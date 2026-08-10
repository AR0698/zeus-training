import { useEffect, useState } from "react";
import { formatDuration } from "../../domain/format.ts";
import type { AppState, Settings } from "../../domain/types.ts";
import { downloadBackup, pickBackupFile, readBackup } from "../../storage/backup.ts";
import { requestPersistentStorage, storageKind } from "../../storage/db.ts";
import { Segmented } from "../components/Segmented.tsx";
import { Sheet } from "../components/Sheet.tsx";
import {
  IconAlert,
  IconAuto,
  IconCheck,
  IconDownload,
  IconMoon,
  IconSun,
  IconTrash,
  IconUpload,
} from "../icons.tsx";

const REST_CHOICES = [45, 60, 90, 120, 180];

export function SettingsScreen({
  state,
  onUpdate,
  onImport,
  onReset,
  notify,
}: {
  state: AppState;
  onUpdate: (patch: Partial<Settings>) => void;
  onImport: (next: AppState, issues: string[]) => void;
  onReset: () => void;
  notify: (message: string, tone?: "success" | "warn" | "danger") => void;
}) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [persistent, setPersistent] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void navigator.storage
      ?.persisted?.()
      .then((value) => {
        if (!cancelled) setPersistent(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const handleImport = async () => {
    const text = await pickBackupFile();
    if (text === null) return;
    const result = readBackup(text, Date.now());
    if (!result.ok) {
      notify(result.error, "danger");
      return;
    }
    onImport(result.state, result.issues);
  };

  return (
    <>
      <header className="screen-head">
        <span className="eyebrow">Réglages</span>
        <h1 className="display">À ta main.</h1>
      </header>

      <section className="card panel">
        <span className="kicker">Apparence</span>
        <h2 className="panel-title">Thème</h2>
        <p className="lead">
          Le mode sombre est pensé pour une salle mal éclairée : moins d&apos;éblouissement entre deux
          séries, contraste maintenu au-delà des 4,5:1 exigés.
        </p>
        <Segmented
          name="theme"
          legend="Choix du thème"
          value={state.settings.theme}
          onChange={(theme) => onUpdate({ theme })}
          options={[
            { value: "auto", label: "Auto", icon: <IconAuto size={16} /> },
            { value: "dark", label: "Sombre", icon: <IconMoon size={16} /> },
            { value: "light", label: "Clair", icon: <IconSun size={16} /> },
          ]}
        />
      </section>

      <section className="card panel">
        <span className="kicker">Séance</span>
        <h2 className="panel-title">Confort en salle</h2>

        <label className="field">
          <span className="field-label">Ton prénom</span>
          <input
            className="field-input"
            type="text"
            autoComplete="given-name"
            placeholder="Optionnel"
            value={state.settings.displayName}
            onChange={(event) => onUpdate({ displayName: event.target.value })}
          />
          <span className="field-help">Affiché sur l&apos;accueil. Reste sur cet appareil.</span>
        </label>

        <ToggleRow
          label="Repos automatique"
          help="Démarre le compte à rebours dès qu'une série est validée."
          checked={state.settings.autoRest}
          onChange={(autoRest) => onUpdate({ autoRest })}
        />

        <div className="field">
          <span className="field-label">Repos par défaut</span>
          <div className="chip-row">
            {REST_CHOICES.map((seconds) => (
              <button
                type="button"
                key={seconds}
                className={`chip ${state.settings.defaultRestSeconds === seconds ? "is-active" : ""}`}
                onClick={() => onUpdate({ defaultRestSeconds: seconds })}
              >
                {formatDuration(seconds)}
              </button>
            ))}
          </div>
          <span className="field-help">
            Utilisé quand l&apos;exercice n&apos;a pas de repos propre. Les gros mouvements gardent le leur.
          </span>
        </div>

        <ToggleRow
          label="Vibrations"
          help="Confirmation courte à chaque série validée et à la fin du repos."
          checked={state.settings.vibration}
          onChange={(vibration) => onUpdate({ vibration })}
        />

        <ToggleRow
          label="Garder l'écran allumé"
          help="Évite de déverrouiller le téléphone entre chaque série."
          checked={state.settings.keepAwake}
          onChange={(keepAwake) => onUpdate({ keepAwake })}
        />
      </section>

      <section className="card panel">
        <span className="kicker">Tes données</span>
        <h2 className="panel-title">Sauvegarde</h2>
        <p className="lead">
          Tout est stocké sur cet appareil, rien n&apos;est envoyé sur un serveur. La contrepartie :
          une sauvegarde exportée régulièrement est ta seule copie de secours.
        </p>

        <div className="button-row">
          <button
            type="button"
            className="button button-solid"
            onClick={() => {
              downloadBackup(state, Date.now());
              notify("Sauvegarde exportée", "success");
            }}
          >
            <IconDownload size={18} />
            Exporter
          </button>
          <button type="button" className="button button-ghost" onClick={() => void handleImport()}>
            <IconUpload size={18} />
            Importer
          </button>
        </div>

        <dl className="meta-list">
          <div>
            <dt>Stockage</dt>
            <dd>{storageLabel()}</dd>
          </div>
          <div>
            <dt>Conservation</dt>
            <dd>
              {persistent === true ? (
                <span className="status-ok">
                  <IconCheck size={14} /> Durable
                </span>
              ) : (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    void requestPersistentStorage().then((granted) => {
                      setPersistent(granted);
                      notify(
                        granted
                          ? "Stockage durable accordé"
                          : "Le navigateur a refusé — installe l'app sur l'écran d'accueil",
                        granted ? "success" : "warn",
                      );
                    });
                  }}
                >
                  Demander le stockage durable
                </button>
              )}
            </dd>
          </div>
          <div>
            <dt>Séances enregistrées</dt>
            <dd className="tabular">{state.history.length}</dd>
          </div>
        </dl>
      </section>

      <section className="card panel panel-danger">
        <span className="kicker">Zone sensible</span>
        <h2 className="panel-title">Repartir de zéro</h2>
        <p className="lead">
          Efface l&apos;historique, les records et remet les programmes par défaut. Exporte une
          sauvegarde avant.
        </p>
        <button type="button" className="button button-danger" onClick={() => setConfirmReset(true)}>
          <IconTrash size={18} />
          Réinitialiser l&apos;application
        </button>
      </section>

      <p className="app-footnote">
        Zeus Training · application privée, hors ligne, sans compte ni suivi. Les recommandations de
        charge sont un outil de suivi, pas une prescription médicale.
      </p>

      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)} label="Confirmer la réinitialisation">
        <span className="kicker">Confirmation</span>
        <h2 className="sheet-title">Tout effacer ?</h2>
        <p className="lead">
          {state.history.length} séance{state.history.length > 1 ? "s" : ""} et{" "}
          {Object.keys(state.records).length} record{Object.keys(state.records).length > 1 ? "s" : ""}{" "}
          seront supprimés de cet appareil. Cette action peut être annulée juste après, via
          « Annuler » dans la notification.
        </p>
        <div className="banner banner-warn">
          <IconAlert size={18} />
          <p>Pense à exporter une sauvegarde d&apos;abord.</p>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="button button-danger"
            onClick={() => {
              setConfirmReset(false);
              onReset();
            }}
          >
            Oui, tout effacer
          </button>
          <button type="button" className="button button-ghost" onClick={() => setConfirmReset(false)}>
            Annuler
          </button>
        </div>
      </Sheet>
    </>
  );
}

function storageLabel(): string {
  switch (storageKind()) {
    case "indexeddb":
      return "IndexedDB (local)";
    case "localstorage":
      return "localStorage (mode dégradé)";
    default:
      return "Mémoire seule — non conservé";
  }
}

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <span className="field-label">{label}</span>
        <span className="field-help">{help}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}
