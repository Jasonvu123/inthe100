"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatET } from "@/lib/time"; // using formatET for puzzle date

// API data types
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
  const [order, setOrder] = useState<LadderItem[]>([]);
  const [attempts, setAttempts] = useState(3);
  const [status, setStatus] = useState<"playing" | "win" | "lose">("playing");
  const [feedback, setFeedback] = useState<boolean[] | null>(null); // per-position correctness
  const [locked, setLocked] = useState<Set<number>>(new Set()); // indices locked in place

  // Native DnD bookkeeping
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    const url =
      mode === "today"
        ? "/api/ladder/today"
        : `/api/ladder/random?seed=${encodeURIComponent(seed || String(Date.now()))}`;

    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((pz: LadderPuzzle) => {
        setPuzzle(pz);
        setOrder(pz.items);
        setAttempts(3);
        setStatus("playing");
        setFeedback(null);
        setLocked(new Set()); // clear locks on new puzzle
      })
      .catch((err) => console.error(err));
  }, [mode, seed]);

  const correctOrder = useMemo(() => {
    if (!puzzle) return [];
    return [...puzzle.items].sort((a, b) => a.rank - b.rank).map((x) => x.label);
  }, [puzzle]);

  // Swap-only move between two indices; ignore if either index is locked
  const swap = (i: number, j: number) => {
    if (i === j) return;
    if (locked.has(i) || locked.has(j)) return;
    setOrder((prev) => {
      const a = prev.slice();
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  };

  const submit = () => {
    if (!puzzle || status !== "playing") return;
    const current = order.map((x) => x.label);
    const perPos = current.map((label, i) => label === correctOrder[i]);
    const allRight = perPos.every(Boolean);
    setFeedback(perPos);

    // Lock any newly-correct positions
    setLocked((prev) => {
      const next = new Set(prev);
      perPos.forEach((ok, i) => {
        if (ok) next.add(i);
      });
      return next;
    });

    if (allRight) {
      setStatus("win");
    } else {
      const left = attempts - 1;
      setAttempts(left);
      if (left <= 0) setStatus("lose");
    }
  };

  const playRandom = () => {
    router.push(`/ladder/random?seed=${Date.now()}`);
  };

  // DnD handlers — swap items only if both positions are unlocked
  const onDragStart = (idx: number, isLocked: boolean) => (e: React.DragEvent) => {
    if (isLocked || status !== "playing") {
      e.preventDefault();
      return;
    }
    dragIndex.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx)); // helpful for FF
  };

  const onDragOver = (idx: number, isLocked: boolean) => (e: React.DragEvent) => {
    if (status !== "playing") return;
    // Allow drop even over locked targets; we'll block in onDrop if locked
    e.preventDefault();
  };

  const onDrop = (idx: number, isLocked: boolean) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from == null) return;
    if (isLocked || locked.has(from)) return;
    swap(from, idx);
  };

  const onDragEnd = () => {
    dragIndex.current = null;
  };

  return (
    <main className="max-w-md mx-auto p-6">
      {/* Header matches Index style with null-safe date */}
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
          {/* Keep category line; instructions removed */}
          <div className="mb-3 text-xs text-gray-600">
            Category: <strong>{puzzle.category_name}</strong>
            {puzzle.source ? <> · <em>{puzzle.source}</em></> : null}
          </div>

          {/* Draggable list; locked items are green, non-draggable, and show 🔒 */}
          <ul className="space-y-2 mb-4">
            {order.map((it, idx) => {
              const ok = feedback ? feedback[idx] : null;
              const isLocked = locked.has(idx);
              return (
                <li
                  key={idx}
                  draggable={!isLocked && status === "playing"}
                  onDragStart={onDragStart(idx, isLocked)}
                  onDragOver={onDragOver(idx, isLocked)}
                  onDrop={onDrop(idx, isLocked)}
                  onDragEnd={onDragEnd}
                  className={[
                    "flex items-center gap-3 border rounded-lg px-3 py-2 select-none",
                    isLocked ? "cursor-not-allowed" : "cursor-move",
                    ok === true
                      ? "bg-green-100 border-green-300"
                      : ok === false
                      ? "bg-red-100 border-red-300"
                      : "bg-white",
                  ].join(" ")}
                  aria-roledescription="Draggable list item"
                  aria-grabbed={(!isLocked && status === "playing") ? true : undefined}
                >
                  {/* Position number clearly separated */}
                  <span className="w-8 text-center font-medium">{idx + 1}</span>
                  <span className="h-5 border-l" />
                  <span className="pl-2 flex-1">{it.label}</span>

                  {/* Locked badge */}
                  {isLocked && (
                    <span
                      className="text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green-300 text-green-800 bg-green-50"
                      title="Locked in correct position"
                    >
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
                    {order
                    .map((it) => it)
                    .sort((a, b) => a.rank - b.rank)
                    .map((it) => (
                        <li key={it.label} className="ml-4">
                        {it.label} <span className="text-gray-500">({it.rank})</span>
                        </li>
                    ))}
                </ol>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                    onClick={playRandom}
                    className="h-11 rounded-xl bg-black text-white font-medium"
                >
                    Play Again (Random)
                </button>
                <Link
                    href="/"
                    className="h-11 rounded-xl border font-medium flex items-center justify-center"
                >
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
                        {order
                        .map((it) => it)
                        .sort((a, b) => a.rank - b.rank)
                        .map((it) => (
                            <li key={it.label} className="ml-4">
                            {it.label} <span className="text-gray-500">({it.rank})</span>
                            </li>
                        ))}
                    </ol>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                        onClick={playRandom}
                        className="h-11 rounded-xl bg-black text-white font-medium"
                    >
                        Play Again (Random)
                    </button>
                    <Link
                        href="/"
                        className="h-11 rounded-xl border font-medium flex items-center justify-center"
                    >
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
