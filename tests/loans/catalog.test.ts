import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { LOAN_LENDERS } from "../../classes/loans/catalog";

describe("loan lenders catalogue", () => {
  // A lender the page lists but this catalogue forgets is a lender whose TEA never refreshes.
  it("covers exactly the ids in app/utils/loans.ts", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "utils", "loans.ts"), "utf8");
    // LENDERS entries look like:
    //   {
    //     id: 'brou',
    const appIds = [...src.matchAll(/^\s{2}\{\s*$\n\s{4}id:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]!);
    expect(appIds.length).toBeGreaterThan(5); // the regex still matches something
    expect(LOAN_LENDERS.map((l) => l.id).sort()).toEqual([...appIds].sort());
  });

  it("gives every lender a name, website and source url", () => {
    for (const l of LOAN_LENDERS) {
      expect(l.name).toBeTruthy();
      expect(l.website).toMatch(/^https?:\/\//);
      expect(l.source).toMatch(/^https?:\/\//);
    }
  });
});
