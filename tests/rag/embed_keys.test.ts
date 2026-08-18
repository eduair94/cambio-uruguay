// Key rotation for embeddings.
//
// More than one key is CAPACITY, not redundancy. The quota is
// `EmbedContentRequestsPerDayPerUserPerProjectPerModel-FreeTier` = 1 000/day, metered per PROJECT,
// and every item of a batch counts as one — so a second key from a second project is a second
// thousand, and it is the difference between a first index build taking five days and taking two.
//
// This box already had two distinct keys (one in the backend `.env`, a different one the app was
// configured with) and was only ever spending one of them.
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

async function fresh() {
  vi.resetModules();
  return import("../../classes/gemini");
}

const saved = {
  list: process.env.GEMINI_EMBED_KEYS,
  root: process.env.GEMINI_API_KEY,
  nuxt: process.env.NUXT_GEMINI_API_KEY,
  embed: process.env.GEMINI_EMBED_API_KEY,
  backoff: process.env.GEMINI_RETRY_BASE_MS,
};

const restore = (name: keyof typeof saved, envName: string) => {
  if (saved[name] === undefined) delete process.env[envName];
  else process.env[envName] = saved[name]!;
};

/** An axios-shaped 429, which is what a spent daily quota looks like after backoff. */
const quotaError = () => Object.assign(new Error("429"), { response: { status: 429, headers: {} } });
const ok = (n: number, dims: number) => ({
  data: { embeddings: Array.from({ length: n }, () => ({ values: Array(dims).fill(0.1) })) },
});

describe("gemini — embedding key rotation", () => {
  beforeEach(() => {
    delete process.env.GEMINI_EMBED_KEYS;
    delete process.env.GEMINI_EMBED_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.NUXT_GEMINI_API_KEY;
    // A real four-attempt backoff is ~22 s per key; this exercises the same path in milliseconds.
    process.env.GEMINI_RETRY_BASE_MS = "1";
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    restore("list", "GEMINI_EMBED_KEYS");
    restore("root", "GEMINI_API_KEY");
    restore("nuxt", "NUXT_GEMINI_API_KEY");
    restore("embed", "GEMINI_EMBED_API_KEY");
    restore("backoff", "GEMINI_RETRY_BASE_MS");
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("counts the distinct keys the environment already has", async () => {
    process.env.GEMINI_API_KEY = "uno";
    process.env.NUXT_GEMINI_API_KEY = "dos";
    const { embedKeysAvailable } = await fresh();
    expect(embedKeysAvailable()).toBe(2);
  });

  it("does not double-count the same key configured twice", async () => {
    process.env.GEMINI_API_KEY = "igual";
    process.env.NUXT_GEMINI_API_KEY = "igual";
    const { embedKeysAvailable } = await fresh();
    expect(embedKeysAvailable()).toBe(1);
  });

  it("lets GEMINI_EMBED_KEYS override the discovery", async () => {
    process.env.GEMINI_API_KEY = "ignorada";
    process.env.GEMINI_EMBED_KEYS = " a , b ,c ";
    const { embedKeysAvailable } = await fresh();
    expect(embedKeysAvailable()).toBe(3);
  });

  it("reports zero when nothing is configured, instead of pretending", async () => {
    const { embedKeysAvailable } = await fresh();
    // Cleared AFTER the import on purpose: gemini.ts runs `dotenv.config()` at load, which would
    // repopulate them from the developer's own .env and make this pass only on a clean CI box.
    // `embedKeys()` reads the environment per call, so clearing it here is the honest test.
    delete process.env.GEMINI_API_KEY;
    delete process.env.NUXT_GEMINI_API_KEY;
    delete process.env.GEMINI_EMBED_API_KEY;
    delete process.env.GEMINI_EMBED_KEYS;
    expect(embedKeysAvailable()).toBe(0);
  });

  it("moves to the next key when the first is out of daily quota", async () => {
    process.env.GEMINI_EMBED_KEYS = "gastada,fresca";
    const { embedContents } = await fresh();
    const used: string[] = [];
    vi.spyOn(axios, "post").mockImplementation(async (_url: any, _body: any, cfg: any) => {
      used.push(cfg.params.key);
      if (cfg.params.key === "gastada") throw quotaError();
      return ok(2, 4) as any;
    });

    const out = await embedContents(["a", "b"], { model: "m", dims: 4, taskType: "RETRIEVAL_DOCUMENT" });
    expect(out.every((v) => v !== null)).toBe(true);
    expect(used[used.length - 1]).toBe("fresca");
  });

  it("retires the spent key for the rest of the process instead of retrying it every batch", async () => {
    process.env.GEMINI_EMBED_KEYS = "gastada,fresca";
    const { embedContents, embedKeysAvailable } = await fresh();
    vi.spyOn(axios, "post").mockImplementation(async (_url: any, _body: any, cfg: any) => {
      if (cfg.params.key === "gastada") throw quotaError();
      return ok(1, 4) as any;
    });

    await embedContents(["a"], { model: "m", dims: 4, taskType: "RETRIEVAL_DOCUMENT" });
    expect(embedKeysAvailable()).toBe(1);

    const post = vi.mocked(axios.post);
    post.mockClear();
    await embedContents(["b"], { model: "m", dims: 4, taskType: "RETRIEVAL_DOCUMENT" });
    // Only the surviving key is tried; the spent one is not asked again.
    expect(post.mock.calls.every((c: any) => c[2].params.key === "fresca")).toBe(true);
  });

  it("gives up with nulls once every key is spent", async () => {
    process.env.GEMINI_EMBED_KEYS = "una,otra";
    const { embedContents } = await fresh();
    vi.spyOn(axios, "post").mockRejectedValue(quotaError());
    const out = await embedContents(["a", "b"], { model: "m", dims: 4, taskType: "RETRIEVAL_DOCUMENT" });
    expect(out).toEqual([null, null]);
  });

  it("does not rotate on a non-quota error — that key is fine, the request was not", async () => {
    process.env.GEMINI_EMBED_KEYS = "una,otra";
    const { embedContents, embedKeysAvailable } = await fresh();
    vi.spyOn(axios, "post").mockRejectedValue(
      Object.assign(new Error("400"), { response: { status: 400, headers: {} } })
    );
    const out = await embedContents(["a"], { model: "m", dims: 4, taskType: "RETRIEVAL_DOCUMENT" });
    expect(out).toEqual([null]);
    expect(embedKeysAvailable()).toBe(2);
  });
});
