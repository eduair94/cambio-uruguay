// Task 6: one profile per store, carrying the last good value of each signal across runs. All pure —
// no network, no Mongo. The `undefined`/`null` convention is the one every signal module in
// classes/stores/signals/ already follows: `undefined` = could not query (keep what we had), `null` =
// queried and there is nothing (clear it).
import { describe, expect, it } from "vitest";
import {
  STORE_SIGNAL_MAX_AGE_DAYS,
  buildProfile,
  carriedReddit,
  countFreshSignals,
  formatStoreLogLine,
  mergeSignal,
  shouldStopEarly,
  storeSignalApplies,
  type StoreProfileDoc,
} from "../../classes/stores/profile";
import type { StoreEntry } from "../../classes/stores/types";
import type { SiteSignal } from "../../classes/stores/signals/site";
import type { AgeSignal } from "../../classes/stores/signals/age";
import type { TrustpilotSignal } from "../../classes/stores/signals/trustpilot";
import type { GoogleSignal } from "../../classes/stores/signals/google";
import {
  redditTermsKey,
  type RedditCursor,
  type RedditMention,
  type RedditSignal,
  type StoredRedditMention,
} from "../../classes/stores/signals/reddit";
import type { CatalogSignal } from "../../classes/stores/signals/catalog";
import type { MentionTone } from "../../classes/stores/signals/tone";

const NOW = new Date("2026-09-16T12:00:00.000Z");
const DAY = 86_400_000;
const daysAgo = (days: number): string => new Date(NOW.getTime() - days * DAY).toISOString();

function site(overrides: Partial<SiteSignal> = {}): SiteSignal {
  return {
    status: "ok",
    finalHost: "www.tienda.com.uy",
    https: true,
    platform: "fenicio",
    phone: true,
    whatsapp: false,
    email: true,
    rut: null,
    address: null,
    policies: { returns: null, terms: null, privacy: null },
    payments: ["mercadopago"],
    checkedAt: daysAgo(1),
    ...overrides,
  };
}

const age = (overrides: Partial<AgeSignal> = {}): AgeSignal => ({
  since: "2014-03-02",
  source: "crt.sh",
  checkedAt: daysAgo(1),
  ...overrides,
});

const trustpilot = (overrides: Partial<TrustpilotSignal> = {}): TrustpilotSignal => ({
  score: 1.4,
  reviews: 104,
  reviewsLast12m: 12,
  claimed: false,
  alerts: 0,
  url: "https://www.trustpilot.com/review/tienda.com.uy",
  checkedAt: daysAgo(1),
  ...overrides,
});

const google = (overrides: Partial<GoogleSignal> = {}): GoogleSignal => ({
  rating: 4.3,
  reviews: 812,
  address: "Av. 18 de Julio 1234, Montevideo",
  url: "https://maps.google.com/?cid=1",
  checkedAt: daysAgo(1),
  ...overrides,
});

const reddit = (overrides: Partial<RedditSignal> = {}): RedditSignal => ({
  mentions: 7,
  byYear: { "2025": 4, "2026": 3 },
  threads: [],
  tone: null,
  capped: false,
  checkedAt: daysAgo(1),
  ...overrides,
});

const catalog = (overrides: Partial<CatalogSignal> = {}): CatalogSignal => ({
  offers: 5,
  verticals: [{ key: "sillas", label: "Sillas de escritorio", url: "/sillas-escritorio-uruguay", offers: 5 }],
  checkedAt: daysAgo(1),
  ...overrides,
});

const EMPTY_SIGNALS = { site: null, age: null, trustpilot: null, google: null, reddit: null, catalog: null };

function entry(overrides: Partial<StoreEntry> = {}): StoreEntry {
  return {
    key: "tienda",
    name: "Tienda",
    domain: "tienda.com.uy",
    kind: "tienda-uy",
    rubros: ["hogar"],
    aliases: ["Tienda"],
    redditTerms: ["tienda uy"],
    ...overrides,
  };
}

