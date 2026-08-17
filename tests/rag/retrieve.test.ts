import { describe, expect, it } from "vitest";
import { normalise } from "../../classes/rag/embed";
import { contextOf, SiteRetriever, tokenize } from "../../classes/rag/retrieve";
import type { RagChunk } from "../../classes/rag/types";

/**
 * A toy embedding space: each chunk is placed on a named axis, so a query vector can be aimed at
 * whichever topic the test is about. Real embeddings are not needed to test the fusion, the page
 * aggregation or the stub handicap — only to test the model, which is not this suite's job.
 */
const AXES = ["aduana", "alquiler", "sucursal", "prestamo"] as const;
type Axis = (typeof AXES)[number];

const vectorFor = (axis: Axis, magnitude = 1): Float32Array =>
  normalise(Float32Array.from(AXES.map((a) => (a === axis ? magnitude : 0.05))));

const chunk = (over: Partial<RagChunk> & { path: string; axis: Axis }): RagChunk => ({
  tier: "full",
  chunkIndex: 0,
  title: over.path,
  headingPath: over.path,
  text: "",
  contentHash: "h",
  lastmod: "2026-08-17",
  vector: vectorFor(over.axis),
  ...over,
});

describe("rag/retrieve — tokenize", () => {
  it("strips accents so the site's spelling and Reddit's spelling are one token", () => {
    expect(tokenize("Itaú línea de crédito")).toEqual(tokenize("Itau linea de credito"));
  });

  it("drops stopwords and Reddit filler, keeps the proper nouns", () => {
    const tokens = tokenize("hola gente, alguien sabe si el BROU cobra comision?");
    expect(tokens).toContain("brou");
    expect(tokens).toContain("cobra");
    expect(tokens).not.toContain("hola");
    expect(tokens).not.toContain("gente");
    expect(tokens).not.toContain("alguien");
  });

  it("keeps digits — a query about 'decreto 50' must not lose the 50", () => {
    expect(tokenize("decreto 50 026")).toContain("026");
  });
});

