// Task 7: an aggregated, automatic tone (queja/recomendacion/neutral) over a store's ALREADY STORED
// Reddit mentions (classes/stores/signals/reddit.ts) — counts only, never a quote, never an author,
// never a per-mention verdict shown anywhere. `askJSON` (classes/gemini.ts) is mocked exactly like
// tests/charruadevs/classify.test.ts: this file never calls Gemini.
import { beforeEach, describe, expect, it, vi } from "vitest";

const askJSON = vi.fn();
vi.mock("../../classes/gemini", () => ({ askJSON: (...args: unknown[]) => askJSON(...args) }));

import {
  STORE_TONE_MAX_PER_RUN,
  STORE_TONE_MODEL,
  applyTone,
  classifyMentions,
  freshMentionsToClassify,
  pruneToneCache,
  tonePrompt,
  type MentionTone,
} from "../../classes/stores/signals/tone";
import { STORE_REDDIT_MAX_MENTIONS, type RedditMention, type StoredRedditMention } from "../../classes/stores/signals/reddit";

function mention(id: string, text = `texto de ${id}`, createdUtc = 1_760_000_000): RedditMention {
  return {
    id,
    kind: "post",
    sub: "uruguay",
    createdUtc,
    threadId: id,
    title: `Hilo ${id}`,
    permalink: `/r/uruguay/comments/${id}/`,
    score: 1,
    text,
  };
}

/** A STORED mention (no text) at a given id/date — the shape `freshMentionsToClassify`'s `stored`
 * argument actually has in production (classes/stores/profile.ts never hands it text). */
function storedM(id: string, createdUtc: number): StoredRedditMention {
  const { text: _text, ...rest } = mention(id, "", createdUtc);
  return rest;
}

describe("applyTone", () => {
  it("is null with fewer than 5 classified mentions", () => {
    const cache: Record<string, MentionTone> = { a: "queja", b: "queja", c: "recomendacion", d: "neutral" };
    expect(applyTone(cache, [mention("a"), mention("b"), mention("c"), mention("d")])).toBeNull();
  });

  it("counts exactly with 6 classified: 3 quejas, 2 recomendaciones, 1 neutral", () => {
    const cache: Record<string, MentionTone> = {
      a: "queja",
      b: "queja",
      c: "queja",
      d: "recomendacion",
      e: "recomendacion",
      f: "neutral",
    };
    const mentions = ["a", "b", "c", "d", "e", "f"].map((id) => mention(id));
    expect(applyTone(cache, mentions)).toEqual({ complaints: 3, recommendations: 2, neutral: 1, classified: 6 });
  });

  it("ignores a mention with no cache entry, and never counts an id twice", () => {
    const cache: Record<string, MentionTone> = { a: "queja", b: "queja", c: "queja", d: "queja", e: "queja" };
    const mentions = [...["a", "b", "c", "d", "e"].map((id) => mention(id)), mention("uncached"), mention("a")];
    expect(applyTone(cache, mentions)!.classified).toBe(5);
  });
});

describe("pruneToneCache", () => {
  it("drops ids no longer among the stored mentions", () => {
    const cache: Record<string, MentionTone> = { a: "queja", b: "neutral", gone: "recomendacion" };
    expect(pruneToneCache(cache, [mention("a"), mention("b")])).toEqual({ a: "queja", b: "neutral" });
  });

  it("keeps an empty cache empty", () => {
    expect(pruneToneCache({}, [mention("a")])).toEqual({});
  });
});

describe("tonePrompt", () => {
  it("names the store and asks to classify only regarding it", () => {
    const prompt = tonePrompt("Divino", [{ id: "a", text: "compré en Divino" }]);
    expect(prompt).toContain("Divino");
    expect(prompt).toMatch(/S[ÓO]LO/);
  });

  it("cuts each mention's text to 600 characters", () => {
    const long = "x".repeat(700);
    const prompt = tonePrompt("Divino", [{ id: "a", text: long }]);
    expect(prompt).toContain("x".repeat(600));
    expect(prompt).not.toContain("x".repeat(601));
  });
});

