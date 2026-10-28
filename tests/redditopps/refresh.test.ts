import { describe, expect, it } from "vitest";
import type { RedditPostRaw } from "../../classes/reddit";
import type { JudgeItem, Verdict } from "../../classes/redditopps/judge";
import { commentIdOf, refreshRedditOpportunities, type OppsDeps } from "../../classes/redditopps/refresh";
import { NULL_STORE, type OppsStore, type SaveRow } from "../../classes/redditopps/store";

const NOW = Date.UTC(2026, 9, 28, 12);

const post = (id: string, over: Partial<RedditPostRaw> = {}): RedditPostRaw => ({
  id,
  sub: "AutosUy",
  title: "Busco auto usado hasta 8 mil dólares, qué me recomiendan?",
  selftext: "Para ir a trabajar a Canelones todos los días.",
  author: "alguien",
  score: 3,
  numComments: 2,
  permalink: `https://reddit.com/r/AutosUy/comments/${id}/x`,
  createdUtc: (NOW - 2 * 86_400_000) / 1000,
  url: "",
  isSelf: true,
  ...over,
});

/** Un store en memoria que anota lo que le piden. */
function memoryStore(seed: { known?: string[]; openRecommended?: string[]; linkQueue?: Array<{ postId: string; sub: string; numComments: number }>; answers?: Array<{ postId: string; answerUrl: string }> } = {}) {
  const calls = {
    saved: [] as SaveRow[],
    refreshed: [] as string[],
    removed: [] as string[],
    linkChecked: [] as Array<{ postId: string; linked: boolean }>,
    answers: [] as Array<{ postId: string; visible: boolean | null }>,
    pruned: 0,
    meta: 0,
  };
  const store: OppsStore = {
    ...NULL_STORE,
    knownIds: async (ids) => new Set(ids.filter((id) => seed.known?.includes(id))),
    refreshLive: async (posts) => {
      calls.refreshed.push(...posts.map((p) => p.id));
      return posts.length;
    },
    markRemoved: async (ids) => {
      calls.removed.push(...ids);
      return ids.length;
    },
    saveVerdicts: async (rows) => {
      calls.saved.push(...rows);
    },
    openRecommendedIds: async () => seed.openRecommended ?? [],
    linkCheckQueue: async () => seed.linkQueue ?? [],
    markLinkChecked: async (postId, linked) => {
      calls.linkChecked.push({ postId, linked });
    },
    answerCheckQueue: async () => seed.answers ?? [],
    markAnswerChecked: async (postId, visible) => {
      calls.answers.push({ postId, visible });
    },
    prune: async () => {
      calls.pruned++;
      return 0;
    },
    saveMeta: async () => {
      calls.meta++;
    },
  };
  return { store, calls };
}

const yes = (items: readonly JudgeItem[]): Map<string, Verdict> =>
  new Map(
    items.map((i) => [
      i.post.id,
      { postId: i.post.id, recommend: true, path: i.candidates[0]!.path, confidence: 0.9, reason: "pide auto", angle: "filtrar por precio" },
    ])
  );

function deps(over: Partial<OppsDeps> & { store: OppsStore }): OppsDeps {
  return {
    subs: ["AutosUy"],
    fetchSub: async () => [],
    fetchByIds: async () => [],
    fetchCommentBodies: async () => [],
    fetchCommentsVisible: async () => new Map(),
    judge: async (items) => yes(items),
    retriever: null,
    model: "test-model",
    ...over,
  };
}

