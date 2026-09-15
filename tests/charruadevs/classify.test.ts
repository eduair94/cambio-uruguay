import { beforeEach, describe, expect, it, vi } from "vitest";

const askJSON = vi.fn();
vi.mock("../../classes/gemini", () => ({ askJSON: (...a: unknown[]) => askJSON(...a) }));

import { classifyComments, classifyPosts } from "../../classes/charruadevs/classify";

const post = (id: string) => ({ id, created_utc: 1704067200, title: `t ${id}`, selftext: "", link_flair_text: null });

describe("classify", () => {
  beforeEach(() => askJSON.mockReset());

  it("returns only the ids the model answered with a valid label", async () => {
    askJSON.mockResolvedValue({
      items: [
        { id: "a", rel: true, stance: -1, themes: ["ia"], ai: "amenaza", event: "ninguno", persona: "senior" },
        { id: "zzz", rel: true, stance: 1, themes: [], ai: null, event: "ninguno", persona: "junior" },
        { id: "b", rel: "?" },
      ],
    });
    const out = await classifyPosts([post("a"), post("b")]);
    expect([...out.keys()]).toEqual(["a"]);
    expect(out.get("a")?.stance).toBe(-1);
  });

  it("a failed batch leaves its items unlabelled instead of inventing", async () => {
    askJSON.mockResolvedValue(null);
    const out = await classifyComments(
      [{ id: "c", link_id: "t3_a", parent_id: "t3_a", created_utc: 1704067200, body: "no hay laburo" }],
      new Map(),
      new Map()
    );
    expect(out.size).toBe(0);
  });

  it("splits posts in batches of 40", async () => {
    askJSON.mockResolvedValue({ items: [] });
    await classifyPosts(Array.from({ length: 81 }, (_, i) => post(`p${i}`)));
    expect(askJSON).toHaveBeenCalledTimes(3);
  });
});
