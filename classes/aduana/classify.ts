// The AI labels one text at a time; the code does every count and every choice of quote.
//
// Why the split: keyword scoring cannot tell "la aduana me retuvo el paquete" from "retuve la
// respiración" and cannot read sarcasm, so the label has to come from a model. But a model asked
// to "summarise what Reddit thinks" produces a different page every run and cites whatever it
// liked. So the model only ever answers a closed question about ONE text, and the aggregation
// below is pure and deterministic: same corpus, same page.
import { Schema } from "mongoose";
import { aiService } from "../ai_service";
import { MongooseServer } from "../database";
import { allComments, allPosts, type StoredComment, type StoredPost } from "./corpus";
import { BUCKET_IDS, type AduanaLabel, type BucketId, type Quote } from "./types";

const MAX_QUOTES_PER_BUCKET = 3;
// Below this, a "quote" is more likely a one-line reaction ("+1", "mismo problema") than an
// actual testimony. 60 is the floor that still admits a real one-sentence account — e.g.
// "me retuvieron el paquete en la aduana durante tres semanas sin ninguna explicación".
const MIN_QUOTE_CHARS = 60;
const MAX_QUOTE_CHARS = 420;

const unquotable = (author: string): boolean =>
  !author || author === "[deleted]" || author === "AutoModerator";

export function aggregate(
  labels: AduanaLabel[],
  texts: Map<string, Quote>
): { quotes: Partial<Record<BucketId, Quote[]>>; counts: Partial<Record<BucketId, number>> } {
  const quotes: Partial<Record<BucketId, Quote[]>> = {};
  const counts: Partial<Record<BucketId, number>> = {};

  for (const label of labels) {
    if (!label.confident) continue;
    const quote = texts.get(label.key);
    if (!quote || unquotable(quote.author)) continue;

    counts[label.bucket] = (counts[label.bucket] ?? 0) + 1;
    (quotes[label.bucket] ??= []).push(quote);
  }

  for (const bucket of Object.keys(quotes) as BucketId[]) {
    quotes[bucket] = quotes[bucket]!
      .filter((q) => q.text.length >= MIN_QUOTE_CHARS)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_QUOTES_PER_BUCKET)
      .map((q) => ({ ...q, text: trim(q.text) }));
  }
  return { quotes, counts };
}

/** Cut on a word boundary. The text is trimmed, never rewritten — it is somebody's words. */
function trim(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_QUOTE_CHARS) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", MAX_QUOTE_CHARS)) + "…";
}

const OUTCOMES: AduanaLabel["outcome"][] = ["resuelto", "pago", "perdio", "sin-resolver"];

function isBucketId(x: unknown): x is BucketId {
  return typeof x === "string" && (BUCKET_IDS as readonly string[]).includes(x);
}

function isOutcome(x: unknown): x is AduanaLabel["outcome"] {
  return typeof x === "string" && (OUTCOMES as readonly string[]).includes(x);
}

const PROMPT = `Sos un clasificador. Te paso UN texto de r/uruguay.
Si NO habla de un problema real con la aduana uruguaya o con una compra importada, devolvé exactamente: null
Si habla, devolvé SOLO este JSON, sin markdown, sin explicación:
{"bucket":"<uno de: ${BUCKET_IDS.join("|")}>","outcome":"resuelto|pago|perdio|sin-resolver","lesson":"<=140 caracteres, qué aprender","confident":true|false}
"confident" es false si dudás del bucket.`;

/**
 * Parse the model's raw (already-sanitized) reply into a label, or `null` on anything
 * unexpected. `JSON.parse("null")` legitimately yields `null` — the model's "not about customs"
 * answer and a parse failure both fall out of the same `if (!parsed ...)` check below. Never
 * hand-repairs malformed output: a bad bucket, a bad outcome, or JSON that doesn't parse at all
 * is just discarded, not coerced into something valid.
 */
function parseLabel(key: string, raw: string): AduanaLabel | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const p = parsed as Record<string, unknown>;
  if (!isBucketId(p.bucket)) return null;
  if (!isOutcome(p.outcome)) return null;
  return {
    key,
    bucket: p.bucket,
    outcome: p.outcome,
    lesson: typeof p.lesson === "string" ? p.lesson.slice(0, 140) : "",
    confident: p.confident === true,
  };
}

