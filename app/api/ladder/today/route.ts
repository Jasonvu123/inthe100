// app/api/ladder/today/route.ts
// Make this endpoint fully dynamic and uncacheable so it updates daily on Vercel.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import categoriesRaw from "@/data/categories.json";
import type { Category } from "@/lib/types";
import { seededRng } from "@/lib/rng";
import { todayETDateString } from "@/lib/time";

const CATS = categoriesRaw as Category[];

type LadderItem = { label: string; rank: number };
export type LadderPuzzle = {
  kind: "ladder";
  date: string; // ET date string
  category_id: string;
  category_name: string;
  source?: string;
  items: LadderItem[]; // shuffled; `rank` is true Top-100 position (1..100)
};

export function GET() {
  const ds = todayETDateString();
  const rng = seededRng(ds); // NOTE: seededRng returns () => number

  // Pick a category deterministically for the day
  const cat = CATS[Math.floor(rng() * CATS.length)];

  // Pick 5 distinct ranks 1..100
  const ranks: number[] = [];
  while (ranks.length < 5) {
    const r = Math.min(100, Math.max(1, Math.floor(rng() * 100) + 1));
    if (!ranks.includes(r)) ranks.push(r);
  }

  const items: LadderItem[] = ranks.map((r) => ({
    label: cat.items[r - 1],
    rank: r,
  }));

  const shuffled = shuffle(items, rng);

  const puzzle: LadderPuzzle = {
    kind: "ladder",
    date: ds,
    category_id: cat.id,
    category_name: cat.name,
    source: (cat as any).source,
    items: shuffled,
  };

  return NextResponse.json(puzzle, {
    headers: {
      // Prevent CDN/proxy/browser caching
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}

function shuffle<T>(arr: T[], rng: () => number) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
