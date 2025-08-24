export type Feedback = "HOT" | "COLD" | "HOTTER" | "COLDER" | "SAME" | "CORRECT" | "REPEAT";

export function judge(guess: number, answer: number, prevGuess?: number, history: number[] = []): Feedback {
  if (guess === answer) return "CORRECT";
  if (history.includes(guess)) return "REPEAT";

  const d = Math.abs(guess - answer);
  if (prevGuess == null) return d <= 20 ? "HOT" : "COLD";

  const prevD = Math.abs((prevGuess as number) - answer);
  if (d < prevD) return "HOTTER";
  if (d > prevD) return "COLDER";
  return "SAME";
}