function previousDoc(overrides: Partial<StoreProfileDoc> = {}): StoreProfileDoc {
  return {
    key: "tienda",
    name: "Tienda",
    domain: "tienda.com.uy",
    kind: "tienda-uy",
    rubros: ["hogar"],
    aliases: ["Tienda"],
    ...EMPTY_SIGNALS,
    redditMentions: [],
    redditCursor: null,
    redditTermsKey: redditTermsKey(entry()),
    toneCache: {},
    signals: 0,
    indexable: false,
    firstSeen: "2026-01-04",
    lastSeen: "2026-09-09",
    ...overrides,
  };
}

describe("mergeSignal", () => {
  it("keeps the previous value when the source could not be queried (undefined)", () => {
    const prev = trustpilot({ checkedAt: daysAgo(7) });
    expect(mergeSignal(prev, undefined)).toBe(prev);
  });

  it("clears the previous value when the source answered that there is nothing (null)", () => {
    expect(mergeSignal(trustpilot(), null)).toBeNull();
  });

  it("takes the fresh value when there was nothing before", () => {
    const fresh = trustpilot();
    expect(mergeSignal(null, fresh)).toBe(fresh);
    expect(mergeSignal(undefined, fresh)).toBe(fresh);
  });

  it("replaces an old value with a fresh one", () => {
    const fresh = trustpilot({ score: 2.1 });
    expect(mergeSignal(trustpilot({ checkedAt: daysAgo(7) }), fresh)).toBe(fresh);
  });

  it("never returns undefined: nothing before and nothing fetched is null", () => {
    expect(mergeSignal(undefined, undefined)).toBeNull();
    expect(mergeSignal(null, undefined)).toBeNull();
  });
});

describe("countFreshSignals", () => {
  it("is 60 days", () => {
    expect(STORE_SIGNAL_MAX_AGE_DAYS).toBe(60);
  });

  it("counts every present, qualifying, recent signal", () => {
    const doc = { site: site(), age: age(), trustpilot: trustpilot(), google: google(), reddit: reddit(), catalog: catalog() };
    expect(countFreshSignals(doc, NOW)).toBe(6);
  });

  it("counts nothing when every signal is null", () => {
    expect(countFreshSignals(EMPTY_SIGNALS, NOW)).toBe(0);
  });

  it("counts the site only when it could actually be read (status ok, not blocked)", () => {
    expect(countFreshSignals({ ...EMPTY_SIGNALS, site: site({ status: "ok" }) }, NOW)).toBe(1);
    expect(countFreshSignals({ ...EMPTY_SIGNALS, site: site({ status: "blocked" }) }, NOW)).toBe(0);
  });

  it("counts Reddit only with at least one mention", () => {
    expect(countFreshSignals({ ...EMPTY_SIGNALS, reddit: reddit({ mentions: 1 }) }, NOW)).toBe(1);
    expect(countFreshSignals({ ...EMPTY_SIGNALS, reddit: reddit({ mentions: 0, byYear: {} }) }, NOW)).toBe(0);
  });

  it("counts the catalogue only with at least one offer", () => {
    expect(countFreshSignals({ ...EMPTY_SIGNALS, catalog: catalog({ offers: 3 }) }, NOW)).toBe(1);
    expect(countFreshSignals({ ...EMPTY_SIGNALS, catalog: catalog({ offers: 0, verticals: [] }) }, NOW)).toBe(0);
  });

  it("drops any signal checked more than 60 days ago", () => {
    const stale = daysAgo(61);
    const doc = {
      site: site({ checkedAt: stale }),
      age: age({ checkedAt: stale }),
      trustpilot: trustpilot({ checkedAt: stale }),
      google: google({ checkedAt: stale }),
      reddit: reddit({ checkedAt: stale }),
      catalog: catalog({ checkedAt: stale }),
    };
    expect(countFreshSignals(doc, NOW)).toBe(0);
  });

  it("still counts a signal checked 59 days ago, and one checked exactly 60 days ago", () => {
    expect(countFreshSignals({ ...EMPTY_SIGNALS, age: age({ checkedAt: daysAgo(59) }) }, NOW)).toBe(1);
    expect(countFreshSignals({ ...EMPTY_SIGNALS, age: age({ checkedAt: daysAgo(60) }) }, NOW)).toBe(1);
  });

  it("does not count a signal whose checkedAt is not a date", () => {
    expect(countFreshSignals({ ...EMPTY_SIGNALS, google: google({ checkedAt: "ayer" }) }, NOW)).toBe(0);
  });
});

