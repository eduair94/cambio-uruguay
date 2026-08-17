// Batching and quota behaviour of `embedTexts`.
//
// The cooldown here is not defensive padding — it is the fix for a failure seen for real while
// calibrating the retriever: one batch tripped the per-minute TOKEN quota, the loop immediately
// fired the next one into the same closed window, and five consecutive batches failed. 60 % of the
// index was lost in a single run, silently, because every individual call "just returned null" the
// way the module's contract says it should.
//
// The pacing constants are read once at import, so each test reloads the module with its own env.
// That reload is also why the Gemini client is replaced with `vi.doMock` rather than `vi.spyOn`:
// after `resetModules()` the reloaded embed.ts imports a FRESH copy of classes/gemini, which a spy
// on the statically-imported one does not touch — the first version of this suite did exactly that
// and quietly made real API calls until every test timed out.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EmbedCall = [readonly string[], { model: string; dims: number; taskType: string }];

const calls: EmbedCall[] = [];
let impl: (texts: readonly string[]) => Array<number[] | null> = (texts) => texts.map(() => [1, 0]);

/** Reload embed.ts with the current env, against a stub Gemini client. */
async function freshEmbed() {
  vi.resetModules();
  vi.doMock("../../classes/gemini", () => ({
    embedContents: async (texts: readonly string[], opts: EmbedCall[1]) => {
      calls.push([texts, opts]);
      return impl(texts);
    },
  }));
  return import("../../classes/rag/embed");
}

const saved = { pace: process.env.RAG_EMBED_PACE_MS, cooldown: process.env.RAG_EMBED_COOLDOWN_MS };

describe("rag/embed — batching", () => {
  beforeEach(() => {
    calls.length = 0;
    impl = (texts) => texts.map(() => [1, 0]);
    process.env.RAG_EMBED_PACE_MS = "0";
    process.env.RAG_EMBED_COOLDOWN_MS = "0";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.RAG_EMBED_PACE_MS = saved.pace;
    process.env.RAG_EMBED_COOLDOWN_MS = saved.cooldown;
    vi.restoreAllMocks();
    vi.doUnmock("../../classes/gemini");
    vi.resetModules();
  });

  it("splits the input into calls of at most EMBED_BATCH and keeps the order", async () => {
    const { embedTexts, EMBED_BATCH } = await freshEmbed();
    impl = (texts) => texts.map((t) => [Number(t), 0]);

    const inputs = Array.from({ length: EMBED_BATCH * 2 + 7 }, (_v, i) => String(i + 1));
    const out = await embedTexts(inputs, "RETRIEVAL_DOCUMENT");

    expect(calls.map((c) => c[0].length)).toEqual([EMBED_BATCH, EMBED_BATCH, 7]);
    expect(out).toHaveLength(inputs.length);
    expect(calls.flatMap((c) => [...c[0]])).toEqual(inputs);
  });

  it("normalises what comes back — the whole point of this module", async () => {
    const { embedOne } = await freshEmbed();
    impl = () => [[3, 4, 0, 0]];
    const vector = await embedOne("x", "RETRIEVAL_QUERY");
    expect(Math.hypot(...vector!)).toBeCloseTo(1, 6);
  });

  it("keeps a null hole for one bad input without stalling the run", async () => {
    const { embedTexts } = await freshEmbed();
    impl = () => [[1, 0], null, [0, 1]];
    const out = await embedTexts(["a", "b", "c"], "RETRIEVAL_DOCUMENT");
    expect(out[0]).not.toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).not.toBeNull();
  });

  it("waits and retries once when a whole batch came back empty", async () => {
    process.env.RAG_EMBED_COOLDOWN_MS = "1";
    const { embedTexts } = await freshEmbed();
    let n = 0;
    impl = (texts) => {
      n++;
      return n === 1 ? texts.map(() => null) : texts.map(() => [1, 0]);
    };

    const out = await embedTexts(["a", "b"], "RETRIEVAL_DOCUMENT");
    expect(calls).toHaveLength(2); // the batch, then the retry after the cooldown
    expect(out.every((v) => v !== null)).toBe(true);
  });

  it("does not burn the cooldown on a partial result — that is not a quota problem", async () => {
    process.env.RAG_EMBED_COOLDOWN_MS = "1";
    const { embedTexts } = await freshEmbed();
    impl = () => [[1, 0], null];
    await embedTexts(["a", "b"], "RETRIEVAL_DOCUMENT");
    expect(calls).toHaveLength(1);
  });

  it("gives up after the retry rather than looping forever", async () => {
    process.env.RAG_EMBED_COOLDOWN_MS = "1";
    const { embedTexts } = await freshEmbed();
    impl = (texts) => texts.map(() => null);
    const out = await embedTexts(["a", "b"], "RETRIEVAL_DOCUMENT");
    expect(calls).toHaveLength(2);
    expect(out).toEqual([null, null]);
  });

  it("asks for RETRIEVAL_DOCUMENT when indexing and RETRIEVAL_QUERY when searching", async () => {
    const { embedTexts } = await freshEmbed();
    await embedTexts(["x"], "RETRIEVAL_DOCUMENT");
    await embedTexts(["x"], "RETRIEVAL_QUERY");
    expect(calls[0]![1].taskType).toBe("RETRIEVAL_DOCUMENT");
    expect(calls[1]![1].taskType).toBe("RETRIEVAL_QUERY");
  });
});
