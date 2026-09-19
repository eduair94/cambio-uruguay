import fs from "fs";
import path from "path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const ROOT = path.join(__dirname, "..", "..");
// The app copy is formatted by the app's prettier (single quotes, no semicolons, unions broken onto
// lines with a leading "|"), so both files are reduced to the same token stream before comparing.
const normalized = (file: string): string =>
  fs.readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/'/g, '"')
    .replace(/[\s;,]/g, "")
    .replace(/=\|/g, "=");

const syntaxErrors = (file: string): string[] => {
  const source = ts.createSourceFile(file, fs.readFileSync(path.join(ROOT, file), "utf8"), ts.ScriptTarget.Latest, true);
  const diagnostics = (source as unknown as { parseDiagnostics: ts.DiagnosticWithLocation[] }).parseDiagnostics;
  return diagnostics.map(d => `${file}:${source.getLineAndCharacterOfPosition(d.start).line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`);
};

describe("used-car wire contract", () => {
  // The comparison below drops separators, so a mirror that LOST them ("{ fuel: X | 'unknown' adverts:
  // number }") compared equal and sat broken on main: the app imports it as types only, so no build
  // ever parsed it. Only the linter did.
  it("both copies parse", () => {
    expect([...syntaxErrors("classes/autos/publicTypes.ts"), ...syntaxErrors("app/utils/carsPublic.ts")]).toEqual([]);
  });

  it("keeps the app mirror identical to the backend contract", () => {
    const backend = normalized("classes/autos/publicTypes.ts");
    expect(backend.length).toBeGreaterThan(500);
    expect(normalized("app/utils/carsPublic.ts")).toBe(backend);
  });
});