describe("storeSignalApplies", () => {
  it("queries everything for a Uruguayan store with a domain and Reddit terms", () => {
    const store = entry();
    for (const name of ["site", "age", "trustpilot", "google", "reddit", "catalog"] as const) {
      expect(storeSignalApplies(store, name), name).toBe(true);
    }
  });

  it("never asks domain age or Google Maps about a marketplace or a foreign-purchase platform", () => {
    for (const kind of ["marketplace", "compra-exterior"] as const) {
      const store = entry({ kind });
      expect(storeSignalApplies(store, "age")).toBe(false);
      expect(storeSignalApplies(store, "google")).toBe(false);
      expect(storeSignalApplies(store, "site")).toBe(true);
      expect(storeSignalApplies(store, "trustpilot")).toBe(true);
    }
  });

  it("skips Trustpilot when the registry says trustpilotDomain: null", () => {
    expect(storeSignalApplies(entry({ trustpilotDomain: null }), "trustpilot")).toBe(false);
    expect(storeSignalApplies(entry({ trustpilotDomain: "otro.com.uy" }), "trustpilot")).toBe(true);
  });

  it("skips Reddit when the name is too ambiguous to query (redditTerms: [])", () => {
    expect(storeSignalApplies(entry({ redditTerms: [] }), "reddit")).toBe(false);
  });

  it("skips every domain-based signal when the store has no domain", () => {
    const store = entry({ domain: null });
    for (const name of ["site", "age", "trustpilot", "google"] as const) {
      expect(storeSignalApplies(store, name), name).toBe(false);
    }
    expect(storeSignalApplies(store, "reddit")).toBe(true);
    expect(storeSignalApplies(store, "catalog")).toBe(true);
  });
});

