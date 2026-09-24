// What one social network's harvest hands to harvestSocial: the usual source result, plus every
// post it processed, so the copy guard can see all networks at once before anything is published.
import type { RentalSourceResult } from "../types";
import type { SocialSource } from "./post";
import type { ProcessedPost } from "./process";

export interface PlatformRun {
  result: RentalSourceResult;
  processed: ProcessedPost[];
}

/** A network that read nothing this run, on purpose (disabled, or the hourly run). */
export function idleRun(source: SocialSource, note: string): PlatformRun {
  return { result: { key: source, ok: true, complete: false, listings: [], note }, processed: [] };
}

export const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** A comma-separated env list; a leading `@` or `#` is dropped, empty items too. */
export const envList = (value: string | undefined, fallback: string): string[] =>
  String(value ?? fallback).split(",").map(item => item.trim().replace(/^[@#]/, "")).filter(Boolean);

/** Zero is a value an operator can set ("read no accounts", "geocode nothing"); only a missing or broken one falls back. */
export const envNumber = (value: string | undefined, fallback: number): number => {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};
