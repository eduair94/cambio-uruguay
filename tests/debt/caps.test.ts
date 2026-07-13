// Ported verbatim from app/tests/unit/debtReliefLive.test.ts (same assertions, same numbers):
// applyLiveCaps was already pure and already unit-tested on the app side. Only the signature
// changed — it takes { usuryCaps } instead of the app's full DebtReliefBaseline (refiRates/period
// are static page content that stayed in app/utils/debtRelief.ts, see classes/debt/bands.ts).
import { describe, it, expect } from "vitest";
import { applyLiveCaps, BASELINE_CAPS } from "../../classes/debt/bands";

describe("applyLiveCaps guardrails", () => {
  it("keeps baseline when the payload is empty", () => {
    const { caps, updated } = applyLiveCaps({ usuryCaps: BASELINE_CAPS }, {});
    expect(updated).toEqual([]);
    expect(caps).toEqual(BASELINE_CAPS);
  });

  it("accepts an in-band tope and marks it updated", () => {
    const { caps, updated } = applyLiveCaps(
      { usuryCaps: BASELINE_CAPS },
      { topeConDescuento: 33.5, moraConDescuento: 39.0 }
    );
    expect(updated).toContain("topeConDescuento");
    expect(caps[0]!.topeTasa).toBe(33.5);
  });

  it("rejects an absurd out-of-band value and keeps the baseline", () => {
    const { caps, updated } = applyLiveCaps(
      { usuryCaps: BASELINE_CAPS },
      { topeConDescuento: 5 } // below the plausible band
    );
    expect(updated).not.toContain("topeConDescuento");
    expect(caps[0]!.topeTasa).toBe(BASELINE_CAPS[0]!.topeTasa);
  });

  it("does not mutate the shared BASELINE_CAPS singleton", () => {
    const before = BASELINE_CAPS[0]!.topeTasa;
    applyLiveCaps({ usuryCaps: BASELINE_CAPS }, { topeConDescuento: 33.5 });
    expect(BASELINE_CAPS[0]!.topeTasa).toBe(before);
  });
});
