import { describe, expect, it } from "vitest";
import { isCandidateComment, isGone, isMarketThread } from "../../classes/charruadevs/filter";

describe("charruadevs filter", () => {
  it("treats deleted/removed/empty as gone", () => {
    expect(isGone("[removed]")).toBe(true);
    expect(isGone("[deleted]")).toBe(true);
    expect(isGone("")).toBe(true);
    expect(isGone(undefined)).toBe(true);
    expect(isGone("hola")).toBe(false);
  });

  it("recognises a market thread by title or text", () => {
    expect(isMarketThread("¿Cómo ven el mercado IT para 2026?", "")).toBe(true);
    expect(isMarketThread("Duda con React", "tengo un bug en useEffect")).toBe(false);
  });

  it("a comment is a candidate by its own words or by its thread", () => {
    expect(isCandidateComment({ body: "no hay laburo para juniors", author: "x" }, false)).toBe(true);
    expect(isCandidateComment({ body: "usá un Map en vez de un objeto", author: "x" }, false)).toBe(false);
    expect(isCandidateComment({ body: "usá un Map en vez de un objeto", author: "x" }, true)).toBe(true);
  });

  it("never picks bots, gone or tiny comments", () => {
    expect(isCandidateComment({ body: "no hay laburo, gente", author: "AutoModerator" }, true)).toBe(false);
    expect(isCandidateComment({ body: "[removed]", author: "x" }, true)).toBe(false);
    expect(isCandidateComment({ body: "jaja", author: "x" }, true)).toBe(false);
  });
});
