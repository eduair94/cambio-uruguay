import { describe, expect, it } from "vitest";
import { runPhotoFacts, type ModelAnswer, type RunDeps } from "../../classes/photofacts/run";
import type { PhotoSubject } from "../../classes/photofacts/subjects";
import type { PreparedPhoto } from "../../classes/vision/photos";

const subject = (id: string): PhotoSubject => ({
  id, vertical: "alquiler", listingId: id, propertyKey: id, source: "infocasas", advertiser: "a", department: "Montevideo",
  freshAt: "2026-11-23", propertyType: "apartamento", photos: ["u0", "u1", "u2"], galleryHash: "h",
});

const prepared = (n: number): PreparedPhoto[] =>
  Array.from({ length: n }, (_, index) => ({
    url: `u${index}`, index, data: Buffer.from([index]), mimeType: "image/jpeg", width: 1024, height: 768,
    sha1: `s${index}`, dhash: "0000000000000000", resized: index % 2 === 0,
  }));

const answer = (cost = 0.001): ModelAnswer => ({
  raw: {
    photos: [{ i: 0, kind: "living", render: false, watermark: false, collage: false }, { i: 1, kind: "dormitorio", render: false, watermark: false, collage: false }],
    furniture: "si", furniturePhoto: 0, balconyTerrace: null, patioGarden: null, barbecue: null, pool: null, acUnit: null, integratedKitchen: null,
    cover: 0, note: "Living y dormitorio.",
  },
  model: "claude-haiku-5-5",
  costUsd: cost,
  usage: { input: 5000, output: 200, cacheRead: 2000, cacheWrite: 0 },
});

function deps(overrides: Partial<RunDeps> = {}) {
  const saved: string[] = [];
  const failed: Array<[string, string, number]> = [];
  const asked: string[] = [];
  const base: RunDeps = {
    subjects: ["a", "b", "c", "d"].map(subject),
    prepare: async () => ({ photos: prepared(3), skipped: { small: 1, duplicate: 0, unreadable: 0, failed: 0 } }),
    ask: async s => {
      asked.push(s.id);
      return answer();
    },
    save: async row => {
      saved.push(row.subject.id);
    },
    fail: async (s, reason, cost) => {
      failed.push([s.id, reason, cost]);
    },
    max: 10,
    deadline: Number.POSITIVE_INFINITY,
    monthlyUsd: 100,
    spentUsd: 0,
    ...overrides,
  };
  return { base, saved, failed, asked };
}

describe("runPhotoFacts", () => {
  it("reads every subject, adds up cost, photos and cache hits", async () => {
    const { base, saved } = deps();
    const out = await runPhotoFacts(base);
    expect(saved).toEqual(["a", "b", "c", "d"]);
    expect(out).toMatchObject({ read: 4, failed: 0, noPhotos: 0, photosSent: 12, resized: 8, cacheReadTokens: 8000, stop: "done" });
    expect(out.costUsd).toBeCloseTo(0.004, 9);
    expect(out.skipped.small).toBe(4);
  });

  it("stops at max", async () => {
    const { base, saved } = deps({ max: 2 });
    const out = await runPhotoFacts(base);
    expect(saved).toEqual(["a", "b"]);
    expect(out.stop).toBe("max");
  });

  it("stops at the deadline", async () => {
    let clock = 0;
    const { base, saved } = deps({ deadline: 2, now: () => clock++ });
    const out = await runPhotoFacts(base);
    expect(saved).toEqual(["a", "b"]);
    expect(out.stop).toBe("time");
  });

  it("stops once the month's budget is spent, counting what this run spent", async () => {
    const { base, asked } = deps({ spentUsd: 0.0985, monthlyUsd: 0.1, ask: async s => { asked.push(s.id); return answer(0.001); } });
    const out = await runPhotoFacts(base);
    expect(asked).toEqual(["a", "b"]);
    expect(out.stop).toBe("budget");
  });

  it("does not pay for an advert without two usable photos", async () => {
    const { base, asked, failed } = deps({
      prepare: async s => ({ photos: prepared(s.id === "b" ? 1 : 3), skipped: { small: 0, duplicate: 0, unreadable: 0, failed: 2 } }),
    });
    const out = await runPhotoFacts(base);
    expect(asked).toEqual(["a", "c", "d"]);
    expect(failed).toEqual([["b", "no_photos", 0]]);
    expect(out.noPhotos).toBe(1);
  });

  it("saves a failure when the model does not answer or answers something unreadable", async () => {
    const { base, failed, saved } = deps({
      ask: async s => (s.id === "a" ? null : s.id === "b" ? { ...answer(0.002), raw: "no es un objeto" } : answer()),
    });
    const out = await runPhotoFacts(base);
    expect(failed).toEqual([["a", "no_answer", 0], ["b", "unreadable_answer", 0.002]]);
    expect(saved).toEqual(["c", "d"]);
    expect(out).toMatchObject({ read: 2, failed: 2 });
    expect(out.costUsd).toBeCloseTo(0.004, 9);
  });

  it("downloads the next advert while the model answers the current one", async () => {
    const events: string[] = [];
    let release!: () => void;
    const { base } = deps({
      subjects: ["a", "b"].map(subject),
      prepare: async s => {
        events.push(`prepare ${s.id}`);
        return { photos: prepared(2), skipped: { small: 0, duplicate: 0, unreadable: 0, failed: 0 } };
      },
      ask: async s => {
        events.push(`ask ${s.id}`);
        if (s.id === "a") await new Promise<void>(resolve => { release = resolve; setTimeout(resolve, 5); });
        return answer();
      },
    });
    await runPhotoFacts(base);
    expect(events.indexOf("prepare b")).toBeLessThan(events.indexOf("ask b"));
    expect(events.indexOf("prepare b")).toBeLessThan(events.indexOf("ask a") + 2);
    void release;
  });
});
