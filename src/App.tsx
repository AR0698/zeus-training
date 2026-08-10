import { useCallback, useMemo, useState } from "react";
import { formatLoad } from "./domain/format.ts";
import { decideProgression } from "./domain/progression.ts";
import { isSessionStale } from "./domain/session.ts";
import type { AppState, Effort, Program, SessionExercise } from "./domain/types.ts";
import { useHaptics } from "./hooks/useHaptics.ts";
import { useNow } from "./hooks/useNow.ts";
import { useRestTimer } from "./hooks/useRestTimer.ts";
import { useTheme } from "./hooks/useTheme.ts";
import { useWakeLock } from "./hooks/useWakeLock.ts";
import { useStore } from "./state/store.tsx";
import { ExerciseSheet } from "./ui/components/ExerciseSheet.tsx";
import { ReplaceSheet } from "./ui/components/ReplaceSheet.tsx";
import { Sheet } from "./ui/components/Sheet.tsx";
import { Toaster, useToaster, type ToastTone } from "./ui/components/Toast.tsx";
import {
  IconAlert,
  IconDumbbell,
  IconHome,
  IconSettings,
  IconTrend,
  IconUpload,
  IconWifiOff,
} from "./ui/icons.tsx";
import { EditProgramSheet, ProgramsScreen } from "./ui/screens/ProgramsScreen.tsx";
import { ProgressScreen } from "./ui/screens/ProgressScreen.tsx";
import { SessionScreen, type SessionHandlers } from "./ui/screens/SessionScreen.tsx";
import { SettingsScreen } from "./ui/screens/SettingsScreen.tsx";
import { TodayScreen } from "./ui/screens/TodayScreen.tsx";
import { newId, type ExerciseDetail } from "./ui/types.ts";

type Tab = "today" | "programs" | "progress" | "settings";

const TABS: { id: Tab; label: string; icon: (props: { size?: number }) => React.ReactElement }[] = [
  { id: "today", label: "Aujourd'hui", icon: IconHome },
  { id: "programs", label: "Programmes", icon: IconDumbbell },
  { id: "progress", label: "Progrès", icon: IconTrend },
  { id: "settings", label: "Réglages", icon: IconSettings },
];

