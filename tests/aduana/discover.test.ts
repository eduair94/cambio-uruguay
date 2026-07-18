import { describe, expect, it } from "vitest";
import { discoverNewNorms, extractRgLinks, knownRgNumbers } from "../../classes/aduana/discover";

// Real markup shape from https://www.aduanas.gub.uy/innovaportal/v/28211/.../2026.html — the list
// links per-RG DETAIL pages, not PDFs, and uses single-quoted hrefs.
const html = `
<a href='https://www.aduanas.gub.uy/innovaportal/v/28428/8/innova.front/resolucion-general-09' title='RG 9'>RG 9</a>
<a href='https://www.aduanas.gub.uy/innovaportal/v/28480/8/innova.front/resolucion-general-15' title='RG 15'>RG 15</a>
<a href='https://www.aduanas.gub.uy/innovaportal/v/28613/8/innova.front/resolucion-general-21' title='RG 21'>RG 21</a>
<a href='https://www.aduanas.gub.uy/innovaportal/v/28700/8/innova.front/resolucion-general-25' title='RG 25'>RG 25</a>
<a href='/v/999/8/innova.front/base-de-datos-institucional.html'>no es una RG</a>`;

describe("extractRgLinks", () => {
  it("extracts each RG-2026 detail link with its number, leading zeros stripped", () => {
    const links = extractRgLinks(html, "https://www.aduanas.gub.uy");
    expect(links.map((l) => l.number).sort()).toEqual(["15", "21", "25", "9"]);
    expect(links.find((l) => l.number === "25")!.url).toContain("resolucion-general-25");
    expect(links.find((l) => l.number === "9")!.title).toBe("RG DNA 9/2026");
  });

  it("ignores non-RG links", () => {
    expect(extractRgLinks(html, "https://www.aduanas.gub.uy").some((l) => l.url.includes("base-de-datos"))).toBe(false);
  });
});

describe("knownRgNumbers", () => {
  it("parses RG numbers out of source norm strings, ignoring non-RGs", () => {
    expect(
      knownRgNumbers(["RG DNA 21/2026 (25/06/2026)", "Decreto 50/026", "RG DNA 09/2026", "Ley 20.446"]).sort()
    ).toEqual(["21", "9"]);
  });
});

describe("discoverNewNorms", () => {
  const fakeOk = (async () => ({ ok: true, text: async () => html })) as unknown as typeof fetch;

  it("returns only RGs NEWER than the latest we cite (not every uncited older one)", async () => {
    const found = await discoverNewNorms(["9", "21"], fakeOk); // latest we cite is 21
    expect(found.map((f) => f.number)).toEqual(["25"]); // 25 > 21; the uncited RG 15 is NOT flagged
    expect(found[0].url).toContain("resolucion-general-25");
  });

  it("returns [] on a non-200 index, without throwing", async () => {
    const notOk = (async () => ({ ok: false, text: async () => "" })) as unknown as typeof fetch;
    await expect(discoverNewNorms([], notOk)).resolves.toEqual([]);
  });

  it("tolerates a broken index without throwing", async () => {
    const boom = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    await expect(discoverNewNorms([], boom)).resolves.toEqual([]);
  });
});
