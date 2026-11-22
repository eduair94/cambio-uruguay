import { describe, expect, it, vi } from "vitest";

// Existing suites mock classes/gemini with only the functions their module uses. Once those modules
// import from classes/llm, the router must not touch any other export of the mock (vitest throws on
// a missing one), and with no Anthropic key it must not reach Claude at all.
vi.mock("../../classes/gemini", () => ({ askGrounded: vi.fn(async () => ({ text: "g", sourceUris: [] })) }));

import { askGrounded } from "../../classes/llm";

describe("classes/llm with a partial gemini mock", () => {
  it("askGrounded works with a gemini mock that only defines askGrounded", async () => {
    delete process.env.ANTHROPIC_GROUNDED;
    expect(await askGrounded("q")).toEqual({ text: "g", sourceUris: [] });
  });
});
