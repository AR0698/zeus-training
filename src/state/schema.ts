import { catalogTemplate } from "../domain/catalog/index.ts";
import {
  CURRENT_VERSION,
  DEFAULT_SETTINGS,
  SEED_PROGRAMS,
  createInitialState,
} from "../domain/seed.ts";
import type {
  AppState,
  Effort,
  ExerciseTemplate,
  HistoryEntry,
  MuscleGroup,
  PersonalRecord,
  Program,
  Session,
  SessionExercise,
  SessionExerciseStatus,
  SetEntry,
  Settings,
  ThemePreference,
  Unit,
} from "../domain/types.ts";

/**
 * Defensive parsing for anything that comes back from disk or from an imported
 * file.
 *
 * The contract is absolute: `parseAppState` never throws and always returns a
 * usable state. Unreadable fields are replaced by defaults and reported in
 * `issues`, so a corrupted record costs the user one setting, never the app.
 */

export { CURRENT_VERSION } from "../domain/seed.ts";

type Issues = string[];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** Un instant, ou `null` — jamais `NaN`, jamais une chaîne de date. */
function time(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberList(value: unknown, length: number, fallback: number[]): number[] {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from({ length }, (_, index) =>
    Math.max(0, num(source[index], fallback[index] ?? fallback.at(-1) ?? 0)),
  );
}

const UNITS: readonly Unit[] = ["kg", "sec"];
const GROUPS: readonly MuscleGroup[] = ["upper", "lower", "core"];
const EFFORTS: readonly Effort[] = ["easy", "good", "hard"];
const STATUSES: readonly SessionExerciseStatus[] = ["pending", "done", "skipped"];
const ACCENTS: readonly Program["accent"][] = ["acid", "orange", "sky", "violet"];
const THEMES: readonly ThemePreference[] = ["auto", "dark", "light"];

function parseExercise(raw: unknown, template: ExerciseTemplate | null, issues: Issues): ExerciseTemplate | null {
  if (!isObject(raw)) return template;
  const id = str(raw.id, template?.id ?? "");
  if (!id) {
    issues.push("Exercice sans identifiant ignoré.");
    return template;
  }

  const base = template ?? catalogTemplate(id);
  const sets = Math.max(1, Math.round(num(raw.sets, base?.sets ?? 3)));
  const repMin = Math.max(1, Math.round(num(raw.repMin, base?.repMin ?? 8)));
  const repMax = Math.max(repMin, Math.round(num(raw.repMax, base?.repMax ?? repMin)));
  const fallbackWeights = base?.targetWeights ?? [0];

  return {
    id,
    name: str(raw.name, base?.name ?? id),
    shortName: str(raw.shortName, base?.shortName ?? str(raw.name, id)),
    group: oneOf(raw.group, GROUPS, base?.group ?? "upper"),
    unit: oneOf(raw.unit, UNITS, base?.unit ?? "kg"),
    sets,
    repMin,
    repMax,
    targetWeights: numberList(raw.targetWeights, sets, fallbackWeights),
    lastWeights: numberList(raw.lastWeights, sets, fallbackWeights),
    cue: str(raw.cue, base?.cue ?? ""),
    tip: str(raw.tip, base?.tip ?? ""),
    videoUrl: str(raw.videoUrl, base?.videoUrl ?? ""),
    alternatives: Array.isArray(raw.alternatives)
      ? raw.alternatives.filter((item): item is string => typeof item === "string")
      : [...(base?.alternatives ?? [])],
    restSeconds: Math.max(0, Math.round(num(raw.restSeconds, base?.restSeconds ?? 90))),
  };
}

function parsePrograms(raw: unknown, issues: Issues): Program[] {
  // An empty array is a deliberate choice — the user deleted every program.
  // Restoring the examples there would silently undo their edit.
  if (Array.isArray(raw) && raw.length === 0) return [];
  // No `programs` key at all: a brand new install, or a record so damaged that
  // nothing can be inferred. Either way the welcome screen asks what to load —
  // handing over someone else's example programs is not the app's call.
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) {
    issues.push("Programmes illisibles — séances d'exemple restaurées.");
    return structuredClone(SEED_PROGRAMS);
  }

  const programs: Program[] = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const id = str(item.id, "");
    if (!id) continue;
    const seed = SEED_PROGRAMS.find((program) => program.id === id) ?? null;
    const rawExercises = Array.isArray(item.exercises) ? item.exercises : [];
    const exercises = rawExercises
      .map((exercise, index) => parseExercise(exercise, seed?.exercises[index] ?? null, issues))
      .filter((exercise): exercise is ExerciseTemplate => exercise !== null);

    // A seeded program with no readable exercise is corruption; a user-made one
    // is simply a program still being written. Only the first gets restored.
    if (exercises.length === 0 && seed && rawExercises.length > 0) {
      programs.push(structuredClone(seed));
      issues.push(`Programme « ${seed.name} » restauré depuis les valeurs par défaut.`);
      continue;
    }

    programs.push({
      id,
      name: str(item.name, seed?.name ?? id),
      focus: str(item.focus, seed?.focus ?? ""),
      accent: oneOf(item.accent, ACCENTS, seed?.accent ?? "acid"),
      warmup: str(item.warmup, seed?.warmup ?? ""),
      estimatedMinutes: Math.max(5, Math.round(num(item.estimatedMinutes, seed?.estimatedMinutes ?? 50))),
      exercises,
    });
  }

  if (programs.length === 0 && raw.length > 0) {
    issues.push("Aucun programme valide — séances d'exemple restaurées.");
    return structuredClone(SEED_PROGRAMS);
  }
  return programs;
}

