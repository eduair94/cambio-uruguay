// The rules that decide what reaches the page, and the two guards that stop a bad run from
// replacing a good snapshot. Everything here runs against a synthetic catalogue and a stubbed
// feed reader: no network, no Mongo.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelFeed, RawVideo } from "../../classes/videos/sources";
import type { VideoChannel } from "../../classes/videos/types";

const CHANNELS: VideoChannel[] = [
  {
    id: "econ-uy",
    channelId: "UCecon",
    name: "Economía UY",
    handle: "@econuy",
    country: "UY",
    kind: "creador",
    needsFilter: false,
    weight: 3,
    blurb: "Economía y nada más.",
  },
  {
    id: "tele-uy",
    channelId: "UCtele",
    name: "Informativo",
    handle: "@teleuy",
    country: "UY",
    kind: "medio",
    needsFilter: true,
    weight: 2,
    blurb: "Informativo generalista.",
  },
  {
    id: "caido",
    channelId: "UCcaido",
    name: "Canal caído",
    handle: "@caido",
    country: "AR",
    kind: "medio",
    needsFilter: true,
    weight: 1,
    blurb: "No responde.",
  },
];

vi.mock("../../classes/videos/channels", () => ({ VIDEO_CHANNELS: CHANNELS }));

const feeds = new Map<string, ChannelFeed | Error>();

vi.mock("../../classes/videos/sources", async importOriginal => {
  const actual = await importOriginal<typeof import("../../classes/videos/sources")>();
  return {
    ...actual,
    fetchChannelFeed: vi.fn(async (channelId: string) => {
      const entry = feeds.get(channelId);
      if (!entry) throw new Error("sin fixture");
      if (entry instanceof Error) throw entry;
      return entry;
    }),
  };
});

const { buildVideosSnapshot, scoreVideo, snapshotIsEmpty, snapshotIsThin, MAX_AGE_DAYS } =
  await import("../../classes/videos/refresh");

const NOW = new Date("2026-08-18T12:00:00Z");

/** A feed entry, with only the fields a test cares about spelled out. */
function video(over: Partial<RawVideo> & { videoId: string }): RawVideo {
  return {
    title: "Un video",
    description: "",
    url: `https://www.youtube.com/watch?v=${over.videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${over.videoId}/hqdefault.jpg`,
    publishedAt: "2026-08-17T12:00:00Z",
    channelId: "UCecon",
    views: null,
    isShort: false,
    ...over,
  };
}

function feed(name: string, videos: RawVideo[]): ChannelFeed {
  return { name, videos };
}

beforeEach(() => {
  feeds.clear();
  feeds.set("UCecon", feed("Economía UY", []));
  feeds.set("UCtele", feed("Informativo", []));
  feeds.set("UCcaido", new Error("HTTP 404"));
});