describe("buildProfile", () => {
  it("copies the store's identity from the registry", () => {
    const store = entry({ key: "magic-center", name: "Magic Center", domain: "magiccenter.com.uy", rubros: ["tecnologia"], aliases: ["Magic Center"] });
    const doc = buildProfile(store, {}, null, NOW);
    expect(doc).toMatchObject({
      key: "magic-center",
      name: "Magic Center",
      domain: "magiccenter.com.uy",
      kind: "tienda-uy",
      rubros: ["tecnologia"],
      aliases: ["Magic Center"],
    });
  });

  it("is indexable with 3 fresh signals and not with 2", () => {
    const three = buildProfile(entry(), { site: site(), age: age(), trustpilot: trustpilot() }, null, NOW);
    expect(three.signals).toBe(3);
    expect(three.indexable).toBe(true);

    const two = buildProfile(entry(), { site: site(), age: age(), trustpilot: null }, null, NOW);
    expect(two.signals).toBe(2);
    expect(two.indexable).toBe(false);
  });

  it("inherits firstSeen and sets lastSeen to today", () => {
    const doc = buildProfile(entry(), {}, previousDoc({ firstSeen: "2026-01-04", lastSeen: "2026-09-09" }), NOW);
    expect(doc.firstSeen).toBe("2026-01-04");
    expect(doc.lastSeen).toBe("2026-09-16");
  });

  it("starts firstSeen today for a store seen for the first time", () => {
    const doc = buildProfile(entry(), {}, null, NOW);
    expect(doc.firstSeen).toBe("2026-09-16");
    expect(doc.lastSeen).toBe("2026-09-16");
  });

  it("keeps the last good value of a signal whose source failed, and clears one that answered nothing", () => {
    const prevTp = trustpilot({ checkedAt: daysAgo(7) });
    const prevGoogle = google({ checkedAt: daysAgo(7) });
    const prevAge = age({ checkedAt: daysAgo(7) });
    const previous = previousDoc({ trustpilot: prevTp, google: prevGoogle, age: prevAge });

    // trustpilot: undefined (service down) → kept; google: null (queried, nothing) → cleared;
    // age: key absent → same as undefined → kept.
    const doc = buildProfile(entry(), { trustpilot: undefined, google: null }, previous, NOW);
    expect(doc.trustpilot).toEqual(prevTp);
    expect(doc.google).toBeNull();
    expect(doc.age).toEqual(prevAge);
  });

  it("recounts carried-over signals against today: a kept value older than 60 days stops counting", () => {
    const previous = previousDoc({
      site: site({ checkedAt: daysAgo(70) }),
      age: age({ checkedAt: daysAgo(70) }),
      trustpilot: trustpilot({ checkedAt: daysAgo(70) }),
      signals: 3,
      indexable: true,
    });
    const doc = buildProfile(entry(), {}, previous, NOW);
    expect(doc.site).not.toBeNull();
    expect(doc.signals).toBe(0);
    expect(doc.indexable).toBe(false);
  });

  it("clears a signal that no longer applies to the store, even if an old value was stored", () => {
    // The registry moved this store to `compra-exterior`, dropped its Reddit terms and opted it out
    // of Trustpilot: none of those old values describe what the registry now says about it.
    const store = entry({ kind: "compra-exterior", redditTerms: [], trustpilotDomain: null });
    const previous = previousDoc({ age: age(), google: google(), reddit: reddit(), trustpilot: trustpilot() });
    const doc = buildProfile(store, { age: age(), google: google(), reddit: reddit(), trustpilot: trustpilot() }, previous, NOW);
    expect(doc.age).toBeNull();
    expect(doc.google).toBeNull();
    expect(doc.reddit).toBeNull();
    expect(doc.trustpilot).toBeNull();
  });

  it("drops facts about the OLD domain when the registry changed it and the sources did not answer", () => {
    // Registry moved the store from vieja.com.uy to nueva.com.uy; this week crt.sh, Trustpilot and
    // Maps were down. What we had describes a different site and must not be published as this one.
    const store = entry({ domain: "nueva.com.uy" });
    const previous = previousDoc({
      domain: "vieja.com.uy",
      site: site({ finalHost: "www.vieja.com.uy" }),
      age: age(),
      trustpilot: trustpilot({ url: "https://www.trustpilot.com/review/vieja.com.uy" }),
      google: google(),
      reddit: reddit(),
      catalog: catalog(),
      signals: 6,
      indexable: true,
    });
    const doc = buildProfile(
      store,
      { site: undefined, age: undefined, trustpilot: undefined, google: undefined, reddit: undefined, catalog: undefined },
      previous,
      NOW
    );
    expect(doc.domain).toBe("nueva.com.uy");
    expect(doc.site).toBeNull();
    expect(doc.age).toBeNull();
    expect(doc.trustpilot).toBeNull();
    expect(doc.google).toBeNull();
    // Reddit terms and our own catalogue are keyed by the store, not by its domain: they carry over.
    expect(doc.reddit).toEqual(previous.reddit);
    expect(doc.catalog).toEqual(previous.catalog);
    expect(doc.signals).toBe(2);
    expect(doc.indexable).toBe(false);
  });

  it("still takes a fresh value for the new domain after a domain change", () => {
    const store = entry({ domain: "nueva.com.uy" });
    const fresh = site({ finalHost: "nueva.com.uy" });
    const doc = buildProfile(store, { site: fresh }, previousDoc({ domain: "vieja.com.uy", site: site() }), NOW);
    expect(doc.site).toEqual(fresh);
  });

  it("drops a kept Trustpilot value whose page reviews a different domain than the one now targeted", () => {
    // Same store domain, but the registry now points Trustpilot at another domain.
    const store = entry({ domain: "tienda.com.uy", trustpilotDomain: "otra.com" });
    const previous = previousDoc({ trustpilot: trustpilot({ url: "https://www.trustpilot.com/review/tienda.com.uy" }) });
    const doc = buildProfile(store, { trustpilot: undefined }, previous, NOW);
    expect(doc.trustpilot).toBeNull();
  });

  it("keeps a Trustpilot value whose page reviews the targeted domain, ignoring www.", () => {
    const store = entry({ domain: "tiendamia.com" });
    const prevTp = trustpilot({ url: "https://www.trustpilot.com/review/www.tiendamia.com" });
    const previous = previousDoc({ domain: "tiendamia.com", trustpilot: prevTp });
    const doc = buildProfile(store, { trustpilot: undefined }, previous, NOW);
    expect(doc.trustpilot).toEqual(prevTp);

    const viaOverride = buildProfile(
      entry({ domain: "tienda.com.uy", trustpilotDomain: "www.otra.com" }),
      { trustpilot: undefined },
      previousDoc({ trustpilot: trustpilot({ url: "https://www.trustpilot.com/review/otra.com" }) }),
      NOW
    );
    expect(viaOverride.trustpilot).not.toBeNull();
  });

  it("treats a fetched value that is not a signal (no checkedAt) as a failed query", () => {
    const prevSite = site({ checkedAt: daysAgo(7) });
    const doc = buildProfile(entry(), { site: { status: "ok" } }, previousDoc({ site: prevSite }), NOW);
    expect(doc.site).toEqual(prevSite);
  });
});

