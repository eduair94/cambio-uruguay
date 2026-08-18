// Turning a validated spec into files. Pure, so the whole emission is checked without a checkout.
import { describe, expect, it } from "vitest";
import {
  emitAll,
  emitDataFile,
  emitLocaleEntry,
  emitNavEntry,
  emitPageFile,
  NAV_MARKER,
} from "../../classes/gaps/emit";
import type { PageSpec } from "../../classes/gaps/pageSpec";

const spec: PageSpec = {
  slug: "guia-generada-uruguay",
  title: 'La guía "generada" en Uruguay',
  navLabel: "Guía generada",
  navKey: "guiaGenerada",
  icon: "mdi-file-document-outline",
  description: "Una descripción con comillas \" y un salto\nde línea.",
  intro: "Intro.",
  sections: [{ heading: "Uno", body: ["Párrafo con 'comillas' y \"otras\".", "Segundo párrafo."] }],
  faqs: [{ question: "¿Sí?", answer: "Sí." }],
  keywords: ["una cosa", "otra"],
  notConfirmed: ["Algo sin confirmar."],
  sources: [
    { title: "Fuente buena", url: "https://impo.com.uy/a", text: "texto", verified: true },
    { title: "Fuente rota", url: "https://x/y", text: "", verified: false },
  ],
};

const ctx = { spec, topicLabel: "Importación y aduana", today: "2026-08-18", askedIn: ["https://reddit.com/1"] };

const NAV_FILE = `import type { NavEntry } from './siteNav'

export const GENERATED_NAV: readonly NavEntry[] = Object.freeze([
${NAV_MARKER}
])
`;

describe("gaps/emit — the data file", () => {
  const file = emitDataFile(ctx);

  it("lands under utils/generated with the slug as its name", () => {
    expect(file.path).toBe("app/utils/generated/guia-generada-uruguay.ts");
  });

  it("escapes quotes and newlines instead of breaking the module", () => {
    // The whole reason content is emitted as data and not as markup: a stray quote here is a
    // string, while the same character in a <template> is a build failure at 05:35.
    expect(file.content).toContain('title: "La guía \\"generada\\" en Uruguay"');
    expect(file.content).toContain("un salto\\nde línea");
  });

  it("publishes only the sources we could actually download", () => {
    expect(file.content).toContain("https://impo.com.uy/a");
    expect(file.content).not.toContain("https://x/y");
  });

  it("records the topic, the date and the threads that asked", () => {
    expect(file.content).toContain('topicLabel: "Importación y aduana"');
    expect(file.content).toContain('createdAt: "2026-08-18"');
    expect(file.content).toContain("https://reddit.com/1");
  });

  it("is valid TypeScript module syntax as far as brackets go", () => {
    const opens = (file.content.match(/[[{]/g) ?? []).length;
    const closes = (file.content.match(/[\]}]/g) ?? []).length;
    expect(opens).toBe(closes);
  });
});

describe("gaps/emit — the page file", () => {
  it("is a wrapper thin enough that it cannot be malformed", () => {
    const file = emitPageFile(spec);
    expect(file.path).toBe("app/pages/guia-generada-uruguay.vue");
    expect(file.content).toContain("<AutoGuide :guide=\"guide\" />");
    expect(file.content).toContain("~/utils/generated/guia-generada-uruguay");
    expect(file.content.split("\n").length).toBeLessThan(15);
  });
});

describe("gaps/emit — the nav entry", () => {
  it("inserts at the marker and keeps it for the next page", () => {
    const file = emitNavEntry(NAV_FILE, spec)!;
    expect(file.path).toBe("app/utils/generatedPages.ts");
    expect(file.content).toContain("to: '/guia-generada-uruguay'");
    expect(file.content).toContain("labelKey: 'nav.guiaGenerada'");
    expect(file.content).toContain(NAV_MARKER);
  });

  it("does nothing when the route is already registered", () => {
    const twice = emitNavEntry(emitNavEntry(NAV_FILE, spec)!.content, spec);
    expect(twice).toBeNull();
  });

  it("refuses loudly if the marker was removed, instead of silently not registering the page", () => {
    expect(() => emitNavEntry("export const GENERATED_NAV = []\n", spec)).toThrow(/marcador/);
  });
});

describe("gaps/emit — the locale catalogues", () => {
  const es = JSON.stringify({ nav: { existente: "Existente" }, otra: { cosa: "x" } }, null, 2) + "\n";

  it("adds the key without touching anything else", () => {
    const file = emitLocaleEntry(es, spec, "es")!;
    const parsed = JSON.parse(file.content);
    expect(parsed.nav.guiaGenerada).toBe("Guía generada");
    expect(parsed.nav.existente).toBe("Existente");
    expect(parsed.otra.cosa).toBe("x");
  });

  it("keeps the file's formatting so the diff is one line", () => {
    const file = emitLocaleEntry(es, spec, "es")!;
    expect(file.content.endsWith("\n")).toBe(true);
    expect(file.content).toContain('\n  "nav": {');
  });

  it("is idempotent", () => {
    const once = emitLocaleEntry(es, spec, "es")!;
    expect(emitLocaleEntry(once.content, spec, "es")).toBeNull();
  });

  it("creates nav when a catalogue somehow lacks it", () => {
    const file = emitLocaleEntry('{\n  "otra": {}\n}\n', spec, "pt")!;
    expect(JSON.parse(file.content).nav.guiaGenerada).toBe("Guía generada");
  });
});

describe("gaps/emit — emitAll", () => {
  it("produces exactly the files a commit needs", () => {
    const locales = {
      es: '{\n  "nav": {}\n}\n',
      en: '{\n  "nav": {}\n}\n',
      pt: '{\n  "nav": {}\n}\n',
    };
    const files = emitAll({ ...ctx, generatedPagesTs: NAV_FILE, locales });
    expect(files.map((f) => f.path).sort()).toEqual([
      "app/i18n/locales/json/en.json",
      "app/i18n/locales/json/es.json",
      "app/i18n/locales/json/pt.json",
      "app/pages/guia-generada-uruguay.vue",
      "app/utils/generated/guia-generada-uruguay.ts",
      "app/utils/generatedPages.ts",
    ]);
  });

  it("never emits a change to siteNav.ts", () => {
    // 2 200 hand-maintained lines that every projection of the site reads. The generator gets its
    // own file precisely so an automated job never has to patch that one.
    const files = emitAll({ ...ctx, generatedPagesTs: NAV_FILE, locales: { es: '{"nav":{}}' } });
    expect(files.some((f) => f.path.endsWith("siteNav.ts"))).toBe(false);
  });
});
