import { describe, expect, it } from "vitest";
import { lexCounts } from "../../classes/charruadevs/lexicon";

describe("lexicon", () => {
  it("counts each alarm phrase once per comment and skips gone ones", () => {
    const out = lexCounts([
      "no hay laburo, está saturado",
      "me echaron ayer",
      "la IA nos va a reemplazar",
      "[removed]",
      "conseguí laburo en dos semanas",
    ]);
    expect(out.n).toBe(4);
    expect(out.counts.no_hay_laburo).toBe(1);
    expect(out.counts.saturado).toBe(1);
    expect(out.counts.despidos).toBe(1);
    expect(out.counts.reemplazo_ia).toBe(1);
    expect(out.counts.ia_menciones).toBe(1);
    expect(out.counts.optimismo).toBe(1);
  });
});
