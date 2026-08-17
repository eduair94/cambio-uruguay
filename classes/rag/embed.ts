// Vectors: the model choice, the normalisation, the packing, and the batching.
//
// The HTTP call itself is NOT here — it lives in classes/gemini.ts, which is the one file in the
// backend allowed to touch the Gemini endpoint (`tests/gemini_key_ownership.test.ts` enforces it).
// That is not bureaucracy: the embedding endpoint shares a host, a key and a per-minute quota with
// every grounded job in the fleet, so a second client here would be a second unpaced burst
// competing with them — and a second place for every retry bug to be fixed twice.
//
// THE NORMALISATION IS NOT OPTIONAL. Verified against the live API on 2026-08-17:
// `gemini-embedding-001` at `outputDimensionality: 768` returns vectors with an L2 norm of ~0.59,
// because 768 is a Matryoshka truncation of the model's native 3072 and only the full-width output
// is unit-length. A cosine computed as a bare dot product over those vectors is off by ~1/0.59²,
// which does not look like a bug — it looks like a threshold that needs tuning, and every score in
// the system silently means something other than what it says. `gemini-embedding-2` happens to
// return unit vectors today; normalising unconditionally means switching models via env cannot
// quietly change what a score means.

import dotenv from "dotenv";
import { embedContents } from "../gemini";

dotenv.config();

export const EMBED_MODEL = (process.env.RAG_EMBED_MODEL || "gemini-embedding-001").trim();
export const EMBED_DIMS = ((): number => {
  const raw = Number(process.env.RAG_EMBED_DIMS);
  return Number.isFinite(raw) && raw >= 128 ? Math.floor(raw) : 768;
})();

/**
 * Items per API call. `:batchEmbedContents` accepts up to 100; we send 50.
 *
 * The limit that actually binds is tokens per minute, not calls per minute — measured against the
 * live API on 2026-08-17, 600 chunks of ~300 tokens went through in 18 s untouched, while a
 * different burst of 773 tripped it. Since every item in a batch counts, a smaller batch is a
 * smaller blast radius: when one call is refused, 50 chunks wait for the next run instead of 100.
 */
export const EMBED_BATCH = 50;

/** Gap between successive batches. Cheap insurance against walking into the TPM window. */
const PACE_MS = ((): number => {
  const raw = Number(process.env.RAG_EMBED_PACE_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 250;
})();

/**
 * How long to wait after a batch came back completely empty.
 *
 * This is the fix for the failure actually observed while calibrating: one batch tripped the
 * per-minute token quota, and because the loop immediately fired the next one, every remaining
 * batch failed too — five in a row, 60 % of the index lost in a single run. The quota window is a
 * minute long, so the only useful response to "you are over the limit" is to stop for most of a
 * minute. Backoff inside a single call cannot do this: by the time that call gives up, the caller
 * is already sending the next one.
 */
const COOLDOWN_MS = ((): number => {
  const raw = Number(process.env.RAG_EMBED_COOLDOWN_MS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 45000;
})();

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Indexing and querying are asymmetric; see the note on `embedContents`. */
export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function embeddingsConfigured(): boolean {
  const ok = !!(process.env.GEMINI_API_KEY || process.env.NUXT_GEMINI_API_KEY);
  if (!ok) console.warn("[rag/embed] no GEMINI_API_KEY / NUXT_GEMINI_API_KEY — embedding is a no-op");
  return ok;
}

/** In place. A zero vector stays zero (its cosine against anything is 0, which is the honest answer). */
export function normalise(vector: Float32Array): Float32Array {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) sum += vector[i]! * vector[i]!;
  const norm = Math.sqrt(sum);
  if (norm > 0) for (let i = 0; i < vector.length; i++) vector[i] = vector[i]! / norm;
  return vector;
}

/** Dot product. Only a cosine when BOTH operands are normalised — which, here, they always are. */
export function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += a[i]! * b[i]!;
  return sum;
}

/**
 * Embed any number of texts, batched. Index-aligned with the input; `null` = this one failed.
 *
 * Backs off hard after an empty batch (see {@link COOLDOWN_MS}) and gives that batch one more
 * chance once the quota window has rolled over, because the difference between "we lost 50 chunks"
 * and "we lost the rest of the run" is exactly that pause.
 */
export async function embedTexts(texts: readonly string[], task: EmbedTask): Promise<Array<Float32Array | null>> {
  const out: Array<Float32Array | null> = [];
  const opts = { model: EMBED_MODEL, dims: EMBED_DIMS, taskType: task };

  for (let i = 0; i < texts.length; i += EMBED_BATCH) {
    const slice = texts.slice(i, i + EMBED_BATCH);
    let values = await embedContents(slice, opts);

    // All-null means the call itself failed (a partial result would have some vectors). Anything
    // else — one bad input among fifty — is not a quota problem and must not stall the run.
    if (values.every((v) => v === null) && COOLDOWN_MS > 0) {
      console.warn(`[rag/embed] lote vacío en el ítem ${i}; esperando ${Math.round(COOLDOWN_MS / 1000)}s por la cuota`);
      await sleep(COOLDOWN_MS);
      values = await embedContents(slice, opts);
      if (values.every((v) => v === null)) {
        console.warn(`[rag/embed] el reintento del ítem ${i} también falló; esos ${slice.length} quedan para la próxima corrida`);
      }
    } else if (PACE_MS > 0 && i + EMBED_BATCH < texts.length) {
      await sleep(PACE_MS);
    }

    out.push(...values.map((v) => (v ? normalise(Float32Array.from(v)) : null)));
  }
  return out;
}

/** One text. `null` on any failure, including "not configured". */
export async function embedOne(text: string, task: EmbedTask): Promise<Float32Array | null> {
  const [vector] = await embedTexts([text], task);
  return vector ?? null;
}

// Float32Array ⇄ Buffer, for Mongo. See the note in models/RagChunk.ts on why this is not an array
// of doubles.
//
// Both directions go through the explicit little-endian float accessors rather than wrapping the
// Buffer's ArrayBuffer in a Float32Array view. Two reasons, and the first one is a crash:
//
//  - Alignment. A Float32Array view requires a 4-byte-aligned `byteOffset`, and a Buffer's offset
//    into its (pooled) ArrayBuffer is arbitrary — Node hands out small Buffers as slices of an 8 KB
//    pool. `new Float32Array(buf.buffer, buf.byteOffset, …)` therefore throws RangeError for some
//    documents and not others, depending on what else the process allocated first. Copying into a
//    fresh Buffer does NOT fix it: the copy is pooled too.
//  - Endianness. A typed-array view is platform-endian while the stored bytes are not tagged, so a
//    database written on x86 and read on a big-endian host would silently decode to garbage
//    vectors — cosines near zero, no error anywhere. Pinning both sides to LE removes the question.
//
// The cost is ~4 M float reads to load the whole index (tens of milliseconds, once per process).

export function vectorToBuffer(vector: Float32Array): Buffer {
  const buf = Buffer.allocUnsafe(vector.length * 4);
  for (let i = 0; i < vector.length; i++) buf.writeFloatLE(vector[i]!, i * 4);
  return buf;
}

export function bufferToVector(buf: Buffer): Float32Array {
  const out = new Float32Array(Math.floor(buf.byteLength / 4));
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}
