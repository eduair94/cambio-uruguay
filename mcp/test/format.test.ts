import { describe, expect, it } from "vitest";
import { fold, matchesWords, money, pct, siteUrl, slugify, toQuery, truncate } from "../src/format";
import { parseToolsets, toolsetsFromUrl, TOOLSETS } from "../src/toolsets";

describe("format", () => {
  it("builds compact query strings", () => {
    expect(toQuery({ a: 1, b: true, c: false, d: null, e: "", f: ["x", "y"], g: [] })).toBe("?a=1&b=1&f=x%2Cy");
    expect(toQuery({})).toBe("");
  });

  it("formats money in pesos and dollars", () => {
    expect(money(24900, "UYU")).toBe("$ 24.900");
    expect(money(7900, "USD")).toBe("US$ 7.900");
    expect(money(null)).toBe("s/d");
  });

  it("formats percentages", () => {
    expect(pct(0.271)).toBe("27 %");
    expect(pct(undefined)).toBe("s/d");
  });

  it("slugifies and folds accents", () => {
    expect(slugify("Citroën C3 Aircross")).toBe("citroen-c3-aircross");
    expect(fold("  Cordón  NORTE ")).toBe("cordon norte");
    expect(matchesWords("Heladera no frost 300 L", "heladera NO-frost".replace("-", " "))).toBe(true);
    expect(matchesWords("Heladera", "lavarropas")).toBe(false);
  });

  it("links to the public site", () => {
    expect(siteUrl("/x", { q: "a b" })).toBe("https://cambio-uruguay.com/x?q=a+b");
  });

  it("truncates long text", () => {
    expect(truncate("abcdef", 4)).toBe("abc…");
    expect(truncate("abc", 4)).toBe("abc");
  });
});

describe("toolsets", () => {
  it("parses env lists", () => {
    expect(parseToolsets("autos, x")).toEqual(["autos"]);
    expect(parseToolsets("")).toEqual([...TOOLSETS]);
    expect(parseToolsets("productos,alquileres")).toEqual(["alquileres", "productos"]);
  });

  it("maps request paths", () => {
    expect(toolsetsFromUrl("/mcp")).toEqual([...TOOLSETS]);
    expect(toolsetsFromUrl("/mcp/")).toEqual([...TOOLSETS]);
    expect(toolsetsFromUrl("/mcp/alquileres")).toEqual(["alquileres"]);
    expect(toolsetsFromUrl("/mcp/sitio")).toEqual(["sitio"]);
    expect(toolsetsFromUrl("/mcp?toolsets=autos,productos")).toEqual(["autos", "productos"]);
    expect(toolsetsFromUrl("/mcp/nope")).toBeNull();
    expect(toolsetsFromUrl("/other")).toBeNull();
  });
});
