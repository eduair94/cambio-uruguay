import { describe, expect, it } from "vitest";
import { emptyAduanaDoc, mergeAduanaDoc } from "../../classes/aduana/store";
import type { AduanaDoc, AduanaFact } from "../../classes/aduana/types";

// The bug this whole suite guards against: `loadAduanaDoc` used to do a top-level
// `{ ...emptyAduanaDoc(), ...(stored ?? {}) }` spread. `facts`, `problems` and `sources` are
// arrays, so the stored Mongo doc replaced them WHOLESALE the moment any sync had ever run — a
// human correcting classes/aduana/baseline.ts stopped reaching production, and a pendingReview
// flag raised against a value the baseline no longer publishes could never be discharged.

const factOf = (overrides: Partial<AduanaFact>): AduanaFact => ({
  id: "franquicia.tope_anual_usd",
  label: "Tope anual de la franquicia",
  value: 800,
  unit: "USD",
  sourceId: "decreto-50-026",
  article: "art. 3 y art. 4 lit. c",
  verifiedAt: "2026-07-11",
  origin: "baseline",
  ...overrides,
});

/** A minimal, self-contained AduanaDoc — never the real BASELINE — so these tests exercise
 * "the baseline file changed" without touching classes/aduana/baseline.ts. */
function docWith(facts: AduanaFact[], extra: Partial<AduanaDoc> = {}): AduanaDoc {
  return {
    facts,
    problems: [],
    quotes: {},
    counts: {},
    sources: [],
    pendingReview: [],
    updatedAt: null,
    ...extra,
  };
}

describe("mergeAduanaDoc", () => {
  it("returns the baseline untouched when Mongo has nothing stored yet", () => {
    const base = docWith([factOf({})]);
    expect(mergeAduanaDoc(undefined, base)).toBe(base);
  });

  it("never lets a stored fact's value override the baseline's — value is read-only from Mongo's side", () => {
    const base = docWith([factOf({ value: 900 })]); // the human already corrected the baseline
    const stored = docWith([factOf({ value: 800 })]); // Mongo still has last week's synced value
    const out = mergeAduanaDoc(stored, base);
    expect(out.facts[0].value).toBe(900); // the baseline wins, not the stale stored copy
  });

  it("a fact corrected in the baseline discharges its pendingReview flag", () => {
    // Scenario: the AI proposed 900, we published 800, so the id was flagged for a human. Mongo's
    // last-synced doc reflects that: it still stores the OLD (800) value plus the flag.
    const stored = docWith([factOf({ value: 800 })], {
      pendingReview: ["franquicia.tope_anual_usd"],
    });

    // The human read the decree, agreed the tope really is 900, and edited baseline.ts.
    const correctedBase = docWith([factOf({ value: 900 })]);
    const out = mergeAduanaDoc(stored, correctedBase);

    expect(out.facts[0].value).toBe(900);
    expect(out.pendingReview).toEqual([]); // discharged — editing the file IS the human's review
  });

  it("keeps a fact flagged in pendingReview when the baseline has not been touched", () => {
    const stored = docWith([factOf({ value: 800 })], {
      pendingReview: ["franquicia.tope_anual_usd"],
    });
    const untouchedBase = docWith([factOf({ value: 800 })]); // no human edit happened
    const out = mergeAduanaDoc(stored, untouchedBase);

    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
  });

  it("drops a pendingReview id whose fact no longer exists in the baseline at all", () => {
    const stored = docWith([factOf({})], { pendingReview: ["some.deleted.fact"] });
    const base = docWith([factOf({})]);
    const out = mergeAduanaDoc(stored, base);
    expect(out.pendingReview).toEqual([]);
  });

  it("a stored aiCheckedAt survives only while the value it was stamped against is still published", () => {
    const stored = docWith([factOf({ value: 800, aiCheckedAt: "2026-07-05" })]);
    const untouchedBase = docWith([factOf({ value: 800 })]); // baseline unchanged since the stamp
    const out = mergeAduanaDoc(stored, untouchedBase);
    expect(out.facts[0].aiCheckedAt).toBe("2026-07-05");
  });

  it("a stored aiCheckedAt does NOT survive once the baseline value it checked has been superseded", () => {
    const stored = docWith([factOf({ value: 800, aiCheckedAt: "2026-07-05" })]);
    const correctedBase = docWith([factOf({ value: 900 })]); // human corrected it after the AI's check
    const out = mergeAduanaDoc(stored, correctedBase);
    expect(out.facts[0].aiCheckedAt).toBeUndefined(); // the stamp was against a value we no longer publish
  });

  it("always serves problems and sources from the baseline file, never from Mongo", () => {
    const base = docWith([factOf({})], {
      problems: [{ id: "retenido" } as AduanaDoc["problems"][number]],
      sources: [{ id: "decreto-50-026", title: "x", norm: "x", url: "https://impo.com.uy/x", checkedAt: "2026-07-12", kind: "norma" }],
    });
    const stored = docWith([factOf({})], {
      problems: [{ id: "roto-o-incompleto" } as AduanaDoc["problems"][number]],
      sources: [{ id: "other", title: "y", norm: "y", url: "https://impo.com.uy/y", checkedAt: "2026-07-01", kind: "norma" }],
    });
    const out = mergeAduanaDoc(stored, base);
    expect(out.problems).toEqual(base.problems);
    expect(out.sources).toEqual(base.sources);
  });

  it("takes quotes, counts and updatedAt from Mongo — the baseline has none of those", () => {
    const base = docWith([factOf({})]);
    const stored = docWith([factOf({})], {
      quotes: { retenido: [{ text: "x".repeat(70), author: "a", date: "2026-07-01", score: 3, permalink: "https://reddit.com/x" }] },
      counts: { retenido: 4 },
      updatedAt: "2026-07-12T00:00:00.000Z",
    });
    const out = mergeAduanaDoc(stored, base);
    expect(out.counts.retenido).toBe(4);
    expect(out.quotes.retenido).toHaveLength(1);
    expect(out.updatedAt).toBe("2026-07-12T00:00:00.000Z");
  });
});

