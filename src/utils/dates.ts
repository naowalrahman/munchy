const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Noon keeps date arithmetic clear of daylight-saving transitions.
const noon = (date: string) => new Date(`${date}T12:00:00`);

export const today = () => isoDate(new Date());

export function shiftDate(date: string, delta: number) {
  const d = noon(date);
  d.setDate(d.getDate() + delta);

  return isoDate(d);
}

export const daysBetween = (from: string, to: string) =>
  Math.round((noon(to).getTime() - noon(from).getTime()) / 86400000);

/** True for a real calendar date that is today or earlier. */
export const isLogDate = (date: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(date) && shiftDate(date, 0) === date && date <= today();

export function validLogDate(date: string) {
  if (!isLogDate(date)) throw new Error("Choose today or an earlier date.");
}

export const shortDateLabel = (date: string) =>
  noon(date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

export function relativeDayLabel(date: string) {
  const now = today();
  if (date === now) return "Today";
  if (date === shiftDate(now, -1)) return "Yesterday";

  return noon(date).toLocaleDateString(undefined, { weekday: "long" });
}