export function App() {
  const { state, status, dispatch, storageError, canUndo, undo, issues, dismissIssues } = useStore();
  const [tab, setTab] = useState<Tab>("today");
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<SessionExercise | null>(null);
  const [editProgramId, setEditProgramId] = useState<string | null>(null);
  const [staleDismissed, setStaleDismissed] = useState(false);
  // A running session can be put aside to consult the programs or the history;
  // it keeps running and a bar offers the way back.
  const [sessionHidden, setSessionHidden] = useState(false);

  const { toast, show, dismiss } = useToaster();
  const haptics = useHaptics(state.settings.vibration);
  const now = useNow(state.session !== null);

  useTheme(state.settings.theme);
  useWakeLock(state.settings.keepAwake && state.session !== null);

  const rest = useRestTimer(
    useCallback(() => {
      haptics.alert();
      show({ message: "Repos terminé — série suivante", tone: "success" });
    }, [haptics, show]),
  );

  const notify = useCallback(
    (message: string, tone: ToastTone = "neutral") => show({ message, tone }),
    [show],
  );

  const startSession = useCallback(
    (program: Program) => {
      dispatch({ type: "session/start", program, now: Date.now(), id: newId("session") });
      haptics.confirm();
      rest.stop();
      setSessionHidden(false);
      setTab("today");
    },
    [dispatch, haptics, rest],
  );

  const handlers = useMemo<SessionHandlers>(
    () => ({
      adjust: (exerciseId, setIndex, field, delta) =>
        dispatch({ type: "session/adjust", exerciseId, setIndex, field, delta }),
      setValue: (exerciseId, setIndex, field, value) =>
        dispatch({ type: "session/setValue", exerciseId, setIndex, field, value }),
      toggleSet: (entry, setIndex) => {
        const wasDone = entry.sets[setIndex]?.done ?? false;
        dispatch({ type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex, now: Date.now() });
        if (wasDone) {
          haptics.tap();
          return;
        }
        haptics.confirm();
        const restSeconds = entry.restSeconds > 0 ? entry.restSeconds : state.settings.defaultRestSeconds;
        const lastSet = setIndex === entry.sets.length - 1;
        if (state.settings.autoRest && !lastSet) rest.start(restSeconds);
        if (lastSet) rest.stop();
      },
      setEffort: (exerciseId, effort: Effort) => {
        dispatch({ type: "session/setEffort", exerciseId, effort });
        haptics.tap();
      },
      skip: (entry) => {
        dispatch({ type: "session/skip", exerciseId: entry.exerciseId });
        show({
          message: `${entry.shortName} passé — il sera reproposé`,
          action: { label: "Annuler", run: undo },
        });
      },
      resume: (exerciseId) => dispatch({ type: "session/resume", exerciseId }),
      focus: (exerciseId) => dispatch({ type: "session/focus", exerciseId }),
      addSet: (exerciseId) => dispatch({ type: "session/addSet", exerciseId }),
      removeSet: (exerciseId) => dispatch({ type: "session/removeSet", exerciseId }),
      replace: (entry) => setReplaceTarget(entry),
      openDetail: setDetail,
      finish: () => finishSession(),
      abandon: () => {
        dispatch({ type: "session/abandon" });
        rest.stop();
        show({ message: "Séance abandonnée", action: { label: "Annuler", run: undo } });
      },
      minimize: () => {
        setSessionHidden(true);
        setTab("programs");
      },
      startRest: (seconds) => {
        rest.start(seconds);
        haptics.tap();
      },
    }),
    // `finishSession` is stable enough for this list: it only reads `state`
    // through the closure below, which is recreated with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, haptics, rest, show, undo, state.settings.autoRest, state.settings.defaultRestSeconds, state.session],
  );

  function finishSession() {
    const session = state.session;
    if (!session) return;
    const increases = session.exercises
      .map((entry) => ({ entry, decision: decideProgression(entry) }))
      .filter(({ decision }) => decision.action === "increase");
    const prs = session.exercises.filter((entry) => entry.sets.some((set) => set.pr));

    dispatch({ type: "session/finish", now: Date.now() });
    rest.stop();

    if (prs.length > 0) {
      haptics.celebrate();
      show({ message: `Record battu : ${prs.map((entry) => entry.shortName).join(", ")}`, tone: "success" });
    } else if (increases.length > 0) {
      haptics.confirm();
      const first = increases[0];
      show({
        message: first
          ? `Séance enregistrée — ${first.entry.shortName} passe à ${formatLoad(first.decision.nextWeights.at(-1) ?? 0, first.entry.unit)}`
          : "Séance enregistrée",
        tone: "success",
      });
    } else {
      haptics.confirm();
      show({ message: "Séance enregistrée", tone: "success", action: { label: "Annuler", run: undo } });
    }
    setTab("today");
  }

  const editedProgram = state.programs.find((program) => program.id === editProgramId) ?? null;
  const staleSession =
    state.session !== null && !staleDismissed && isSessionStale(state.session, Date.now());

  if (status === "loading") {
    return (
      <div className="boot" role="status" aria-live="polite">
        <span className="boot-mark">Z</span>
        <p>Chargement de tes données…</p>
      </div>
    );
  }

  if (state.session && !staleSession && !sessionHidden) {
    return (
      <>
        <SessionScreen
          session={state.session}
          settings={state.settings}
          now={now}
          rest={rest}
          handlers={handlers}
        />
        <ExerciseSheet detail={detail} onClose={() => setDetail(null)} />
        <ReplaceSheet
          entry={replaceTarget}
          onClose={() => setReplaceTarget(null)}
          onChoose={(alternative) => {
            if (!replaceTarget) return;
            dispatch({ type: "session/replace", exerciseId: replaceTarget.exerciseId, alternative });
            show({ message: `${alternative} remplace ${replaceTarget.shortName}` });
            setReplaceTarget(null);
          }}
        />
        <Toaster toast={toast} onDismiss={dismiss} />
      </>
    );
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>

      <header className="topbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true">
            Z
          </span>
          <span className="brand-text">
            Zeus <b>Training</b>
          </span>
        </span>
        <span className="storage-pill" title="Toutes les données restent sur cet appareil">
          <IconWifiOff size={13} />
          Local
        </span>
      </header>

      {state.session && sessionHidden && (
        <button type="button" className="resume-bar" onClick={() => setSessionHidden(false)}>
          <span className="live-dot" aria-hidden="true" />
          <span>
            <strong>{state.session.programName}</strong> en cours
          </span>
          <span className="resume-bar-cta">Reprendre</span>
        </button>
      )}

      <main id="main" className="page">
        {storageError && (
          <div className="banner banner-danger" role="alert">
            <IconAlert size={18} />
            <p>{storageError}</p>
          </div>
        )}

        {issues.length > 0 && (
          <div className="banner banner-warn" role="status">
            <IconAlert size={18} />
            <div>
              {issues.map((issue) => (
                <p key={issue}>{issue}</p>
              ))}
              <button type="button" className="link-button" onClick={dismissIssues}>
                J&apos;ai compris
              </button>
            </div>
          </div>
        )}

        {state.history.length === 0 && tab === "today" && (
          <div className="banner banner-accent">
            <IconUpload size={18} />
            <div>
              <p>
                <strong>Tu as déjà un carnet ?</strong> Importe ta sauvegarde pour retrouver tes
                charges et ton historique.
              </p>
              <button type="button" className="link-button" onClick={() => setTab("settings")}>
                Aller dans Réglages → Importer
              </button>
            </div>
          </div>
        )}

        {tab === "today" && (
          <TodayScreen
            state={state}
            now={Date.now()}
            onStart={startSession}
            onOpenDetail={setDetail}
            onOpenPrograms={() => setTab("programs")}
          />
        )}
        {tab === "programs" && (
          <ProgramsScreen
            state={state}
            onStart={startSession}
            onEdit={setEditProgramId}
            onOpenDetail={setDetail}
          />
        )}
        {tab === "progress" && <ProgressScreen state={state} now={Date.now()} />}
        {tab === "settings" && (
          <SettingsScreen
            state={state}
            onUpdate={(patch) => dispatch({ type: "settings/update", patch })}
            onImport={(next: AppState, importIssues) => {
              dispatch({ type: "state/replace", state: next });
              show({
                message: `Sauvegarde importée — ${next.history.length} séance(s)`,
                tone: "success",
                action: { label: "Annuler", run: undo },
              });
              if (importIssues.length > 0) notify(importIssues[0] ?? "", "warn");
              setTab("today");
            }}
            onReset={() => {
              dispatch({ type: "state/reset", now: Date.now() });
              show({
                message: "Application réinitialisée",
                tone: "warn",
                action: { label: "Annuler", run: undo },
              });
              setTab("today");
            }}
            notify={notify}
          />
        )}
      </main>

      <nav className="tabbar" aria-label="Navigation principale">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            type="button"
            key={id}
            className={tab === id ? "is-active" : ""}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => {
              setTab(id);
              window.scrollTo({ top: 0 });
            }}
          >
            <Icon size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <ExerciseSheet detail={detail} onClose={() => setDetail(null)} />
      <EditProgramSheet
        program={editedProgram}
        onClose={() => setEditProgramId(null)}
        onAdjust={(exerciseId, setIndex, delta) => {
          if (!editProgramId) return;
          dispatch({ type: "program/adjustTarget", programId: editProgramId, exerciseId, setIndex, delta });
        }}
        onSet={(exerciseId, setIndex, value) => {
          if (!editProgramId) return;
          dispatch({ type: "program/setTarget", programId: editProgramId, exerciseId, setIndex, value });
        }}
      />

      <Sheet
        open={staleSession}
        onClose={() => setStaleDismissed(true)}
        label="Séance laissée en cours"
      >
        <span className="kicker">Séance oubliée</span>
        <h2 className="sheet-title">Une séance est restée ouverte</h2>
        <p className="lead">
          {state.session?.programName} a démarré il y a plus de cinq heures. Tu peux la reprendre,
          l&apos;enregistrer telle quelle, ou l&apos;abandonner.
        </p>
        <div className="stack">
          <button type="button" className="button button-accent" onClick={() => setStaleDismissed(true)}>
            Reprendre la séance
          </button>
          <button
            type="button"
            className="button button-solid"
            onClick={() => {
              setStaleDismissed(true);
              finishSession();
            }}
          >
            Enregistrer telle quelle
          </button>
          <button
            type="button"
            className="button button-danger-quiet"
            onClick={() => {
              setStaleDismissed(true);
              dispatch({ type: "session/abandon" });
              show({ message: "Séance abandonnée", action: { label: "Annuler", run: undo } });
            }}
          >
            Abandonner
          </button>
        </div>
      </Sheet>

      <Toaster toast={toast} onDismiss={dismiss} />
      {canUndo && <span className="visually-hidden">Une annulation est disponible</span>}
    </div>
  );
}
