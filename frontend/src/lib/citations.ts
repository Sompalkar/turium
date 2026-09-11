const CITATION = /\[(\d+)\]/g;

// Which sources the model actually leaned on, read back out of its own text.
export function parseCitedNumbers(answer: string): Set<number> {
  const found = new Set<number>();
  for (const match of answer.matchAll(CITATION)) {
    found.add(Number(match[1]));
  }
  return found;
}
