// The gate that decides whether a generated page is allowed to become a live page.
//
// There is no human between this file and the public site: `publish.ts` pushes to main, and pushing
// to main deploys. So every rule here is one a reviewer would otherwise have applied by reading —
// and the one that matters most is the last: a figure that is not in the downloaded text of a
// source we fetched does not get published, no matter how right it looks.
import { describe, expect, it } from "vitest";
import { correctionFor, evidenceOf, proseOf, validatePageSpec, type PageSpec } from "../../classes/gaps/pageSpec";

const SOURCE_TEXT =
  "El régimen de courier admite envíos de hasta US$ 800 y 20 kg. El recargo único es del 60% " +
  "sobre el valor. El Decreto 50/026 permite hasta 3 envíos por año calendario, y el IVA mínimo " +
  "es de US$ 20 por envío.";

const spec = (over: Partial<PageSpec> = {}): PageSpec => ({
  slug: "importar-para-revender-guia",
  title: "Importar para revender en Uruguay",
  navLabel: "Importar para revender",
  navKey: "importarRevender",
  icon: "mdi-package-variant",
  description: "Qué admite el régimen de courier cuando la compra es para revender, y cuál es el tope real.",
  intro:
    "El régimen de courier admite fines comerciales, aunque casi todo el mundo crea que no. " +
    "El límite que importa no es el del monto sino el de la cantidad de envíos por año, y ahí " +
    "es donde la mayoría se choca sin saberlo. Acá está qué dice la norma y qué pasa cuando te " +
    "pasás del cupo previsto para el año calendario en curso.",
  sections: [
    {
      heading: "Qué admite el régimen",
      body: [
        "El régimen de courier admite envíos de hasta US$ 800 y 20 kg por vez, y no distingue si lo " +
          "que traés es para uso personal o para revender. Esa distinción vive en otro lado.",
      ],
    },
    {
      heading: "El tope que sí te frena",
      body: [
        "Podés hacer hasta 3 envíos por año calendario. Ese es el número que en la práctica define " +
          "cuánto podés traer, y el que casi nadie mira antes de comprar.",
      ],
    },
    {
      heading: "Qué se paga",
      body: [
        "El recargo único es del 60% sobre el valor declarado, y hay un IVA mínimo de US$ 20 por " +
          "envío que se cobra igual aunque la compra sea chica.",
      ],
    },
  ],
  verdicts: [
    { claim: "¿Se puede?", answer: "Sí, el régimen lo admite sin trámite extra." },
    { claim: "¿Cuál es el tope real?", answer: "No es el monto sino la cantidad de envíos por año." },
  ],
  steps: [],
  related: ["/importar-para-revender-uruguay"],
  faqs: [{ question: "¿Puedo revender lo que traigo?", answer: "Sí, el régimen lo admite." }],
  keywords: ["importar para revender", "courier uruguay", "regimen de courier"],
  notConfirmed: ["Si el tope de 3 envíos se cuenta por persona o por domicilio."],
  sources: [
    { title: "Decreto 50/026", url: "https://impo.com.uy/a", text: SOURCE_TEXT, verified: true },
    { title: "Aduanas", url: "https://aduanas.gub.uy/b", text: SOURCE_TEXT, verified: true },
  ],
  ...over,
});

