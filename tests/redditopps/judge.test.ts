import { describe, expect, it } from "vitest";
import type { RedditPostRaw } from "../../classes/reddit";
import type { Candidate } from "../../classes/redditopps/candidates";
import { buildJudgePrompt, judgeBatch, type AskJson, type JudgeItem } from "../../classes/redditopps/judge";
import { rankOf } from "../../classes/redditopps/rank";

const post = (id: string, title = "Busco auto usado hasta 8 mil dólares"): RedditPostRaw => ({
  id,
  sub: "AutosUy",
  title,
  selftext: "Para ir a trabajar.",
  author: "usuario_secreto",
  score: 4,
  numComments: 3,
  permalink: `https://reddit.com/r/AutosUy/comments/${id}/x`,
  createdUtc: 1_790_000_000,
  url: "",
});

const cand = (path: string): Candidate => ({ path, title: path, family: "autos", source: "intent", describe: "desc" });

const items: JudgeItem[] = [
  { post: post("a"), candidates: [cand("/autos-usados-uruguay"), cand("/que-auto-comprar-uruguay")] },
  { post: post("b"), candidates: [cand("/motos-usadas-uruguay")] },
];

const fakeAsk =
  (reply: unknown): AskJson =>
  async <T>() =>
    reply as T;

describe("redditopps/judge", () => {
  it("acepta sólo rutas que eran candidatas de ese hilo", async () => {
    const got = await judgeBatch(
      items,
      fakeAsk({
        verdicts: [
          { id: "a", recommend: true, path: "/inventada", confidence: 0.9, reason: "x", angle: "y" },
          { id: "b", recommend: true, path: "/autos-usados-uruguay", confidence: 0.9, reason: "x", angle: "y" },
        ],
      })
    );
    expect(got!.get("a")).toMatchObject({ recommend: false, path: null });
    // La ruta existe, pero era candidata de OTRO hilo.
    expect(got!.get("b")).toMatchObject({ recommend: false, path: null });
  });

  it("recorta confianza y textos", async () => {
    const got = await judgeBatch(
      items,
      fakeAsk({
        verdicts: [
          { id: "a", recommend: true, path: "/autos-usados-uruguay", confidence: 7, reason: "r".repeat(400), angle: "a".repeat(400) },
        ],
      })
    );
    const v = got!.get("a")!;
    expect(v.recommend).toBe(true);
    expect(v.confidence).toBe(1);
    expect(v.reason.length).toBeLessThanOrEqual(160);
    expect(v.angle.length).toBeLessThanOrEqual(200);
  });

  it("una llamada fallida no juzga nada", async () => {
    expect(await judgeBatch(items, fakeAsk(null))).toBeNull();
    expect(await judgeBatch(items, fakeAsk({ nada: 1 }))).toBeNull();
  });

  it("un hilo que el modelo omitió queda sin veredicto", async () => {
    const got = await judgeBatch(
      items,
      fakeAsk({ verdicts: [{ id: "a", recommend: false, path: null, confidence: 0.2, reason: "no", angle: "" }] })
    );
    expect(got!.has("a")).toBe(true);
    expect(got!.has("b")).toBe(false);
  });

  it("el prompt lleva ids y candidatas, nunca el autor", () => {
    const prompt = buildJudgePrompt(items);
    expect(prompt).toContain("id: a");
    expect(prompt).toContain("id: b");
    expect(prompt).toContain("/que-auto-comprar-uruguay");
    expect(prompt).not.toContain("usuario_secreto");
  });
});

describe("redditopps/rank", () => {
  const now = Date.UTC(2026, 9, 28);
  const base = { confidence: 0.8, createdAt: new Date(now - 3_600_000), score: 5, numComments: 10 };

  it("lo nuevo antes que lo viejo", () => {
    expect(rankOf(base, now)).toBeGreaterThan(rankOf({ ...base, createdAt: new Date(now - 20 * 86_400_000) }, now));
  });

  it("más votos antes que menos", () => {
    expect(rankOf({ ...base, score: 50 }, now)).toBeGreaterThan(rankOf(base, now));
  });

  it("un hilo repleto baja", () => {
    expect(rankOf({ ...base, numComments: 120 }, now)).toBeLessThan(rankOf({ ...base, numComments: 30 }, now));
  });
});
