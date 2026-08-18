import { describe, expect, it } from "vitest";
import { botConfig } from "../../classes/redditbot/config";
import { retrievalQuery, screenPost } from "../../classes/redditbot/filter";
import type { RedditPostRaw } from "../../classes/reddit";

const NOW = Date.UTC(2026, 7, 17, 12, 0, 0);
const cfg = { ...botConfig(), minAgeMinutes: 15, maxAgeHours: 8 };

const post = (over: Partial<RedditPostRaw> = {}): RedditPostRaw => ({
  id: "abc123",
  sub: "uruguay",
  title: "¿Cuánto se paga de aduana por traer una notebook del exterior?",
  selftext: "Me quiero traer una notebook de Estados Unidos y no entiendo cuánto termino pagando de impuestos.",
  author: "alguien",
  score: 3,
  numComments: 2,
  permalink: "https://reddit.com/r/uruguay/comments/abc123/x",
  createdUtc: (NOW - 60 * 60 * 1000) / 1000, // one hour old
  url: "",
  over18: false,
  locked: false,
  stickied: false,
  isSelf: true,
  linkFlair: "",
  ...over,
});

describe("redditbot/filter — the age window", () => {
  it("accepts a thread inside the window", () => {
    expect(screenPost(post(), cfg, NOW).ok).toBe(true);
  });

  it("waits before answering a brand-new thread", () => {
    const fresh = post({ createdUtc: (NOW - 3 * 60 * 1000) / 1000 });
    expect(screenPost(fresh, cfg, NOW).reason).toBe("too_new");
  });

  it("does not revive an old thread", () => {
    const old = post({ createdUtc: (NOW - 20 * 60 * 60 * 1000) / 1000 });
    expect(screenPost(old, cfg, NOW).reason).toBe("too_old");
  });
});

describe("redditbot/filter — moderation state", () => {
  it("skips a locked thread", () => {
    expect(screenPost(post({ locked: true }), cfg, NOW).reason).toBe("locked");
  });

  it("skips a pinned mod post", () => {
    expect(screenPost(post({ stickied: true }), cfg, NOW).reason).toBe("stickied");
  });

  it("skips NSFW", () => {
    expect(screenPost(post({ over18: true }), cfg, NOW).reason).toBe("nsfw");
  });

  it("skips AutoModerator and deleted authors", () => {
    expect(screenPost(post({ author: "AutoModerator" }), cfg, NOW).reason).toBe("deleted_author");
    expect(screenPost(post({ author: "[deleted]" }), cfg, NOW).reason).toBe("deleted_author");
  });

  it("skips a flair the bot has no business under", () => {
    expect(screenPost(post({ linkFlair: "Humor" }), cfg, NOW).reason).toBe("blocked_flair");
    expect(screenPost(post({ linkFlair: "Política" }), cfg, NOW).reason).toBe("blocked_flair");
  });
});

