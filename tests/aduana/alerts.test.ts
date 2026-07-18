import { describe, expect, it } from "vitest";
import { buildAlerts } from "../../classes/aduana/alerts";

describe("buildAlerts", () => {
  it("says nothing on a quiet run", () => {
    expect(buildAlerts({ published: [], flagged: [], discovered: [] })).toEqual([]);
  });

  it("emits one line per state change, each carrying its identifying detail", () => {
    const msgs = buildAlerts({
      published: [
        { id: "franquicia.registro_vendedor_desde", value: "2027-01-01", prevValue: "2026-10-01" },
      ],
      flagged: ["prestacion_unica.minimo_usd"],
      discovered: [
        { url: "https://www.aduanas.gub.uy/x/resolucion-general-30", number: "30", title: "RG DNA 30/2026" },
      ],
    });
    const joined = msgs.join("\n");
    expect(msgs).toHaveLength(3);
    expect(joined).toContain("2027-01-01");
    expect(joined).toContain("2026-10-01"); // the previous value, for rollback context
    expect(joined).toContain("prestacion_unica.minimo_usd");
    expect(joined).toContain("30/2026");
  });

  it("only emits the sections that have content", () => {
    const msgs = buildAlerts({ published: [], flagged: ["x"], discovered: [] });
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toContain("🟡");
  });
});
