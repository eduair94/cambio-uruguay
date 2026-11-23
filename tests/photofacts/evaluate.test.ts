import { describe, expect, it } from "vitest";
import { claimsOf, consensusLabels, evaluateLabels, stratifiedSample, wilsonLower, type Label } from "../../classes/photofacts/evaluate";

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

describe("consensusLabels", () => {
  const seen = (over: Record<string, number | null> = {}) => ({
    balconyTerrace: null, patioGarden: null, barbecue: null, pool: null, acUnit: null, integratedKitchen: null, ...over,
  });
  const doc = (id: string, over: Record<string, unknown> = {}) => ({
    _id: id,
    facts: { furniture: "si", seen: seen({ balconyTerrace: 2 }) },
    photos: [{ render: false, watermark: true }, { render: false, watermark: false }, { render: false, watermark: false }],
    ...over,
  });
  const answer = (over: Record<string, unknown> = {}) => ({
    facts: { furniture: "si", seen: seen({ balconyTerrace: 2 }) },
    photos: [{ render: false, watermark: true }, { render: false, watermark: false }, { render: false, watermark: false }],
    ...over,
  });

  it("judges the model only where both blind labelers agree", () => {
    const out = consensusLabels(
      [doc("a")],
      new Map([["a", answer()]]),
      new Map([["a", answer({ facts: { furniture: "no", seen: seen({ balconyTerrace: 1 }) } })]]),
    );
    expect(out.compared).toBe(1);
    expect(out.disagreements).toEqual({ furniture: 1 });
    const byAttribute = Object.fromEntries(out.labels.map(label => [label.attribute, label]));
    expect(byAttribute.furniture).toBeUndefined();
    expect(byAttribute.balconyTerrace).toMatchObject({ positive: true, verdict: "correcto" });
    expect(byAttribute.pool).toMatchObject({ positive: false, verdict: "correcto" });
    expect(byAttribute.watermark).toMatchObject({ positive: true, verdict: "correcto" });
    expect(byAttribute.render).toMatchObject({ positive: false, verdict: "correcto" });
    expect(out.evidence.balconyTerrace).toEqual({ confirmed: 1, samePhoto: 1 });
  });

  it("counts a false claim and a miss", () => {
    const labelers = answer({ facts: { furniture: "no", seen: seen({ acUnit: 0 }) } });
    const out = consensusLabels([doc("a")], new Map([["a", labelers]]), new Map([["a", labelers]]));
    const byAttribute = Object.fromEntries(out.labels.map(label => [label.attribute, label]));
    expect(byAttribute.balconyTerrace).toMatchObject({ positive: true, verdict: "incorrecto" });
    expect(byAttribute.furniture).toMatchObject({ positive: true, verdict: "incorrecto" });
    expect(byAttribute.acUnit).toMatchObject({ positive: false, verdict: "incorrecto" });
  });

  it("treats an abstention on furniture as a miss, and skips it when both labelers abstain", () => {
    const unsure = doc("a", { facts: { furniture: "no_se", seen: seen() } });
    const empty = answer({ facts: { furniture: "no", seen: seen() } });
    const out = consensusLabels([unsure], new Map([["a", empty]]), new Map([["a", empty]]));
    expect(out.labels.find(label => label.attribute === "furniture")).toMatchObject({ positive: false, verdict: "incorrecto" });
    const both = answer({ facts: { furniture: "no_se", seen: seen() } });
    const none = consensusLabels([unsure], new Map([["a", both]]), new Map([["a", both]]));
    expect(none.labels.find(label => label.attribute === "furniture")).toBeUndefined();
  });

  it("skips adverts a labeler did not answer", () => {
    const out = consensusLabels([doc("a"), doc("b")], new Map([["a", answer()]]), new Map([["b", answer()]]));
    expect(out.compared).toBe(0);
    expect(out.labels).toEqual([]);
  });
});
