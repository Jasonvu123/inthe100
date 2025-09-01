// Force dynamic behavior on Vercel; never cache this route.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import categoriesRaw from "@/data/categories.json";
import type { Category, Puzzle, Clue } from "@/lib/types";
import { seededRng } from "@/lib/rng";
import { todayETDateString } from "@/lib/time";
import { pickHintNeighbor } from "@/lib/game-build";

const CATS = categoriesRaw as Category[];

export function GET(req: Request) {
  // Optional: a daily cache-busting key from the client (?d=YYYY-MM-DD)
  const _d = new URL(req.url).searchParams.get("d");

  const date = todayETDateString();       // ET-based seed
  const rng = seededRng(date);

  // Pick an N that appears in >=5 categories; fall back to best-covered rank
  let N = clamp(Math.floor(rng() * 100) + 1, 1, 100);
  let tries = 0;
  while (tries < 200) {
    const eligible = CATS.filter(c => c.items[N] != null);
    if (eligible.length >= 5) break;
    N = clamp(Math.floor(rng() * 100) + 1, 1, 100);
    tries++;
  }
  if (CATS.filter(c => c.items[N] != null).length < 5) {
    let best = { rank: 1, count: 0 };
    for (let r = 1; r <= 100; r++) {
      const count = CATS.filter(c => c.items[r] != null).length;
      if (count > best.count) best = { rank: r, count };
    }
    N = best.rank;
  }

  // Shuffle eligible categories deterministically and take 5
  const eligible = CATS.filter(c => c.items[N] != null);
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  const cats = eligible.slice(0, 5);

  // Build clues with adjacent-item hints (no ranks shown)
  const clues: Clue[] = cats.map(cat => {
    const item = cat.items[N]!;
    const { hintItem } = pickHintNeighbor(N, cat, rng);
    return {
      category_id: cat.id,
      category_name: cat.name,
      source: cat.source,
      item,
      hint_item: hintItem,
    };
  });

  const puzzle: Puzzle = { date, n: N, clues };

  return NextResponse.json(puzzle, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "X-Generated-At": new Date().toISOString(),
    },
  });
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
