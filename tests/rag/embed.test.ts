import { describe, expect, it } from "vitest";
import { bufferToVector, cosine, normalise, vectorToBuffer } from "../../classes/rag/embed";

describe("rag/embed — normalise", () => {
  it("makes the vector unit length", () => {
    const v = normalise(Float32Array.from([3, 4]));
    expect(Math.hypot(v[0]!, v[1]!)).toBeCloseTo(1, 6);
  });

  it("leaves a zero vector alone instead of dividing by zero", () => {
    const v = normalise(new Float32Array(4));
    expect([...v]).toEqual([0, 0, 0, 0]);
  });

  it("is what makes cosine mean cosine — the reason this is not optional", () => {
    // gemini-embedding-001 at 768 dims returns vectors with |v| ≈ 0.59. Without normalising, the
    // dot product of a vector with ITSELF is ~0.35, not 1 — so every threshold in the system would
    // silently be measuring something other than similarity.
    const raw = Float32Array.from([0.3, 0.4, 0.1]);
    expect(cosine(raw, raw)).not.toBeCloseTo(1, 3);
    const unit = normalise(Float32Array.from(raw));
    expect(cosine(unit, unit)).toBeCloseTo(1, 6);
  });
});

describe("rag/embed — cosine", () => {
  it("is 1 for identical unit vectors and 0 for orthogonal ones", () => {
    const a = normalise(Float32Array.from([1, 0, 0]));
    const b = normalise(Float32Array.from([0, 1, 0]));
    expect(cosine(a, a)).toBeCloseTo(1, 6);
    expect(cosine(a, b)).toBeCloseTo(0, 6);
  });
});

describe("rag/embed — Buffer round trip", () => {
  it("survives the trip to Mongo and back", () => {
    const original = normalise(Float32Array.from(Array.from({ length: 768 }, (_v, i) => Math.sin(i))));
    const restored = bufferToVector(vectorToBuffer(original));
    expect(restored.length).toBe(768);
    for (let i = 0; i < original.length; i++) expect(restored[i]).toBeCloseTo(original[i]!, 6);
  });

  it("packs a 768-dim vector into 3 072 bytes, not 768 BSON doubles", () => {
    expect(vectorToBuffer(new Float32Array(768)).byteLength).toBe(3072);
  });

  it("decodes correctly from an unaligned Buffer — the crash a Float32Array view would cause", () => {
    // Node hands out small Buffers as slices of a shared pool, so `byteOffset` is arbitrary. A
    // typed-array view over one of those throws RangeError for some documents and not others.
    const source = vectorToBuffer(normalise(Float32Array.from([1, 2, 3, 4])));
    const padded = Buffer.concat([Buffer.alloc(1), source]);
    const unaligned = padded.subarray(1);
    expect(unaligned.byteOffset % 4).not.toBe(0);
    expect(() => bufferToVector(unaligned)).not.toThrow();
    expect(bufferToVector(unaligned).length).toBe(4);
  });
});