function parseSet(raw: unknown, fallbackReps: number): SetEntry {
  if (!isObject(raw)) return { weight: 0, reps: fallbackReps, done: false, pr: false };
  return {
    weight: Math.max(0, num(raw.weight, 0)),
    reps: Math.max(0, Math.round(num(raw.reps, fallbackReps))),
    done: bool(raw.done, false),
    pr: bool(raw.pr, false),
  };
}

function parseSessionExercise(raw: unknown): SessionExercise | null {
  if (!isObject(raw)) return null;
  const exerciseId = str(raw.exerciseId, "");
  if (!exerciseId) return null;
  const seed = catalogTemplate(exerciseId);
  const repMin = Math.max(1, Math.round(num(raw.repMin, seed?.repMin ?? 8)));
  const rawSets = Array.isArray(raw.sets) ? raw.sets : [];

  return {
    exerciseId,
    name: str(raw.name, seed?.name ?? exerciseId),
    shortName: str(raw.shortName, seed?.shortName ?? exerciseId),
    group: oneOf(raw.group, GROUPS, seed?.group ?? "upper"),
    unit: oneOf(raw.unit, UNITS, seed?.unit ?? "kg"),
    repMin,
    repMax: Math.max(repMin, Math.round(num(raw.repMax, seed?.repMax ?? repMin))),
    cue: str(raw.cue, seed?.cue ?? ""),
    tip: str(raw.tip, seed?.tip ?? ""),
    videoUrl: str(raw.videoUrl, seed?.videoUrl ?? ""),
    alternatives: Array.isArray(raw.alternatives)
      ? raw.alternatives.filter((item): item is string => typeof item === "string")
      : [...(seed?.alternatives ?? [])],
    restSeconds: Math.max(0, Math.round(num(raw.restSeconds, seed?.restSeconds ?? 90))),
    sets: rawSets.length > 0 ? rawSets.map((set) => parseSet(set, repMin)) : [parseSet(null, repMin)],
    effort: typeof raw.effort === "string" ? oneOf(raw.effort, EFFORTS, "good") : null,
    status: oneOf(raw.status, STATUSES, "pending"),
    replacedBy: typeof raw.replacedBy === "string" ? raw.replacedBy : null,
  };
}

function parseSession(
  raw: unknown,
  now: number,
  issues: Issues,
  unreadable = "Séance en cours illisible — elle a été écartée.",
): Session | null {
  if (!isObject(raw)) return null;
  const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
  const exercises = rawExercises
    .map(parseSessionExercise)
    .filter((entry): entry is SessionExercise => entry !== null);

  if (exercises.length === 0) {
    issues.push(unreadable);
    return null;
  }

  return {
    id: str(raw.id, `session-${now}`),
    programId: str(raw.programId, ""),
    programName: str(raw.programName, "Séance"),
    accent: oneOf(raw.accent, ACCENTS, "acid"),
    startedAt: num(raw.startedAt, now),
    currentIndex: Math.min(Math.max(0, Math.round(num(raw.currentIndex, 0))), exercises.length - 1),
    exercises,
  };
}

function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];
  const entries: HistoryEntry[] = [];
  for (const item of raw) {
    if (!isObject(item)) continue;
    const date = num(item.date, NaN);
    if (!Number.isFinite(date)) continue;
    const totalExercises = Math.max(0, Math.round(num(item.totalExercises, 0)));
    entries.push({
      id: str(item.id, `history-${date}`),
      date,
      programId: str(item.programId, ""),
      programName: str(item.programName, "Séance"),
      durationMinutes: Math.max(0, Math.round(num(item.durationMinutes, 0))),
      completedExercises: Math.max(0, Math.round(num(item.completedExercises, 0))),
      totalExercises,
      completedSets: Math.max(0, Math.round(num(item.completedSets, 0))),
      volume: Math.max(0, Math.round(num(item.volume, 0))),
      note: str(item.note, ""),
      personalRecords: Array.isArray(item.personalRecords)
        ? item.personalRecords.filter((value): value is string => typeof value === "string")
        : [],
    });
  }
  return entries.sort((a, b) => b.date - a.date);
}

function parseRecords(raw: unknown): Record<string, PersonalRecord> {
  if (!isObject(raw)) return {};
  const records: Record<string, PersonalRecord> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!isObject(value)) continue;
    records[key] = {
      weight: Math.max(0, num(value.weight, 0)),
      reps: Math.max(0, Math.round(num(value.reps, 0))),
      date: num(value.date, 0),
    };
  }
  return records;
}

