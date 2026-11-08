import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { POSITIONSTACK_REVERSE_URL, reverseGeocodeQuery } from "../../classes/geo/positionstack";

// Privacy audit, 2026-11-08: GET /position_stack (the "where am I" of /avanzado) sent the API key
// and the visitor's coordinates to Positionstack over plain HTTP, and printed every answer — the
// visitor's street address — to the pm2 log of the API, while the privacy policy says the server
// keeps only errors. HTTPS was measured working with the configured plan the same day.

describe("reverseGeocodeQuery", () => {
  it("keeps a point and clamps the limit", () => {
    expect(reverseGeocodeQuery("-34.9067,-56.199", "1")).toEqual({ query: "-34.9067,-56.199", limit: 1 });
    expect(reverseGeocodeQuery(" -34.9 , -56.2 ", undefined)).toEqual({ query: "-34.9,-56.2", limit: 1 });
    expect(reverseGeocodeQuery("-34.9,-56.2", "500")?.limit).toBe(10);
    expect(reverseGeocodeQuery("-34.9,-56.2", "0")?.limit).toBe(1);
    expect(reverseGeocodeQuery("-34.9,-56.2", "abc")?.limit).toBe(1);
  });

  it("sends nothing for what is not a point on Earth", () => {
    const notPoints: unknown[] = [
      undefined,
      "",
      ",",
      "-34.9",
      "-34.9,",
      ",-56.2",
      "abc,def",
      "12abc,-56.2",
      "-34.9,-56.2,7",
      "91,0",
      "0,181",
      "NaN,1",
      "Infinity,0",
      ["-34.9,-56.2"],
    ];
    for (const query of notPoints) expect(reverseGeocodeQuery(query, "1")).toBeNull();
  });

  it("takes only a number from limit", () => {
    expect(reverseGeocodeQuery("-34.9,-56.2", "1&fields=x")?.limit).toBe(1);
    expect(reverseGeocodeQuery("-34.9,-56.2", ["3"])?.limit).toBe(1);
  });
});

describe("GET /position_stack", () => {
  const source = readFileSync(resolve(__dirname, "../../index.ts"), "utf8");
  const start = source.indexOf('server.getJson("position_stack"');
  const handler = source.slice(start, source.indexOf("server.", start + 10));

  it("talks to the provider over HTTPS only", () => {
    expect(POSITIONSTACK_REVERSE_URL.startsWith("https://")).toBe(true);
    expect(source).not.toContain("http://api.positionstack.com");
  });

  it("does not write the visitor's address to the log", () => {
    expect(start).toBeGreaterThan(-1);
    expect(handler).toContain("reverseGeocodeQuery(");
    expect(handler).not.toMatch(/console\.(log|info|debug)/);
  });
});
