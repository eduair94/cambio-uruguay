import { describe, expect, it } from "vitest";
import { chunkPage, CHUNK_CHARS } from "../../classes/rag/chunk";
import type { CrawledPage } from "../../classes/rag/types";

const page = (over: Partial<CrawledPage> = {}): CrawledPage => ({
  path: "/importar",
  tier: "full",
  title: "Importar a Uruguay",
  description: "Cómo importar",
  h1: "Importar a Uruguay",
  text: "",
  lastmod: "2026-08-17",
  crawledAt: new Date("2026-08-17T00:00:00Z"),
  ...over,
});

describe("rag/chunk — stubs", () => {
  it("gives a stub page exactly one chunk built from its title and description", () => {
    const chunks = chunkPage(page({ tier: "stub", path: "/sucursales/maldonado", title: "Casas de cambio en Maldonado", description: "Direcciones y horarios", text: "" }));
    expect(chunks).toHaveLength(1);
    expect(chunks[0]!.headingPath).toBe("Casas de cambio en Maldonado");
    expect(chunks[0]!.text).toContain("Direcciones y horarios");
  });

  it("falls back to a single chunk when a full page turned out to have no body", () => {
    expect(chunkPage(page({ text: "   " }))).toHaveLength(1);
  });
});

describe("rag/chunk — heading path", () => {
  it("builds Título › H2 › H3 and resets deeper levels on a shallower heading", () => {
    const text = [
      "## El 60%",
      "Se paga al courier sobre el valor declarado.",
      "### Quién lo cobra",
      "Lo cobra el courier al entregar.",
      "## Otro tema",
      "Algo distinto del 60%.",
    ].join("\n");
    const chunks = chunkPage(page({ text }));
    const paths = chunks.map((c) => c.headingPath);
    expect(paths).toContain("Importar a Uruguay › El 60%");
    expect(paths).toContain("Importar a Uruguay › El 60% › Quién lo cobra");
    // "Otro tema" is an h2, so the h3 must NOT still be attached.
    expect(paths).toContain("Importar a Uruguay › Otro tema");
    expect(paths.some((p) => p === "Importar a Uruguay › Otro tema › Quién lo cobra")).toBe(false);
  });

  it("keeps the heading out of `text` — it belongs to the embedding, not to the quotable body", () => {
    const chunks = chunkPage(page({ text: "## El 60%\nSe paga al courier." }));
    expect(chunks[0]!.text).not.toContain("El 60% Se paga");
    expect(chunks[0]!.embedInput.startsWith(chunks[0]!.headingPath)).toBe(true);
  });
});

describe("rag/chunk — slicing", () => {
  const long = (sentences: number): string =>
    Array.from({ length: sentences }, (_v, i) => `Esta es la oración número ${i} y dice algo de largo razonable.`).join(" ");

  it("splits a long run into several chunks", () => {
    const chunks = chunkPage(page({ text: long(80) }));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("keeps every slice near the target size rather than emitting runts", () => {
    const chunks = chunkPage(page({ text: long(80) }));
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_CHARS * 1.6);
    }
  });

  it("numbers chunks contiguously from zero", () => {
    const chunks = chunkPage(page({ text: long(120) }));
    expect(chunks.map((c) => c.chunkIndex)).toEqual(chunks.map((_c, i) => i));
  });

  it("hashes the same content to the same value and different content to a different one", () => {
    const a = chunkPage(page({ text: "## H\nUn texto." }))[0]!;
    const b = chunkPage(page({ text: "## H\nUn texto." }))[0]!;
    const c = chunkPage(page({ text: "## H\nOtro texto." }))[0]!;
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.contentHash).not.toBe(c.contentHash);
  });

  it("changes the hash when only the heading changed — the same words under a new section are new", () => {
    const a = chunkPage(page({ text: "## Uno\nMismo cuerpo." }))[0]!;
    const b = chunkPage(page({ text: "## Dos\nMismo cuerpo." }))[0]!;
    expect(a.contentHash).not.toBe(b.contentHash);
  });
});
