import { describe, expect, it } from "vitest";
import { sanitizePatch, sourceHostAllowed, TEA_MAX, TEA_MIN } from "../../classes/loantiers/research";
import type { LoanLenderSeed } from "../../classes/loantiers/catalog";

const LENDER: LoanLenderSeed = {
  id: "creditel",
  name: "Creditel",
  website: "https://www.creditel.com.uy",
  sourceUrl: "https://www.creditel.com.uy/prestamos",
};

function raw(over: Record<string, unknown> = {}) {
  return {
    found: true,
    sourceUrl: "https://www.creditel.com.uy/prestamos",
    ...over,
  } as any;
}

describe("sourceHostAllowed", () => {
  it("accepts the lender's own host and its subdomains", () => {
    expect(sourceHostAllowed("https://www.creditel.com.uy/x", LENDER.website)).toBe(true);
    expect(sourceHostAllowed("https://solicitar.creditel.com.uy/x", LENDER.website)).toBe(true);
  });

  it("accepts official Uruguayan sources", () => {
    expect(sourceHostAllowed("https://www.bcu.gub.uy/algo", LENDER.website)).toBe(true);
    expect(sourceHostAllowed("https://www.impo.com.uy/bases/leyes/18212-2007", LENDER.website)).toBe(true);
  });

  it("rejects comparison blogs and look-alike domains", () => {
    // The whole point: a "préstamos rápidos" aggregator quoting a rate is not the lender saying it.
    expect(sourceHostAllowed("https://prestamosfrescos.com/uy/creditel", LENDER.website)).toBe(false);
    // Dot-boundary check, not a substring one.
    expect(sourceHostAllowed("https://creditel.com.uy.phish.net/x", LENDER.website)).toBe(false);
    expect(sourceHostAllowed("not a url", LENDER.website)).toBe(false);
  });
});

describe("sanitizePatch", () => {
  it("drops an answer that never reached an official page", () => {
    expect(sanitizePatch(raw({ found: false }), LENDER)).toBeNull();
    expect(sanitizePatch(null, LENDER)).toBeNull();
  });

  it("drops an answer sourced off the lender's domain", () => {
    expect(sanitizePatch(raw({ sourceUrl: "https://finanzas.com.uy/creditel" }), LENDER)).toBeNull();
  });

  it("keeps a plausible TEA and discards an implausible one", () => {
    expect(sanitizePatch(raw({ teaPct: 62 }), LENDER)?.teaPct).toBe(62);
    // A monthly rate mistaken for an annual one, and a typo'd one.
    expect(sanitizePatch(raw({ teaPct: TEA_MIN - 1 }), LENDER)).not.toHaveProperty("teaPct");
    expect(sanitizePatch(raw({ teaPct: TEA_MAX + 1 }), LENDER)).not.toHaveProperty("teaPct");
  });

  it("treats an explicit null TEA as 'stopped publishing', not as 'no data'", () => {
    const patch = sanitizePatch(raw({ teaPct: null }), LENDER);
    expect(patch).not.toBeNull();
    expect(patch).toHaveProperty("teaPct", null);
  });

  it("only accepts a clearing stance backed by a quoted sentence", () => {
    expect(sanitizePatch(raw({ clearing: "si" }), LENDER)?.clearing).toBeUndefined();
    expect(sanitizePatch(raw({ clearing: "si", clearingEvidence: "corto" }), LENDER)?.clearing).toBeUndefined();
    const ok = sanitizePatch(
      raw({
        clearing: "si",
        clearingEvidence: "Prestamos aunque estés en el Clearing de Informes.",
        clearingNote: "Presta con antecedentes, con tope de monto.",
      }),
      LENDER
    );
    expect(ok?.clearing).toBe("si");
    expect(ok?.clearingNote).toContain("antecedentes");
  });

  it("lets 'desconocido' through without evidence — admitting ignorance needs no proof", () => {
    expect(sanitizePatch(raw({ clearing: "desconocido" }), LENDER)?.clearing).toBe("desconocido");
  });

  it("rejects values outside the enums instead of passing them through", () => {
    const patch = sanitizePatch(
      raw({ clearing: "quizas", bcu: "medio regulada", currencies: ["UYU", "EUR"], audiences: ["marciano"] }),
      LENDER
    );
    expect(patch?.clearing).toBeUndefined();
    expect(patch?.bcu).toBeUndefined();
    expect(patch?.currencies).toEqual(["UYU"]);
    expect(patch?.audiences).toBeUndefined();
  });

  it("bounds the numeric fields", () => {
    const patch = sanitizePatch(
      raw({ minIncomeUyu: -5, maxAmountUyu: 999999999, maxTermMonths: 999, disbursementHours: 24 }),
      LENDER
    );
    expect(patch?.minIncomeUyu).toBeUndefined();
    expect(patch?.maxAmountUyu).toBeUndefined();
    expect(patch?.maxTermMonths).toBeUndefined();
    expect(patch?.disbursementHours).toBe(24);
  });

  it("flags a lender the research could not find operating", () => {
    const patch = sanitizePatch(raw({ stillOperating: false }), LENDER);
    expect(patch?.changeNote).toContain("revisar a mano");
  });

  it("always stamps the verification date and keeps the id", () => {
    const patch = sanitizePatch(raw(), LENDER);
    expect(patch?.id).toBe("creditel");
    expect(patch?.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
