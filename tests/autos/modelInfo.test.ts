import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { mergeModelInfo, planModelInfoTargets, type CarModelTarget } from "../../classes/autos/modelInfo/refresh";
import { namesCar } from "../../classes/autos/modelInfo/text";
import type { CarModelInfoRecord, CarModelVideo } from "../../classes/autos/modelInfo/types";
import { trimExtract, wikiLooksLikeVehicle, wikiTitleFits } from "../../classes/autos/modelInfo/wikipedia";
import { findModelVideos, groundedVideoIds, rankVideos, videoTitleMatches, youtubeIdFromUrl } from "../../classes/autos/modelInfo/youtube";

const ROOT = path.join(__dirname, "..", "..");

describe("namesCar", () => {
  it("matches the model with or without spaces and dashes", () => {
    expect(namesCar("Hyundai HB20 a fondo", "Hyundai", "HB 20")).toBe(true);
    expect(namesCar("Honda CRV 2018 prueba", "Honda", "CR-V")).toBe(true);
    expect(namesCar("Prueba de la VW Saveiro Cross", "Volkswagen", "Saveiro")).toBe(true);
  });
  it("needs the brand when the model name is a common word or very short", () => {
    expect(namesCar("Probamos uno de los más vendidos", "Fiat", "Uno")).toBe(false);
    expect(namesCar("Fiat Uno Way: prueba", "Fiat", "Uno")).toBe(true);
    expect(namesCar("Peugeot 208 review", "Peugeot", "208")).toBe(true);
    expect(namesCar("Los 208 mejores trucos", "Peugeot", "208")).toBe(false);
  });
  it("does not take a sibling model for this one", () => {
    expect(namesCar("Volkswagen Gol Trend prueba", "Volkswagen", "Saveiro")).toBe(false);
    expect(namesCar("Volkswagen Golf GTI review", "Volkswagen", "Gol")).toBe(false);
    expect(namesCar("Volkswagen Gol Trend review", "Volkswagen", "Gol")).toBe(true);
  });
});

describe("wikipedia guards", () => {
  it("accepts a vehicle article and rejects the maker, lists and disambiguations", () => {
    expect(wikiLooksLikeVehicle({ type: "standard", description: "modelo de automóvil", extract: "El Gol es un automóvil…" }, "es")).toBe(true);
    expect(wikiLooksLikeVehicle({ type: "standard", description: "fabricante de automóviles alemán", extract: "Volkswagen es…" }, "es")).toBe(false);
    expect(wikiLooksLikeVehicle({ type: "disambiguation", description: "", extract: "Uno puede referirse a un automóvil" }, "es")).toBe(false);
    expect(wikiLooksLikeVehicle({ type: "standard", description: "número", extract: "El uno es el número natural…" }, "es")).toBe(false);
    expect(wikiLooksLikeVehicle({ type: "standard", description: "Pickup truck", extract: "The Saveiro is a pickup…" }, "en")).toBe(true);
  });
  it("accepts Wikipedia's own redirect to a sibling article, never the brand alone", () => {
    expect(wikiTitleFits("Volkswagen Gol", "Volkswagen", "Saveiro", true)).toBe(true);
    expect(wikiTitleFits("Volkswagen Gol", "Volkswagen", "Saveiro", false)).toBe(false);
    expect(wikiTitleFits("Volkswagen", "Volkswagen", "Saveiro", true)).toBe(false);
    expect(wikiTitleFits("Chevrolet Onix", "Chevrolet", "Onix", false)).toBe(true);
  });
  it("cuts the summary at a sentence end", () => {
    const text = `${"Una oración larga sobre el auto. ".repeat(40)}`;
    const cut = trimExtract(text, 200);
    expect(cut.length).toBeLessThanOrEqual(200);
    expect(cut.endsWith(".")).toBe(true);
  });
});

