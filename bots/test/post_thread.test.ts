// The thread poster has one property that matters more than anything it does when it works:
// X has no transaction, so a thread that fails halfway leaves the first half published forever.
// Everything here pins the checks that happen BEFORE the first tweet goes out.
import { describe, expect, it, vi } from "vitest";
import { parseThread } from "../src/entries/post_thread.js";
import { TwitterPublisher } from "../src/publish/twitter.js";

describe("parseThread", () => {
  it("splits on a line that is only ---", () => {
    expect(parseThread("uno\n---\ndos\n---\ntres")).toEqual(["uno", "dos", "tres"]);
  });

  it("keeps blank lines INSIDE a tweet, which is what makes a thread readable", () => {
    const [first] = parseThread("titular\n\ncuerpo del tuit\n---\nsiguiente");
    expect(first).toBe("titular\n\ncuerpo del tuit");
  });

  it("ignores a trailing separator and stray whitespace", () => {
    expect(parseThread("uno\n---\ndos\n---\n   \n")).toEqual(["uno", "dos"]);
    expect(parseThread("  \n")).toEqual([]);
  });

  it("does not split on --- that is part of a sentence", () => {
    expect(parseThread("un guión --- en el medio no corta")).toHaveLength(1);
  });
});

describe("TwitterPublisher.thread", () => {
  it("chains every tweet as a reply to the previous one", async () => {
    const tweet = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "1" } })
      .mockResolvedValueOnce({ data: { id: "2" } })
      .mockResolvedValueOnce({ data: { id: "3" } });
    const publisher = new TwitterPublisher(
      { appKey: "a", appSecret: "b", accessToken: "c", accessSecret: "d" },
      {}
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (publisher as any).client = { v2: { tweet } };

    const ids = await publisher.thread(["uno", "dos", "tres"]);

    expect(ids).toEqual(["1", "2", "3"]);
    expect(tweet.mock.calls[0]?.[1]).toBeUndefined();
    expect(tweet.mock.calls[1]?.[1]).toEqual({ reply: { in_reply_to_tweet_id: "1" } });
    expect(tweet.mock.calls[2]?.[1]).toEqual({ reply: { in_reply_to_tweet_id: "2" } });
  });

  it("says WHERE it broke, because the tweets before it stay published", async () => {
    const tweet = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: "1" } })
      .mockRejectedValueOnce(new Error("rate limited"));
    const publisher = new TwitterPublisher(
      { appKey: "a", appSecret: "b", accessToken: "c", accessSecret: "d" },
      {}
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (publisher as any).client = { v2: { tweet } };

    await expect(publisher.thread(["uno", "dos", "tres"])).rejects.toThrow(
      /tweet 2\/3 \(1 already posted\)/
    );
  });

  it("posts nothing in a dry run", async () => {
    const tweet = vi.fn();
    const publisher = new TwitterPublisher(
      { appKey: "a", appSecret: "b", accessToken: "c", accessSecret: "d" },
      { dryRun: true }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (publisher as any).client = { v2: { tweet } };

    await expect(publisher.thread(["uno", "dos"])).resolves.toEqual([]);
    expect(tweet).not.toHaveBeenCalled();
  });

  it("an empty thread is a no-op, not a crash", async () => {
    const publisher = new TwitterPublisher(undefined, {});
    await expect(publisher.thread([])).resolves.toEqual([]);
    await expect(publisher.thread(["  ", ""])).resolves.toEqual([]);
  });
});
