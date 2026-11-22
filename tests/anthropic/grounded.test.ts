import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  anthropicUsage,
  askClaudeGrounded,
  claudeGroundedEnabled,
  webSearchToolFor,
} from "../../classes/anthropic";
import { groundedHeadlines } from "../../classes/gemini";

const SEARCH_REPLY = {
  model: "claude-haiku-5-5",
  stop_reason: "end_turn",
  content: [
    { type: "text", text: "Voy a buscar la tasa." },
    { type: "server_tool_use", id: "srv_1", name: "web_search", input: { query: "tasa" } },
    {
      type: "web_search_tool_result",
      tool_use_id: "srv_1",
      content: [
        { type: "web_search_result", url: "https://www.bcu.gub.uy/a", title: "BCU A", encrypted_content: "x", page_age: null },
        { type: "web_search_result", url: "https://ute.com.uy/b", title: "UTE B", encrypted_content: "y", page_age: null },
      ],
    },
    {
      type: "text",
      text: "La tasa subió al 8 %.",
      citations: [{ type: "web_search_result_location", url: "https://ute.com.uy/b", title: "UTE B", cited_text: "8 %", encrypted_index: "z" }],
    },
    { type: "text", text: " Sin más cambios." },
  ],
  usage: { input_tokens: 900, output_tokens: 40, server_tool_use: { web_search_requests: 1 } },
};

function fakeClient(answer: any) {
  const calls: any[] = [];
  __setAnthropicClientFactoryForTests(() => ({
    messages: {
      stream(params: any) {
        calls.push(params);
        return { finalMessage: async () => answer };
      },
    },
  }));
  return calls;
}

describe("askClaudeGrounded", () => {
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("ANTHROPIC_") || name === "AI_LLM_PROVIDER") delete process.env[name];
    }
    process.env.ANTHROPIC_API_KEYS = "sk-ant-api-test0001";
    process.env.ANTHROPIC_GROUNDED = "1";
    __resetAnthropicForTests();
  });
  afterEach(() => __setAnthropicClientFactoryForTests(null));

  it("grounded is off unless ANTHROPIC_GROUNDED=1", () => {
    expect(claudeGroundedEnabled()).toBe(true);
    delete process.env.ANTHROPIC_GROUNDED;
    expect(claudeGroundedEnabled()).toBe(false);
    process.env.ANTHROPIC_GROUNDED = "true";
    expect(claudeGroundedEnabled()).toBe(false);
  });

  it("uses the basic tool on haiku and the dynamic one on sonnet", () => {
    expect(webSearchToolFor("claude-haiku-5-5")).toMatchObject({ type: "web_search_20250305", name: "web_search", max_uses: 5 });
    expect(webSearchToolFor("claude-sonnet-5-5")).toMatchObject({ type: "web_search_20260209", name: "web_search", max_uses: 5 });
  });

  it("searches from Uruguay", async () => {
    const calls = fakeClient(SEARCH_REPLY);
    await askClaudeGrounded("¿tasa?");
    expect(calls[0].tools[0].user_location).toMatchObject({ type: "approximate", country: "UY" });
  });

  it("maps results to sourceUris, chunks (hostname as title) and resolvedByChunk", async () => {
    fakeClient(SEARCH_REPLY);
    const out = await askClaudeGrounded("¿tasa?");
    expect(out?.sourceUris).toEqual(["https://www.bcu.gub.uy/a", "https://ute.com.uy/b"]);
    expect(out?.resolvedByChunk).toEqual(["https://www.bcu.gub.uy/a", "https://ute.com.uy/b"]);
    expect(out?.chunks).toEqual([
      { web: { uri: "https://www.bcu.gub.uy/a", title: "bcu.gub.uy" } },
      { web: { uri: "https://ute.com.uy/b", title: "ute.com.uy" } },
    ]);
  });

  it("uses only the text written after the last search", async () => {
    fakeClient(SEARCH_REPLY);
    expect((await askClaudeGrounded("¿tasa?"))?.text).toBe("La tasa subió al 8 %. Sin más cambios.");
  });

  it("maps a cited text block to a support pointing at the cited chunk", async () => {
    fakeClient(SEARCH_REPLY);
    const out = await askClaudeGrounded("¿tasa?");
    expect(out?.supports).toEqual([{ segment: { text: "La tasa subió al 8 %.", startIndex: 0, endIndex: 21 }, groundingChunkIndices: [1] }]);
  });

  it("groundedHeadlines over the mapped reply yields the cited sentence as title", async () => {
    fakeClient(SEARCH_REPLY);
    const out = await askClaudeGrounded("¿tasa?");
    expect(groundedHeadlines(out!)).toEqual([
      { title: "bcu.gub.uy", source: "bcu.gub.uy", link: "https://www.bcu.gub.uy/a" },
      { title: "La tasa subió al 8 %.", source: "ute.com.uy", link: "https://ute.com.uy/b" },
    ]);
  });

  it("counts searches in the usage", async () => {
    fakeClient(SEARCH_REPLY);
    await askClaudeGrounded("¿tasa?");
    expect(anthropicUsage()[0]).toMatchObject({ searches: 1, inputTokens: 900 });
  });

  it("returns null when no text came back", async () => {
    fakeClient({ ...SEARCH_REPLY, content: SEARCH_REPLY.content.slice(0, 3) });
    expect(await askClaudeGrounded("¿tasa?")).toBeNull();
  });

  it("returns null on pause_turn", async () => {
    fakeClient({ ...SEARCH_REPLY, stop_reason: "pause_turn" });
    expect(await askClaudeGrounded("¿tasa?")).toBeNull();
  });

  it("returns null without calling when the flag is off", async () => {
    delete process.env.ANTHROPIC_GROUNDED;
    const calls = fakeClient(SEARCH_REPLY);
    expect(await askClaudeGrounded("¿tasa?")).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