describe("shouldStopEarly", () => {
  it("stops when the first 10 stores processed all got no fresh outside signal (sources down)", () => {
    expect(shouldStopEarly({ processed: 10, withFreshSignal: 0 })).toBe(true);
  });

  it("keeps going before 10 stores, or once any store got a fresh signal", () => {
    expect(shouldStopEarly({ processed: 9, withFreshSignal: 0 })).toBe(false);
    expect(shouldStopEarly({ processed: 10, withFreshSignal: 1 })).toBe(false);
    expect(shouldStopEarly({ processed: 40, withFreshSignal: 1 })).toBe(false);
  });
});

// Task 12: Reddit is fetched incrementally, so the profile stores what was read (metadata only) and a
// cursor, and the signal is summarized over everything stored — not just this week's increment.
const NOW_UTC = Math.floor(NOW.getTime() / 1000);
const START_UTC = Math.floor(Date.parse("2024-09-16T12:00:00.000Z") / 1000);

function storedMention(id: string, createdUtc: number, overrides: Partial<StoredRedditMention> = {}): StoredRedditMention {
  return {
    id,
    kind: "post",
    sub: "uruguay",
    createdUtc,
    threadId: id,
    title: `Hilo ${id}`,
    permalink: `/r/uruguay/comments/${id}/`,
    score: 1,
    ...overrides,
  };
}

function freshMention(id: string, createdUtc: number): RedditMention {
  return { ...storedMention(id, createdUtc), text: `texto crudo de ${id}` };
}

const cursorDone = (checkedUntilUtc: number): RedditCursor => ({
  backfillStartUtc: START_UTC,
  backfillNextUtc: checkedUntilUtc,
  backfillDone: true,
  checkedUntilUtc,
});

