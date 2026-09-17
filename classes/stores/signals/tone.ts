// Task 7: an aggregated, automatic tone for a store's Reddit mentions — never a per-mention verdict,
// never a quote, never an author: just counts of complaint/recommendation/neutral folded into
// `RedditSignal.tone` (see classes/stores/signals/reddit.ts's module header on why nothing here ever
// carries a username).
//
// `RedditMention.text` exists only in memory, for the mentions fetched THIS run (reddit.ts strips it
// before anything is stored). This module is the one place that ever reads it, and only to ask Gemini
// a classification — the text itself is never persisted, never logged, and is cut to
// STORE_TONE_TEXT_MAX_CHARS before it leaves the process.
//
// `toneCache` (a profile field, classes/stores/profile.ts — never published, Task 8 excludes it with
// `.select`) remembers one tone per mention id so a mention is classified once, ever. A run only asks
// about ids missing from the cache, in batches of STORE_TONE_BATCH_SIZE, capped at
// STORE_TONE_MAX_PER_RUN per store per run: a 24-month backfill can bring thousands of mentions in one
// go, and this budget spreads the classification cost over several runs instead of paying it all at
// once. `pruneToneCache` drops any id no longer among the stored mentions — the 500-cap in
// `mergeStoredMentions` (reddit.ts) can push an old one out — so the cache never outgrows what is
// actually kept.
//
// `askJSON` (classes/gemini.ts) returns null with no API key or on any error it already gave up
// retrying: `classifyMentions` then leaves that batch's ids unclassified and moves on to the next
// batch, exactly like classes/charruadevs/classify.ts does for its own batches — nothing is ever
// invented, and an unclassified id is simply retried whenever it comes up again in a future run.
import { askJSON } from "../../gemini";
import type { RedditMention, RedditSignal } from "./reddit";

export type MentionTone = "queja" | "recomendacion" | "neutral";

/** Pinned, like classes/charruadevs/classify.ts's own model: a classification series must not drift
 * under a caller that only ever changes GEMINI_MODEL for the grounded jobs. */
export const STORE_TONE_MODEL = "gemini-2.5-flash-lite";

/** A mention's text is cut to this many characters before a prompt is ever built from it. */
const STORE_TONE_TEXT_MAX_CHARS = 600;
const STORE_TONE_BATCH_SIZE = 25;
/** Classifications spent per store per run — the shared cost control the brief asks for. */
export const STORE_TONE_MAX_PER_RUN = 100;

const TONE_VALUES: readonly MentionTone[] = ["queja", "recomendacion", "neutral"];

const TONE_SYSTEM =
  "Clasificás menciones de una tienda en Reddit. queja = relata un problema con la tienda; " +
  "recomendacion = la recomienda o cuenta una buena experiencia; neutral = la menciona sin juicio. " +
  "Si el texto no habla de esa tienda, neutral.";

const TONE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          tone: { type: "STRING", enum: [...TONE_VALUES] },
        },
        required: ["id", "tone"],
        propertyOrdering: ["id", "tone"],
      },
    },
  },
  required: ["items"],
};

/**
 * The prompt for one batch: the store's name (so "queja"/"recomendacion" are read against THIS
 * store, never another brand or product the same text happens to also name), one line per mention
 * with its text cut to STORE_TONE_TEXT_MAX_CHARS, and the exact ids the model must answer with.
 */
export function tonePrompt(storeName: string, mentions: Array<{ id: string; text: string }>): string {
  const lines = mentions
    .map((mention) => `id=${mention.id}: ${mention.text.slice(0, STORE_TONE_TEXT_MAX_CHARS)}`)
    .join("\n");
  return (
    `Tienda: "${storeName}".\n` +
    `Clasificá cada mención de Reddit de abajo SÓLO respecto de esta tienda, "${storeName}" — no de ` +
    `otra marca, producto o persona que el mismo texto también nombre.\n` +
    `Devolvé un item por cada id listado, usando exactamente esos ids, ni uno más.\n\n` +
    `${lines}`
  );
}

/**
 * The published, aggregated tone: counts over `mentions` (the store's STORED mentions — every one
 * read so far, not just this run's increment) that have an entry in `cache`, by id. `null` below 5
 * classified mentions: a store with a single angry comment must not read as "100% complaints".
 * Deduplicates by id, in case the same mention id were ever passed twice.
 */
export function applyTone(
  cache: Record<string, MentionTone>,
  mentions: readonly { id: string }[]
): RedditSignal["tone"] {
  let complaints = 0;
  let recommendations = 0;
  let neutral = 0;
  let classified = 0;
  const seen = new Set<string>();

  for (const mention of mentions) {
    if (seen.has(mention.id)) continue;
    const tone = cache[mention.id];
    if (!tone) continue;
    seen.add(mention.id);
    classified++;
    if (tone === "queja") complaints++;
    else if (tone === "recomendacion") recommendations++;
    else neutral++;
  }

  if (classified < 5) return null;
  return { complaints, recommendations, neutral, classified };
}

/** Drops any cache entry whose id is no longer among `mentions` — never lets the cache outgrow what
 * `mergeStoredMentions` (reddit.ts) actually kept (it caps stored mentions at 500). */
export function pruneToneCache(
  cache: Record<string, MentionTone>,
  mentions: readonly { id: string }[]
): Record<string, MentionTone> {
  const ids = new Set(mentions.map((mention) => mention.id));
  const pruned: Record<string, MentionTone> = {};
  for (const [id, tone] of Object.entries(cache)) {
    if (ids.has(id)) pruned[id] = tone;
  }
  return pruned;
}

/**
 * Classifies whatever of `mentions` is not already a key of `cache`, in the order `mentions` arrives,
 * up to STORE_TONE_MAX_PER_RUN, in batches of STORE_TONE_BATCH_SIZE. Returns a NEW cache object
 * (never mutates `cache`; returns the same reference when there is nothing pending) with every
 * classification that came back merged in. A batch whose `askJSON` call returns null (no
 * GEMINI_API_KEY, or an error `askJSON` already gave up retrying) leaves its ids out of the result —
 * they are retried whenever they come up again in a future run — and the next batch is still asked.
 * An id the model answers that was not asked in THAT batch, or an unrecognised tone value, is
 * dropped: the response schema only shapes the JSON, it does not stop the model from inventing an id.
 */
export async function classifyMentions(
  storeName: string,
  mentions: readonly RedditMention[],
  cache: Record<string, MentionTone>
): Promise<Record<string, MentionTone>> {
  const pending = mentions.filter((mention) => !(mention.id in cache)).slice(0, STORE_TONE_MAX_PER_RUN);
  if (!pending.length) return cache;

  const updated = { ...cache };
  for (let i = 0; i < pending.length; i += STORE_TONE_BATCH_SIZE) {
    const batch = pending.slice(i, i + STORE_TONE_BATCH_SIZE);
    const wanted = new Set(batch.map((mention) => mention.id));
    const prompt = tonePrompt(
      storeName,
      batch.map((mention) => ({ id: mention.id, text: mention.text }))
    );
    const res = await askJSON<{ items?: unknown[] }>(prompt, TONE_SCHEMA, {
      system: TONE_SYSTEM,
      model: STORE_TONE_MODEL,
    });
    if (!res) continue;

    for (const raw of res.items ?? []) {
      const row = raw as { id?: unknown; tone?: unknown } | null;
      const id = row?.id;
      const tone = row?.tone;
      if (typeof id !== "string" || !wanted.has(id)) continue;
      if (tone !== "queja" && tone !== "recomendacion" && tone !== "neutral") continue;
      updated[id] = tone;
    }
  }
  return updated;
}
