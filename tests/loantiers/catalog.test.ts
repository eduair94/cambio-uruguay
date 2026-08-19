import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { LOAN_TIER_LENDERS } from "../../classes/loantiers/catalog";

describe("loan tier-list catalogue", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "..", "app", "utils", "loanTierlist.ts"),
    "utf8"
  );

  // A lender the tier list shows but this catalogue forgets is a lender whose facts silently never
  // refresh — on a page that advertises a weekly re-check, that is worse than having no refresh.
  it("covers exactly the ids in app/utils/loanTierlist.ts", () => {
    // Only the ids inside LENDER_TIERLIST — the rubric dimensions and the reader presets above it
    // are objects with an `id` too, and matching those would make this test pass for the wrong
    // reason (and then fail forever the day somebody adds a preset).
    const catalogue = src.slice(src.indexOf("export const LENDER_TIERLIST"));
    expect(catalogue).toBeTruthy();
    const appIds = [...catalogue.matchAll(/^\s{2}\{\s*$\n\s{4}id: '([a-z0-9-]+)',/gm)].map(m => m[1]!);
    expect(appIds.length).toBeGreaterThan(15);
    expect(LOAN_TIER_LENDERS.map(l => l.id).sort()).toEqual([...appIds].sort());
  });

  it("gives every lender a name, website and source url", () => {
    for (const l of LOAN_TIER_LENDERS) {
      expect(l.name).toBeTruthy();
      expect(l.website).toMatch(/^https?:\/\//);
      expect(l.sourceUrl).toMatch(/^https?:\/\//);
    }
  });

  it("has no duplicate ids", () => {
    const ids = LOAN_TIER_LENDERS.map(l => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // The refresh only accepts a citation from the lender's own host (or an official one), so a seed
  // whose source already lives somewhere else would be unrefreshable from day one.
  it("seeds every lender from its own domain or an official source", () => {
    const OFFICIAL = ["bcu.gub.uy", "gub.uy", "impo.com.uy"];
    for (const l of LOAN_TIER_LENDERS) {
      const own = new URL(l.website).hostname.replace(/^www\./, "");
      const host = new URL(l.sourceUrl).hostname.replace(/^www\./, "");
      const ok =
        host === own ||
        host.endsWith(`.${own}`) ||
        own.endsWith(`.${host}`) ||
        OFFICIAL.some(o => host === o || host.endsWith(`.${o}`));
      expect(ok, `${l.id}: ${host} no pertenece a ${own}`).toBe(true);
    }
  });
});
