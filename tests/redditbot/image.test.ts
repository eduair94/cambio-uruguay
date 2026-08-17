// Getting the picture out of a Reddit post, and refusing the ones that are not a question.
import { describe, expect, it } from "vitest";
import { imageUrlOfRawPost } from "../../classes/reddit";
import { botConfig } from "../../classes/redditbot/config";
import { screenPost } from "../../classes/redditbot/filter";
import type { RedditPostRaw } from "../../classes/reddit";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);
const cfg = { ...botConfig(), minAgeMinutes: 15, maxAgeHours: 8 };

const post = (over: Partial<RedditPostRaw> = {}): RedditPostRaw => ({
  id: "img1",
  sub: "uruguay",
  title: "¿Me llegó esto de DHL, es normal?",
  selftext: "",
  author: "alguien",
  score: 1,
  numComments: 0,
  permalink: "https://reddit.com/r/uruguay/comments/img1/x",
  createdUtc: (NOW - 60 * 60 * 1000) / 1000,
  url: "https://i.redd.it/abc.jpg",
  over18: false,
  locked: false,
  stickied: false,
  isSelf: false,
  linkFlair: "",
  imageUrl: "https://preview.redd.it/abc.jpg?width=1080&s=sig",
  ...over,
});

describe("redditbot — posts that ARE the screenshot", () => {
  it("lets a short image post through: the picture is the question", () => {
    // Without the image these 38 characters would be dropped as too_short, and those threads are
    // exactly the ones the site answers best.
    expect(screenPost(post(), cfg, NOW).ok).toBe(true);
  });

  it("still drops the same short title when there is no image", () => {
    expect(screenPost(post({ imageUrl: undefined }), cfg, NOW).reason).toBe("too_short");
  });

  it("recognises the courier named in the title as the topic", () => {
    expect(screenPost(post(), cfg, NOW).matched).toContain("dhl");
  });

  it("does not let an image excuse a thread that is not about money", () => {
    const meme = post({ title: "¿Vieron esta puesta de sol en la rambla?", selftext: "" });
    expect(screenPost(meme, cfg, NOW).reason).toBe("off_topic");
  });

  it("does not let an image excuse a post that asks nothing", () => {
    const rant = post({ title: "Otra vez el courier cobrando de más.", selftext: "" });
    expect(screenPost(rant, cfg, NOW).reason).toBe("not_a_question");
  });
});

describe("reddit — imageUrlOfRawPost", () => {
  it("unescapes &amp; — a preview URL kept HTML-escaped answers 403", () => {
    // The `s=` parameter is a signature, so `&amp;s=` is simply a different (invalid) query.
    const url = imageUrlOfRawPost({
      preview: { images: [{ source: { url: "https://preview.redd.it/a.jpg?width=1080&amp;crop=smart&amp;s=abc" } }] },
    });
    expect(url).toBe("https://preview.redd.it/a.jpg?width=1080&crop=smart&s=abc");
  });

  it("prefers the preview over url — for a crosspost, url points at the other thread", () => {
    const url = imageUrlOfRawPost({
      url: "https://reddit.com/r/otro/comments/xyz",
      preview: { images: [{ source: { url: "https://preview.redd.it/real.png" } }] },
    });
    expect(url).toBe("https://preview.redd.it/real.png");
  });

  it("falls back to url when Reddit flagged the post as an image", () => {
    expect(imageUrlOfRawPost({ url: "https://i.redd.it/a.jpg", post_hint: "image" })).toBe("https://i.redd.it/a.jpg");
  });

  it("recognises an image by extension even with a query string", () => {
    expect(imageUrlOfRawPost({ url: "https://i.imgur.com/a.png?1" })).toBe("https://i.imgur.com/a.png?1");
  });

  it("returns nothing for a plain link or text post", () => {
    expect(imageUrlOfRawPost({ url: "https://elpais.com.uy/nota" })).toBeUndefined();
    expect(imageUrlOfRawPost({})).toBeUndefined();
  });
});
