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

      <section className="p-4 border rounded-2xl">
        <h2 className="font-semibold">How to play</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>• Five items, each from a different Top-100 list, all share the <strong>same rank (1–100)</strong>.</li>
          <li>• You get <strong>5 guesses</strong> with Hot/Cold → Hotter/Colder feedback.</li>
          <li>• Each card has one <strong>Hint</strong> that shows another item from the same list near that rank (±2..±5).</li>
          <li>• All five cards are visible; the <strong>next card unlocks</strong> after each guess.</li>
        </ul>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button onClick={goToday} className="px-4 py-2 rounded-xl bg-black text-white">
            Play Today
          </button>
          <button onClick={goRandom} className="px-4 py-2 rounded-xl border">
            Random
          </button>
        </div>
      </section>
    </main>
  );
}