describe("mergeAduanaDoc — auto-published overrides", () => {
  const dateId = "franquicia.registro_vendedor_desde";

  it("serves an AI override over the baseline value while the baseline is unchanged", () => {
    const base = emptyAduanaDoc();
    const f = base.facts.find((x) => x.id === dateId)!;
    const merged = mergeAduanaDoc(
      {
        overrides: [
          { id: dateId, value: "2027-01-01", publishedAt: "2026-09-30", basedOnValue: String(f.value), sources: ["a", "b"], prevValue: f.value },
        ],
      },
      base
    );
    const got = merged.facts.find((x) => x.id === dateId)!;
    expect(got.value).toBe("2027-01-01");
    expect(got.origin).toBe("ai");
    expect(merged.overrides).toHaveLength(1);
  });

  it("discharges the override once a human edits baseline.ts (basedOnValue diverges)", () => {
    const base = emptyAduanaDoc();
    const f = base.facts.find((x) => x.id === dateId)!;
    f.value = "2027-01-01"; // the human promoted it in the file…
    f.verifiedAt = "2026-10-05";
    const merged = mergeAduanaDoc(
      {
        overrides: [
          { id: dateId, value: "2027-01-01", publishedAt: "2026-09-30", basedOnValue: "2026-10-01", sources: ["a", "b"], prevValue: "2026-10-01" },
        ],
      },
      base
    );
    const got = merged.facts.find((x) => x.id === dateId)!;
    expect(got.value).toBe("2027-01-01");
    expect(got.origin).toBe("baseline"); // human-verified, NOT the discharged AI override
    expect(merged.overrides).toEqual([]); // discharged
  });

  it("does not apply an override whose fact was rolled back in the baseline", () => {
    const base = emptyAduanaDoc();
    const f = base.facts.find((x) => x.id === dateId)!; // baseline still 2026-10-01
    const merged = mergeAduanaDoc(
      {
        overrides: [
          { id: dateId, value: "2027-06-01", publishedAt: "2026-09-30", basedOnValue: "2027-01-01", sources: ["a", "b"], prevValue: "2027-01-01" },
        ],
      },
      base
    );
    expect(merged.facts.find((x) => x.id === dateId)!.value).toBe(f.value); // baseline wins
    expect(merged.overrides).toEqual([]);
  });
});

describe("emptyAduanaDoc", () => {
  it("is a deep, independent copy of BASELINE each call", () => {
    const a = emptyAduanaDoc();
    const b = emptyAduanaDoc();
    a.facts[0].value = "mutated";
    expect(b.facts[0].value).not.toBe("mutated");
  });
});
