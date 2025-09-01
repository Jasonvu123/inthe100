import { NextResponse } from "next/server";
import categoriesRaw from "@/data/categories.json";
import type { Category } from "@/lib/types";
import { seededRng } from "@/lib/rng";

const CATS = categoriesRaw as Category[];

type LadderItem = { label: string; rank: number };
export type LadderPuzzle = {
  kind: "ladder";
  date: string;
  category_id: string;
  category_name: string;
  source?: string;
  items: LadderItem[]; // shuffled; `rank` is true position (1..100)
};

export function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seed = searchParams.get("seed") ?? String(Date.now());
  const rng = seededRng(seed); // rng is a function that returns a number

  // pick a category
  const cat = CATS[Math.floor(rng() * CATS.length)];

  // pick 5 distinct ranks 1..100
  const ranks: number[] = [];
  while (ranks.length < 5) {
    const r = clamp(Math.floor(rng() * 100) + 1, 1, 100);
    if (!ranks.includes(r)) ranks.push(r);
  }

  const items = ranks.map((r) => ({ label: cat.items[r - 1], rank: r }));
  const shuffled = shuffle(items, rng);

  const puzzle: LadderPuzzle = {
    kind: "ladder",
    date: "random",
    category_id: cat.id,
    category_name: cat.name,
    source: (cat as any).source,
    items: shuffled,
  };

  return NextResponse.json(puzzle, { headers: { "Cache-Control": "no-store" } });
}

function shuffle<T>(arr: T[], rng: () => number) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
