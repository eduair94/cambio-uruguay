import { beforeEach, describe, expect, it, vi } from "vitest";

const claude = vi.hoisted(() => ({
  anthropicConfigured: vi.fn(() => true),
  anthropicModel: vi.fn(() => "claude-haiku-5-5"),
  claudeGroundedEnabled: vi.fn(() => false),
  askClaudePlain: vi.fn(),
  askClaudeJSON: vi.fn(),
  askClaudeWithImages: vi.fn(),
  askClaudeGrounded: vi.fn(),
}));
const gemini = vi.hoisted(() => ({
  GEMINI_MODEL: "gemini-test-lite",
  geminiConfigured: vi.fn(() => true),
  askPlain: vi.fn(),
  askJSON: vi.fn(),
  askWithImage: vi.fn(),
  askJSONWithImages: vi.fn(),
  askGrounded: vi.fn(),
  groundedHeadlines: vi.fn(),
}));
vi.mock("../../classes/anthropic", () => claude);
vi.mock("../../classes/gemini", () => gemini);

import {
  askGrounded,
  askJSON,
  askJSONWithImagesDetailed,
  askPlain,
  askPlainDetailed,
  askWithImage,
  groundedConfigured,
  llmConfigured,
  preferredLlmModel,
} from "../../classes/llm";

const IMAGE = { data: Buffer.from("x"), mimeType: "image/jpeg" };

describe("classes/llm router", () => {
  beforeEach(() => {
    for (const fn of [...Object.values(claude), ...Object.values(gemini)]) if (typeof fn === "function") (fn as any).mockReset?.();
    claude.anthropicConfigured.mockReturnValue(true);
    claude.anthropicModel.mockReturnValue("claude-haiku-5-5");
    claude.claudeGroundedEnabled.mockReturnValue(false);
    gemini.geminiConfigured.mockReturnValue(true);
  });

  it("askPlain uses Claude when it answers", async () => {
    claude.askClaudePlain.mockResolvedValue({ text: "de Claude", model: "claude-haiku-5-5", keyLabel: "…1111" });
    expect(await askPlain("hola", 30000)).toBe("de Claude");
    expect(gemini.askPlain).not.toHaveBeenCalled();
  });

  it("askPlain falls back to Gemini when Claude returns null", async () => {
    claude.askClaudePlain.mockResolvedValue(null);
    gemini.askPlain.mockResolvedValue("de Gemini");
    expect(await askPlainDetailed("hola", 30000)).toEqual({ text: "de Gemini", model: "gemini-test-lite", provider: "gemini" });
    expect(gemini.askPlain).toHaveBeenCalledWith("hola", 30000);
  });

  it("askPlain goes straight to Gemini when Claude is not configured", async () => {
    claude.anthropicConfigured.mockReturnValue(false);
    gemini.askPlain.mockResolvedValue("de Gemini");
    expect(await askPlain("hola")).toBe("de Gemini");
    expect(claude.askClaudePlain).not.toHaveBeenCalled();
  });

  it("gives Claude at least 60 s even when the Gemini budget is shorter", async () => {
    claude.askClaudePlain.mockResolvedValue({ text: "ok", model: "m", keyLabel: "k" });
    await askPlain("hola", 30000);
    expect(claude.askClaudePlain.mock.calls[0][1]).toMatchObject({ timeoutMs: 60000 });
  });

  it("askJSON passes system and max tokens to Claude and model/temperature only to Gemini", async () => {
    claude.askClaudeJSON.mockResolvedValue(null);
    gemini.askJSON.mockResolvedValue({ a: 1 });
    const opts = { system: "s", model: "gemini-pinned", temperature: 0.2, maxOutputTokens: 4000, timeoutMs: 90000 };
    expect(await askJSON("p", { type: "object" }, opts)).toEqual({ a: 1 });
    expect(claude.askClaudeJSON).toHaveBeenCalledWith("p", { type: "object" }, { system: "s", maxTokens: 4000, timeoutMs: 90000 });
    expect(gemini.askJSON).toHaveBeenCalledWith("p", { type: "object" }, opts);
  });

  it("askWithImage uses Claude's vision first", async () => {
    claude.askClaudeWithImages.mockResolvedValue({ text: "una silla", model: "claude-haiku-5-5" });
    expect(await askWithImage("¿qué es?", IMAGE, 60000)).toBe("una silla");
    expect(claude.askClaudeWithImages).toHaveBeenCalledWith("¿qué es?", [IMAGE], { timeoutMs: 60000 });
  });

  it("askJSONWithImagesDetailed reports the model that answered", async () => {
    claude.askClaudeWithImages.mockResolvedValue({ text: "{}", value: { ok: true }, model: "claude-haiku-5-5" });
    expect(await askJSONWithImagesDetailed("p", [IMAGE], { type: "object" }, { system: "s", model: "gemini-2.5-flash-lite" })).toEqual({
      value: { ok: true },
      model: "claude-haiku-5-5",
      provider: "claude",
    });
    claude.askClaudeWithImages.mockResolvedValue(null);
    gemini.askJSONWithImages.mockResolvedValue({ ok: false });
    expect(await askJSONWithImagesDetailed("p", [IMAGE], { type: "object" }, { model: "gemini-2.5-flash-lite" })).toEqual({
      value: { ok: false },
      model: "gemini-2.5-flash-lite",
      provider: "gemini",
    });
  });

  it("askGrounded stays on Gemini unless the flag is on", async () => {
    gemini.askGrounded.mockResolvedValue({ text: "g", sourceUris: [] });
    expect(await askGrounded("q")).toEqual({ text: "g", sourceUris: [] });
    expect(claude.askClaudeGrounded).not.toHaveBeenCalled();

    claude.claudeGroundedEnabled.mockReturnValue(true);
    claude.askClaudeGrounded.mockResolvedValue({ text: "c", sourceUris: ["https://x.uy"] });
    expect(await askGrounded("q")).toEqual({ text: "c", sourceUris: ["https://x.uy"] });
  });

  it("llmConfigured is true with only Gemini, with only Claude, false with neither", () => {
    claude.anthropicConfigured.mockReturnValue(false);
    expect(llmConfigured()).toBe(true);
    claude.anthropicConfigured.mockReturnValue(true);
    gemini.geminiConfigured.mockReturnValue(false);
    expect(llmConfigured()).toBe(true);
    claude.anthropicConfigured.mockReturnValue(false);
    expect(llmConfigured()).toBe(false);
  });

  it("groundedConfigured needs Gemini unless Claude search is on", () => {
    gemini.geminiConfigured.mockReturnValue(false);
    expect(groundedConfigured()).toBe(false);
    claude.claudeGroundedEnabled.mockReturnValue(true);
    expect(groundedConfigured()).toBe(true);
  });

  it("preferredLlmModel names Claude's model when Claude can spend, Gemini's otherwise", () => {
    expect(preferredLlmModel()).toBe("claude-haiku-5-5");
    claude.anthropicConfigured.mockReturnValue(false);
    expect(preferredLlmModel()).toBe("gemini-test-lite");
  });
});
