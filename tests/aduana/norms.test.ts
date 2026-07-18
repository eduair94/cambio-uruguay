// Every test here mutation-checks ONE gate. That matters: an earlier version of this suite used
// proposals whose value also DIFFERED from what we publish, so the "differs → defer to a human"
// gate satisfied every assertion on its own — you could delete the official-domain check, the
// range check and the DNA lock outright and all five tests still passed. Each test below is built
// so that exactly one gate is load-bearing: break that gate, and only this test goes red.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AduanaDoc, AduanaFact, Source } from "../../classes/aduana/types";

vi.mock("../../classes/aduana/gemini", () => ({
  geminiConfigured: vi.fn(() => true),
  askGrounded: vi.fn(async () => null),
}));

import { askGrounded, geminiConfigured } from "../../classes/aduana/gemini";
import { BASELINE, DENYLIST_URLS } from "../../classes/aduana/baseline";
import { applyProposals, refreshNorms } from "../../classes/aduana/norms";

const NORM_URL = "https://www.impo.com.uy/bases/decretos/50-2026";
/** What Gemini's grounding metadata said it actually retrieved. */
const GROUNDED = [NORM_URL];

const SOURCES: Source[] = [
  { id: "decreto-50-026", title: "Decreto 50/026", norm: "Decreto 50/026", url: NORM_URL, checkedAt: "2026-07-11", kind: "norma" },
];

const current: AduanaFact[] = [
  { id: "franquicia.tope_anual_usd", label: "Tope anual", value: 800, unit: "USD", sourceId: "decreto-50-026", article: "art. 3", verifiedAt: "2026-07-11", origin: "baseline" },
];

const proposal = (over: Record<string, unknown> = {}) => [
  { id: "franquicia.tope_anual_usd", value: 800, sourceUrl: NORM_URL, article: "art. 3", ...over },
];

const today = () => new Date().toISOString().slice(0, 10);

