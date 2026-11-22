import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({
  askClaude: vi.fn(),
  askClaudeJson: vi.fn(),
  claudeConfigured: vi.fn(() => false),
  claudeHasBudget: vi.fn(async () => false),
  claudeSaturated: vi.fn(() => false),
}));
const llm = vi.hoisted(() => ({
  askPlain: vi.fn(async () => "de los créditos"),
  askWithImage: vi.fn(async () => "imagen por créditos"),
  llmConfigured: vi.fn(() => true),
}));
const gemini = vi.hoisted(() => ({
  askPlain: vi.fn(async () => "de Gemini"),
  askWithImage: vi.fn(async () => "imagen por Gemini"),
  geminiConfigured: vi.fn(() => true),
}));
vi.mock("../classes/claude", () => claude);
vi.mock("../classes/llm", () => llm);
vi.mock("../classes/gemini", () => gemini);

import { __resetProviderForTests, askStructured, askText, askTextWithImage } from "../classes/ai_text";

const IMAGE = { data: Buffer.from([0xff, 0xd8, 0xff]), mimeType: "image/jpeg", ext: ".jpg" };

describe("AI_TEXT_PROVIDER=gemini means Gemini and nothing else", () => {
  beforeEach(() => {
    delete process.env.AI_TEXT_PROVIDER;
    __resetProviderForTests();
    vi.clearAllMocks();
  });

  it("pinned to gemini, askText skips the API credit and asks Gemini", async () => {
    process.env.AI_TEXT_PROVIDER = "gemini";
    expect(await askText("hola")).toBe("de Gemini");
    expect(llm.askPlain).not.toHaveBeenCalled();
  });

  it("pinned to gemini, askTextWithImage asks Gemini's vision", async () => {
    process.env.AI_TEXT_PROVIDER = "gemini";
    expect(await askTextWithImage("¿qué es?", IMAGE)).toBe("imagen por Gemini");
    expect(llm.askWithImage).not.toHaveBeenCalled();
  });

  it("pinned to gemini, askStructured asks Gemini", async () => {
    process.env.AI_TEXT_PROVIDER = "gemini";
    gemini.askPlain.mockResolvedValueOnce('{"ok":true}');
    expect(await askStructured("x", { type: "object" })).toEqual({ ok: true });
    expect(llm.askPlain).not.toHaveBeenCalled();
  });

  it("unpinned, with the subscription out of budget, the fallback spends API credit first", async () => {
    expect(await askText("hola")).toBe("de los créditos");
    expect(gemini.askPlain).not.toHaveBeenCalled();
  });
});