/**
 * Ask the model the one closed question about one text. Returns `null` when the AI is not
 * configured (silent no-op — see AIService#classify), when the model says this text isn't about
 * a real customs problem, or when its reply doesn't parse into a valid label.
 */
export async function labelText(input: { id: string; text: string }): Promise<AduanaLabel | null> {
  const raw = await aiService.classify(`${PROMPT}\n\nTEXTO:\n"""${input.text}"""`);
  if (raw === null) return null;
  return parseLabel(input.id, raw);
}

// Persisted ledger of every text we have ever asked the model about, keyed by the same
// postId/commentId corpus.ts dedupes on. `bucket: null` records "the model looked at this and
// said it isn't about customs" — that row still counts as "already labelled" so refreshLabels()
// never re-spends an AI call on it, which is what makes the weekly job cheap.
interface LabelRow {
  key: string;
  bucket: BucketId | null;
  outcome: AduanaLabel["outcome"] | null;
  lesson: string;
  confident: boolean;
}

const labelSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    bucket: { type: String, default: null },
    outcome: { type: String, default: null },
    lesson: { type: String, default: "" },
    confident: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const labels = () => MongooseServer.getInstance("aduana_labels", labelSchema);

function postText(p: StoredPost): string {
  return [p.title, p.selftext].filter((s) => s && s.trim()).join("\n\n");
}

/**
 * Label every post/comment not already in the `aduana_labels` collection, store the result
 * (confident, unconfident, and "not about customs" alike — all three make a key "already
 * labelled"), and return how many got a real bucket. Silent no-op without AI credentials, which
 * leaves whatever labels already exist to keep serving the page unchanged.
 */
export async function refreshLabels(): Promise<{ labeled: number }> {
  if (!aiService.isConfigured()) return { labeled: 0 };

  const [posts, comments, existingRows] = await Promise.all([
    allPosts(),
    allComments(),
    labels().allEntries({}),
  ]);
  const already = new Set((existingRows as { key: string }[]).map((r) => r.key));

  const candidates: { id: string; text: string }[] = [];
  for (const p of posts) {
    if (already.has(p.redditId)) continue;
    const text = postText(p);
    if (text.trim()) candidates.push({ id: p.redditId, text });
  }
  for (const c of comments) {
    if (already.has(c.commentId)) continue;
    if (c.body && c.body.trim()) candidates.push({ id: c.commentId, text: c.body });
  }

  let labeled = 0;
  for (const { id, text } of candidates) {
    const label = await labelText({ id, text });
    const row: LabelRow = label
      ? { key: id, bucket: label.bucket, outcome: label.outcome, lesson: label.lesson, confident: label.confident }
      : { key: id, bucket: null, outcome: null, lesson: "", confident: false };
    await labels().updateOne({ key: id }, row);
    if (label) labeled++;
  }
  return { labeled };
}

function toIsoDate(createdUtc: number): string {
  return new Date(createdUtc * 1000).toISOString().slice(0, 10);
}

function postQuote(p: StoredPost): Quote {
  return { text: postText(p), author: p.author, date: toIsoDate(p.createdUtc), score: p.score, permalink: p.permalink };
}

function commentQuote(c: StoredComment): Quote {
  return { text: c.body, author: c.author, date: toIsoDate(c.createdUtc), score: c.score, permalink: c.permalink };
}

/**
 * Load posts, comments and stored labels from Mongo, build the same `Map<string, Quote>` shape
 * `aggregate()` expects, and run it. What the weekly job (Task 6) calls to rebuild the page's
 * quotes and counts from whatever has been labelled so far.
 */
export async function aggregateFromCorpus(): Promise<{
  quotes: Partial<Record<BucketId, Quote[]>>;
  counts: Partial<Record<BucketId, number>>;
}> {
  const [posts, comments, rows] = await Promise.all([allPosts(), allComments(), labels().allEntries({})]);

  const texts = new Map<string, Quote>();
  for (const p of posts) texts.set(p.redditId, postQuote(p));
  for (const c of comments) texts.set(c.commentId, commentQuote(c));

  const validLabels: AduanaLabel[] = (rows as LabelRow[])
    .filter((r): r is LabelRow & { bucket: BucketId; outcome: AduanaLabel["outcome"] } =>
      isBucketId(r.bucket) && isOutcome(r.outcome)
    )
    .map((r) => ({ key: r.key, bucket: r.bucket, outcome: r.outcome, lesson: r.lesson ?? "", confident: !!r.confident }));

  return aggregate(validLabels, texts);
}
