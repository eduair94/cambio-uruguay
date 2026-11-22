import { describe, expect, it, vi } from "vitest";

// tests/banks/news.test.ts mocks classes/gemini with askPlain/askGrounded/geminiConfigured but not
// GEMINI_MODEL: the plain path must not read the model name it does not return.
vi.mock("../../classes/gemini", () => ({ askPlain: vi.fn(async () => "de Gemini"), geminiConfigured: () => true }));

import { askPlain } from "../../classes/llm";

describe("classes/llm plain path with a partial gemini mock", () => {
  it("askPlain works with a gemini mock that has no GEMINI_MODEL", async () => {
    expect(await askPlain("q", 1000)).toBe("de Gemini");
  });
});
