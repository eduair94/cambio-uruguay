// Leer el hilo antes de contestarlo.
//
// El bot leía el título y el cuerpo, y nada más. Eso produce dos fallas opuestas y las dos se ven
// como un bot: repetir lo que el primer comentario ya dijo, y no poder corregir lo que dijo mal.
// Medido en el hilo que originó esto — "¿cuál es la mejor cuenta remunerada?" — donde la única
// respuesta afirmaba que Prex y Mercado Pago comparten administradora de fondos. Es falso, y
// corregirlo con la fuente es lo más útil que se puede escribir ahí.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as reddit from "../../classes/reddit";
import { fetchThreadContext } from "../../classes/redditbot/thread";
import { buildComposePrompt } from "../../classes/redditbot/compose";
import type { RetrievedPage } from "../../classes/rag/types";

const comment = (over: Partial<reddit.RedditCommentRaw> = {}): reddit.RedditCommentRaw => ({
  id: "c1",
  author: "alguien",
  body: "Por ahora Mercado Pago porque cobra menos comisión, pero están todas con el mismo manager.",
  score: 3,
  createdUtc: 1,
  permalink: "/r/uruguay/comments/x/c1",
  ...over,
});

afterEach(() => vi.restoreAllMocks());

describe("redditbot/thread — qué se le muestra al redactor", () => {
  it("trae los comentarios ordenados por voto, con el voto a la vista", async () => {
    vi.spyOn(reddit, "fetchComments").mockResolvedValue([
      comment({ id: "a", body: "Una respuesta floja pero larga para pasar el largo mínimo.", score: 1 }),
      comment({ id: "b", body: "La respuesta que el hilo votó arriba, también suficientemente larga.", score: 9 }),
    ]);

    const ctx = await fetchThreadContext("uruguay", "1vsuv9i");
    expect(ctx.count).toBe(2);
    expect(ctx.text.indexOf("+9 votos")).toBeLessThan(ctx.text.indexOf("+1 votos"));
  });

  it("no se lee a sí mismo", async () => {
    // Una segunda pasada sobre el mismo hilo trataría su propio comentario como "lo que ya dijeron"
    // y escribiría para no repetirse a sí misma.
    vi.spyOn(reddit, "fetchComments").mockResolvedValue([
      comment({ id: "a", author: "SizeSouthern112", body: "Lo que escribimos nosotros la vez pasada, largo." }),
      comment({ id: "b", author: "otra", body: "Lo que escribió una persona de verdad, también largo." }),
    ]);

    const ctx = await fetchThreadContext("uruguay", "x", "sizesouthern112");
    expect(ctx.count).toBe(1);
    expect(ctx.text).toContain("una persona de verdad");
  });

  it("descarta borrados, AutoModerator, votos negativos y las respuestas de una línea", async () => {
    vi.spyOn(reddit, "fetchComments").mockResolvedValue([
      comment({ id: "a", author: "[deleted]", body: "Un comentario borrado pero con texto largo igual." }),
      comment({ id: "b", author: "AutoModerator", body: "Recordá leer las reglas del subreddit antes." }),
      comment({ id: "c", body: "esto es basura y está abajo de cero, con largo suficiente", score: -4 }),
      comment({ id: "d", body: "jaja" }),
      comment({ id: "e", body: "La única que debería sobrevivir a todos estos filtros." }),
    ]);

    const ctx = await fetchThreadContext("uruguay", "x");
    expect(ctx.count).toBe(1);
    expect(ctx.text).toContain("debería sobrevivir");
  });

  it("un fallo de red cuesta el contexto, no la respuesta", async () => {
    vi.spyOn(reddit, "fetchComments").mockRejectedValue(new Error("502"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(fetchThreadContext("uruguay", "x")).resolves.toEqual({ text: "", count: 0 });
  });
});

describe("redditbot/compose — los comentarios del hilo no son una fuente", () => {
  const page: RetrievedPage = {
    path: "/cuenta-remunerada-uruguay",
    title: "Cuenta remunerada",
    tier: "full",
    score: 0.03,
    cosine: 0.82,
    chunks: [
      {
        chunk: {
          headingPath: "Quién lo ofrece",
          text: "El fondo de Prex lo administra VALO; el de Mercado Pago, BIND AFISA.",
        },
        score: 0.03,
        cosine: 0.82,
      },
    ],
  } as unknown as RetrievedPage;

  const base = {
    postTitle: "Cuentas remuneradas en Uruguay",
    postBody: "¿Cuál es la mejor?",
    page,
    support: [],
    url: "https://cambio-uruguay.com/cuenta-remunerada-uruguay",
  };

  it("le dice al modelo, con todas las letras, que de ahí no puede sacar cifras", () => {
    const prompt = buildComposePrompt({ ...base, threadComments: "[+3 votos] Es un 0.2 0.5 la diferencia" });
    expect(prompt).toContain("esto NO es una fuente");
    expect(prompt).toContain("NINGUNA cifra de acá abajo");
    // Y sigue estando el texto, porque el punto es que lo lea.
    expect(prompt).toContain("0.2 0.5");
  });

  it("le pide corregir lo que el contexto desmiente, sin nombrar a nadie", () => {
    // Aplanado: el prompt viene con saltos de línea en medio de las frases.
    const prompt = buildComposePrompt({ ...base, threadComments: "[+3 votos] están todas con VALO" }).replace(/\s+/g, " ");
    expect(prompt).toContain("corregilo con el dato concreto");
    expect(prompt).toContain("Nunca cites usuarios por su nombre");
  });

  it("sin comentarios, el prompt no menciona el hilo", () => {
    // Un encabezado vacío invita al modelo a inventar qué había ahí.
    expect(buildComposePrompt(base)).not.toContain("LO QUE YA CONTESTARON");
  });
});
