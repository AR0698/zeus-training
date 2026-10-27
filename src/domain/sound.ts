/**
 * Les signaux sonores de la séance, sans fichier audio : chaque son est une
 * courte suite de notes synthétisées par la Web Audio API.
 *
 * Tout ce qui décide *quand* sonner et *quoi* jouer vit ici, hors DOM, pour être
 * testé sans navigateur. Le hook `useSounds` ne fait que brancher ces règles sur
 * un vrai `AudioContext`.
 */

export type Cue = "tick" | "end";

export type Tone = {
  /** Fréquence en Hz. */
  frequency: number;
  /** Décalage depuis le début du son, en secondes. */
  at: number;
  /** Durée de la note, en secondes. */
  duration: number;
};

/** Le compte à rebours sonore commence à 3 s de la fin. */
export const PRE_SIGNAL_SECONDS = 3;

/** Volume crête : audible dans une salle, sans saturer un haut-parleur de téléphone. */
export const PEAK_GAIN = 0.3;

/** Montée et descente de chaque note, pour éviter le « clic » d'un signal coupé net. */
const RAMP_SECONDS = 0.01;

/**
 * Un tic grave et bref pour 3, 2, 1, puis deux notes montantes plus longues
 * pour la fin : on distingue « bientôt » de « c'est reparti » sans regarder.
 */
export const CUES: Record<Cue, readonly Tone[]> = {
  tick: [{ frequency: 660, at: 0, duration: 0.07 }],
  end: [
    { frequency: 880, at: 0, duration: 0.12 },
    { frequency: 1320, at: 0.16, duration: 0.24 },
  ],
};

/**
 * Le son à jouer quand le repos passe de `previous` à `current` secondes.
 *
 * On compare deux lectures plutôt que de regarder une valeur seule : le
 * minuteur peut sauter des secondes (onglet en arrière-plan, écran verrouillé),
 * repartir à la hausse (+30 s) ou être arrêté (`null`). Seule une descente
 * sonne, et une seule fois par seconde franchie.
 */
export function restCue(previous: number | null, current: number | null): Cue | null {
  if (previous === null || current === null) return null;
  if (current >= previous) return null;
  if (current === 0) return "end";
  if (current <= PRE_SIGNAL_SECONDS) return "tick";
  return null;
}

/** Le strict nécessaire d'un `AudioContext`, pour pouvoir le simuler en test. */
export type AudioParamLike = {
  setValueAtTime: (value: number, time: number) => unknown;
  linearRampToValueAtTime: (value: number, time: number) => unknown;
};

export type AudioNodeLike = {
  connect: (destination: never) => unknown;
};

export type OscillatorLike = AudioNodeLike & {
  type: OscillatorType;
  frequency: AudioParamLike;
  start: (when: number) => void;
  stop: (when: number) => void;
};

export type GainLike = AudioNodeLike & { gain: AudioParamLike };

export type AudioContextLike = {
  readonly state: string;
  readonly currentTime: number;
  readonly destination: unknown;
  resume: () => Promise<void>;
  createOscillator: () => OscillatorLike;
  createGain: () => GainLike;
};

/** Programme les notes d'un son sur le contexte. */
export function scheduleTones(context: AudioContextLike, tones: readonly Tone[]): void {
  const start = context.currentTime;
  for (const tone of tones) {
    const begin = start + tone.at;
    const end = begin + tone.duration;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, begin);
    gain.gain.setValueAtTime(0, begin);
    gain.gain.linearRampToValueAtTime(PEAK_GAIN, begin + RAMP_SECONDS);
    gain.gain.setValueAtTime(PEAK_GAIN, end - RAMP_SECONDS);
    gain.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(gain as never);
    gain.connect(context.destination as never);
    oscillator.start(begin);
    oscillator.stop(end);
  }
}

export type SoundPlayer = {
  /** À appeler depuis un geste : iOS Safari ne laisse démarrer l'audio qu'ainsi. */
  unlock: () => void;
  /** Joue un son si l'audio est disponible et déverrouillé. Ne lève jamais. */
  play: (cue: Cue) => boolean;
};

/**
 * Un lecteur qui ne casse jamais : sans Web Audio (`createContext` renvoie
 * `null` ou lève), chaque appel est un no-op silencieux. Le contexte n'est créé
 * qu'au premier déverrouillage, donc jamais pour qui laisse les sons coupés.
 */
export function createSoundPlayer(createContext: () => AudioContextLike | null): SoundPlayer {
  let context: AudioContextLike | null = null;
  let unavailable = false;

  const ensure = (): AudioContextLike | null => {
    if (context !== null || unavailable) return context;
    try {
      context = createContext();
    } catch {
      context = null;
    }
    if (context === null) unavailable = true;
    return context;
  };

  // Un contexte suspendu (premier geste pas encore fait, retour d'arrière-plan,
  // appel entrant sur iOS) est relancé ; l'échec est sans conséquence.
  const wake = (current: AudioContextLike) => {
    if (current.state === "running") return;
    try {
      current.resume().catch(() => undefined);
    } catch {
      // ignore
    }
  };

  return {
    unlock: () => {
      const current = ensure();
      if (current !== null) wake(current);
    },
    play: (cue) => {
      if (context === null) return false;
      if (context.state !== "running") {
        wake(context);
        return false;
      }
      try {
        scheduleTones(context, CUES[cue]);
        return true;
      } catch {
        return false;
      }
    },
  };
}