describe("buildVideosSnapshot", () => {
  it("publishes a video from a dedicated economy channel even with an untagged title", async () => {
    feeds.set("UCecon", feed("Economía UY", [video({ videoId: "a1", title: "Editorial del lunes" })]));
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos.map(v => v.videoId)).toEqual(["a1"]);
    expect(snap.videos[0]!.topics).toEqual([]);
  });

  it("drops an off-topic video from a generalist channel", async () => {
    feeds.set(
      "UCtele",
      feed("Informativo", [
        video({ videoId: "b1", title: "Resumen de la fecha del fútbol uruguayo", channelId: "UCtele" }),
        video({ videoId: "b2", title: "El dólar cerró en alza", channelId: "UCtele" }),
      ])
    );
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos.map(v => v.videoId)).toEqual(["b2"]);
  });

  it("drops a generalist video that only a bank name made look like money", async () => {
    // Measured against the live feeds: `MONEY_KEYWORDS` contains "itau", so an Itaú ad titled
    // "Kaizen Softworks e Itaú Empresas" cleared a money-verdict filter. A generalist channel must
    // clear a TOPIC, which is a much narrower claim.
    feeds.set(
      "UCtele",
      feed("Informativo", [
        video({ videoId: "ad", title: "Kaizen Softworks e Itaú Empresas", channelId: "UCtele" }),
      ])
    );
    expect((await buildVideosSnapshot(NOW)).videos).toHaveLength(0);
  });

  it("drops Shorts", async () => {
    feeds.set(
      "UCecon",
      feed("Economía UY", [video({ videoId: "s1", title: "El dólar hoy", isShort: true })])
    );
    expect((await buildVideosSnapshot(NOW)).videos).toHaveLength(0);
  });

  it("drops anything older than the window", async () => {
    const old = new Date(NOW.getTime() - (MAX_AGE_DAYS + 1) * 86_400_000).toISOString();
    feeds.set(
      "UCecon",
      feed("Economía UY", [
        video({ videoId: "old", title: "El dólar en su día", publishedAt: old }),
        video({ videoId: "new", title: "El dólar hoy" }),
      ])
    );
    expect((await buildVideosSnapshot(NOW)).videos.map(v => v.videoId)).toEqual(["new"]);
  });

  it("ignores an entry with an unparseable date instead of publishing NaN", async () => {
    feeds.set(
      "UCecon",
      feed("Economía UY", [video({ videoId: "bad", title: "El dólar hoy", publishedAt: "ayer" })])
    );
    expect((await buildVideosSnapshot(NOW)).videos).toHaveLength(0);
  });

  it("keeps one copy of the same title uploaded to two channels", async () => {
    feeds.set("UCecon", feed("Economía UY", [video({ videoId: "x1", title: "El dólar hoy" })]));
    feeds.set(
      "UCtele",
      feed("Informativo", [video({ videoId: "x2", title: "El dólar hoy", channelId: "UCtele" })])
    );
    expect((await buildVideosSnapshot(NOW)).videos).toHaveLength(1);
  });

  it("records a dead channel as down without losing the rest", async () => {
    feeds.set("UCecon", feed("Economía UY", [video({ videoId: "a1", title: "El dólar hoy" })]));
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos).toHaveLength(1);
    const dead = snap.channels.find(c => c.id === "caido")!;
    expect(dead.ok).toBe(false);
    expect(dead.error).toMatch(/404/);
    expect(snap.counts.channelsDown).toBe(1);
    expect(snap.counts.channelsOk).toBe(2);
  });

  it("trusts the feed's own channel name over the catalogue's", async () => {
    feeds.set("UCecon", feed("Economía UY — Oficial", [video({ videoId: "a1", title: "El dólar hoy" })]));
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos[0]!.channelName).toBe("Economía UY — Oficial");
    expect(snap.channels.find(c => c.id === "econ-uy")!.name).toBe("Economía UY — Oficial");
  });

  it("carries the catalogue's identity into the snapshot so the page can credit its sources", async () => {
    const snap = await buildVideosSnapshot(NOW);
    const channel = snap.channels.find(c => c.id === "econ-uy")!;
    expect(channel.country).toBe("UY");
    expect(channel.handle).toBe("@econuy");
    expect(channel.blurb).toBeTruthy();
  });

  it("counts each topic exactly once per video", async () => {
    feeds.set(
      "UCecon",
      feed("Economía UY", [
        video({ videoId: "a1", title: "Impuestos sobre inversiones" }),
        video({ videoId: "a2", title: "El dólar hoy" }),
      ])
    );
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.topicCounts["impuestos-y-dgi"]).toBe(1);
    expect(snap.topicCounts["inversiones-y-bolsa"]).toBe(1);
    expect(snap.topicCounts["dolar-y-cotizaciones"]).toBe(1);
  });

  it("caps how much of the page one prolific channel can take", async () => {
    feeds.set(
      "UCecon",
      feed(
        "Economía UY",
        Array.from({ length: 30 }, (_, i) => video({ videoId: `p${i}`, title: `El dólar, parte ${i}` }))
      )
    );
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos.length).toBeLessThanOrEqual(8);
    expect(snap.channels.find(c => c.id === "econ-uy")!.count).toBe(snap.videos.length);
  });

  it("builds an embeddable player URL, not the /shorts one", async () => {
    feeds.set("UCecon", feed("Economía UY", [video({ videoId: "a1", title: "El dólar hoy" })]));
    const snap = await buildVideosSnapshot(NOW);
    expect(snap.videos[0]!.embedUrl).toBe("https://www.youtube.com/embed/a1");
  });
});

describe("scoreVideo", () => {
  const base = {
    publishedAt: NOW.toISOString(),
    views: null,
    money: "money" as const,
    topics: ["dolar-y-cotizaciones"],
    channelCountry: "UY",
  };

  it("ranks a fresh video above an old one from the same channel", () => {
    const old = { ...base, publishedAt: new Date(NOW.getTime() - 20 * 86_400_000).toISOString() };
    expect(scoreVideo(base, 3, NOW.getTime())).toBeGreaterThan(scoreVideo(old, 3, NOW.getTime()));
  });

  it("does not let a huge foreign audience outrank a Uruguayan channel of the same day", () => {
    // The reason views are capped and logarithmic: a page for Uruguayans that sorts by audience is
    // a page of Spanish and Mexican videos.
    const foreignHit = { ...base, channelCountry: "ES", views: 5_000_000 };
    expect(scoreVideo(base, 3, NOW.getTime())).toBeGreaterThan(
      scoreVideo(foreignHit, 3, NOW.getTime())
    );
  });

  it("never returns NaN when the feed gave no view count", () => {
    expect(Number.isFinite(scoreVideo(base, 1, NOW.getTime()))).toBe(true);
  });
});

describe("write guards", () => {
  it("calls an all-empty snapshot empty", () => {
    expect(snapshotIsEmpty({ videos: [] } as never)).toBe(true);
    expect(snapshotIsEmpty({ videos: [{}] } as never)).toBe(false);
  });

  it("refuses a run that lost more than half its channels", () => {
    const snap = { videos: [{}, {}], counts: { channelsOk: 2, channelsDown: 3 } } as never;
    expect(snapshotIsThin(snap, 0)).toBe(true);
  });

  it("refuses a run that came back with less than half the videos already serving", () => {
    const snap = { videos: [{}, {}], counts: { channelsOk: 5, channelsDown: 0 } } as never;
    expect(snapshotIsThin(snap, 40)).toBe(true);
  });

  it("accepts a healthy run, including the very first one", () => {
    const snap = { videos: new Array(40).fill({}), counts: { channelsOk: 5, channelsDown: 0 } } as never;
    expect(snapshotIsThin(snap, 0)).toBe(false);
    expect(snapshotIsThin(snap, 38)).toBe(false);
  });
});
