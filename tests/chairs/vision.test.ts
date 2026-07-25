import { describe, expect, it } from "vitest";
import { acceptableGuess } from "../../classes/chairs/vision";

describe("acceptableGuess", () => {
  it("accepts a confident reading of a brand that sells here", () => {
    expect(acceptableGuess({ brand: "Cougar", model: "Armor Elite", kind: "gamer", confidence: 0.9 })).toBe(true);
  });

  it("refuses a brand nobody sells here, however confident the model is", () => {
    // The whole directory rests on not inventing chairs.
    expect(acceptableGuess({ brand: "ErgoMax", model: "Pro 3000", kind: "escritorio", confidence: 0.99 })).toBe(false);
  });

  it("refuses a low-confidence reading", () => {
    expect(acceptableGuess({ brand: "Cougar", model: "Armor", kind: "gamer", confidence: 0.4 })).toBe(false);
  });

  it("refuses a brand with no model and a model with no brand", () => {
    expect(acceptableGuess({ brand: "Cougar", model: "", kind: "gamer", confidence: 0.95 })).toBe(false);
    expect(acceptableGuess({ brand: "", model: "Armor Elite", kind: "gamer", confidence: 0.95 })).toBe(false);
    expect(acceptableGuess({ brand: "null", model: "null", kind: "otra", confidence: 0.95 })).toBe(false);
  });

  it("refuses nothing at all", () => {
    expect(acceptableGuess(null)).toBe(false);
  });
});
