"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Puzzle, Clue } from "@/lib/types";
import { judge, type Feedback } from "@/lib/game";
import { todayETDateString, formatET } from "@/lib/time";

export default function PlayPage({ params }: { params: { mode: "today" | "random" } }) {
  const mode = params.mode;
  const isRandom = mode === "random";
  const sp = useSearchParams();
  const router = useRouter();
  const seed = sp.get("seed") || "";

  const [puz, setPuz] = useState<Puzzle | null>(null);
  const [active, setActive] = useState(0);               // live card index (0..4)
  const [guesses, setGuesses] = useState<number[]>([]);
  const [fbs, setFbs] = useState<Feedback[]>([]);
  const [input, setInput] = useState<string>("");
  const [hintUsed, setHintUsed] = useState<boolean[]>([false, false, false, false, false]); // per-card

  // fresh unique-ish seed each click
  function newSeed() {
    const rand = Math.random().toString(36).slice(2, 10);
    return `${Date.now().toString(36)}-${rand}`;
  }

  // Fetch puzzle (Today uses ET daily key; Random uses seed)
  useEffect(() => {
    const dailyKey = todayETDateString(); // "YYYY-MM-DD" in ET
    const url = isRandom
      ? `/api/random?seed=${encodeURIComponent(seed || String(Date.now()))}`
      : `/api/today?d=${dailyKey}`;

    fetch(url, { cache: "no-store" })
      .then(r => r.json())
      .then(setPuz);

    // Reset game state whenever mode/seed changes
    setActive(0);
    setGuesses([]);
    setFbs([]);
    setInput("");
    setHintUsed([false, false, false, false, false]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, seed]);

  const solved = fbs.includes("CORRECT");
  const outOfGuesses = !solved && guesses.length >= 5;
  const showResult = solved || outOfGuesses;

  const useHint = (i: number) =>
    setHintUsed(prev => (prev[i] ? prev : Object.assign([...prev], { [i]: true })));

  const submit = () => {
    if (!puz) return;
    const g = Math.max(1, Math.min(100, Number(input)));
    if (!Number.isFinite(g)) return;

    const fb = judge(g, puz.n, guesses.at(-1), guesses);
    const nextGuesses = [...guesses, g].slice(0, 5);
    const nextFbs = [...fbs, fb].slice(0, 5);
    setGuesses(nextGuesses);
    setFbs(nextFbs);
    setInput("");

    if (fb !== "CORRECT" && nextGuesses.length < 5) {
      setActive(a => Math.min(a + 1, 4)); // unlock next card
    }
  };

  if (!puz) return <main className="max-w-md mx-auto p-6">Loading…</main>;

  return (
    <main className="max-w-md mx-auto p-6">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">In the 100</h1>
        {isRandom ? (
          <span className="text-xs px-2 py-1 rounded-full border">Random</span>
        ) : (
          <span className="text-xs text-gray-600">{formatET(puz.date)}</span>
        )}
      </header>

      {/* Cards: all visible; only the active one is live. Hints persist. */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {puz.clues.map((clue, i) => (
          <ClueCard
            key={`${i}-${clue.item}`}
            clue={clue}
            state={i < active ? "done" : i === active ? "active" : "locked"}
            hintShown={hintUsed[i]}
            onHint={() => useHint(i)}
          />
        ))}
      </div>

      {!showResult && (
        <>
          <div className="flex gap-2 items-center">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="1–100"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="border rounded-lg px-3 py-2 w-28"
            />
            <button onClick={submit} className="px-4 py-2 rounded-lg bg-black text-white">
              Guess
            </button>
            <span className="ml-auto text-sm text-gray-600">{guesses.length}/5</span>
          </div>
          <ul className="mt-3 flex flex-wrap gap-2">
            {fbs.map((f, i) => (
              <li key={i} className="px-2 py-1 rounded-full text-xs border">
                {f === "CORRECT" ? "🎯 CORRECT" : f}
              </li>
            ))}
          </ul>
        </>
      )}

      {showResult && (
        <section className="mt-6 p-4 border rounded-xl">
          <h2 className="text-lg font-semibold mb-2">{solved ? "You win!" : "You lose"}</h2>
          <p className="mb-2">
            Answer: <strong>{puz.n}</strong>
          </p>

          <details className="mt-2">
            <summary>Reveal categories & sources</summary>
            <ul className="list-disc ml-6 text-sm mt-2">
              {puz.clues.map((c, i) => (
                <li key={i}>
                  <strong>{c.category_name}</strong> — <em>{c.item}</em>{" "}
                  <span className="text-gray-500">({c.source})</span>
                </li>
              ))}
            </ul>
          </details>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* NEW: Always generate a brand-new seed on click */}
            <button
              onClick={() => router.replace(`/play/random?seed=${newSeed()}`)}
              className="px-4 py-2 rounded-xl bg-black text-white text-center"
            >
              Play Again (Random)
            </button>
            <Link href="/" className="px-4 py-2 rounded-xl border text-center">
              Home
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function ClueCard({
  clue,
  state,
  hintShown,
  onHint,
}: {
  clue: Clue;
  state: "locked" | "active" | "done";
  hintShown: boolean;
  onHint: () => void;
}) {
  if (state === "locked") {
    return (
      <div className="p-4 rounded-xl border bg-gray-50 text-gray-400">
        <div className="text-xs uppercase tracking-wide">Locked</div>
        <div className="mt-1 font-medium">Card hidden</div>
      </div>
    );
  }

  const showHintBtn = state === "active" && !hintShown;

  return (
    <div className={`p-4 rounded-xl border ${state === "active" ? "ring-2 ring-black" : ""}`}>
      <div className="text-xs uppercase tracking-wide text-gray-500">{clue.category_name}</div>
      <div className="mt-1 font-medium">{clue.item}</div>
      <div className="text-sm text-gray-500 mt-2">
        {hintShown ? (
          <>
            Also near this rank: <em>{clue.hint_item}</em>
          </>
        ) : (
          " "
        )}
      </div>
      {showHintBtn && (
        <button onClick={onHint} className="mt-2 text-xs underline">
          Hint
        </button>
      )}
    </div>
  );
}
