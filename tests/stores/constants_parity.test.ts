import { describe, expect, it } from "vitest";
import { INDEXABLE_MIN_SIGNALS, STORE_SIGNAL_MAX_AGE_DAYS } from "../../classes/stores/profile";
import {
  STORE_INDEXABLE_MIN_SIGNALS,
  STORE_SIGNAL_MAX_AGE_DAYS as APP_STORE_SIGNAL_MAX_AGE_DAYS,
} from "../../app/utils/storeProfiles";

// app/ is a separate package that cannot import from the repo root (see AGENTS.md), so
// app/utils/storeProfiles.ts hand-copies these two cutoffs instead of importing them. This test is
// the only thing keeping the copies honest: a backend tweak to either number that isn't mirrored
// here would silently change what the API publishes as "fresh"/"indexable" without either side's
// own tests noticing (each only checks its own literal).

describe("store profile constants stay in sync between backend and app", () => {
  it("STORE_SIGNAL_MAX_AGE_DAYS matches", () => {
    expect(APP_STORE_SIGNAL_MAX_AGE_DAYS).toBe(STORE_SIGNAL_MAX_AGE_DAYS);
  });

  it("the indexable threshold matches (classes/stores/profile.ts INDEXABLE_MIN_SIGNALS <-> app/utils/storeProfiles.ts STORE_INDEXABLE_MIN_SIGNALS)", () => {
    expect(STORE_INDEXABLE_MIN_SIGNALS).toBe(INDEXABLE_MIN_SIGNALS);
  });
});
