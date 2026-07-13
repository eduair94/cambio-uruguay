import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { BANK_ENTITIES, KIND_LABELS } from "../../classes/banks/entities";

describe("bank entities", () => {
  // A bank the tier list shows but this list forgets is a bank that silently never gets news.
  it("covers exactly the ids in app/utils/bankTierlist.ts", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "..", "..", "app", "utils", "bankTierlist.ts"),
      "utf8"
    );
    // Scope to the `BANKS` array only — the file has several other `{ id: '...' }`-shaped arrays
    // (BANK_RUBRIC's dimensions, PROFILE_PRESETS) with the same 2-space/4-space indentation, whose
    // ids (e.g. 'app', 'usd', 'joven-digital') are not banks and must not leak into this list.
    const banksBlockMatch = /export const BANKS[\s\S]*?\n\]\)/.exec(src);
    expect(banksBlockMatch, "BANKS array not found in app/utils/bankTierlist.ts").toBeTruthy();
    const banksBlock = banksBlockMatch![0];

    // BANKS entries look like: { id: 'itau', name: 'Itaú', kind: 'banco', ... }
    const appIds = [...banksBlock.matchAll(/^\s{2}\{\s*$\n\s{4}id:\s*'([a-z0-9-]+)'/gm)].map((m) => m[1]);
    expect(appIds.length).toBeGreaterThan(5); // the regex still matches something
    expect(BANK_ENTITIES.map((e) => e.id).sort()).toEqual([...appIds].sort());
  });

  it("labels every kind it uses", () => {
    for (const e of BANK_ENTITIES) expect(KIND_LABELS[e.kind]).toBeTruthy();
  });
});