describe("redditbot/filter — content", () => {
  it("skips a thread too short to retrieve against", () => {
    expect(screenPost(post({ title: "aduana?", selftext: "" }), cfg, NOW).reason).toBe("too_short");
  });

  it("stays out when someone already linked the site — a second link is spam", () => {
    const linked = post({ selftext: "Lo vi en cambio-uruguay.com pero no me quedó claro el tope del courier." });
    expect(screenPost(linked, cfg, NOW).reason).toBe("already_linked");
  });

  it("skips a thread about football", () => {
    const off = post({
      title: "¿Alguien sabe a qué hora juega Peñarol el domingo?",
      selftext: "No encuentro el horario del partido por ningún lado, ¿alguien lo tiene?",
    });
    expect(screenPost(off, cfg, NOW).reason).toBe("off_topic");
  });

  it("skips a statement that is not asking anything", () => {
    const rant = post({
      title: "El dólar subió otra vez y ya no se puede vivir",
      selftext: "Nada, era eso. Cada vez que voy al supermercado con pesos me quiero morir.",
    });
    expect(screenPost(rant, cfg, NOW).reason).toBe("not_a_question");
  });

  it("stays out of a thread where somebody needs a person, not a link", () => {
    const hard = post({
      title: "¿Qué hago si me estafaron ayer con una transferencia bancaria?",
      selftext: "Me estafaron ayer y no sé si puedo recuperar la plata del banco de alguna manera.",
    });
    expect(screenPost(hard, cfg, NOW).reason).toBe("sensitive");
  });

  it("does not read 'ya no se puede vivir' as a question", () => {
    // The bug this test exists for: matching interrogatives as bare substrings turns every
    // complaint into an ask. "se puede" is a question only at the start of a sentence.
    const rant = post({
      title: "El dólar subió otra vez y ya no se puede vivir",
      selftext: "Voy al supermercado con pesos y cada vez me alcanza para menos, es un delirio.",
    });
    expect(screenPost(rant, cfg, NOW).reason).toBe("not_a_question");
  });

  it("accepts a real question that forgot the question mark", () => {
    const asked = post({
      title: "Cuánto sale traer una notebook de Estados Unidos",
      selftext: "Estoy mirando una en Amazon y quiero saber el costo final con impuestos y aduana.",
    });
    expect(screenPost(asked, cfg, NOW).ok).toBe(true);
  });

  it("accepts an ask phrased without any interrogative at all", () => {
    const asked = post({
      title: "Alguien sabe si conviene comprar dólares en el BROU o en una casa de cambio",
      selftext: "Tengo unos pesos ahorrados y no sé dónde me conviene cambiarlos sin perder tanto.",
    });
    expect(screenPost(asked, cfg, NOW).ok).toBe(true);
  });

  it("accepts a thread labelled as a consulta", () => {
    const asked = post({
      title: "Consulta: préstamo con clearing",
      selftext: "Consulta: estoy en clearing y quiero saber si igual me dan un préstamo en alguna cooperativa.",
    });
    expect(screenPost(asked, cfg, NOW).ok).toBe(true);
  });

  it("does not match a topic term inside a longer word", () => {
    // "iva" must not fire on "privado", "tea" must not fire on "tarea".
    const off = post({
      title: "¿Alguien tiene una tarea del liceo privado que pueda prestarme?",
      selftext: "Necesito la tarea de literatura del liceo privado, se me traspapeló la fotocopia.",
    });
    expect(off.title.includes("tarea")).toBe(true);
    expect(screenPost(off, cfg, NOW).reason).toBe("off_topic");
  });

  it("does not admit a diet question because it says 'peso'", () => {
    // Real false positive from a live run over 334 threads: "peso" from "bajar de peso". The
    // retrieval gate caught it, but only after paying for an embedding.
    const diet = post({
      title: "¿Cómo hacen para no comer cosas dulces? Yo no puedo parar",
      selftext: "Estoy tratando de bajar de peso y no hay forma, cada tarde termino comiendo algo dulce.",
    });
    expect(screenPost(diet, cfg, NOW).reason).toBe("off_topic");
  });

  it("does not admit a broken-wifi thread because it says 'anda'", () => {
    const wifi = post({
      title: "Red inestable, ¿a alguien más le pasa?",
      selftext: "Hace una semana que no anda bien el wifi en casa y no sé qué puede ser.",
    });
    expect(screenPost(wifi, cfg, NOW).reason).toBe("off_topic");
  });

  it("admits an ambiguous word once a second one joins it", () => {
    // "peso" alone is a diet; "peso" plus "cotizacion" is the exchange rate.
    const rate = post({
      title: "¿Conviene cambiar pesos ahora?",
      selftext: "Tengo unos ahorros y no sé si esperar a que mejore el cambio o hacerlo ya.",
    });
    expect(screenPost(rate, cfg, NOW).ok).toBe(true);
  });

  it("admits a thread on one unambiguous word", () => {
    const one = post({
      title: "¿Alguien sabe cómo va el trámite del monotributo?",
      selftext: "Quiero empezar a facturar por mi cuenta y no sé por dónde arranca el trámite.",
    });
    expect(screenPost(one, cfg, NOW).matched).toContain("monotributo");
    expect(screenPost(one, cfg, NOW).ok).toBe(true);
  });

  it("admits a salary question — el sitio cubre sueldos y el léxico no los miraba", () => {
    const sueldo = post({
      title: "¿Cuánto me tienen que pagar por las horas extras?",
      selftext: "Trabajo de noche y no sé si el recibo de sueldo está bien liquidado, nadie me explica.",
    });
    expect(screenPost(sueldo, cfg, NOW).ok).toBe(true);
  });

  it("admits seguro de paro, despido e indemnización", () => {
    for (const [title, body] of [
      ["¿Cómo se cobra el seguro de paro?", "Me suspendieron y no sé qué me corresponde ni por cuánto tiempo."],
      ["¿Qué indemnización me toca por despido?", "Llevo cuatro años en la empresa y me quieren desvincular ahora."],
      ["¿El aguinaldo se cobra sobre el nominal?", "Nunca entendí cómo se calcula el aguinaldo en mi recibo mensual."],
    ] as const) {
      expect(screenPost(post({ title, selftext: body }), cfg, NOW).ok, title).toBe(true);
    }
  });

  it("admits los servicios del hogar y los trámites que el sitio sí cubre", () => {
    for (const [title, body] of [
      ["¿Por qué me vino tan cara la factura de UTE?", "Me llegó el triple que el mes pasado y no cambié nada en casa."],
      ["¿Cómo hago para cambiar de mutualista?", "Quiero cambiarme y no sé en qué período se puede hacer el trámite."],
      ["¿Prescribe una deuda con el Estado?", "Tengo una deuda vieja de patente y quiero saber si ya prescribió."],
    ] as const) {
      expect(screenPost(post({ title, selftext: body }), cfg, NOW).ok, title).toBe(true);
    }
  });

  it("sigue sin admitir una charla de trabajo que no es de plata", () => {
    // "trabajo" y "jefe" son términos débiles justamente para esto: hace falta un segundo.
    const charla = post({
      title: "¿Cómo hacen para llevarse bien con el jefe?",
      selftext: "En mi trabajo el ambiente está pesado y quería saber cómo lo manejan ustedes.",
    });
    expect(screenPost(charla, cfg, NOW).reason).toBe("off_topic");
  });

  it("reports which topic terms matched, for debugging a miss", () => {
    const verdict = screenPost(post(), cfg, NOW);
    expect(verdict.matched).toContain("aduana");
  });
});

describe("redditbot/filter — retrievalQuery", () => {
  it("puts the title first and caps the length", () => {
    const query = retrievalQuery(post({ selftext: "x".repeat(5000) }));
    expect(query.startsWith("¿Cuánto se paga de aduana")).toBe(true);
    expect(query.length).toBeLessThanOrEqual(1200);
  });
});