describe("classifyMentions", () => {
  beforeEach(() => askJSON.mockReset());

  it("classifies only mentions missing from the cache", async () => {
    askJSON.mockResolvedValue({ items: [{ id: "b", tone: "queja" }] });
    const result = await classifyMentions("Divino", [mention("a"), mention("b")], { a: "neutral" });
    expect(askJSON).toHaveBeenCalledTimes(1);
    const prompt = askJSON.mock.calls[0]![0] as string;
    expect(prompt).not.toContain("id=a:");
    expect(prompt).toContain("id=b:");
    expect(result).toEqual({ a: "neutral", b: "queja" });
  });

  it("pins the model and passes a system instruction", async () => {
    askJSON.mockResolvedValue({ items: [] });
    await classifyMentions("Divino", [mention("a")], {});
    expect(askJSON).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ model: STORE_TONE_MODEL, system: expect.any(String) })
    );
  });

  it("rejects an id the model answers that was not asked in that batch", async () => {
    askJSON.mockResolvedValue({
      items: [
        { id: "a", tone: "queja" },
        { id: "zzz", tone: "recomendacion" },
      ],
    });
    const result = await classifyMentions("Divino", [mention("a")], {});
    expect(result).toEqual({ a: "queja" });
  });

  it("rejects an invalid tone value from the model", async () => {
    askJSON.mockResolvedValue({ items: [{ id: "a", tone: "furioso" }] });
    const result = await classifyMentions("Divino", [mention("a")], {});
    expect(result).toEqual({});
  });

  it("leaves a batch unclassified when askJSON returns null (no key/error), and never throws", async () => {
    askJSON.mockResolvedValue(null);
    const result = await classifyMentions("Divino", [mention("a"), mention("b")], {});
    expect(result).toEqual({});
  });

  it("a failed batch does not stop the next batch from being asked", async () => {
    // 30 mentions → batches of 25: the first fails, the second (ids z25..z29) is still asked.
    askJSON.mockResolvedValueOnce(null).mockResolvedValueOnce({ items: [{ id: "z25", tone: "neutral" }] });
    const mentions = Array.from({ length: 30 }, (_, i) => mention(`z${i}`));
    const result = await classifyMentions("Divino", mentions, {});
    expect(askJSON).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ z25: "neutral" });
  });

  it("batches in groups of 25 and caps at STORE_TONE_MAX_PER_RUN (500) classifications per run", async () => {
    askJSON.mockResolvedValue({ items: [] });
    const mentions = Array.from({ length: 520 }, (_, i) => mention(`m${i}`));
    await classifyMentions("Divino", mentions, {});
    expect(askJSON).toHaveBeenCalledTimes(20); // ceil(500 / 25)
    const totalIds = askJSON.mock.calls.reduce((sum, call) => {
      const prompt = call[0] as string;
      return sum + (prompt.match(/id=/g) ?? []).length;
    }, 0);
    expect(totalIds).toBe(STORE_TONE_MAX_PER_RUN);
  });

  it("makes no call and returns the same cache when nothing is pending", async () => {
    const cache: Record<string, MentionTone> = { a: "queja" };
    const result = await classifyMentions("Divino", [mention("a")], cache);
    expect(askJSON).not.toHaveBeenCalled();
    expect(result).toBe(cache);
  });

  it("makes no call with an empty mentions list", async () => {
    const result = await classifyMentions("Divino", [], {});
    expect(askJSON).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });
});

// Fix round 1, ruling on I2: `STORE_TONE_MAX_PER_RUN` now matches `STORE_REDDIT_MAX_MENTIONS` (500),
// and the caller (sync_store_profiles.ts) is expected to pass `freshMentionsToClassify`'s result, not
// the raw increment — otherwise a big backfill run could fetch far more than 500 fresh mentions in one
// go, and whatever a run does not classify is lost for good (their raw text only ever exists in that
// run's memory; a later run never re-fetches an already-stored window).
describe("freshMentionsToClassify", () => {
  beforeEach(() => askJSON.mockReset());

  it("STORE_TONE_MAX_PER_RUN equals the store's own mention cap", () => {
    expect(STORE_TONE_MAX_PER_RUN).toBe(STORE_REDDIT_MAX_MENTIONS);
    expect(STORE_TONE_MAX_PER_RUN).toBe(500);
  });

  it("returns every fresh mention when nothing is evicted, newest first, carrying its text", () => {
    const fresh = Array.from({ length: 5 }, (_, i) => mention(`f${i}`, `texto ${i}`, 2_000_000 + i));
    const result = freshMentionsToClassify([], fresh);
    expect(result.map((m) => m.id)).toEqual(["f4", "f3", "f2", "f1", "f0"]);
    expect(result[0]!.text).toBe("texto 4");
  });

  it("excludes a fresh mention evicted by the 500-mention cap", () => {
    // 500 stored mentions (createdUtc 1000..1499) plus 2 fresh ones: one newer than everything
    // (survives at the top) and one older than everything (502 unique total, cap 500 — it is the one
    // dropped, along with the single oldest stored mention).
    const stored = Array.from({ length: 500 }, (_, i) => storedM(`s${i}`, 1000 + i));
    const fresh = [mention("newest", "nueva", 5000), mention("evicted", "vieja", 0)];
    const result = freshMentionsToClassify(stored, fresh);
    expect(result.map((m) => m.id)).toEqual(["newest"]);
  });

  it("returns nothing for an empty fresh list, without looking at stored at all", () => {
    expect(freshMentionsToClassify([storedM("s1", 1)], [])).toEqual([]);
  });

  it("180 fresh mentions with no eviction all survive, and all get classification requests in one run (8 batches)", async () => {
    askJSON.mockResolvedValue({ items: [] });
    const fresh = Array.from({ length: 180 }, (_, i) => mention(`f${i}`, `texto ${i}`, 2_000_000 + i));
    const toClassify = freshMentionsToClassify([], fresh);
    expect(toClassify).toHaveLength(180);
    await classifyMentions("Divino", toClassify, {});
    expect(askJSON).toHaveBeenCalledTimes(8); // ceil(180 / 25)
  });

  it("a fresh mention already in the tone cache is not re-sent", async () => {
    askJSON.mockResolvedValue({ items: [] });
    const fresh = [mention("cached", "ya clasificada"), mention("new", "sin clasificar")];
    const toClassify = freshMentionsToClassify([], fresh);
    await classifyMentions("Divino", toClassify, { cached: "neutral" });
    expect(askJSON).toHaveBeenCalledTimes(1);
    const prompt = askJSON.mock.calls[0]![0] as string;
    expect(prompt).not.toContain("id=cached:");
    expect(prompt).toContain("id=new:");
  });
});
