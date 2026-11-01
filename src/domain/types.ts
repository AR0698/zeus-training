/**
 * Domain types for Zeus Training.
 *
 * Two rules keep this model bug-resistant:
 *
 * 1. A running session **snapshots** everything it needs from the program.
 *    Nothing in `Session` points back into `Program` by array index, so editing
 *    a program (or reordering exercises) while a session is live can never
 *    desynchronise the logged sets from the exercise they belong to.
 * 2. Every timestamp is an epoch millisecond number, never a formatted string.
 *    Formatting happens at the very edge, in `format.ts`.
 */

/**
 * Ce que mesure la « charge » d'un exercice : des kilos, des secondes tenues,
 * ou rien du tout (`reps`) quand le corps seul fait la résistance. Un exercice
 * `reps` n'affiche ni ne demande aucune charge : seules les répétitions comptent.
 */
export type Unit = "kg" | "sec" | "reps";
export type MuscleGroup = "upper" | "lower" | "core";
export type Effort = "easy" | "good" | "hard";
export type SessionExerciseStatus = "pending" | "done" | "skipped";
export type ThemePreference = "auto" | "dark" | "light";

/** An exercise as it lives in a program: the plan, not the performance. */
export type ExerciseTemplate = {
  id: string;
  name: string;
  shortName: string;
  group: MuscleGroup;
  unit: Unit;
  sets: number;
  repMin: number;
  repMax: number;
  /** Target load per set for the next session. Length should equal `sets`. */
  targetWeights: number[];
  /** What was actually lifted last time, per set. Used to show the delta. */
  lastWeights: number[];
  cue: string;
  tip: string;
  videoUrl: string;
  alternatives: string[];
  /** Default rest between sets, in seconds. */
  restSeconds: number;
};

/**
 * Les `size` premiers exercices d'une séance faits en tours : une série de
 * chacun à la suite, sans repos, puis `restSeconds` de repos avant le tour
 * suivant. Le nombre de tours est le nombre de séries de chaque exercice ; les
 * exercices d'après restent en séries classiques (gainage, chaise murale).
 */
export type Circuit = { size: number; restSeconds: number };

export type Program = {
  id: string;
  name: string;
  focus: string;
  /** Accent hue name, resolved to a CSS variable by the UI. */
  accent: "acid" | "orange" | "sky" | "violet";
  warmup: string;
  estimatedMinutes: number;
  exercises: ExerciseTemplate[];
  /** Absent : la séance se fait exercice par exercice. */
  circuit?: Circuit;
};

export type SetEntry = {
  weight: number;
  reps: number;
  done: boolean;
  /** Set when this set beat the stored personal record at validation time. */
  pr: boolean;
};

/** An exercise inside a live session: a self-contained snapshot + the logs. */
export type SessionExercise = {
  exerciseId: string;
  name: string;
  shortName: string;
  group: MuscleGroup;
  unit: Unit;
  repMin: number;
  repMax: number;
  cue: string;
  tip: string;
  videoUrl: string;
  alternatives: string[];
  restSeconds: number;
  sets: SetEntry[];
  effort: Effort | null;
  status: SessionExerciseStatus;
  /** Name of the substitute movement when the machine was taken. */
  replacedBy: string | null;
  /** Free text typed during the session ("siège cran 4"). Empty when unused. */
  note: string;
};

export type Session = {
  id: string;
  programId: string;
  programName: string;
  accent: Program["accent"];
  startedAt: number;
  currentIndex: number;
  exercises: SessionExercise[];
  /** Copie du circuit du programme au démarrage, bornée à la séance. */
  circuit?: Circuit;
};

/** A per-exercise note kept with the session that produced it. */
export type ExerciseNote = {
  exerciseId: string;
  /** Name shown at the time, substitute included, so the note still reads right. */
  name: string;
  note: string;
};

export type HistoryEntry = {
  id: string;
  date: number;
  programId: string;
  programName: string;
  durationMinutes: number;
  completedExercises: number;
  totalExercises: number;
  completedSets: number;
  /** Sum of weight × reps over validated sets (seconds-based work excluded). */
  volume: number;
  /** Status line generated at the end of the session — not typed by the user. */
  note: string;
  /** What the user wrote on each exercise, in session order. */
  exerciseNotes: ExerciseNote[];
  /** Short names of exercises that produced a personal record. */
  personalRecords: string[];
};

/** Best validated set ever recorded, per exercise id. */
export type PersonalRecord = {
  weight: number;
  reps: number;
  date: number;
};

export type Settings = {
  theme: ThemePreference;
  /** Start the rest countdown automatically when a set is validated. */
  autoRest: boolean;
  /** Fallback rest duration when an exercise has none, in seconds. */
  defaultRestSeconds: number;
  vibration: boolean;
  /** Short beeps at the end of the rest. Off by default: a gym phone that beeps unasked surprises everyone. */
  sounds: boolean;
  /** Hold a screen wake lock during a session. */
  keepAwake: boolean;
  displayName: string;
};

export type AppState = {
  /** Persisted schema version. Bump it and add a migration, never mutate. */
  version: number;
  createdAt: number;
  /**
   * When the welcome screen was completed. `null` means a brand new install:
   * nobody inherits someone else's programs, and the app asks first.
   */
  onboardedAt: number | null;
  /** Last successful backup export. `null` means it never happened. */
  lastBackupAt: number | null;
  /** Last time the monthly backup reminder was shown and postponed. */
  backupPromptedAt: number | null;
  programs: Program[];
  session: Session | null;
  /**
   * La dernière séance abandonnée, gardée pour pouvoir la reprendre : un
   * « Abandonner » touché par erreur ne doit rien coûter. Effacée dès qu'une
   * nouvelle séance démarre.
   */
  abandonedSession: Session | null;
  history: HistoryEntry[];
  records: Record<string, PersonalRecord>;
  lastCompletedProgramId: string | null;
  settings: Settings;
};
