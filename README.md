# Rankle (starter)

Guess the **shared rank** (1–100) across five different Top 100 lists.

This starter is a minimal Next.js + TypeScript + Tailwind project with:

- **Hot/Cold** feedback (5 guesses total)
- **Per-card adjacent-item hints** (±2..±5 neighbors; no ranks shown)
- Deterministic **daily puzzle** seeded by **America/New_York** date

## Quickstart

```bash
pnpm install   # or npm i / yarn
pnpm dev       # http://localhost:3000
```

## Files to look at

- `app/page.tsx` — UI + feedback loop
- `app/api/today/route.ts` — builds today's puzzle server-side
- `lib/game.ts` — HOT / COLD / HOTTER / COLDER logic
- `lib/game-build.ts` — adjacent-item hint picker
- `data/categories.json` — **demo lists** (replace with real snapshots)

## Shipping notes

- Replace demo categories with **snapshotted** Top 100 lists; keep keys 1..100.
- The API seeds by ET date so everyone gets the same puzzle globally.
- Consider pre-generating a month of puzzles once you have real data.
- Add Plausible/PostHog and a simple localStorage streak if desired.