describe("applyProposals", () => {
  it("keeps the last-good value and flags a changed fact instead of publishing it", () => {
    const out = applyProposals(current, proposal({ value: 1200 }), GROUNDED, SOURCES);
    expect(out.facts[0].value).toBe(800); // NOT 1200 — a human confirms a change of law
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 1 — grounding. The model cites the real decree, on the real official domain, with the
  // right number… but Google's grounding metadata says it never opened that page. A citation to a
  // page it did not fetch is a hallucinated citation, whatever it points at.
  it("refuses a proposal whose source the model never actually retrieved", () => {
    const out = applyProposals(current, proposal(), ["https://www.gub.uy/otra-cosa"], SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  it("admits nothing at all when the model did not search (no grounding chunks)", () => {
    const out = applyProposals(current, proposal(), [], SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 1b — a homepage is not a citation. Reproduces the exact exploit found in review:
  // host-only grounding means ANY page on gub.uy — including the bare homepage, which cites no
  // norm at all — satisfies isGrounded and isOfficial identically to a real decree page.
  it("refuses a homepage sourceUrl, even when grounded on an official host", () => {
    const homepage = "https://www.gub.uy/";
    const out = applyProposals(current, proposal({ sourceUrl: homepage }), [homepage], SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 1c — official is not enough; it has to be THIS fact's own source. Demonstrated bug: an
  // unrelated gub.uy tramite page "confirmed" franquicia.tope_anual_usd, whose own source
  // (SOURCES: decreto-50-026) lives on impo.com.uy. Both isGrounded and isOfficial pass here —
  // only the own-source-host check can refuse it.
  it("refuses a citation on an official host that is not this fact's own source host", () => {
    const otherOfficialPage = "https://www.gub.uy/tramites/otra-cosa-cualquiera";
    const out = applyProposals(current, proposal({ sourceUrl: otherOfficialPage }), [otherOfficialPage], SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 2 — official domain. Grounded (the model really did read the newspaper), in range, and
  // equal to what we publish. Only the domain check can stop it. A newspaper is not the law.
  it("refuses a fact sourced to a domain that is not official, even when the model really read it", () => {
    const press = "https://elpais.com.uy/nota";
    const out = applyProposals(current, proposal({ sourceUrl: press }), [press], SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 3 — plausible range. Grounded, official, and EQUAL to what we publish, so neither the
  // grounding gate nor the equality gate can refuse it: the range is the only thing standing.
  // (A doc whose stored value sits outside its band is exactly when we least want a machine
  // blessing it.)
  it("refuses an out-of-range value even when it equals the one we publish", () => {
    const outOfBand: AduanaFact[] = [{ ...current[0], value: 9999 }]; // FACT_RANGES caps this at 5000
    const out = applyProposals(outOfBand, proposal({ value: 9999 }), GROUNDED, SOURCES);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[0].value).toBe(9999); // untouched
    expect(out.pendingReview).toContain("franquicia.tope_anual_usd");
  });

  // GATE 3b — THE DNA LOCK. `general.dua_por_persona_por_anio` and
  // `despachante.dna_lo_exige_sobre_800` are assertions the DNA's own page makes with no norm
  // behind them, so they have no FACT_RANGES entry and there is nothing to check a number
  // against. The first fixture below is the one that pins the lock on its own: the proposal is
  // grounded, official, and stringifies EQUAL to the published value — only "a fact with no range
  // may never take a number" refuses it.
  it("refuses a number proposed for an unsourceable DNA assertion (no range = not numeric)", () => {
    const dna: AduanaFact[] = [
      { id: "general.dua_por_persona_por_anio", label: "DUA por año", value: "2", sourceId: "decreto-50-026", article: "v/28223", verifiedAt: "2026-07-12", origin: "baseline" },
      { id: "despachante.dna_lo_exige_sobre_800", label: "Despachante", value: '"es preceptiva"', sourceId: "decreto-50-026", article: "v/28223", verifiedAt: "2026-07-12", origin: "baseline" },
    ];
    const out = applyProposals(
      dna,
      [
        { id: "general.dua_por_persona_por_anio", value: 2, sourceUrl: NORM_URL },
        { id: "despachante.dna_lo_exige_sobre_800", value: 800, sourceUrl: NORM_URL },
      ],
      GROUNDED,
      SOURCES
    );
    expect(out.facts[0].value).toBe("2"); // still the string, still untouched
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.facts[1].value).toBe('"es preceptiva"');
    expect(out.facts[1].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toEqual([
      "general.dua_por_persona_por_anio",
      "despachante.dna_lo_exige_sobre_800",
    ]);
  });

  // Alarm hygiene: two proposals for one id contradict each other, and `.find()` would obey the
  // first and drop the second with no trace. Value-safe, alarm-unsafe. Trust neither.
  it("flags a fact the model proposed twice, and changes nothing", () => {
    const out = applyProposals(
      current,
      [
        { id: "franquicia.tope_anual_usd", value: 800, sourceUrl: NORM_URL },
        { id: "franquicia.tope_anual_usd", value: 1200, sourceUrl: NORM_URL },
      ],
      GROUNDED,
      SOURCES
    );
    expect(out.facts[0].value).toBe(800);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
  });

  // Alert fatigue: a stringified "800" for a numeric 800 is the same number. Deferring it would
  // put this id on the human's list EVERY week until they stop reading the list.
  it('treats a stringified "800" as the 800 we publish, not as a change', () => {
    const out = applyProposals(current, proposal({ value: "800" }), GROUNDED, SOURCES);
    expect(out.facts[0].value).toBe(800); // still the number — the proposal's value is never copied
    expect(out.facts[0].aiCheckedAt).toBe(today());
    expect(out.pendingReview).toEqual([]);
  });

  it("keeps everything when the AI returns garbage", () => {
    expect(applyProposals(current, "<think>hmm</think>", GROUNDED, SOURCES).facts).toEqual(current);
    expect(applyProposals(current, null, GROUNDED, SOURCES).facts).toEqual(current);
    expect(applyProposals(current, { error: "no encontré la norma" }, GROUNDED, SOURCES).facts).toEqual(current);
    expect(applyProposals(current, [{ nonsense: true }], GROUNDED, SOURCES).facts).toEqual(current);
  });

  it("stamps aiCheckedAt — never verifiedAt — when the AI confirms the value we already had", () => {
    const out = applyProposals(current, proposal({ value: 800 }), GROUNDED, SOURCES);
    expect(out.facts[0].value).toBe(800);
    expect(out.facts[0].aiCheckedAt).toBe(today());
    expect(out.facts[0].verifiedAt).toBe("2026-07-11"); // a machine's re-read is not a human's
    expect(out.facts[0].origin).toBe("baseline"); // confirmation does not make it AI-authored
    expect(out.pendingReview).toEqual([]);
  });
});

describe("applyProposals — auto-publish guardrail", () => {
  const dateFact: AduanaFact = {
    id: "franquicia.registro_vendedor_desde",
    label: "Fecha registro vendedor",
    value: "2026-10-01",
    sourceId: "rg-dna-21-2026",
    article: "num. 1",
    verifiedAt: "2026-07-11",
    origin: "baseline",
  };
  const rgSrc: Source = {
    id: "rg-dna-21-2026",
    title: "RG 21/2026",
    norm: "RG DNA 21/2026",
    url: "https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf",
    checkedAt: "2026-07-11",
    kind: "norma",
  };
  const mefUrl =
    "https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes";

  it("auto-publishes a CHANGED date when 2 independent official grounded sources agree", () => {
    const raw = [
      { id: dateFact.id, value: "2027-01-01", sourceUrl: rgSrc.url, corroborationUrl: mefUrl },
    ];
    const grounding = [rgSrc.url, mefUrl];
    const { overrides, facts, pendingReview } = applyProposals([dateFact], raw, grounding, [rgSrc]);
    expect(overrides).toHaveLength(1);
    expect(overrides[0]).toMatchObject({
      id: dateFact.id,
      value: "2027-01-01",
      basedOnValue: "2026-10-01",
      prevValue: "2026-10-01",
    });
    expect([...overrides[0].sources].sort()).toEqual([mefUrl, rgSrc.url].sort());
    expect(pendingReview).not.toContain(dateFact.id); // published, not flagged
    expect(facts[0].value).toBe("2026-10-01"); // the fact object is never mutated
  });

  it("does NOT auto-publish a changed value with only ONE source — flags instead", () => {
    const raw = [{ id: dateFact.id, value: "2027-01-01", sourceUrl: rgSrc.url }];
    const { overrides, pendingReview } = applyProposals([dateFact], raw, [rgSrc.url], [rgSrc]);
    expect(overrides).toHaveLength(0);
    expect(pendingReview).toContain(dateFact.id);
  });

  it("never lets a denylisted page be one of the 2 sources (the repealed-numbers trap)", () => {
    const minFact = BASELINE.facts.find((f) => f.id === "prestacion_unica.minimo_usd")!; // value 20
    const src = BASELINE.sources.find((s) => s.id === minFact.sourceId)!;
    const denyUrl = DENYLIST_URLS[0]; // v/27950 still publishes USD 10
    const raw = [
      { id: minFact.id, value: 10, sourceUrl: denyUrl, corroborationUrl: `${denyUrl}?x=1` },
    ];
    const { overrides, pendingReview } = applyProposals(
      [minFact],
      raw,
      [denyUrl, `${denyUrl}?x=1`],
      [src]
    );
    expect(overrides).toHaveLength(0); // the repealed 10 can never publish
    expect(pendingReview).toContain(minFact.id);
  });

  it("rejects an out-of-window date and a number proposed for a date fact", () => {
    const outOfWindow = [
      { id: dateFact.id, value: "2099-01-01", sourceUrl: rgSrc.url, corroborationUrl: mefUrl },
    ];
    expect(
      applyProposals([dateFact], outOfWindow, [rgSrc.url, mefUrl], [rgSrc]).overrides
    ).toHaveLength(0);
    const numericForDate = [
      { id: dateFact.id, value: 800, sourceUrl: rgSrc.url, corroborationUrl: mefUrl },
    ];
    expect(
      applyProposals([dateFact], numericForDate, [rgSrc.url, mefUrl], [rgSrc]).overrides
    ).toHaveLength(0);
  });

  it("auto-publishes a CHANGED numeric fact only when both sources are in range and independent", () => {
    const minFact = BASELINE.facts.find((f) => f.id === "prestacion_unica.minimo_usd")!; // 20, range [1,200]
    const impo = "https://www.impo.com.uy/bases/leyes/20446-2025/627";
    const mef = "https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/nuevo-minimo";
    const raw = [{ id: minFact.id, value: 25, sourceUrl: impo, corroborationUrl: mef }];
    const { overrides } = applyProposals([minFact], raw, [impo, mef], [
      { ...BASELINE.sources.find((s) => s.id === minFact.sourceId)!, url: impo },
    ]);
    expect(overrides).toHaveLength(1);
    expect(overrides[0].value).toBe(25);
  });
});

const mockedConfigured = vi.mocked(geminiConfigured);
const mockedAsk = vi.mocked(askGrounded);

const docWith = (facts: AduanaFact[], pendingReview: string[] = []): AduanaDoc => ({
  facts,
  problems: [],
  quotes: {},
  counts: {},
  sources: SOURCES,
  pendingReview,
  overrides: [],
  updatedAt: null,
});

const grounded = (text: string) => ({ text, sourceUris: GROUNDED });

/** Everything this function does on a bad reply, it does by logging. Silence IS the bug. */
const warnedWith = (needle: string): boolean =>
  vi.mocked(console.warn).mock.calls.some((args) =>
    args.some((a) => typeof a === "string" && a.includes(needle))
  );

describe("refreshNorms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedConfigured.mockReturnValue(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  // F1: unconfigured is a no-op — but NOT a silent one. The root .env has no GEMINI_API_KEY at
  // all (this repo's key lives in app/.env as NUXT_GEMINI_API_KEY), so before this fix
  // geminiConfigured() was false in production and refreshNorms returned early with nothing
  // logged — the weekly job "ran" every week while never checking a single norm.
  it("is a no-op without a Gemini key — the doc comes back by reference, and it warns", async () => {
    mockedConfigured.mockReturnValue(false);
    const doc = docWith(current);
    await expect(refreshNorms(doc)).resolves.toBe(doc); // by reference
    expect(mockedAsk).not.toHaveBeenCalled();
    expect(warnedWith("GEMINI_API_KEY")).toBe(true); // a skipped safety check must never be silent
  });

  // The one that would have wiped the alarm: `{"error": ...}` parses fine, is not an array, and
  // the old code fell straight through it into `pendingReview: []`.
  it("changes nothing and PRESERVES pendingReview when the reply parses but is not an array", async () => {
    mockedAsk.mockResolvedValue(grounded('{"error":"no encontré la norma"}'));
    const doc = docWith(current, ["franquicia.tope_anual_usd"]);
    const out = await refreshNorms(doc);
    expect(out.facts).toEqual(current);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]); // NOT wiped
    expect(warnedWith("not an array")).toBe(true); // and it says so out loud
    expect(warnedWith("no encontré la norma")).toBe(true); // …with the raw reply, so it is debuggable
  });

  // The old code did `catch { return doc }` with no log at all: a permanently truncated reply
  // would have been an invisible no-op forever, with everyone assuming the gate was running.
  it("changes nothing and preserves pendingReview when the reply is malformed — and warns", async () => {
    mockedAsk.mockResolvedValue(grounded("lo siento, no pude verificar las normas"));
    const doc = docWith(current, ["franquicia.tope_anual_usd"]);
    const out = await refreshNorms(doc);
    expect(out.facts).toEqual(current);
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
    expect(warnedWith("did not parse")).toBe(true);
    expect(warnedWith("lo siento")).toBe(true);
  });

  it("changes nothing when the grounded call itself fails", async () => {
    mockedAsk.mockResolvedValue(null);
    const out = await refreshNorms(docWith(current, ["franquicia.tope_anual_usd"]));
    expect(out.facts).toEqual(current);
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
  });

  it("stamps aiCheckedAt on a good grounded confirmation, and leaves verifiedAt and value alone", async () => {
    mockedAsk.mockResolvedValue(grounded(JSON.stringify(proposal())));
    const out = await refreshNorms(docWith(current));
    expect(out.facts[0].aiCheckedAt).toBe(today());
    expect(out.facts[0].verifiedAt).toBe("2026-07-11");
    expect(out.facts[0].value).toBe(800);
    expect(out.pendingReview).toEqual([]);
  });

  it("survives a fenced ```json reply instead of losing the whole run to it", async () => {
    mockedAsk.mockResolvedValue(grounded("```json\n" + JSON.stringify(proposal()) + "\n```"));
    const out = await refreshNorms(docWith(current));
    expect(out.facts[0].aiCheckedAt).toBe(today());
  });

  // 52 facts in one call is ~2.5k tokens of reply against a 4k cap: one truncation and the entire
  // weekly check silently vanishes. Batching means a bad batch costs a batch.
  it("batches the facts, so one bad batch cannot lose all the others", async () => {
    const many: AduanaFact[] = Array.from({ length: 25 }, (_, i) => ({
      ...current[0],
      id: i === 0 ? "franquicia.tope_anual_usd" : `franquicia.peso_max_kg.${i}`,
    }));
    // Only the first fact is a real, rangeable id; the rest are ignorable filler. The first batch
    // comes back truncated garbage, the second confirms the one fact we can actually check.
    many[10] = { ...current[0], id: "franquicia.max_envios", value: 3 };

    mockedAsk
      .mockResolvedValueOnce(grounded('[{"id":"franquicia.tope_anual_usd","value":8')) // truncated
      .mockResolvedValueOnce(grounded(JSON.stringify([{ id: "franquicia.max_envios", value: 3, sourceUrl: NORM_URL }])))
      .mockResolvedValueOnce(grounded("[]"));

    const out = await refreshNorms(docWith(many));
    expect(mockedAsk).toHaveBeenCalledTimes(3); // 25 facts / batch of 10
    expect(out.facts[0].aiCheckedAt).toBeUndefined(); // lost with its own batch…
    expect(out.facts[10].aiCheckedAt).toBe(today()); // …and only with its own batch
    expect(out.facts[10].value).toBe(3);
  });

  it("never lets the AI move a value, whatever it proposes", async () => {
    mockedAsk.mockResolvedValue(grounded(JSON.stringify(proposal({ value: 1200 }))));
    const out = await refreshNorms(docWith(current));
    expect(out.facts[0].value).toBe(800);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]);
  });

  // F4 — pendingReview is not a pure ratchet: a dispute resolved this run must not stay flagged
  // forever. A fact flagged by a PRIOR run that this run's AI grounds, sources correctly, and
  // reconfirms unchanged is exactly "the dispute is resolved" — discharge it.
  it("discharges a previously-flagged fact once the AI reconfirms it this run", async () => {
    mockedAsk.mockResolvedValue(grounded(JSON.stringify(proposal()))); // same value, grounded, official
    const doc = docWith(current, ["franquicia.tope_anual_usd"]); // flagged by an earlier run
    const out = await refreshNorms(doc);
    expect(out.facts[0].aiCheckedAt).toBe(today());
    expect(out.pendingReview).toEqual([]); // discharged — the flag is not a ratchet
  });

  // F4's other half: a fact flagged by a prior run that this run's AI simply says nothing about
  // (no proposal for that id — the model omitted it, per buildPrompt's own instructions) must
  // stay flagged. Only an actual reconfirmation discharges a flag; silence does not.
  it("keeps a previously-flagged fact flagged when the AI proposes nothing for it this run", async () => {
    mockedAsk.mockResolvedValue(grounded("[]")); // verified nothing this run
    const doc = docWith(current, ["franquicia.tope_anual_usd"]);
    const out = await refreshNorms(doc);
    expect(out.facts[0].aiCheckedAt).toBeUndefined();
    expect(out.pendingReview).toEqual(["franquicia.tope_anual_usd"]); // still flagged
  });
});
