// Los prefijos de idioma del backend son los del app: `app/utils/locales.ts` se lee como texto.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { LOCALE_PREFIXES } from "../../classes/insights/paths";

describe("LOCALE_PREFIXES", () => {
  it("son exactamente los códigos con prefijo del app", () => {
    const src = fs.readFileSync(path.join(__dirname, "..", "..", "app", "utils", "locales.ts"), "utf8");
    const core = /CORE_LOCALES\s*=\s*\[([^\]]*)\]/.exec(src)?.[1] ?? "";
    const coreCodes = [...core.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);
    const extra = [...src.matchAll(/\{\s*code:\s*'([a-z-]+)'/g)].map((m) => m[1]);
    const def = /DEFAULT_LOCALE\s*=\s*'([a-z-]+)'/.exec(src)?.[1];
    const prefixed = [...coreCodes, ...extra].filter((c) => c !== def);
    expect(prefixed.length).toBeGreaterThan(30);
    expect([...LOCALE_PREFIXES].sort()).toEqual(prefixed.sort());
  });
});
