// Task 6: one profile per store, carrying the last good value of each signal across runs. All pure —
// no network, no Mongo. The `undefined`/`null` convention is the one every signal module in
// classes/stores/signals/ already follows: `undefined` = could not query (keep what we had), `null` =
// queried and there is nothing (clear it).
import { describe, expect, it } from "vitest";
import {
  STORE_SIGNAL_MAX_AGE_DAYS,
  buildProfile,
  countFreshSignals,
  formatStoreLogLine,
  isThinRun,
  mergeSignal,
  storeSignalApplies,
  type StoreProfileDoc,
} from "../../classes/stores/profile";
import type { StoreEntry } from "../../classes/stores/types";
import type { SiteSignal } from "../../classes/stores/signals/site";
import type { AgeSignal } from "../../classes/stores/signals/age";
import type { TrustpilotSignal } from "../../classes/stores/signals/trustpilot";
import type { GoogleSignal } from "../../classes/stores/signals/google";
import type { RedditSignal } from "../../classes/stores/signals/reddit";
import type { CatalogSignal } from "../../classes/stores/signals/catalog";

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

describe("isThinRun", () => {
  it("never blocks the first run (nothing stored to protect)", () => {
    expect(isThinRun({ storesWithFreshSignal: 0, stores: 76, storedProfiles: 0 })).toBe(false);
  });

  it("blocks when fewer than 40 % of the stores got at least one fresh signal and profiles exist", () => {
    expect(isThinRun({ storesWithFreshSignal: 30, stores: 76, storedProfiles: 76 })).toBe(true);
    expect(isThinRun({ storesWithFreshSignal: 1, stores: 3, storedProfiles: 76 })).toBe(true);
  });

  it("lets exactly 40 % through", () => {
    expect(isThinRun({ storesWithFreshSignal: 2, stores: 5, storedProfiles: 76 })).toBe(false);
  });
});

describe("formatStoreLogLine", () => {
  it("prints each signal's headline value, and - for a missing one", () => {
    const doc = buildProfile(
      entry({ key: "tiendamia" }),
      { site: site(), trustpilot: trustpilot({ score: 4.1 }), google: null, reddit: reddit({ mentions: 12 }), catalog: null },
      null,
      NOW
    );
    expect(formatStoreLogLine(doc)).toBe(
      `[tiendas] tiendamia señales=${doc.signals} sitio=ok  tp=4.1  g=-  reddit=12  catálogo=-`
    );
  });

  it("shows a blocked site and a catalogue count", () => {
    const doc = buildProfile(entry({ key: "loi" }), { site: site({ status: "blocked" }), catalog: catalog({ offers: 9 }) }, null, NOW);
    expect(formatStoreLogLine(doc)).toBe("[tiendas] loi señales=1 sitio=blocked  tp=-  g=-  reddit=-  catálogo=9");
  });
});
