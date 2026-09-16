import { describe, expect, it } from "vitest";
import {
  AUTHOR_MIN_OPS,
  AUTHOR_SHRINK_K,
  buildAuthorRanking,
  gini,
  isRankableAuthor,
  type AuthorUnit,
} from "../../classes/charruadevs/authors";

const NOW = Date.UTC(2026, 8, 16);
const YEAR = 365 * 86400000;

const unit = (over: Partial<AuthorUnit> = {}): AuthorUnit => ({
  author: "alguien",
  kind: "comment",
  rel: true,
  stance: 0,
  score: 1,
  themes: [],
  t: NOW - 30 * 86400000,
  ...over,
});

/** n opiniones de un autor, todas con la misma postura. */
const voice = (a: string, n: number, stance: number, over: Partial<AuthorUnit> = {}): AuthorUnit[] =>
  Array.from({ length: n }, () => unit({ author: a, stance, ...over }));

describe("buildAuthorRanking", () => {
  it("no rankea bots ni cuentas borradas", () => {
    expect(isRankableAuthor("AutoModerator")).toBe(false);
    expect(isRankableAuthor("[deleted]")).toBe(false);
    expect(isRankableAuthor("")).toBe(false);
    expect(isRankableAuthor(null)).toBe(false);
    expect(isRankableAuthor("Bitter-Customer-7457")).toBe(true);

    const out = buildAuthorRanking(
      [...voice("AutoModerator", 40, -2), ...voice("[deleted]", 40, -2), ...voice("humano", 40, -1)],
      NOW
    );
    expect(out.authors).toBe(1);
    expect(out.negative.map((u) => u.a)).toEqual(["humano"]);
  });

  it("cuenta como opinión sólo lo que habla del mercado y toma postura", () => {
    const out = buildAuthorRanking(
      [
        ...voice("a", 30, -1),
        ...voice("a", 10, null as unknown as number, { rel: true, stance: null }),
        ...voice("a", 5, -2, { rel: false }),
      ],
      NOW
    );
    const a = out.loudest[0]!;
    expect(a.n).toBe(30);
    expect(a.texts).toBe(45);
  });

  it("encoge la media hacia la del sub, así una cuenta de 4 opiniones no encabeza", () => {
    // Un coro de 400 opiniones neutras fija el prior cerca de 0.
    const crowd = Array.from({ length: 400 }, (_, i) => unit({ author: `n${i % 100}`, stance: 0 }));
    const out = buildAuthorRanking(
      [...crowd, ...voice("ruidoso", 4, -2), ...voice("sostenido", 120, -1)],
      NOW
    );
    expect(out.k).toBe(AUTHOR_SHRINK_K);
    const ruidoso = out.loudest.concat(out.negative).find((u) => u.a === "ruidoso");
    const sostenido = out.negative.find((u) => u.a === "sostenido")!;
    // La media cruda del de 4 opiniones es −2 y la del otro −1, pero el ranking lo gana el segundo.
    expect(out.negative[0]!.a).toBe("sostenido");
    expect(sostenido.mean).toBe(-1);
    expect(sostenido.score).toBeGreaterThan(-1);
    // Y con menos de MIN_OPS opiniones ni siquiera entra en la tabla.
    expect(ruidoso).toBeUndefined();
    expect(out.minOps).toBe(AUTHOR_MIN_OPS);
  });

  it("separa el karma de lo negativo del de lo positivo", () => {
    const out = buildAuthorRanking(
      [
        ...voice("mixto", 30, -1, { score: 2 }),
        ...voice("mixto", 30, 1, { score: 50 }),
        ...voice("amargo", 30, -1, { score: 10 }),
      ],
      NOW
    );
    expect(out.mostUpvotedNeg[0]!.a).toBe("amargo");
    expect(out.mostUpvotedNeg[0]!.negK).toBe(300);
    expect(out.mostUpvotedPos[0]!.a).toBe("mixto");
    expect(out.mostUpvotedPos[0]!.posK).toBe(1500);
    // El karma total de `mixto` (1.560) es mayor, y aun así no encabeza el pesimismo más votado.
    expect(out.mostUpvotedNeg[0]!.karma).toBeLessThan(out.mostUpvotedPos[0]!.karma);
  });

  it("mide la concentración y el peso de los que opinan una sola vez", () => {
    const loud = voice("loud", 90, -1);
    const tail = Array.from({ length: 10 }, (_, i) => unit({ author: `t${i}`, stance: 0 }));
    const out = buildAuthorRanking([...loud, ...tail], NOW);
    expect(out.opinions).toBe(100);
    expect(out.concentration.single).toBe(10);
    expect(out.concentration.top1).toBe(0.9);
    expect(out.concentration.top1Neg).toBe(1);
    expect(out.concentration.gini).toBeGreaterThan(0.8);
    expect(gini([5, 5, 5, 5])).toBe(0);
  });

  it("clasifica gente, no textos, y exige diferencia para decir que alguien se inclina", () => {
    const out = buildAuthorRanking(
      [
        ...voice("neg", 20, -1),
        ...voice("pos", 20, 1),
        ...voice("mix", 10, -1),
        ...voice("mix", 10, 1),
        ...voice("chico", 5, -2),
      ],
      NOW
    );
    // `chico` no llega al mínimo de la mezcla y no cuenta en ningún lado.
    expect(out.mix.n).toBe(3);
    expect(out.mix.negative).toBeCloseTo(1 / 3, 2);
    expect(out.mix.positive).toBeCloseTo(1 / 3, 2);
    expect(out.mix.mixed).toBeCloseTo(1 / 3, 2);
  });

  it("el karma por orientación mira sólo comentarios", () => {
    const out = buildAuthorRanking(
      [
        ...voice("neg", 20, -1, { score: 3 }),
        ...voice("neg", 1, -1, { kind: "post", score: 900 }),
        ...voice("pos", 20, 1, { score: 4 }),
      ],
      NOW
    );
    expect(out.karmaByOrientation.negative).toBe(3);
    expect(out.karmaByOrientation.positive).toBe(4);
    expect(out.karmaByOrientation.n).toBe(40);
  });

  it("sólo declara un giro con historia en las dos ventanas", () => {
    const old = { t: NOW - 3 * YEAR };
    const recent = { t: NOW - 60 * 86400000 };
    const out = buildAuthorRanking(
      [
        ...voice("giro", 20, 1, old),
        ...voice("giro", 20, -2, recent),
        // Mucho volumen pero todo viejo: no entra en el conteo de giros.
        ...voice("quieto", 40, -1, old),
        // Y uno con apenas 5 opiniones en cada ventana tampoco.
        ...voice("poco", 5, 1, old),
        ...voice("poco", 5, -2, recent),
      ],
      NOW
    );
    expect(out.shift.both).toBe(1);
    expect(out.shift.morePessimistic).toBe(1);
    expect(out.shift.moreOptimistic).toBe(0);
    const giro = out.pessimistic[0]!;
    expect(giro.a).toBe("giro");
    expect(giro.oldMean).toBe(1);
    expect(giro.recentMean).toBe(-2);
    expect(giro.delta).toBe(-3);
  });

  it("guarda la ventana de actividad y los temas de cada autor", () => {
    const out = buildAuthorRanking(
      [
        ...voice("a", 30, -1, { themes: ["ia", "despidos"], t: Date.UTC(2023, 0, 5) }),
        ...voice("a", 10, -1, { themes: ["ia"], t: Date.UTC(2026, 5, 5) }),
      ],
      NOW
    );
    const a = out.negative[0]!;
    expect(a.first).toBe("2023-01");
    expect(a.last).toBe("2026-06");
    expect(a.themes[0]).toEqual({ th: "ia", n: 40 });
    expect(a.themes[1]).toEqual({ th: "despidos", n: 30 });
  });

  it("no explota con un corpus vacío", () => {
    const out = buildAuthorRanking([], NOW);
    expect(out.authors).toBe(0);
    expect(out.opinions).toBe(0);
    expect(out.negative).toEqual([]);
    expect(out.karmaByOrientation.negative).toBeNull();
    expect(out.concentration.gini).toBe(0);
  });
});
