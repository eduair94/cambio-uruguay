import fs from "fs";
import path from "path";
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

describe("used-car wire contract", () => {
  it("keeps the app mirror identical to the backend contract", () => {
    const backend = normalized("classes/autos/publicTypes.ts");
    expect(backend.length).toBeGreaterThan(500);
    expect(normalized("app/utils/carsPublic.ts")).toBe(backend);
  });
});
