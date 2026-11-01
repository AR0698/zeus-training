import { useCallback, useMemo, useState } from "react";
import { restAfterValidation } from "./domain/circuit.ts";
import { formatLoad } from "./domain/format.ts";
import {
  makeCustomExercise,
  slugify,
  uniqueExerciseId,
} from "./domain/library.ts";
import { markOnboarded, type StarterChoice } from "./domain/onboarding.ts";
import type { PackId } from "./domain/packs.ts";
import { decideProgression } from "./domain/progression.ts";
import { shouldPromptBackup } from "./domain/reminder.ts";
import { isSessionStale } from "./domain/session.ts";
import type {
  AppState,
  Effort,
  ExerciseTemplate,
  Program,
  SessionExercise,
} from "./domain/types.ts";
import { downloadBackup } from "./storage/backup.ts";
import { useHaptics } from "./hooks/useHaptics.ts";
import { useNow } from "./hooks/useNow.ts";
import { useRestTimer } from "./hooks/useRestTimer.ts";
import { useRestCues, useSounds } from "./hooks/useSounds.ts";
import { useTheme } from "./hooks/useTheme.ts";
import { useWakeLock } from "./hooks/useWakeLock.ts";
import { useStore } from "./state/store.tsx";
import { BackupReminderSheet } from "./ui/components/BackupReminderSheet.tsx";
import { ExerciseSheet } from "./ui/components/ExerciseSheet.tsx";
import { ReplaceSheet } from "./ui/components/ReplaceSheet.tsx";
import { Sheet } from "./ui/components/Sheet.tsx";
import { Toaster, useToaster, type ToastTone } from "./ui/components/Toast.tsx";
import { preloadFigures } from "./ui/figures.ts";
import {
  IconAlert,
  IconDumbbell,
  IconHome,
  IconSettings,
  IconTrend,
  IconWifiOff,
} from "./ui/icons.tsx";
import {
  ProgramEditorScreen,
  type ProgramEditorHandlers,
} from "./ui/screens/ProgramEditorScreen.tsx";
import { ProgramsScreen } from "./ui/screens/ProgramsScreen.tsx";
import { ProgressScreen } from "./ui/screens/ProgressScreen.tsx";
import { SessionScreen, type SessionHandlers } from "./ui/screens/SessionScreen.tsx";
import { SettingsScreen } from "./ui/screens/SettingsScreen.tsx";
import { TodayScreen } from "./ui/screens/TodayScreen.tsx";
import { WelcomeScreen } from "./ui/screens/WelcomeScreen.tsx";
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
  const sounds = useSounds(state.settings.sounds);
  // One clock for the whole app: to the second during a session, to the minute
  // otherwise. No screen ever calls Date.now() while rendering.
  const now = useNow(true, state.session === null ? 60_000 : 1000);

  useTheme(state.settings.theme);
  useWakeLock(state.settings.keepAwake && state.session !== null);

  const rest = useRestTimer(
    useCallback(() => {
      haptics.alert();
      show({ message: "Repos terminé — série suivante", tone: "success" });
    }, [haptics, show]),
  );
  useRestCues(rest.remaining, sounds);

  const notify = useCallback(
    (message: string, tone: ToastTone = "neutral") => show({ message, tone }),
    [show],
  );

  // Un seul chemin d'export : le rappel mensuel et l'écran Réglages doivent
  // enregistrer la même date, sinon le rappel se redéclencherait juste après
  // une sauvegarde faite depuis l'autre bouton.
  const exportBackup = useCallback(() => {
    const at = Date.now();
    downloadBackup(state, at);
    dispatch({ type: "backup/exported", now: at });
    show({ message: "Sauvegarde exportée — dépose-la sur Drive ou iCloud", tone: "success" });
  }, [state, dispatch, show]);

  const importState = useCallback(
    (next: AppState, importIssues: string[]) => {
      // Arriver avec une sauvegarde vaut réponse à l'écran de bienvenue.
      dispatch({ type: "state/replace", state: markOnboarded(next, Date.now()) });
      show({
        message: `Sauvegarde importée — ${next.history.length} séance(s)`,
        tone: "success",
        action: { label: "Annuler", run: undo },
      });
      if (importIssues.length > 0) notify(importIssues[0] ?? "", "warn");
      setTab("today");
    },
    [dispatch, show, notify, undo],
  );

  const startOnboarding = useCallback(
    (starter: StarterChoice, displayName: string) => {
      dispatch({ type: "onboarding/finish", choice: { now: Date.now(), starter, displayName } });
      // Page blanche : la première chose à faire est de composer une séance.
      setTab(starter === "blank" ? "programs" : "today");
    },
    [dispatch],
  );

  const startSession = useCallback(
    (program: Program) => {
      dispatch({ type: "session/start", program, now: Date.now(), id: newId("session") });
      haptics.confirm();
      rest.stop();
      setSessionHidden(false);
      setTab("today");
      // On tient encore le réseau de la maison : on met les dessins de la
      // séance en cache maintenant, pour qu'ils s'affichent au sous-sol.
      preloadFigures(program.exercises.map((exercise) => exercise.id));
    },
    [dispatch, haptics, rest],
  );

  // Reprendre une séance abandonnée est un choix explicite : la feuille
  // « séance oubliée » ne doit pas la reposer aussitôt, même si elle date.
  const restoreAbandoned = useCallback(() => {
    dispatch({ type: "session/restoreAbandoned" });
    haptics.confirm();
    setStaleDismissed(true);
    setSessionHidden(false);
    setTab("today");
  }, [dispatch, haptics]);

  const discardAbandoned = useCallback(() => {
    dispatch({ type: "session/discardAbandoned" });
    show({ message: "Séance abandonnée oubliée", action: { label: "Annuler", run: undo } });
  }, [dispatch, show, undo]);

  const handlers = useMemo<SessionHandlers>(
    () => ({
      adjust: (exerciseId, setIndex, field, delta) =>
        dispatch({ type: "session/adjust", exerciseId, setIndex, field, delta }),
      setValue: (exerciseId, setIndex, field, value) =>
        dispatch({ type: "session/setValue", exerciseId, setIndex, field, value }),
      toggleSet: (entry, setIndex) => {
        const wasDone = entry.sets[setIndex]?.done ?? false;
        // Décidé sur la séance d'avant le geste : en circuit, pas de repos
        // entre deux exercices d'un tour, celui du circuit en fin de tour.
        const decision = state.session
          ? restAfterValidation(state.session, entry.exerciseId, setIndex, state.settings)
          : ({ kind: "none" } as const);
        dispatch({ type: "session/toggleSet", exerciseId: entry.exerciseId, setIndex, now: Date.now() });
        if (wasDone) {
          haptics.tap();
          return;
        }
        haptics.confirm();
        if (decision.kind === "start") rest.start(decision.seconds);
        if (decision.kind === "stop") rest.stop();
      },
      setEffort: (exerciseId, effort: Effort) => {
        dispatch({ type: "session/setEffort", exerciseId, effort });
        haptics.tap();
      },
      setNote: (exerciseId, note) => dispatch({ type: "session/setNote", exerciseId, note }),
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
    [dispatch, haptics, rest, show, undo, state.settings, state.session],
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

    // L'annulation vaut pour les trois issues. Elle ne tenait qu'à la plus
    // banale, alors qu'un enregistrement par mégarde coûte le plus cher
    // précisément quand la séance a produit un record ou une hausse.
    const cancel = { label: "Annuler", run: undo };

    if (prs.length > 0) {
      haptics.celebrate();
      show({
        message: `Record battu : ${prs.map((entry) => entry.shortName).join(", ")}`,
        tone: "success",
        action: cancel,
      });
    } else if (increases.length > 0) {
      haptics.confirm();
      const first = increases[0];
      show({
        message: first
          ? `Séance enregistrée — ${first.entry.shortName} passe à ${formatLoad(first.decision.nextWeights.at(-1) ?? 0, first.entry.unit)}`
          : "Séance enregistrée",
        tone: "success",
        action: cancel,
      });
    } else {
      haptics.confirm();
      show({ message: "Séance enregistrée", tone: "success", action: cancel });
    }
    setTab("today");
  }

  const editedProgram = state.programs.find((program) => program.id === editProgramId) ?? null;
  const editedIndex = state.programs.findIndex((program) => program.id === editProgramId);

  function makeEditorHandlers(program: Program): ProgramEditorHandlers {
    const addTemplate = (template: ExerciseTemplate): string => {
      const id = uniqueExerciseId(program, template.id);
      dispatch({
        type: "program/addExercise",
        programId: program.id,
        exercise: { ...structuredClone(template), id },
      });
      haptics.tap();
      return id;
    };

    return {
      update: (patch) => dispatch({ type: "program/update", programId: program.id, patch }),
      moveProgram: (direction) =>
        dispatch({ type: "program/move", programId: program.id, direction }),
      duplicate: () => {
        const id = newId("program");
        dispatch({ type: "program/duplicate", programId: program.id, id });
        setEditProgramId(id);
        show({ message: `« ${program.name} » dupliquée`, tone: "success" });
      },
      remove: () => {
        dispatch({ type: "program/delete", programId: program.id });
        setEditProgramId(null);
        show({
          message: `« ${program.name} » supprimée`,
          tone: "warn",
          action: { label: "Annuler", run: undo },
        });
      },
      addExercise: addTemplate,
      createCustomExercise: () => {
        const id = uniqueExerciseId(program, `perso-${slugify(String(state.programs.length))}`);
        dispatch({
          type: "program/addExercise",
          programId: program.id,
          exercise: makeCustomExercise(id),
        });
        return id;
      },
      removeExercise: (exerciseId) => {
        const exercise = program.exercises.find((item) => item.id === exerciseId);
        dispatch({ type: "program/removeExercise", programId: program.id, exerciseId });
        show({
          message: `${exercise?.shortName ?? "Exercice"} retiré`,
          action: { label: "Annuler", run: undo },
        });
      },
      moveExercise: (exerciseId, direction) =>
        dispatch({ type: "program/moveExercise", programId: program.id, exerciseId, direction }),
      patchExercise: (exerciseId, patch) =>
        dispatch({ type: "program/updateExercise", programId: program.id, exerciseId, patch }),
      start: () => {
        setEditProgramId(null);
        startSession(program);
      },
    };
  }

  function createProgram() {
    const id = newId("program");
    dispatch({ type: "program/create", id });
    setEditProgramId(id);
    setTab("programs");
  }

  function addPack(packId: PackId) {
    dispatch({ type: "program/addPack", packId });
    show({ message: "Séances ajoutées à ta liste", tone: "success" });
  }

  const staleSession =
    state.session !== null && !staleDismissed && isSessionStale(state.session, now);
  // Deux feuilles modales ouvertes en même temps s'empilent : la séance oubliée
  // est plus urgente, le rappel de sauvegarde attendra le prochain lancement.
  const backupDue = !staleSession && shouldPromptBackup(state, now);

  if (status === "loading") {
    return (
      <div className="boot" role="status" aria-live="polite">
        <span className="boot-mark">Z</span>
        <p>Chargement de tes données…</p>
      </div>
    );
  }

  // Première ouverture : personne n'hérite des séances de quelqu'un d'autre.
  if (state.onboardedAt === null) {
    return (
      <>
        <WelcomeScreen onChoose={startOnboarding} onImport={importState} notify={notify} />
        <Toaster toast={toast} onDismiss={dismiss} />
      </>
    );
  }

  if (state.session && !staleSession && !sessionHidden) {
    return (
      <>
        <SessionScreen
          session={state.session}
          history={state.history}
          settings={state.settings}
          now={now}
          rest={rest}
          handlers={handlers}
        />
        <ExerciseSheet detail={detail} onClose={() => setDetail(null)} />
        <ReplaceSheet
          entry={replaceTarget}
          canKeep={
            replaceTarget !== null &&
            state.programs.some(
              (program) =>
                program.id === state.session?.programId &&
                program.exercises.some((exercise) => exercise.id === replaceTarget.exerciseId),
            )
          }
          onClose={() => setReplaceTarget(null)}
          onChoose={(alternative, keep) => {
            if (!replaceTarget) return;
            const { exerciseId, name, shortName } = replaceTarget;
            if (keep) {
              dispatch({ type: "session/keepReplacement", exerciseId, alternative });
              show({
                message: `${alternative} remplace ${shortName} dans le programme`,
                action: { label: "Annuler", run: undo },
              });
            } else {
              dispatch({ type: "session/replace", exerciseId, alternative });
              show({
                message:
                  alternative === name ? `Retour à ${shortName}` : `${alternative} remplace ${shortName}`,
              });
            }
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

        {editedProgram && (
          <ProgramEditorScreen
            program={editedProgram}
            index={editedIndex}
            total={state.programs.length}
            onBack={() => setEditProgramId(null)}
            handlers={makeEditorHandlers(editedProgram)}
          />
        )}

        {!editedProgram && tab === "today" && (
          <TodayScreen
            state={state}
            now={now}
            onStart={startSession}
            onOpenDetail={setDetail}
            onOpenPrograms={() => setTab("programs")}
            onRestoreAbandoned={restoreAbandoned}
            onDiscardAbandoned={discardAbandoned}
          />
        )}
        {!editedProgram && tab === "programs" && (
          <ProgramsScreen
            state={state}
            onStart={startSession}
            onEdit={setEditProgramId}
            onCreate={createProgram}
            onAddPack={addPack}
            onOpenDetail={setDetail}
          />
        )}
        {!editedProgram && tab === "progress" && <ProgressScreen state={state} now={now} />}
        {!editedProgram && tab === "settings" && (
          <SettingsScreen
            state={state}
            now={now}
            onUpdate={(patch) => dispatch({ type: "settings/update", patch })}
            onPreviewSound={() => sounds.preview("end")}
            onExport={exportBackup}
            onImport={importState}
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

      <BackupReminderSheet
        state={state}
        open={backupDue}
        now={now}
        onExport={exportBackup}
        onLater={() => dispatch({ type: "backup/snooze", now: Date.now() })}
      />

      <Toaster toast={toast} onDismiss={dismiss} />
      {canUndo && <span className="visually-hidden">Une annulation est disponible</span>}
    </div>
  );
}
