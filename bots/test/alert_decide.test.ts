import { describe, expect, it } from "vitest";
import { decideAlert, type AlertPrev } from "../src/store/alert_state.js";

const cfg = { thresholdPct: 1, cooldownMin: 120 };
const now = 1_000_000_000_000;
const minsAgo = (m: number) => now - m * 60_000;

describe("decideAlert", () => {
  it("rejects moves below the threshold", () => {
    expect(decideAlert(null, 0.5, now, cfg)).toBe(false);
    expect(decideAlert(null, -0.9, now, cfg)).toBe(false);
  });

  it("alerts on a first qualifying move", () => {
    expect(decideAlert(null, 1.2, now, cfg)).toBe(true);
    expect(decideAlert(null, -2, now, cfg)).toBe(true);
  });

  it("suppresses same-direction moves within the cooldown", () => {
    const prev: AlertPrev = { direction: "up", pct: 1.2, atMs: minsAgo(30) };
    expect(decideAlert(prev, 1.5, now, cfg)).toBe(false);
  });

  it("allows an opposite-direction reversal within the cooldown", () => {
    const prev: AlertPrev = { direction: "up", pct: 1.2, atMs: minsAgo(30) };
    expect(decideAlert(prev, -1.3, now, cfg)).toBe(true);
  });

  it("suppresses an unchanged same-direction move even after the cooldown", () => {
    // The headline bug: a sustained move vs yesterday's static baseline yields
    // ~the same pct on every run, so re-firing after cooldown spams identical alerts.
    const prev: AlertPrev = { direction: "up", pct: 1.2, atMs: minsAgo(200) };
    expect(decideAlert(prev, 1.2, now, cfg)).toBe(false);
    expect(decideAlert(prev, 1.5, now, cfg)).toBe(false); // grew, but below the re-alert step
  });

  it("suppresses a shrinking same-direction move after the cooldown", () => {
    const prev: AlertPrev = { direction: "up", pct: 2.5, atMs: minsAgo(200) };
    expect(decideAlert(prev, 1.6, now, cfg)).toBe(false);
  });

  it("re-alerts same direction after cooldown when the move materially grows", () => {
    const prev: AlertPrev = { direction: "up", pct: 1.2, atMs: minsAgo(200) };
    expect(decideAlert(prev, 2.5, now, cfg)).toBe(true); // grew by >= thresholdPct step
  });

  it("never re-alerts a grown same-direction move while still within the cooldown", () => {
    const prev: AlertPrev = { direction: "up", pct: 1.2, atMs: minsAgo(30) };
    expect(decideAlert(prev, 3, now, cfg)).toBe(false);
  });
});
