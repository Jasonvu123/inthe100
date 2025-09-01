"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatET } from "@/lib/time";

type LadderItem = { label: string; rank: number };
type LadderPuzzle = {
  kind: "ladder";
  date: string; // "YYYY-MM-DD" or "random"
  category_id: string;
  category_name: string;
  source?: string;
  items: LadderItem[]; // shuffled order for display
};

export default function LadderPage({ params }: { params: { mode: "today" | "random" } }) {
  const mode = params.mode;
  const sp = useSearchParams();
  const router = useRouter();
  const seed = sp.get("seed") || "";

  const [puzzle, setPuzzle] = useState<LadderPuzzle | null>(null);

  // CORE STATE (two-array model)
  const [lockedSlots, setLockedSlots] = useState<Array<LadderItem | null>>([]); // fixed at indices
  const [unlockedItems, setUnlockedItems] = useState<LadderItem[]>([]);          // reorderable pool

  const [attempts, setAttempts] = useState(3);
  const [status, setStatus] = useState<"playing" | "win" | "lose">("playing");
  const [feedback, setFeedback] = useState<boolean[] | null>(null); // per-visible-index correct flags

  // touch detection -> show buttons on phones
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const touch = typeof window !== "undefined" && ("ontouchstart" in window);
    const mtp = typeof navigator !== "undefined" && (navigator as any).maxTouchPoints > 0;
    setIsTouch(Boolean(coarse || touch || mtp));
  }, []);

  // DnD
  const dragVisibleIndex = useRef<number | null>(null);

  useEffect(() => {
    const url =
      mode === "today"
        ? "/api/ladder/today"
        : `/api/ladder/random?seed=${encodeURIComponent(seed || String(Date.now()))}`;

    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((pz: LadderPuzzle) => {
        setPuzzle(pz);
        // initialize: no locked slots, all items unlocked in provided order
        setLockedSlots(new Array(pz.items.length).fill(null));
        setUnlockedItems(pz.items.slice());
        setAttempts(3);
        setStatus("playing");
        setFeedback(null);
      })
      .catch(console.error);
  }, [mode, seed]);

  const correctOrder = useMemo(() => {
    if (!puzzle) return [];
    return [...puzzle.items].sort((a, b) => a.rank - b.rank);
  }, [puzzle]);

  // ------- Derived: visible list (interleave locked + unlocked) -------
  const visibleItems = useMemo(() => {
    if (!puzzle) return [];
    const out: LadderItem[] = [];
    let u = 0;
    for (let i = 0; i < lockedSlots.length; i++) {
      if (lockedSlots[i]) {
        out.push(lockedSlots[i] as LadderItem);
      } else {
        out.push(unlockedItems[u++]);
      }
    }
    return out;
  }, [lockedSlots, unlockedItems, puzzle]);

  // map visible index -> whether locked
  const isIndexLocked = (visIdx: number) => !!lockedSlots[visIdx];

  // map visible index -> unlocked index (in unlockedItems array)
  const visibleToUnlockedIndex = (visIdx: number): number | -1 => {
    let u = 0;
    for (let i = 0; i < visIdx; i++) {
      if (!lockedSlots[i]) u++;
    }
    return lockedSlots[visIdx] ? -1 : u;
  };

  // given unlocked index -> visible index
  const unlockedToVisibleIndex = (unIdx: number): number => {
    let u = 0;
    for (let i = 0; i < lockedSlots.length; i++) {
      if (lockedSlots[i]) continue;
      if (u === unIdx) return i;
      u++;
    }
    return -1;
  };

  // nearest unlocked visible index scanning direction
  const nearestUnlockedVisible = (startVis: number, dir: -1 | 1): number | null => {
    let i = startVis;
    while (i >= 0 && i < lockedSlots.length) {
      if (!lockedSlots[i]) return i;
      i += dir;
    }
    return null;
  };

  // move inside unlockedItems by unlocked indices (insert semantics)
  const moveUnlocked = (fromUn: number, toUn: number) => {
    if (fromUn === toUn) return;
    setUnlockedItems(prev => {
      const a = prev.slice();
      const [item] = a.splice(fromUn, 1);
      a.splice(toUn, 0, item);
      return a;
    });
  };

  // Mobile buttons: move by visible index (skip locked)
  const moveUp = (visIdx: number) => {
    if (isIndexLocked(visIdx)) return;
    const fromUn = visibleToUnlockedIndex(visIdx);
    if (fromUn <= 0) return;
    moveUnlocked(fromUn, fromUn - 1);
  };

  const moveDown = (visIdx: number) => {
    if (isIndexLocked(visIdx)) return;
    const fromUn = visibleToUnlockedIndex(visIdx);
    const lastUn = unlockedItems.length - 1;
    if (fromUn === -1 || fromUn >= lastUn) return;
    moveUnlocked(fromUn, fromUn + 1);
  };

  // Desktop DnD handlers working on visible indices → unlocked indices
  const onDragStart = (visIdx: number) => (e: React.DragEvent) => {
    if (isTouch || status !== "playing" || isIndexLocked(visIdx)) {
      e.preventDefault();
      return;
    }
    dragVisibleIndex.current = visIdx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(visIdx));
  };
  const onDragOver = (visIdx: number) => (e: React.DragEvent) => {
    if (isTouch || status !== "playing") return;
    e.preventDefault();
  };
  const onDrop = (visIdx: number) => (e: React.DragEvent) => {
    if (isTouch) return;
    e.preventDefault();
    const fromVis = dragVisibleIndex.current;
    dragVisibleIndex.current = null;
    if (fromVis == null) return;

    // compute unlocked positions
    const fromUn = visibleToUnlockedIndex(fromVis);
    let toVis = visIdx;

    // if drop target is locked, steer to nearest unlocked slot
    if (isIndexLocked(toVis)) {
      toVis = fromVis < visIdx
        ? (nearestUnlockedVisible(visIdx - 1, -1) ?? fromVis)
        : (nearestUnlockedVisible(visIdx + 1, +1) ?? fromVis);
      if (isIndexLocked(toVis)) return;
    }
    const toUn = visibleToUnlockedIndex(toVis);
    if (fromUn === -1 || toUn === -1) return;
    moveUnlocked(fromUn, toUn);
  };
  const onDragEnd = () => {
    if (isTouch) return;
    dragVisibleIndex.current = null;
  };

  // -------- Submit + locking --------
  const submit = () => {
    if (!puzzle || status !== "playing") return;

    // recompute visible & correctness
    const vis = visibleItems; // latest
    const correctLabels = correctOrder.map(x => x.label);

    const perPos = vis.map((it, i) => it.label === correctLabels[i]);
    setFeedback(perPos);

    // lock any newly correct slots by filling lockedSlots[i] with that item
    setLockedSlots(prev => {
      const next = prev.slice();
      perPos.forEach((ok, i) => {
        if (ok && !next[i]) {
          next[i] = vis[i]; // pin that item at this index
        }
      });
      return next;
    });

    // remove any newly-locked items from unlockedItems
    setUnlockedItems(prev => {
      const newlyLockedLabels = new Set<string>();
      perPos.forEach((ok, i) => {
        if (ok) newlyLockedLabels.add(vis[i].label);
      });
      if (newlyLockedLabels.size === 0) return prev;
      return prev.filter(item => !newlyLockedLabels.has(item.label));
    });

    const allRight = perPos.every(Boolean);
    if (allRight) {
      setStatus("win");
    } else {
      const left = attempts - 1;
      setAttempts(left);
      if (left <= 0) setStatus("lose");
    }
  };

  const playRandom = () => router.push(`/ladder/random?seed=${Date.now()}`);

  return (
    <main className="max-w-md mx-auto p-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm underline">← Home</Link>
        <h1 className="text-2xl font-bold">Ladder</h1>
        {mode === "random" ? (
          <span className="text-xs px-2 py-1 rounded-full border">Random</span>
        ) : puzzle ? (
          <span className="text-xs text-gray-600">{formatET(puzzle.date)}</span>
        ) : (
          <span className="text-xs text-gray-400">…</span>
        )}
      </header>

      {!puzzle ? (
        <div>Loading…</div>
      ) : (
        <div>
          <div className="mb-3 text-xs text-gray-600">
            Category: <strong>{puzzle.category_name}</strong>
            {puzzle.source ? <> · <em>{puzzle.source}</em></> : null}
          </div>

          <ul className="space-y-2 mb-4">
            {visibleItems.map((it, idx) => {
              const locked = isIndexLocked(idx);
              const ok = feedback ? feedback[idx] : null;
              return (
                <li
                  key={it.label + ":" + idx}
                  draggable={!isTouch && !locked && status === "playing"}
                  onDragStart={onDragStart(idx)}
                  onDragOver={onDragOver(idx)}
                  onDrop={onDrop(idx)}
                  onDragEnd={onDragEnd}
                  className={[
                    "flex items-center gap-3 border rounded-lg px-3 py-2 select-none",
                    locked ? "cursor-not-allowed" : (isTouch ? "cursor-default" : "cursor-move"),
                    ok === true
                      ? "bg-green-100 border-green-300"
                      : ok === false
                      ? "bg-red-100 border-red-300"
                      : "bg-white",
                  ].join(" ")}
                >
                  <span className="w-8 text-center font-medium">{idx + 1}</span>
                  <span className="h-5 border-l" />
                  <span className="pl-2 flex-1">{it.label}</span>

                  {/* Mobile Up/Down buttons: hidden when locked or not playing */}
                  {isTouch && status === "playing" && !locked && (
                    <div className="flex gap-1">
                      <button
                        className="px-2 py-1 rounded border disabled:opacity-50"
                        onClick={() => moveUp(idx)}
                        disabled={visibleToUnlockedIndex(idx) <= 0}
                        aria-label={`Move ${it.label} up`}
                      >
                        ↑
                      </button>
                      <button
                        className="px-2 py-1 rounded border disabled:opacity-50"
                        onClick={() => moveDown(idx)}
                        disabled={visibleToUnlockedIndex(idx) === (unlockedItems.length - 1)}
                        aria-label={`Move ${it.label} down`}
                      >
                        ↓
                      </button>
                    </div>
                  )}

                  {locked && (
                    <span className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green-300 text-green-800 bg-green-50">
                      🔒
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {status === "playing" && (
            <div className="flex items-center gap-3">
              <button onClick={submit} className="px-4 py-2 rounded-lg bg-black text-white">
                Submit
              </button>
              <span className="text-sm text-gray-600">Guesses left: {attempts}</span>
            </div>
          )}

          {status === "win" && (
            <div className="mt-4 border rounded-2xl p-4">
              <h3 className="text-lg font-semibold">You win</h3>
              <div className="mt-2 text-sm text-gray-800">
                Correct order:
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  {correctOrder.map((it) => (
                    <li key={it.label} className="ml-4">
                      {it.label} <span className="text-gray-500">({it.rank})</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={playRandom} className="h-11 rounded-xl bg-black text-white font-medium">
                  Play Again (Random)
                </button>
                <Link href="/" className="h-11 rounded-xl border font-medium flex items-center justify-center">
                  Home
                </Link>
              </div>
            </div>
          )}

          {status === "lose" && (
            <div className="mt-4 border rounded-2xl p-4">
              <h3 className="text-lg font-semibold">You lose</h3>
              <div className="mt-2 text-sm text-gray-800">
                Correct order:
                <ol className="mt-2 list-decimal list-inside space-y-1">
                  {correctOrder.map((it) => (
                    <li key={it.label} className="ml-4">
                      {it.label} <span className="text-gray-500">({it.rank})</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={playRandom} className="h-11 rounded-xl bg-black text-white font-medium">
                  Play Again (Random)
                </button>
                <Link href="/" className="h-11 rounded-xl border font-medium flex items-center justify-center">
                  Home
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
