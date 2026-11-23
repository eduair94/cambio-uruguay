import { describe, expect, it } from "vitest";
import { claimsOf, evaluateLabels, stratifiedSample, wilsonLower, type Label } from "../../classes/photofacts/evaluate";

const labels = (attribute: string, positives: number, correctPositives: number, negatives: number, extraUnseen = 0): Label[] => [
  ...Array.from({ length: positives }, (_, i) => ({ id: `p${i}`, attribute, positive: true, verdict: i < correctPositives ? "correcto" : "incorrecto" }) as Label),
  ...Array.from({ length: negatives }, (_, i) => ({ id: `n${i}`, attribute, positive: false, verdict: "correcto" }) as Label),
  ...Array.from({ length: extraUnseen }, (_, i) => ({ id: `u${i}`, attribute, positive: true, verdict: "no_se_ve" }) as Label),
];

describe("evaluateLabels", () => {
  it("passes an attribute with 100 labels, 30 positives and 29 of them right", () => {
    const [score] = evaluateLabels(labels("pool", 30, 29, 70));
    expect(score).toMatchObject({ attribute: "pool", n: 100, positives: 30, correctPositives: 29, passes: true });
    expect(score.precision).toBeCloseTo(29 / 30, 9);
  });

  it("fails below 95 %, below 100 labels or below 30 positives", () => {
    expect(evaluateLabels(labels("pool", 30, 28, 70))[0].passes).toBe(false);
    expect(evaluateLabels(labels("pool", 30, 30, 69))[0].passes).toBe(false);
    expect(evaluateLabels(labels("pool", 29, 29, 80))[0].passes).toBe(false);
  });

  it("leaves 'no se ve' out of the sample", () => {
    const [score] = evaluateLabels(labels("acUnit", 30, 30, 70, 25));
    expect(score.n).toBe(100);
    expect(score.positives).toBe(30);
  });

  it("reports no precision when the model never claimed anything", () => {
    const [score] = evaluateLabels(labels("barbecue", 0, 0, 120));
    expect(score).toMatchObject({ precision: null, wilsonLow: null, passes: false, accuracy: 1 });
  });
});

describe("wilsonLower", () => {
  it("is the cautious end of the interval", () => {
    expect(wilsonLower(96, 100)).toBeCloseTo(0.9016, 3);
    expect(wilsonLower(29, 30)).toBeLessThan(29 / 30);
    expect(wilsonLower(0, 0)).toBe(0);
  });
});

describe("stratifiedSample", () => {
  const doc = (id: string, pool: boolean, render = false) => ({
    _id: id,
    facts: { furniture: "no_se", seen: { pool: pool ? 2 : null } },
    photos: [{ render, watermark: false }],
  });

  it("brings adverts where each attribute was claimed and where it was not", () => {
    const docs = [...Array.from({ length: 50 }, (_, i) => doc(`x${i}`, false)), doc("pool-1", true), doc("pool-2", true), doc("render-1", false, true)];
    const sample = stratifiedSample(docs, 2);
    const ids = sample.map(d => d._id);
    expect(ids).toEqual(expect.arrayContaining(["pool-1", "pool-2", "render-1"]));
    expect(sample.length).toBeLessThan(docs.length);
    expect(stratifiedSample(docs, 2).map(d => d._id)).toEqual(ids);
  });

  it("reads the claims off a stored document", () => {
    expect(claimsOf(doc("a", true, true))).toMatchObject({ pool: true, balconyTerrace: false, render: true, watermark: false, furniture: false });
  });
});
