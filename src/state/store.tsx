import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createInitialState } from "../domain/seed.ts";
import type { AppState } from "../domain/types.ts";
import { loadState, requestPersistentStorage, saveState, storageKind } from "../storage/db.ts";
import { SAVE_NOW, UNDOABLE, type Action } from "./actions.ts";
import { reducer } from "./reducer.ts";
import { parseAppState } from "./schema.ts";

/**
 * The single owner of application state.
 *
 * Reads happen once at boot, writes are debounced and flushed whenever the page
 * is about to disappear. The reducer stays pure: persistence is a side effect of
 * *observing* the state, never something a reducer case performs.
 */

const SAVE_DEBOUNCE_MS = 400;
const UNDO_DEPTH = 10;

type Store = {
  state: AppState;
  status: "loading" | "ready";
  /** Set when a write failed, so the UI can stop claiming everything is saved. */
  storageError: string | null;
  saving: boolean;
  issues: string[];
  dispatch: (action: Action) => void;
  canUndo: boolean;
  undo: () => void;
  dismissIssues: () => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, rawDispatch] = useReducer(reducer, undefined, () => createInitialState(Date.now()));
  const [status, setStatus] = useState<Store["status"]>("loading");
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  const undoStack = useRef<AppState[]>([]);
  const latest = useRef(state);
  // Declared before the persistence effect so `flush` always sees this render's
  // state: effects run in declaration order.
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const saveTimer = useRef<number | null>(null);
  const pendingSave = useRef(false);
  const saveNow = useRef(false);

  // ---- boot ---------------------------------------------------------------
  // No "already hydrated" guard here: under StrictMode the effect runs, unmounts
  // and runs again, and a guard would leave the second run staring at a result
  // the first run's cleanup already discarded. Reading twice is harmless.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const raw = await loadState();
      const parsed = parseAppState(raw, Date.now());
      if (cancelled) return;
      if (!parsed.fresh) rawDispatch({ type: "state/replace", state: parsed.state });
      setIssues(parsed.issues);
      setStatus("ready");
      void requestPersistentStorage();
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ---- persistence --------------------------------------------------------
  const flush = useCallback(async () => {
    if (!pendingSave.current) return;
    pendingSave.current = false;
    try {
      await saveState(latest.current, Date.now());
      setStorageError(null);
    } catch {
      setStorageError(
        storageKind() === "memory"
          ? "Stockage indisponible — cette séance ne sera pas conservée à la fermeture."
          : "La dernière sauvegarde a échoué. Exporte une sauvegarde par sécurité.",
      );
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    pendingSave.current = true;
    setSaving(true);
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    const delay = saveNow.current ? 0 : SAVE_DEBOUNCE_MS;
    saveNow.current = false;
    saveTimer.current = window.setTimeout(() => void flush(), delay);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [state, status, flush]);

  // Leaving the page mid-set must never cost a set.
  useEffect(() => {
    const onHide = () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
      void flush();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") onHide();
    });
    return () => window.removeEventListener("pagehide", onHide);
  }, [flush]);

  // ---- dispatch with undo -------------------------------------------------
  const dispatch = useCallback((action: Action) => {
    if (SAVE_NOW.has(action.type)) saveNow.current = true;
    if (UNDOABLE.has(action.type)) {
      undoStack.current = [latest.current, ...undoStack.current].slice(0, UNDO_DEPTH);
      setUndoDepth(undoStack.current.length);
    }
    rawDispatch(action);
  }, []);

  const undo = useCallback(() => {
    const [previous, ...rest] = undoStack.current;
    if (!previous) return;
    undoStack.current = rest;
    setUndoDepth(rest.length);
    rawDispatch({ type: "state/replace", state: previous });
  }, []);

  const value = useMemo<Store>(
    () => ({
      state,
      status,
      storageError,
      saving,
      issues,
      dispatch,
      canUndo: undoDepth > 0,
      undo,
      dismissIssues: () => setIssues([]),
    }),
    [state, status, storageError, saving, issues, dispatch, undoDepth, undo],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore doit être utilisé dans <StoreProvider>");
  return store;
}