describe("buildProfile: Reddit", () => {
  const storedThree = [
    storedMention("a", NOW_UTC - 30 * 86_400),
    storedMention("b", NOW_UTC - 20 * 86_400),
    storedMention("c", NOW_UTC - 10 * 86_400),
  ];

  it("summarizes over the stored mentions plus the new ones, not only the new ones", () => {
    const previous = previousDoc({ reddit: reddit({ mentions: 3 }), redditMentions: storedThree, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    const increment = {
      mentions: [freshMention("c", NOW_UTC - 10 * 86_400), freshMention("d", NOW_UTC - 86_400)],
      cursor: cursorDone(NOW_UTC),
      complete: true,
    };

    const doc = buildProfile(entry(), { reddit: increment }, previous, NOW);

    expect(doc.reddit!.mentions).toBe(4);
    expect(doc.reddit!.checkedAt).toBe(NOW.toISOString());
    expect(doc.reddit!.capped).toBe(false);
    expect(doc.redditMentions.map((m) => m.id)).toEqual(["d", "c", "b", "a"]);
    expect(doc.redditCursor).toEqual(cursorDone(NOW_UTC));
    expect(doc.redditTermsKey).toBe(redditTermsKey(entry()));
  });

  it("keeps the signal, the stored mentions and the cursor untouched when Reddit could not be read (undefined)", () => {
    const prevSignal = reddit({ mentions: 3, checkedAt: daysAgo(7) });
    const prevCursor = cursorDone(NOW_UTC - 7 * 86_400);
    const previous = previousDoc({ reddit: prevSignal, redditMentions: storedThree, redditCursor: prevCursor });

    const doc = buildProfile(entry(), { reddit: undefined }, previous, NOW);

    expect(doc.reddit).toEqual(prevSignal);
    expect(doc.redditMentions).toEqual(storedThree);
    expect(doc.redditCursor).toEqual(prevCursor);
  });

  it("dates a partial incremental run by how far it got, not by today", () => {
    const threeDaysAgo = NOW_UTC - 3 * 86_400;
    const previous = previousDoc({ reddit: reddit(), redditMentions: storedThree, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    const doc = buildProfile(entry(), { reddit: { mentions: [], cursor: cursorDone(threeDaysAgo), complete: false } }, previous, NOW);
    expect(doc.reddit!.checkedAt).toBe(new Date(threeDaysAgo * 1000).toISOString());
    expect(doc.reddit!.mentions).toBe(3);
  });

  it("does not publish a count while the 24-month backfill is still running, but keeps what it read", () => {
    const halfway: RedditCursor = {
      backfillStartUtc: START_UTC,
      backfillNextUtc: NOW_UTC - 200 * 86_400,
      backfillDone: false,
      checkedUntilUtc: NOW_UTC - 200 * 86_400,
    };
    const doc = buildProfile(
      entry(),
      { reddit: { mentions: [freshMention("x", NOW_UTC - 300 * 86_400)], cursor: halfway, complete: false } },
      null,
      NOW
    );
    expect(doc.reddit).toBeNull();
    expect(doc.redditMentions.map((m) => m.id)).toEqual(["x"]);
    expect(doc.redditCursor).toEqual(halfway);
  });

  it("marks the signal capped when the stored mentions reach 500", () => {
    const many = Array.from({ length: 499 }, (_, i) => storedMention(`s${i}`, START_UTC + i));
    const previous = previousDoc({ redditMentions: many, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    const increment = {
      mentions: [freshMention("n1", NOW_UTC - 2 * 86_400), freshMention("n2", NOW_UTC - 86_400)],
      cursor: cursorDone(NOW_UTC),
      complete: true,
    };
    const doc = buildProfile(entry(), { reddit: increment }, previous, NOW);
    expect(doc.redditMentions).toHaveLength(500);
    expect(doc.reddit!.mentions).toBe(500);
    expect(doc.reddit!.capped).toBe(true);
  });

  it("never stores the raw text of a mention", () => {
    const doc = buildProfile(
      entry(),
      { reddit: { mentions: [freshMention("x", NOW_UTC - 86_400)], cursor: cursorDone(NOW_UTC), complete: true } },
      null,
      NOW
    );
    const json = JSON.stringify(doc);
    expect(json).not.toContain('"text"');
    expect(json).not.toContain("texto crudo");
  });

  it("discards stored mentions, cursor, signal AND the tone cache when the store's Reddit terms changed", () => {
    const previous = previousDoc({
      reddit: reddit(),
      redditMentions: storedThree,
      redditCursor: cursorDone(NOW_UTC - 7 * 86_400),
      redditTermsKey: redditTermsKey({ redditTerms: ["un termino viejo"] }),
      toneCache: { a: "queja" },
    });
    const store = entry();

    // The job asks Arctic Shift from scratch...
    expect(carriedReddit(store, previous)).toEqual({ signal: null, mentions: [], cursor: null, toneCache: {} });

    // ...and a week in which Reddit did not answer does not bring the old terms' data back.
    const doc = buildProfile(store, { reddit: undefined }, previous, NOW);
    expect(doc.reddit).toBeNull();
    expect(doc.redditMentions).toEqual([]);
    expect(doc.redditCursor).toBeNull();
    expect(doc.redditTermsKey).toBe(redditTermsKey(store));
    expect(doc.toneCache).toEqual({});
  });

  it("treats a profile stored without a terms fingerprint as other terms", () => {
    const previous = { ...previousDoc({ reddit: reddit(), redditMentions: storedThree }), redditTermsKey: undefined } as unknown as StoreProfileDoc;
    expect(carriedReddit(entry(), previous)).toEqual({ signal: null, mentions: [], cursor: null, toneCache: {} });
  });

  it("hands the job the stored cursor and tone cache when the terms are the same", () => {
    const cursor = cursorDone(NOW_UTC - 7 * 86_400);
    const prevSignal = reddit();
    const toneCache: Record<string, MentionTone> = { a: "queja", b: "recomendacion" };
    const previous = previousDoc({ reddit: prevSignal, redditMentions: storedThree, redditCursor: cursor, toneCache });
    expect(carriedReddit(entry(), previous)).toEqual({ signal: prevSignal, mentions: storedThree, cursor, toneCache });
  });

  it("clears every Reddit field, including the tone cache, when the store no longer has terms to search", () => {
    const previous = previousDoc({
      reddit: reddit(),
      redditMentions: storedThree,
      redditCursor: cursorDone(NOW_UTC),
      toneCache: { a: "queja" },
    });
    const doc = buildProfile(entry({ redditTerms: [] }), { reddit: undefined }, previous, NOW);
    expect(doc.reddit).toBeNull();
    expect(doc.redditMentions).toEqual([]);
    expect(doc.redditCursor).toBeNull();
    expect(doc.redditTermsKey).toBeNull();
    expect(doc.toneCache).toEqual({});
    expect(carriedReddit(entry({ redditTerms: [] }), previous)).toEqual({
      signal: null,
      mentions: [],
      cursor: null,
      toneCache: {},
    });
  });
});

// Task 7: an aggregated, automatic tone over the store's Reddit mentions. `classifyMentions` (network,
// classes/stores/signals/tone.ts) runs in sync_store_profiles.ts, not here — `buildProfile` only ever
// receives its RESULT as `fetched.toneCache`, merges it with what carried over, prunes it against the
// final stored mentions, and folds it into `RedditSignal.tone` via `applyTone`.
describe("buildProfile: tone (Task 7)", () => {
  const fiveClassified: Record<string, MentionTone> = {
    a: "queja",
    b: "queja",
    c: "queja",
    d: "recomendacion",
    e: "neutral",
  };
  const fiveMentions = [
    storedMention("a", NOW_UTC - 50 * 86_400),
    storedMention("b", NOW_UTC - 40 * 86_400),
    storedMention("c", NOW_UTC - 30 * 86_400),
    storedMention("d", NOW_UTC - 20 * 86_400),
    storedMention("e", NOW_UTC - 10 * 86_400),
  ];

  it("publishes RedditSignal.tone from fetched.toneCache once the cache has 5+ classified mentions", () => {
    const previous = previousDoc({ redditMentions: fiveMentions, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    const increment = { mentions: [], cursor: cursorDone(NOW_UTC), complete: true };
    const doc = buildProfile(entry(), { reddit: increment, toneCache: fiveClassified }, previous, NOW);
    expect(doc.reddit!.tone).toEqual({ complaints: 3, recommendations: 1, neutral: 1, classified: 5 });
    expect(doc.toneCache).toEqual(fiveClassified);
  });

  it("keeps tone null under 5 classified mentions", () => {
    const previous = previousDoc({ redditMentions: fiveMentions, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    const increment = { mentions: [], cursor: cursorDone(NOW_UTC), complete: true };
    const doc = buildProfile(entry(), { reddit: increment, toneCache: { a: "queja" } }, previous, NOW);
    expect(doc.reddit!.tone).toBeNull();
  });

  it("prunes a cached id that fell out of the stored mentions (the 500-cap dropped it)", () => {
    const previous = previousDoc({ redditMentions: fiveMentions, redditCursor: cursorDone(NOW_UTC - 7 * 86_400) });
    // "a" is classified but no longer among the stored mentions this run.
    const stillStored = fiveMentions.filter((m) => m.id !== "a");
    const increment = { mentions: [], cursor: cursorDone(NOW_UTC), complete: true };
    const doc = buildProfile(
      entry(),
      { reddit: { ...increment, mentions: [] }, toneCache: fiveClassified },
      { ...previous, redditMentions: stillStored },
      NOW
    );
    expect(doc.toneCache).toEqual({ b: "queja", c: "queja", d: "recomendacion", e: "neutral" });
    // Only 4 classified ids remain among the stored mentions: below the 5-mention floor.
    expect(doc.reddit!.tone).toBeNull();
  });

  it("carries the tone cache over untouched when Reddit could not be read this run", () => {
    const previous = previousDoc({
      reddit: reddit({ tone: { complaints: 3, recommendations: 1, neutral: 1, classified: 5 } }),
      redditMentions: fiveMentions,
      redditCursor: cursorDone(NOW_UTC - 7 * 86_400),
      toneCache: fiveClassified,
    });
    const doc = buildProfile(entry(), { reddit: undefined }, previous, NOW);
    expect(doc.toneCache).toEqual(fiveClassified);
    expect(doc.reddit!.tone).toEqual({ complaints: 3, recommendations: 1, neutral: 1, classified: 5 });
  });

  it("starts empty for a store seen for the first time", () => {
    const doc = buildProfile(entry(), {}, null, NOW);
    expect(doc.toneCache).toEqual({});
  });
});

describe("formatStoreLogLine", () => {
  it("prints each signal's headline value, and - for a missing one", () => {
    const mentions = Array.from({ length: 12 }, (_, i) => freshMention(`m${i}`, NOW_UTC - (i + 1) * 86_400));
    const doc = buildProfile(
      entry({ key: "tiendamia" }),
      {
        site: site(),
        trustpilot: trustpilot({ score: 4.1 }),
        google: null,
        reddit: { mentions, cursor: cursorDone(NOW_UTC), complete: true },
        catalog: null,
      },
      null,
      NOW
    );
    expect(formatStoreLogLine(doc, 12)).toBe(
      `[tiendas] tiendamia señales=${doc.signals} sitio=ok  tp=4.1  g=-  reddit=12(+12)  catálogo=-`
    );
  });

  it("shows how far a running backfill got", () => {
    const march = Math.floor(Date.parse("2025-03-16T00:00:00Z") / 1000);
    const halfway: RedditCursor = { backfillStartUtc: START_UTC, backfillNextUtc: march, backfillDone: false, checkedUntilUtc: march };
    const doc = buildProfile(
      entry({ key: "tushop" }),
      { reddit: { mentions: [freshMention("x", START_UTC + 86_400)], cursor: halfway, complete: false } },
      null,
      NOW
    );
    expect(formatStoreLogLine(doc, 1)).toBe(
      "[tiendas] tushop señales=0 sitio=-  tp=-  g=-  reddit=1(+1) backfill 2025-03-16  catálogo=-"
    );
  });

  it("shows a blocked site and a catalogue count", () => {
    const doc = buildProfile(entry({ key: "loi" }), { site: site({ status: "blocked" }), catalog: catalog({ offers: 9 }) }, null, NOW);
    expect(formatStoreLogLine(doc)).toBe("[tiendas] loi señales=1 sitio=blocked  tp=-  g=-  reddit=-  catálogo=9");
  });
});
