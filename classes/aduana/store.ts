// One Mongo document (`aduana_data`) holding the whole public payload. Small, always read whole,
// always written whole by the weekly job — the same single-document shape used elsewhere in
// classes/ (e.g. classes/bcu_details.ts, keyed by a single filter field instead of many rows).
import { MongooseServer, Schema } from "../database";
import { BASELINE } from "./baseline";
import type { AduanaDoc } from "./types";

const KEY = "aduana_data";
const schema = new Schema({ key: String, doc: Schema.Types.Mixed }, { strict: false });
const server = () => MongooseServer.getInstance("aduana_data", schema);

/** What every reader falls back to before the first sync has run: the verified baseline. */
export function emptyAduanaDoc(): AduanaDoc {
  return JSON.parse(JSON.stringify(BASELINE)) as AduanaDoc;
}

/**
 * Merge the stored Mongo doc on top of the baseline FILE — never the other way around.
 *
 * The baseline file is the human's edit surface for the law: `facts`, `problems` and `sources`
 * come from it, full stop. A top-level `{ ...base, ...stored }` spread (the bug this replaces)
 * let the stored doc's arrays replace the baseline's wholesale, because `sync_aduana.ts` writes
 * the whole doc back every week. Once that first sync ran, correcting a fact in `baseline.ts` —
 * the documented human response to a `pendingReview` flag, or to any change in the law — became a
 * silent no-op in production: the page kept serving whatever Mongo already had, and a dispute the
 * AI keeps re-raising against the (now-current) baseline value could never be discharged, because
 * the human's fix never reached the published doc.
 *
 * Mongo owns only what the baseline file cannot carry:
 *  - `facts[].aiCheckedAt` — the weekly grounded re-check's freshness stamp, but ONLY while it was
 *    stamped against the value we still publish. A stamp taken against a value the baseline has
 *    since superseded is not a check of the new value, so it does not survive the merge.
 *  - `quotes` / `counts` — the Reddit corpus, which has no home in the baseline file at all.
 *  - `updatedAt` — when the sync last ran.
 *  - `pendingReview` — but filtered: an id stays flagged only while the baseline's current value
 *    still matches what was stored when the AI raised the dispute. The moment a human edits
 *    `baseline.ts` for that fact, the two diverge and the flag is discharged — editing the file
 *    *is* the resolution, whether the human agreed with the AI's proposal or overruled it with a
 *    fact of their own; either way there is nothing left for a human to review.
 *
 * `base` defaults to the real baseline and is only ever overridden by tests (see
 * tests/aduana/store.test.ts) — passing a synthetic "baseline after a human's edit" is how those
 * tests exercise "the file changed since the last sync" without touching classes/aduana/baseline.ts.
 */
export function mergeAduanaDoc(
  stored: Partial<AduanaDoc> | undefined,
  base: AduanaDoc = emptyAduanaDoc()
): AduanaDoc {
  if (!stored) return base;

  const storedFactById = new Map((stored.facts ?? []).map((f) => [f.id, f]));
  const facts = base.facts.map((f) => {
    const s = storedFactById.get(f.id);
    return s?.aiCheckedAt && String(s.value) === String(f.value) ? { ...f, aiCheckedAt: s.aiCheckedAt } : f;
  });

  const baseFactById = new Map(base.facts.map((f) => [f.id, f]));
  const pendingReview = (stored.pendingReview ?? []).filter((id) => {
    const baseFact = baseFactById.get(id);
    if (!baseFact) return false; // the fact itself is gone from the baseline — nothing to review
    return String(storedFactById.get(id)?.value) === String(baseFact.value);
  });

  return {
    ...base, // facts (below), problems and sources: the baseline file, always — never Mongo's copy
    facts,
    quotes: stored.quotes ?? base.quotes,
    counts: stored.counts ?? base.counts,
    updatedAt: stored.updatedAt ?? base.updatedAt,
    pendingReview,
  };
}

export async function loadAduanaDoc(): Promise<AduanaDoc> {
  const rows = await server().aggregate([{ $match: { key: KEY } }, { $limit: 1 }]);
  return mergeAduanaDoc(rows[0]?.doc as Partial<AduanaDoc> | undefined);
}

export async function saveAduanaDoc(doc: AduanaDoc): Promise<void> {
  // `updateOne` upserts (findOneAndUpdate-style options) and strips the filter's keys from the
  // update object before sending it — Mongoose then implicitly wraps the remaining fields in
  // `$set` (see classes/database.ts). On upsert, Mongo copies the equality filter's `key` field
  // into the newly created document, so the saved doc still ends up `{ key: KEY, doc }`.
  await server().updateOne({ key: KEY }, { key: KEY, doc });
}
