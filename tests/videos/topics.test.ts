// The topic classifier decides which URL a video is listed under, so its failure mode is not a
// wrong label — it is a page family that quietly reshuffles under Google. These tests pin the two
// things that would do that silently: the matching rule, and the slug list the app writes copy for.
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { classifyTopics, getVideoTopic, topicSlugs, VIDEO_TOPICS } from "../../classes/videos/topics";
import { MAX_AGE_DAYS } from "../../classes/videos/refresh";
import { normalizeForMatch } from "../../classes/trends/classify";

const APP_TOPICS = path.join(__dirname, "..", "..", "app", "utils", "videoTopics.ts");

describe("topic table", () => {
  it("has unique slugs", () => {
    const slugs = topicSlugs();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses url-safe slugs", () => {
    for (const slug of topicSlugs()) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("keeps every keyword already normalised", () => {
    // A keyword with an accent or a capital can never match: the haystack is normalised before the
    // comparison and the keyword is not. This is the bug that would silently empty a whole topic.
    for (const topic of VIDEO_TOPICS) {
      for (const keyword of topic.keywords) {
        expect(normalizeForMatch(keyword)).toBe(keyword);
      }
    }
  });

  it("gives every topic keywords and a label", () => {
    for (const topic of VIDEO_TOPICS) {
      expect(topic.label).toBeTruthy();
      expect(topic.keywords.length).toBeGreaterThan(3);
    }
  });
});

describe("classifyTopics", () => {
  it("finds the obvious topic from a title", () => {
    expect(classifyTopics("¿Por qué subió el dólar esta semana?")).toContain("dolar-y-cotizaciones");
    expect(classifyTopics("Cómo hacer la declaración de IRPF paso a paso")).toContain("impuestos-y-dgi");
    expect(classifyTopics("Cuánto cuesta alquilar en Montevideo")).toContain("vivienda-y-alquileres");
  });

  it("matches through accents and capitals", () => {
    expect(classifyTopics("INFLACIÓN: el dato del mes")).toContain("inflacion-y-precios");
  });

  it("matches whole words only", () => {
    // The classic keyword-classifier embarrassments, each one a real substring of a real keyword.
    expect(classifyTopics("Bolivia hoy")).not.toContain("impuestos-y-dgi"); // "iva"
    expect(classifyTopics("Un disparo en el barrio")).not.toContain("sueldos-y-trabajo"); // "paro"
    expect(classifyTopics("Repuestos para autos")).not.toContain("impuestos-y-dgi"); // "puestos"
  });

  it("returns several topics when a video spans them", () => {
    const topics = classifyTopics("Impuestos sobre inversiones: qué paga cada bono");
    expect(topics).toContain("impuestos-y-dgi");
    expect(topics).toContain("inversiones-y-bolsa");
    // Table order: the narrower topic is listed first, which is what makes topics[0] the primary.
    expect(topics.indexOf("impuestos-y-dgi")).toBeLessThan(topics.indexOf("inversiones-y-bolsa"));
  });

  it("returns nothing for a video about nothing we cover", () => {
    expect(classifyTopics("Resumen de la fecha del campeonato uruguayo")).toEqual([]);
    expect(classifyTopics("")).toEqual([]);
    expect(classifyTopics(null, undefined)).toEqual([]);
  });

  it("reads the description as well as the title", () => {
    expect(classifyTopics("Editorial del lunes", "Hablamos de la inflación de agosto")).toContain(
      "inflacion-y-precios"
    );
  });
});

describe("getVideoTopic", () => {
  it("resolves a known slug and refuses an unknown one", () => {
    expect(getVideoTopic("dolar-y-cotizaciones")?.label).toBeTruthy();
    expect(getVideoTopic("no-existe")).toBeUndefined();
  });
});

describe("parity with the app's copy table", () => {
  // A slug the app writes copy for but the classifier never emits is a page that can never fill;
  // a slug the classifier emits but the app has no page for is a set of videos with nowhere to be
  // listed. Read the app's source straight off disk so this needs no build across the two packages.
  it("covers exactly the slugs in app/utils/videoTopics.ts", () => {
    const src = fs.readFileSync(APP_TOPICS, "utf8");
    const appSlugs = [...src.matchAll(/^\s{4}slug:\s*'([a-z0-9-]+)'/gm)].map(m => m[1]!);
    expect(appSlugs.length).toBeGreaterThan(5); // the regex still matches something
    expect(topicSlugs().sort()).toEqual([...appSlugs].sort());
  });

  it("keeps MAX_AGE_DAYS in step with the number the pages print", () => {
    // Both Vue pages state the window in prose ("los últimos N días"). They cannot import from the
    // backend package, so the constant is duplicated — and this is what stops the two from drifting.
    const pagesDir = path.join(__dirname, "..", "..", "app", "pages", "videos-de-economia-uruguay");
    for (const file of fs.readdirSync(pagesDir)) {
      const src = fs.readFileSync(path.join(pagesDir, file), "utf8");
      const m = /const MAX_AGE_DAYS = (\d+)/.exec(src);
      expect(m, `${file} declares MAX_AGE_DAYS`).not.toBeNull();
      expect(Number(m![1])).toBe(MAX_AGE_DAYS);
    }
  });
});
