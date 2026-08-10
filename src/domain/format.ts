import type { Unit } from "./types.ts";

/** All user-facing formatting lives here, in fr-FR, so screens stay dumb. */

const dayMonth = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const weekday = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const longDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDayMonth(timestamp: number): string {
  return dayMonth.format(timestamp);
}

export function formatWeekday(timestamp: number): string {
  return weekday.format(timestamp).replace(".", "");
}

export function formatLongDate(timestamp: number): string {
  return longDate.format(timestamp);
}

/** "il y a 3 jours", "hier", "aujourd'hui" — relative and readable. */
export function formatRelativeDay(timestamp: number, now: number): string {
  const start = (value: number) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  };
  const days = Math.round((start(now) - start(timestamp)) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  if (days < 14) return "il y a 1 semaine";
  if (days < 60) return `il y a ${Math.round(days / 7)} semaines`;
  return `il y a ${Math.round(days / 30)} mois`;
}

/** mm:ss, or h:mm:ss past an hour. Always monospaced-safe, zero padded. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** "45 s", "1 min 30", "2 min" — never the misleading "2 min" for 90 seconds. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe < 60) return `${safe} s`;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds}`;
}

/** French decimals use a comma, and 2.0 should read as "2" not "2,0". */
export function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

export function formatLoad(value: number, unit: Unit): string {
  return unit === "sec" ? `${formatNumber(value)} s` : `${formatNumber(value)} kg`;
}

export function unitLabel(unit: Unit): string {
  return unit === "sec" ? "s" : "kg";
}

export function formatVolume(value: number): string {
  if (value >= 1000) return `${formatNumber(Math.round(value / 100) / 10)} t`;
  return `${Math.round(value)} kg`;
}

export function formatRepRange(min: number, max: number): string {
  return min === max ? String(max) : `${min}–${max}`;
}

export function formatSigned(value: number): string {
  return value > 0 ? `+${formatNumber(value)}` : formatNumber(value);
}
