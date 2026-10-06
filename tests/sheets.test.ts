import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSheetPermissionError, sheetPermissionHelp } from "../classes/sheets";

describe("Google Sheets permission refusals", () => {
  it("recognizes the 403 google-spreadsheet raises for a read-only service account", () => {
    // The shape of Sentry CAMBIO-URUGUAY-BACKEND-15 (ky HTTPError from setHeaderRow).
    const refused = Object.assign(
      new Error("Google API error - [403] The caller does not have permission"),
      { name: "HTTPError", response: { status: 403 } },
    );
    expect(isSheetPermissionError(refused)).toBe(true);
    expect(isSheetPermissionError(new Error("Google API error - [403] The caller does not have permission"))).toBe(
      true,
    );
    expect(isSheetPermissionError(Object.assign(new Error("Too many requests"), { response: { status: 429 } }))).toBe(
      false,
    );
    expect(isSheetPermissionError(new Error("socket hang up"))).toBe(false);
    expect(isSheetPermissionError(undefined)).toBe(false);
  });

  it("tells the owner which address to share the file with, without any key material", () => {
    const help = sheetPermissionHelp("sheet-id", { client_email: "job@project.iam.gserviceaccount.com" });
    expect(help).toContain("job@project.iam.gserviceaccount.com");
    expect(help).toContain("https://docs.google.com/spreadsheets/d/sheet-id");
    expect(help).toContain("Editor");
  });

  it("sync_sheet logs the refusal instead of letting it crash and report", () => {
    const source = readFileSync(join(__dirname, "../sync_sheet.ts"), "utf8");
    expect(source).toMatch(/if \(isSheetPermissionError\(error\)\) \{\s*console\.error\(/);
    // Other failures still propagate (Sentry's unhandled-rejection handler reports them).
    expect(source).toMatch(/\n\s*throw error;\n/);
    // The first write precedes clearRows, so a refused run never empties the sheet.
    expect(source.indexOf("setHeaderRow")).toBeLessThan(source.indexOf("clearRows"));
  });
});
