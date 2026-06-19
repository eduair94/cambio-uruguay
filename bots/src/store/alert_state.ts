// Alert dedup/cooldown: a pure decision function (unit-tested) plus thin Mongo
// persistence of the last alert per currency/day.
import mongoose, { Schema } from "mongoose";
import type { AlertConfig } from "../config.js";

export type Direction = "up" | "down";

export interface AlertPrev {
  direction: Direction;
  pct: number;
  atMs: number;
}

/**
 * Decide whether a move warrants an alert.
 * - Below threshold → never.
 * - No prior alert → yes.
 * - Opposite direction (a reversal) → yes, even within cooldown.
 * - Same direction within cooldown → no (anti-spam).
 * - Same direction past cooldown → only when the move materially grew since the
 *   last alert (|pct| advanced by ≥ reAlertDeltaPct). Because changePct is taken
 *   vs yesterday's static baseline, a sustained move yields ~the same pct each
 *   run; without this guard the channel gets the identical alert every cooldown.
 */
export function decideAlert(
  prev: AlertPrev | null,
  pct: number,
  nowMs: number,
  cfg: Pick<AlertConfig, "thresholdPct" | "cooldownMin"> & Partial<Pick<AlertConfig, "reAlertDeltaPct">>
): boolean {
  if (Math.abs(pct) < cfg.thresholdPct) return false;
  if (!prev) return true;
  const direction: Direction = pct > 0 ? "up" : "down";
  if (direction !== prev.direction) return true;
  const withinCooldown = nowMs - prev.atMs < cfg.cooldownMin * 60_000;
  if (withinCooldown) return false;
  const step = cfg.reAlertDeltaPct ?? cfg.thresholdPct;
  return Math.abs(pct) - Math.abs(prev.pct) >= step;
}

interface AlertStateDoc {
  key: string; // `${currency}:${date}`
  direction: Direction;
  pct: number;
  atMs: number;
}

const alertStateSchema = new Schema<AlertStateDoc>({
  key: { type: String, required: true, unique: true },
  direction: { type: String, required: true },
  pct: { type: Number, required: true },
  atMs: { type: Number, required: true },
});

const AlertStateModel =
  mongoose.models.BotAlertState || mongoose.model<AlertStateDoc>("BotAlertState", alertStateSchema);

const today = () => new Date().toISOString().slice(0, 10);
const keyFor = (currency: string) => `${currency.toUpperCase()}:${today()}`;

/** Read the last alert recorded for a currency today (null if none / no Mongo). */
export async function getAlertPrev(currency: string): Promise<AlertPrev | null> {
  if (mongoose.connection.readyState !== 1) return null;
  const doc = await AlertStateModel.findOne({ key: keyFor(currency) }).lean<AlertStateDoc>();
  return doc ? { direction: doc.direction, pct: doc.pct, atMs: doc.atMs } : null;
}

/** Persist the alert just sent for a currency today. */
export async function recordAlert(currency: string, direction: Direction, pct: number, atMs = Date.now()): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  await AlertStateModel.updateOne(
    { key: keyFor(currency) },
    { $set: { direction, pct, atMs } },
    { upsert: true }
  );
}
