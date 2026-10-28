import { describe, expect, it } from "vitest";
import { groupDuplicates, type DupRow } from "../../classes/redditopps/dupes";

const row = (postId: string, sub: string, over: Partial<DupRow> = {}): DupRow => ({
  postId,
  title: "Consulta IRPF por dos trabajos",
  sub,
  permalink: `https://reddit.com/r/${sub}/comments/${postId}/x`,
  score: 1,
  numComments: 1,
  createdAt: new Date(Date.UTC(2026, 9, 20)),
  ...over,
});

describe("redditopps/dupes", () => {
  it("deja una card por hilo repetido, la de más movimiento", () => {
    const groups = groupDuplicates([
      row("a", "uruguay", { numComments: 8 }),
      row("b", "monte_video", { numComments: 2 }),
      row("c", "LegalUruguay", { title: "consulta irpf por DOS trabajos!" }),
      row("d", "AutosUy", { title: "Swift o HB20 para primer auto" }),
    ]);
    expect(groups.get("a")).toEqual({
      duplicateOf: "",
      alsoIn: [
        { sub: "monte_video", permalink: "https://reddit.com/r/monte_video/comments/b/x" },
        { sub: "LegalUruguay", permalink: "https://reddit.com/r/LegalUruguay/comments/c/x" },
      ],
    });
    expect(groups.get("b")!.duplicateOf).toBe("a");
    expect(groups.get("c")!.duplicateOf).toBe("a");
    expect(groups.get("d")).toEqual({ duplicateOf: "", alsoIn: [] });
  });

  it("no junta títulos genéricos cortos", () => {
    const groups = groupDuplicates([row("a", "uruguay", { title: "Consulta" }), row("b", "Burises", { title: "Consulta" })]);
    expect(groups.get("a")!.duplicateOf).toBe("");
    expect(groups.get("b")!.duplicateOf).toBe("");
  });

  it("a igual movimiento manda el más viejo, que es el original", () => {
    const groups = groupDuplicates([
      row("nuevo", "monte_video", { createdAt: new Date(Date.UTC(2026, 9, 21)) }),
      row("viejo", "uruguay", { createdAt: new Date(Date.UTC(2026, 9, 19)) }),
    ]);
    expect(groups.get("nuevo")!.duplicateOf).toBe("viejo");
  });
});