describe("redditopps/refresh", () => {
  it("si ningún sub devuelve nada, no poda ni pisa la meta", async () => {
    const { store, calls } = memoryStore();
    const summary = await refreshRedditOpportunities(deps({ store }), { now: NOW });
    expect(summary.aborted).toBe(true);
    expect(calls.pruned).toBe(0);
    expect(calls.meta).toBe(0);
  });

  it("juzga lo nuevo y sólo refresca lo conocido", async () => {
    const { store, calls } = memoryStore({ known: ["old1"] });
    let judged: string[] = [];
    const summary = await refreshRedditOpportunities(
      deps({
        store,
        fetchSub: async () => [post("old1"), post("new1")],
        judge: async (items) => {
          judged = items.map((i) => i.post.id);
          return yes(items);
        },
      }),
      { now: NOW }
    );
    expect(judged).toEqual(["new1"]);
    expect(calls.refreshed).toContain("old1");
    expect(calls.saved.map((r) => r.post.id)).toEqual(["new1"]);
    expect(summary.recommended).toBe(1);
    expect(summary.perSub[0]).toMatchObject({ sub: "AutosUy", fetched: 2, candidates: 1, judged: 1, recommended: 1 });
    expect(calls.meta).toBe(1);
  });

  it("un lote que falla no guarda nada y se cuenta", async () => {
    const { store, calls } = memoryStore();
    const summary = await refreshRedditOpportunities(
      deps({ store, fetchSub: async () => [post("a"), post("b")], judge: async () => null }),
      { now: NOW }
    );
    expect(calls.saved).toEqual([]);
    expect(summary.judgeFailures).toBe(1);
  });

  it("respeta el tope del juez, empezando por lo más nuevo", async () => {
    const { store } = memoryStore();
    const posts = Array.from({ length: 25 }, (_, i) => post(`p${i}`, { createdUtc: (NOW - (i + 1) * 3_600_000) / 1000 }));
    const judged: string[] = [];
    const summary = await refreshRedditOpportunities(
      deps({
        store,
        fetchSub: async () => posts,
        judge: async (items) => {
          judged.push(...items.map((i) => i.post.id));
          return yes(items);
        },
      }),
      { now: NOW, judgeMax: 10 }
    );
    expect(judged).toHaveLength(10);
    expect(judged[0]).toBe("p0");
    expect(summary.notes.join(" ")).toContain("15 hilos quedaron");
  });

  it("marca borrado al recomendado que ya no vuelve de /api/info, y refresca el que vuelve", async () => {
    const { store, calls } = memoryStore({ openRecommended: ["vivo", "borrado"] });
    await refreshRedditOpportunities(
      deps({
        store,
        fetchSub: async () => [post("otro")],
        fetchByIds: async () => [post("vivo", { removedBy: "moderator" })],
      }),
      { now: NOW }
    );
    expect(calls.removed).toEqual(["borrado"]);
    expect(calls.refreshed).toContain("vivo");
  });

  it("si /api/info no contesta, no marca nada como borrado", async () => {
    const { store, calls } = memoryStore({ openRecommended: ["x"] });
    await refreshRedditOpportunities(deps({ store, fetchSub: async () => [post("otro")], fetchByIds: async () => null }), {
      now: NOW,
    });
    expect(calls.removed).toEqual([]);
  });

  it("detecta el enlace del sitio en los comentarios, y no confunde una lectura fallida con un no", async () => {
    const { store, calls } = memoryStore({
      linkQueue: [
        { postId: "con", sub: "uruguay", numComments: 3 },
        { postId: "sin", sub: "uruguay", numComments: 2 },
        { postId: "fallo", sub: "uruguay", numComments: 5 },
      ],
    });
    await refreshRedditOpportunities(
      deps({
        store,
        fetchSub: async () => [post("z")],
        fetchCommentBodies: async (_sub, id) =>
          id === "con" ? ["fijate en https://cambio-uruguay.com/autos-usados-uruguay"] : id === "sin" ? ["ni idea"] : [],
      }),
      { now: NOW }
    );
    expect(calls.linkChecked).toEqual([
      { postId: "con", linked: true },
      { postId: "sin", linked: false },
    ]);
  });

  it("relee la respuesta marcada con el token anónimo", async () => {
    const { store, calls } = memoryStore({
      answers: [
        { postId: "a", answerUrl: "https://www.reddit.com/r/uruguay/comments/abc123/titulo/kx9z1q/" },
        { postId: "b", answerUrl: "https://www.reddit.com/r/uruguay/comments/abc123/comment/zz88aa/" },
        { postId: "c", answerUrl: "https://reddit.com/r/uruguay/s/AbCdEf" },
      ],
    });
    await refreshRedditOpportunities(
      deps({
        store,
        fetchSub: async () => [post("z")],
        fetchCommentsVisible: async (names) => new Map(names.map((n) => [n, n === "t1_kx9z1q"])),
      }),
      { now: NOW }
    );
    expect(calls.answers).toEqual(
      expect.arrayContaining([
        { postId: "a", visible: true },
        { postId: "b", visible: false },
        { postId: "c", visible: null },
      ])
    );
  });

  it("en ensayo no escribe nada", async () => {
    const { store, calls } = memoryStore();
    const summary = await refreshRedditOpportunities(deps({ store, fetchSub: async () => [post("n")] }), {
      now: NOW,
      dryRun: true,
    });
    expect(summary.recommended).toBe(1);
    expect(calls.saved).toEqual([]);
    expect(calls.meta).toBe(0);
  });
});

describe("redditopps/commentIdOf", () => {
  it("lee las dos formas de enlace a un comentario y rechaza el del hilo", () => {
    expect(commentIdOf("https://www.reddit.com/r/uruguay/comments/abc123/titulo_largo/kx9z1q/")).toBe("kx9z1q");
    expect(commentIdOf("https://www.reddit.com/r/uruguay/comments/abc123/comment/kx9z1q/?context=3")).toBe("kx9z1q");
    expect(commentIdOf("https://www.reddit.com/r/uruguay/comments/abc123/hola/")).toBeNull();
    expect(commentIdOf("https://reddit.com/r/uruguay/s/AbCdEf")).toBeNull();
  });
});