describe("gaps/pageSpec — the number rule", () => {
  it("passes a page whose every figure is in a downloaded source", () => {
    expect(validatePageSpec(spec())).toEqual([]);
  });

  it("refuses a figure that is in no source, however plausible", () => {
    const bad = spec({
      sections: [
        ...spec().sections.slice(0, 2),
        { heading: "Qué se paga", body: ["El recargo único es del 45% sobre el valor declarado y se cobra al retirar el envío."] },
      ],
    });
    const problems = validatePageSpec(bad);
    expect(problems.some((p) => p.field === "numbers" && p.detail.includes("45"))).toBe(true);
  });

  it("does not count a figure that only appears in an UNVERIFIED source", () => {
    // A source we could not fetch proves nothing; letting its text back a number would make the
    // whole check theatre.
    const bad = spec({
      sources: [
        { title: "ok", url: "https://impo.com.uy/a", text: "Sin cifras acá.", verified: true },
        { title: "rota", url: "https://x/y", text: SOURCE_TEXT, verified: false },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "numbers")).toBe(true);
  });

  it("accepts the same quantity written the Uruguayan way", () => {
    const ok = spec({
      sources: [
        { title: "a", url: "https://impo.com.uy/a", text: "El tope es de 1.000 dólares.", verified: true },
        { title: "b", url: "https://aduanas.gub.uy/b", text: SOURCE_TEXT, verified: true },
      ],
      sections: spec().sections.map((s, i) =>
        i === 0 ? { heading: s.heading, body: ["El tope es de 1000 dólares por envío, que es bastante más de lo que la gente cree."] } : s
      ),
    });
    expect(validatePageSpec(ok).some((p) => p.field === "numbers")).toBe(false);
  });
});

describe("gaps/pageSpec — shape", () => {
  it("rejects a slug that is not kebab-case", () => {
    expect(validatePageSpec(spec({ slug: "Importar Para Revender" })).some((p) => p.field === "slug")).toBe(true);
  });

  it("refuses to overwrite a route that already exists", () => {
    const problems = validatePageSpec(spec(), new Set(["/importar-para-revender-guia"]));
    expect(problems.some((p) => p.field === "slug" && p.detail.includes("ya existe"))).toBe(true);
  });

  it("rejects a description too long for a meta tag", () => {
    expect(validatePageSpec(spec({ description: "x".repeat(200) })).some((p) => p.field === "description")).toBe(true);
  });

  it("rejects a made-up icon", () => {
    expect(validatePageSpec(spec({ icon: "package" })).some((p) => p.field === "icon")).toBe(true);
  });

  it("rejects a navKey that is not camelCase", () => {
    expect(validatePageSpec(spec({ navKey: "importar-revender" })).some((p) => p.field === "navKey")).toBe(true);
  });

  it("rejects a thin page", () => {
    expect(validatePageSpec(spec({ sections: spec().sections.slice(0, 1) })).some((p) => p.field === "sections")).toBe(true);
  });

  it("rejects a section that is a heading with one line under it", () => {
    const bad = spec({
      sections: [...spec().sections.slice(0, 2), { heading: "Qué se paga", body: ["El 60%."] }],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "sections[2]")).toBe(true);
  });

  it("rejects an intro that announces instead of answering", () => {
    expect(validatePageSpec(spec({ intro: "Acá te contamos todo sobre el tema." })).some((p) => p.field === "intro")).toBe(true);
  });

  it("needs at least two sources it could actually download", () => {
    const bad = spec({
      sources: [{ title: "a", url: "https://impo.com.uy/a", text: SOURCE_TEXT, verified: true }],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "sources")).toBe(true);
  });

  it("refuses when more citations are broken than good — that taints the rest", () => {
    const bad = spec({
      sources: [
        { title: "a", url: "https://impo.com.uy/a", text: SOURCE_TEXT, verified: true },
        { title: "b", url: "https://aduanas.gub.uy/b", text: SOURCE_TEXT, verified: true },
        { title: "c", url: "https://inventada.uy/1", text: "", verified: false },
        { title: "d", url: "https://inventada.uy/2", text: "", verified: false },
        { title: "e", url: "https://inventada.uy/3", text: "", verified: false },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "sources" && p.detail.includes("rotas"))).toBe(true);
  });

  it("rejects filler prose", () => {
    const bad = spec({
      sections: [
        ...spec().sections.slice(0, 2),
        {
          heading: "Qué se paga",
          body: ["Es importante destacar que el recargo único es del 60% sobre el valor declarado del envío."],
        },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "prose")).toBe(true);
  });

  it("reports every problem at once, so one retry can fix them all", () => {
    const bad = spec({ slug: "MAL", icon: "nope", navKey: "no-camel" });
    const fields = validatePageSpec(bad).map((p) => p.field);
    expect(fields).toContain("slug");
    expect(fields).toContain("icon");
    expect(fields).toContain("navKey");
  });
});

describe("gaps/pageSpec — the first screen and the internal links", () => {
  it("needs at least two committed short answers", () => {
    // Somebody arriving from a Reddit comment has one thing they want to know. A page that cannot
    // state two plain answers has not understood the question well enough to publish under the
    // site's name.
    expect(validatePageSpec(spec({ verdicts: [] })).some((p) => p.field === "verdicts")).toBe(true);
  });

  it("rejects a short answer that says nothing", () => {
    const bad = spec({
      verdicts: [
        { claim: "¿Se puede?", answer: "Depende." },
        { claim: "¿Cuánto?", answer: "No es el monto sino la cantidad de envíos por año." },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "verdicts[0]")).toBe(true);
  });

  it("rejects a short answer that is not short", () => {
    const bad = spec({
      verdicts: [
        { claim: "¿Se puede?", answer: "palabra ".repeat(70) },
        { claim: "¿Cuánto?", answer: "No es el monto sino la cantidad de envíos por año." },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "verdicts[0]")).toBe(true);
  });

  it("refuses an internal link to a route that does not exist — that is a 404 published on purpose", () => {
    const routes = new Set(["/importar-para-revender-uruguay"]);
    const bad = spec({ related: ["/pagina-que-no-existe"] });
    expect(validatePageSpec(bad, routes).some((p) => p.field === "related" && p.detail.includes("no existe"))).toBe(true);
  });

  it("accepts links that do exist", () => {
    const routes = new Set(["/importar-para-revender-uruguay", "/otra"]);
    expect(validatePageSpec(spec(), routes).some((p) => p.field === "related")).toBe(false);
  });

  it("refuses a page that links to itself", () => {
    const routes = new Set(["/importar-para-revender-guia"]);
    const bad = spec({ related: ["/importar-para-revender-guia"] });
    expect(validatePageSpec(bad, routes).some((p) => p.detail.includes("sí misma"))).toBe(true);
  });

  it("wants at least one internal link, so a new page is not an orphan", () => {
    const routes = new Set(["/importar-para-revender-uruguay"]);
    expect(validatePageSpec(spec({ related: [] }), routes).some((p) => p.field === "related")).toBe(true);
  });

  it("does not demand links when the caller has no route list to check them against", () => {
    expect(validatePageSpec(spec({ related: [] })).some((p) => p.field === "related")).toBe(false);
  });

  it("holds the short answers to the number rule too", () => {
    const bad = spec({
      verdicts: [
        { claim: "¿Cuánto se paga?", answer: "Un recargo del 73% sobre el valor declarado del envío." },
        { claim: "¿Cuál es el tope?", answer: "No es el monto sino la cantidad de envíos por año." },
      ],
    });
    expect(validatePageSpec(bad).some((p) => p.field === "numbers" && p.detail.includes("73"))).toBe(true);
  });
});

describe("gaps/pageSpec — correctionFor", () => {
  it("tells the retry to DROP the claim, not to swap the figure", () => {
    // Observed twice on the same page: told only "15 and 45 are in no source", the model rewrote
    // the sentence with different numbers. It treats the claim as required and the figure as
    // negotiable; the instruction it needs is the opposite.
    const text = correctionFor([{ field: "numbers", detail: "cifras que no están en ninguna fuente: 15, 45" }]);
    expect(text).toContain("15, 45");
    expect(text).toContain("NO las reemplaces por otras");
    expect(text).toContain("notConfirmed");
  });

  it("does not add the numbers advice when nothing numeric is wrong", () => {
    const text = correctionFor([{ field: "icon", detail: "no es mdi-*" }]);
    expect(text).not.toContain("notConfirmed");
    expect(text).toContain("icon");
  });

  it("names the internal-link rule when a route was invented", () => {
    const text = correctionFor([{ field: "related", detail: "/no-existe no existe" }]);
    expect(text).toContain("rutas EXACTAS");
  });
});

describe("gaps/pageSpec — helpers", () => {
  it("proseOf covers everything a reader sees, including the honest gaps", () => {
    const prose = proseOf(spec());
    expect(prose).toContain("El tope que sí te frena");
    expect(prose).toContain("¿Puedo revender lo que traigo?");
    expect(prose).toContain("por persona o por domicilio");
  });

  it("evidenceOf uses only what we downloaded", () => {
    const withBroken = spec({
      sources: [
        { title: "a", url: "https://a", text: "buena", verified: true },
        { title: "b", url: "https://b", text: "mala", verified: false },
      ],
    });
    expect(evidenceOf(withBroken)).toContain("buena");
    expect(evidenceOf(withBroken)).not.toContain("mala");
  });
});