describe("youtube", () => {
  it("reads plain video ids and refuses shorts, lists and junk", () => {
    expect(youtubeIdFromUrl("https://www.youtube.com/watch?v=c8MmSaOgDlw")).toBe("c8MmSaOgDlw");
    expect(youtubeIdFromUrl("https://youtu.be/c8MmSaOgDlw?t=4")).toBe("c8MmSaOgDlw");
    expect(youtubeIdFromUrl("https://m.youtube.com/watch?v=c8MmSaOgDlw&list=x")).toBe("c8MmSaOgDlw");
    expect(youtubeIdFromUrl("https://www.youtube.com/shorts/c8MmSaOgDlw")).toBeNull();
    // The reply TEXT carries redirect tokens shaped like ids: they are not 11 characters.
    expect(youtubeIdFromUrl("https://www.youtube.com/watch?v=AUZIYQE3zf2DsdHoCr84rW6sVsz7QPlefo0")).toBeNull();
    expect(youtubeIdFromUrl("not a url")).toBeNull();
  });
  it("keeps reviews of the car and drops toys, games and sale adverts", () => {
    expect(videoTitleMatches("Prueba VW Saveiro Extreme 2024", "Volkswagen", "Saveiro")).toBe(true);
    expect(videoTitleMatches("Hot Wheels Volkswagen Saveiro", "Volkswagen", "Saveiro")).toBe(false);
    expect(videoTitleMatches("Vendo Saveiro 2015 impecable", "Volkswagen", "Saveiro")).toBe(false);
    expect(videoTitleMatches("Saveiro en GTA V", "Volkswagen", "Saveiro")).toBe(false);
    expect(videoTitleMatches("Volkswagen Gol 2020 review", "Volkswagen", "Saveiro")).toBe(false);
  });
  it("puts reviews first and keeps at most four", () => {
    const video = (id: string, title: string): CarModelVideo => ({ id, title, channel: "c", channelUrl: null });
    const ranked = rankVideos([
      video("a", "Saveiro walkaround"),
      video("b", "Prueba Saveiro"),
      video("c", "Saveiro en la ruta"),
      video("d", "Review Saveiro"),
      video("e", "Saveiro sonido"),
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["b", "d", "a", "c"]);
  });
  it("takes ids only from the pages the search opened, never from the text", async () => {
    const reply = {
      text: "https://www.youtube.com/watch?v=ZZZZZZZZZZZ",
      sourceUris: [],
      resolvedByChunk: ["https://www.youtube.com/watch?v=c8MmSaOgDlw", null, "https://www.youtube.com/watch?v=c8MmSaOgDlw", "https://www.youtube.com/watch?v=OeCEHBGruYQ"],
    };
    expect(groundedVideoIds(reply)).toEqual(["c8MmSaOgDlw", "OeCEHBGruYQ"]);
    const videos = await findModelVideos("Volkswagen", "Saveiro", {
      ask: async () => reply,
      oembed: async (id) =>
        id === "c8MmSaOgDlw" ? { id, title: "Prueba Saveiro", channel: "Autos UY", channelUrl: null } : null,
    });
    expect(videos.map((item) => item.id)).toEqual(["c8MmSaOgDlw"]);
  });
  it("asks a second time when the first answer opened no page, and fails if neither did", async () => {
    let calls = 0;
    const videos = await findModelVideos("Volkswagen", "Saveiro", {
      ask: async () => {
        calls += 1;
        return calls === 1
          ? { text: "x", sourceUris: [], resolvedByChunk: [] }
          : { text: "x", sourceUris: [], resolvedByChunk: ["https://www.youtube.com/watch?v=c8MmSaOgDlw"] };
      },
      oembed: async (id) => ({ id, title: "Prueba Saveiro", channel: "c", channelUrl: null }),
    });
    expect(calls).toBe(2);
    expect(videos).toHaveLength(1);
    await expect(
      findModelVideos("Volkswagen", "Saveiro", { ask: async () => ({ text: "x", sourceUris: [] }), oembed: async () => null }),
    ).rejects.toThrow(/no YouTube page/);
  });
  it("throws when the search did not answer, so the old videos survive", async () => {
    await expect(findModelVideos("Volkswagen", "Saveiro", { ask: async () => null, oembed: async () => null })).rejects.toThrow();
  });
});

describe("planModelInfoTargets", () => {
  const now = new Date("2026-10-03T00:00:00.000Z");
  const target = (marketSlug: string, listings: number): CarModelTarget => ({ marketSlug, brand: "B", model: marketSlug, listings });
  const record = (marketSlug: string, daysAgo: number, failures: string[] = []): CarModelInfoRecord => ({
    marketSlug,
    brand: "B",
    model: marketSlug,
    readAt: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
    wiki: null,
    wikiReadAt: null,
    videos: [],
    videosReadAt: null,
    failures,
  });
  it("reads new models first, then old failures, then stale ones, within budget", () => {
    const models = [target("fresh", 900), target("stale", 800), target("failed", 10), target("new-small", 9), target("new-big", 300), target("tiny", 3)];
    const previous = new Map([
      ["fresh", record("fresh", 3)],
      ["stale", record("stale", 40)],
      ["failed", record("failed", 8, ["youtube"])],
    ]);
    expect(planModelInfoTargets(models, previous, now, 10).map((item) => item.marketSlug)).toEqual(["new-big", "new-small", "failed", "stale"]);
    expect(planModelInfoTargets(models, previous, now, 1).map((item) => item.marketSlug)).toEqual(["new-big"]);
  });
  it("waits a week before retrying a failure", () => {
    const previous = new Map([["failed", record("failed", 2, ["wikipedia"])]]);
    expect(planModelInfoTargets([target("failed", 50)], previous, now, 5)).toEqual([]);
  });
});

describe("mergeModelInfo", () => {
  const target: CarModelTarget = { marketSlug: "volkswagen-saveiro", brand: "Volkswagen", model: "Saveiro", listings: 400 };
  const wiki = { lang: "es" as const, title: "Volkswagen Gol", url: "https://es.wikipedia.org/wiki/Volkswagen_Gol", extract: "…", description: null, thumbnail: null };
  const video: CarModelVideo = { id: "c8MmSaOgDlw", title: "Prueba Saveiro", channel: "c", channelUrl: null };
  const previous: CarModelInfoRecord = {
    ...target,
    readAt: "2026-09-01T00:00:00.000Z",
    wiki,
    wikiReadAt: "2026-09-01T00:00:00.000Z",
    videos: [video],
    videosReadAt: "2026-09-01T00:00:00.000Z",
    failures: [],
  };
  const now = new Date("2026-10-03T00:00:00.000Z");
  it("keeps what it had when a source fails, and records the failure", () => {
    const merged = mergeModelInfo(target, previous, { wiki: undefined, videos: undefined }, now);
    expect(merged.wiki).toEqual(wiki);
    expect(merged.videos).toEqual([video]);
    expect(merged.failures).toEqual(["wikipedia", "youtube"]);
    expect(merged.readAt).toBe(now.toISOString());
  });
  it("does not wipe a good article on a later 'there is none', but records none for a new model", () => {
    expect(mergeModelInfo(target, previous, { wiki: null, videos: [video] }, now).wiki).toEqual(wiki);
    expect(mergeModelInfo(target, undefined, { wiki: null, videos: [] }, now).wiki).toBeNull();
  });
  it("treats an unreachable oEmbed as a failure, not as 'no videos'", async () => {
    await expect(
      findModelVideos("Volkswagen", "Saveiro", {
        ask: async () => ({ text: "x", sourceUris: [], resolvedByChunk: ["https://www.youtube.com/watch?v=c8MmSaOgDlw"] }),
        oembed: async () => {
          throw new Error("ECONNRESET");
        },
      }),
    ).rejects.toThrow(/unreachable/);
  });
  it("does not drop old videos because one search came back empty", () => {
    const merged = mergeModelInfo(target, previous, { wiki, videos: [] }, now);
    expect(merged.videos).toEqual([video]);
    expect(merged.videosReadAt).toBe("2026-09-01T00:00:00.000Z");
  });
  it("leaves the article out until it could be read once", () => {
    expect("wiki" in mergeModelInfo(target, undefined, { wiki: undefined, videos: [] }, now)).toBe(false);
  });
});

describe("wiring", () => {
  it("runs as its own daily job, started on deploy", () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const app = require(path.join(ROOT, "ecosystem.config.js")).apps.find((item: { name: string }) => item.name === "currency-autos-models");
    expect(app).toMatchObject({ script: "dist/sync_car_models.js", autorestart: false, exec_mode: "fork", cron_restart: "37 6 * * *" });
    expect(fs.readFileSync(path.join(ROOT, "scripts/deploy-backend.sh"), "utf8")).toMatch(/OTHER_APPS=\([^)]*\bcurrency-autos-models\b[^)]*\)/);
  });
});