describe("rag/retrieve — ranking", () => {
  const index = new SiteRetriever([
    chunk({ path: "/problemas-con-la-aduana-uruguay", axis: "aduana", text: "Qué hacer cuando la aduana retiene un paquete del courier." }),
    chunk({ path: "/problemas-con-la-aduana-uruguay", axis: "aduana", chunkIndex: 1, text: "El despachante interviene cuando el envío supera el tope." }),
    chunk({ path: "/alquilar-en-uruguay", axis: "alquiler", text: "La comisión inmobiliaria y las garantías de alquiler." }),
    chunk({ path: "/prestamos-uruguay", axis: "prestamo", text: "Tasa efectiva anual de los préstamos en Uruguay." }),
  ]);

  it("returns the on-topic page first", () => {
    const pages = index.rankWithVector("me retuvieron un paquete en la aduana", vectorFor("aduana"), 3);
    expect(pages[0]!.path).toBe("/problemas-con-la-aduana-uruguay");
  });

  it("collapses several chunks of one page into a single result", () => {
    const pages = index.rankWithVector("aduana paquete despachante", vectorFor("aduana"), 5);
    const aduana = pages.filter((p) => p.path === "/problemas-con-la-aduana-uruguay");
    expect(aduana).toHaveLength(1);
    expect(aduana[0]!.chunks.length).toBeGreaterThan(1);
  });

  it("reports the best cosine of the page, which is the gate the bot checks", () => {
    const pages = index.rankWithVector("aduana", vectorFor("aduana"), 1);
    expect(pages[0]!.cosine).toBeGreaterThan(0.9);
  });

  it("still ranks on the lexical arm alone when the embedding call failed", () => {
    // A Gemini outage must degrade retrieval, not silently return nothing — that would look to the
    // bot exactly like "the site has no page about this" and would file a false content gap.
    const pages = index.rankWithVector("garantias de alquiler y comision inmobiliaria", null, 3);
    expect(pages[0]!.path).toBe("/alquilar-en-uruguay");
  });

  it("finds a proper noun the dense arm points away from — the reason for the hybrid", () => {
    const withBrand = new SiteRetriever([
      chunk({ path: "/tarjetas-de-debito-uruguay", axis: "prestamo", text: "Prex cobra una comisión por retirar dólares en el exterior." }),
      chunk({ path: "/mejores-bancos-uruguay", axis: "aduana", text: "Comparativa de bancos: cuentas, apps y comisiones." }),
    ]);
    // The query vector is aimed at the WRONG page on purpose; only BM25 knows what "Prex" is.
    const pages = withBrand.rankWithVector("cuanto cobra Prex por sacar dolares", vectorFor("aduana"), 2);
    expect(pages.map((p) => p.path)).toContain("/tarjetas-de-debito-uruguay");
  });

  it("handicaps a stub so a templated page does not beat a guide on an explanatory question", () => {
    const mixed = new SiteRetriever([
      chunk({ path: "/guias/aduana", axis: "aduana", text: "Explicación larga del régimen de courier y sus topes." }),
      chunk({ path: "/sucursal/aduana", axis: "aduana", tier: "stub", text: "Aduana" }),
    ]);
    const pages = mixed.rankWithVector("como funciona el regimen de courier", vectorFor("aduana"), 2);
    expect(pages[0]!.path).toBe("/guias/aduana");
  });

  it("returns nothing on an empty index instead of throwing", () => {
    expect(new SiteRetriever([]).rankWithVector("cualquier cosa", vectorFor("aduana"), 3)).toEqual([]);
  });

  it("finds a stub that has no vector at all — stubs live in the lexical arm on purpose", () => {
    // Stub chunks are deliberately left unembedded to save the daily quota (see store.ts). They
    // must still be retrievable, and must not poison the dense scoring of the chunks that do have
    // a vector.
    const mixed = new SiteRetriever([
      chunk({ path: "/guias/cambio", axis: "aduana", text: "Cómo elegir una casa de cambio." }),
      chunk({
        path: "/sucursales/maldonado",
        axis: "aduana",
        tier: "stub",
        vector: new Float32Array(0),
        title: "Casas de cambio en Maldonado",
        headingPath: "Casas de cambio en Maldonado",
        text: "Direcciones y horarios en Maldonado",
      }),
    ]);
    const pages = mixed.rankWithVector("casas de cambio en maldonado", vectorFor("aduana"), 2);
    expect(pages.map((p) => p.path)).toContain("/sucursales/maldonado");
    expect(pages.find((p) => p.path === "/sucursales/maldonado")!.cosine).toBe(0);
  });

  it("does not crash when EVERY chunk is vectorless", () => {
    const lexicalOnly = new SiteRetriever([
      chunk({ path: "/a", axis: "aduana", tier: "stub", vector: new Float32Array(0), text: "aduana courier" }),
    ]);
    expect(() => lexicalOnly.rankWithVector("aduana", vectorFor("aduana"), 1)).not.toThrow();
    expect(lexicalOnly.rankWithVector("aduana courier", vectorFor("aduana"), 1)).toHaveLength(1);
  });
});

describe("rag/retrieve — contextOf", () => {
  it("labels each block with its page path, so the composer can only cite what it was given", () => {
    const index = new SiteRetriever([chunk({ path: "/x", axis: "aduana", text: "Un dato con el número 800." })]);
    const context = contextOf(index.rankWithVector("aduana", vectorFor("aduana"), 1));
    expect(context).toContain("[/x]");
    expect(context).toContain("800");
  });

  it("respects the character budget", () => {
    const index = new SiteRetriever(
      Array.from({ length: 10 }, (_v, i) => chunk({ path: `/p${i}`, axis: "aduana", text: "x".repeat(900) }))
    );
    const context = contextOf(index.rankWithVector("aduana", vectorFor("aduana"), 10), 2000);
    expect(context.length).toBeLessThanOrEqual(2200);
  });
});
