import chalk from "./chalk.js";
import classicA from "./classic-a.js";
import classicB from "./classic-b.js";
import { py } from "./_util.js";

const playground = {
  id: "playground",
  title: "Python Playground",
  difficulty: "Easy",
  topic: "Playground",
  playground: true,
  prompt: "A scratch pad. Runs any Python 3 code offline. `print()` output shows up below.",
  starter: py`
    import sys
    print("Python", sys.version.split()[0])

    def fib(n: int) -> int:
        a, b = 0, 1
        for _ in range(n):
            a, b = b, a + b
        return a

    print([fib(i) for i in range(10)])
  `,
};

export const problems = [playground, ...chalk, ...classicA, ...classicB];

// Tests for a problem, with `part` (0-based) attached for multi-part problems.
export function flattenTests(p) {
  if (p.parts) return p.parts.flatMap((part, i) => (part.tests || []).map((t) => ({ ...t, part: i })));
  return p.tests || [];
}
