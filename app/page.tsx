"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const goToday = () => router.push("/play/today");
  const goRandom = () => router.push(`/play/random?seed=${Date.now()}`);

  return (
    <main className="max-w-md mx-auto p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold">In the 100</h1>
      </header>

      {/* Index (first game) */}
      <section className="mb-6 border rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Index</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1">
          <li>You’ll see 5 items, each from a different Top-100 list.</li>
          <li>All share the same hidden rank (1–100).</li>
          <li>You get 5 guesses with Hot/Cold → Hotter/Colder feedback.</li>
          <li>Each card has a Hint showing a nearby item.</li>
        </ul>
        <div className="flex gap-2">
          <button onClick={goToday} className="px-4 py-2 rounded-lg bg-black text-white">
            Play Today
          </button>
          <button onClick={goRandom} className="px-4 py-2 rounded-lg border">
            Random
          </button>
        </div>
      </section>


      {/* Ladder (second game) */}
      <section className="mb-6 border rounded-xl p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Ladder</h2>
        <ul className="list-disc list-inside text-sm text-gray-700 mb-3 space-y-1">
          <li>You’ll see 5 items from a Top-100 list.</li>
          <li>Reorder them by their true ranking (top = #1).</li>
          <li>Submit to check — each position turns red/green.</li>
          <li>You have 3 guesses.</li>
        </ul>
        <div className="flex gap-2">
          <button
            onClick={() => router.push("/ladder/today")}
            className="px-4 py-2 rounded-lg bg-black text-white"
          >
            Play Today
          </button>
          <button
            onClick={() => router.push(`/ladder/random?seed=${Date.now()}`)}
            className="px-4 py-2 rounded-lg border"
          >
            Random
          </button>
        </div>
      </section>
    </main>
  );
}