function parseSettings(raw: unknown): Settings {
  if (!isObject(raw)) return { ...DEFAULT_SETTINGS };
  return {
    theme: oneOf(raw.theme, THEMES, DEFAULT_SETTINGS.theme),
    autoRest: bool(raw.autoRest, DEFAULT_SETTINGS.autoRest),
    defaultRestSeconds: Math.min(600, Math.max(15, Math.round(num(raw.defaultRestSeconds, DEFAULT_SETTINGS.defaultRestSeconds)))),
    vibration: bool(raw.vibration, DEFAULT_SETTINGS.vibration),
    keepAwake: bool(raw.keepAwake, DEFAULT_SETTINGS.keepAwake),
    displayName: str(raw.displayName, DEFAULT_SETTINGS.displayName).slice(0, 40),
  };
}

/**
 * Converts the shape used by the first (Cloudflare D1) version of the app.
 * Kept so a backup exported from the old deployment can still be imported.
 */
function migrateLegacy(raw: Record<string, unknown>): Record<string, unknown> {
  if ("version" in raw) return raw;
  if (!("programs" in raw) || !("history" in raw)) return raw;

  const legacyPrograms = Array.isArray(raw.programs) ? raw.programs : [];
  const programs = legacyPrograms.map((program) => {
    if (!isObject(program)) return program;
    const exercises = Array.isArray(program.exercises) ? program.exercises : [];
    return {
      ...program,
      estimatedMinutes: program.duration,
      accent: "acid",
      exercises: exercises.map((exercise) => {
        if (!isObject(exercise)) return exercise;
        return {
          ...exercise,
          group: exercise.category,
          repMin: exercise.minReps,
          repMax: exercise.maxReps,
          targetWeights: exercise.suggestedWeights,
          videoUrl: exercise.mediaUrl,
        };
      }),
    };
  });

  const legacyHistory = Array.isArray(raw.history) ? raw.history : [];
  const history = legacyHistory.map((entry) => {
    if (!isObject(entry)) return entry;
    return {
      ...entry,
      date: typeof entry.date === "string" ? Date.parse(entry.date) : entry.date,
      durationMinutes: entry.duration,
      completedExercises: entry.completed,
      totalExercises: entry.total,
      completedSets: 0,
      personalRecords: [],
    };
  });

  return {
    version: CURRENT_VERSION,
    programs,
    history,
    session: null,
    records: {},
    lastCompletedProgramId: raw.lastProgramId ?? null,
    settings: {},
  };
}

export type ParseResult = {
  state: AppState;
  issues: Issues;
  /** True when the input was missing or unusable and defaults were produced. */
  fresh: boolean;
};

export function parseAppState(raw: unknown, now: number): ParseResult {
  const issues: Issues = [];
  if (!isObject(raw)) {
    return { state: createInitialState(now), issues, fresh: true };
  }

  const source = migrateLegacy(raw);
  const version = num(source.version, CURRENT_VERSION);
  if (version > CURRENT_VERSION) {
    issues.push(
      `Sauvegarde créée par une version plus récente (v${version}) — lecture en mode compatible.`,
    );
  }

  const createdAt = num(source.createdAt, now);
  const programs = parsePrograms(source.programs, issues);
  const history = parseHistory(source.history);

  const state: AppState = {
    version: CURRENT_VERSION,
    createdAt,
    onboardedAt: parseOnboardedAt(source.onboardedAt, { createdAt, programs, history }),
    lastBackupAt: time(source.lastBackupAt),
    backupPromptedAt: time(source.backupPromptedAt),
    programs,
    session: parseSession(source.session, now, issues),
    // Migration v2 → v3 : le champ n'existait pas, l'absence vaut « rien à reprendre ».
    abandonedSession: parseSession(
      source.abandonedSession,
      now,
      issues,
      "Séance abandonnée illisible — elle ne pourra pas être reprise.",
    ),
    history,
    records: parseRecords(source.records),
    lastCompletedProgramId:
      typeof source.lastCompletedProgramId === "string" ? source.lastCompletedProgramId : null,
    settings: parseSettings(source.settings),
  };

  return { state, issues, fresh: false };
}

/**
 * Migration v1 → v2 : `onboardedAt` n'existait pas.
 *
 * Une sauvegarde qui contient déjà des séances ou de l'historique appartient à
 * quelqu'un qui utilise l'app depuis un moment — lui présenter l'écran de
 * bienvenue serait absurde. À l'inverse, un enregistrement vide vient d'une
 * installation neuve : la question doit être posée.
 */
function parseOnboardedAt(
  raw: unknown,
  context: { createdAt: number; programs: Program[]; history: HistoryEntry[] },
): number | null {
  const stored = time(raw);
  if (stored !== null) return stored;
  const hasContent = context.programs.length > 0 || context.history.length > 0;
  return hasContent ? context.createdAt : null;
}
