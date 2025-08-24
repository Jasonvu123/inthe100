export function todayETDateString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")!.value;
  const m = parts.find((p) => p.type === "month")!.value;
  const d = parts.find((p) => p.type === "day")!.value;
  return `${y}-${m}-${d}`;
}

export function puzzleNumberFrom(dateStr: string, epoch = "2025-01-01") {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(`${epoch}T00:00:00-05:00`);
  const day = new Date(Date.UTC(y, m - 1, d));
  return Math.floor((+day - +start) / 86400000) + 1;
}

// lib/time.ts
export function formatET(dateStr: string) {
  const [y,m,d] = dateStr.split("-").map(Number);
  // Use NOON UTC to avoid rolling back a day when formatting to ET
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(dt);
}

