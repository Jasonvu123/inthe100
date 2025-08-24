import type { Category } from "@/lib/types";

const DELTAS = [1,2,3,4,5]; 

export function pickHintNeighbor(N: number, cat: Category, rnd: () => number) {
  const cands = DELTAS.flatMap(d => [N-d, N+d])
    .filter(k => k >= 1 && k <= 100 && k !== N && cat.items[k] != null);

  // Prefer farther neighbors to keep hints vague
  const sorted = cands.sort((a,b)=>Math.abs(b-N)-Math.abs(a-N));
  for (const k of sorted) {
    const item = cat.items[k];
    if (item && isFamiliar(item)) return { hintItem: item, hintRank: k };
  }
  // fallback random choice if none passed the familiarity test
  const k = cands[Math.floor(rnd() * cands.length)];
  return { hintItem: cat.items[k]!, hintRank: k };
}

function isFamiliar(s: string) {
  // Very light heuristic; replace with your own wordlist/fame score
  return s.length >= 3 && /^[A-Za-z0-9 .,'’\-&()]+$/.test(s);
}
