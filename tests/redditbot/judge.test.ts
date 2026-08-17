import { afterEach, describe, expect, it, vi } from "vitest";
import * as gemini from "../../classes/gemini";
import { judgeRelevance } from "../../classes/redditbot/judge";
import type { RetrievedPage } from "../../classes/rag/types";

const pages: RetrievedPage[] = [
  {
    path: "/importar-para-revender-uruguay",
    title: "Importar para revender",
    tier: "full",
    score: 0.05,
    cosine: 0.8,
    chunks: [
      {
        score: 0.05,
        cosine: 0.8,
        chunk: {
          path: "/importar-para-revender-uruguay",
          tier: "full",
          chunkIndex: 0,
          title: "Importar para revender",
          headingPath: "Importar para revender",
          text: "El régimen de courier admite fines comerciales.",
          contentHash: "h",
          vector: new Float32Array(4),
          lastmod: "2026-08-17",
        },
      },
    ],
  },
];

const mockReply = (text: string | null) => vi.spyOn(gemini, "askPlain").mockResolvedValue(text);

describe("redditbot/judge", () => {
  afterEach(() => vi.restoreAllMocks());

  it("accepts a clean yes for a candidate it was actually shown", async () => {
    mockReply('{"relevant": true, "path": "/importar-para-revender-uruguay", "confidence": 0.9, "reason": "contesta"}');
    const verdict = await judgeRelevance("¿Puedo importar para revender?", "", pages);
    expect(verdict).toMatchObject({ relevant: true, path: "/importar-para-revender-uruguay", confidence: 0.9 });
  });

  it("parses through a markdown fence", async () => {
    mockReply('```json\n{"relevant": true, "path": "/importar-para-revender-uruguay", "confidence": 0.8, "reason": "ok"}\n```');
    expect((await judgeRelevance("x", "", pages)).relevant).toBe(true);
  });

  it("refuses a path the judge invented — that link would 404 in public", async () => {
    mockReply('{"relevant": true, "path": "/pagina-que-no-existe", "confidence": 0.95, "reason": "inventada"}');
    const verdict = await judgeRelevance("x", "", pages);
    expect(verdict.relevant).toBe(false);
    expect(verdict.reason).toContain("no estaba entre las candidatas");
  });

  it("closes when the model is unreachable — a gate that cannot run must not open", async () => {
    mockReply(null);
    expect((await judgeRelevance("x", "", pages)).relevant).toBe(false);
  });

  it("closes on an unparseable reply", async () => {
    mockReply("me parece que sí, la verdad");
    expect((await judgeRelevance("x", "", pages)).relevant).toBe(false);
  });

  it("clamps a confidence outside 0..1 instead of trusting it", async () => {
    mockReply('{"relevant": true, "path": "/importar-para-revender-uruguay", "confidence": 42, "reason": "ok"}');
    expect((await judgeRelevance("x", "", pages)).confidence).toBe(1);
  });

  it("treats a missing confidence as zero, so the caller's threshold rejects it", async () => {
    mockReply('{"relevant": true, "path": "/importar-para-revender-uruguay", "reason": "ok"}');
    expect((await judgeRelevance("x", "", pages)).confidence).toBe(0);
  });

  it("says no without calling the model when there are no candidates", async () => {
    const spy = mockReply("{}");
    expect((await judgeRelevance("x", "", [])).relevant).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
