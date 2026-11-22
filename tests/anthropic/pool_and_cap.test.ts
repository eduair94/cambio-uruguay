import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  __setAnthropicNowForTests,
  anthropicKeyPool,
  anthropicUsage,
  askClaudePlain,
  estimateClaudeCostUsd,
  webSearchToolFor,
} from "../../classes/anthropic";

const reply = (inputTokens: number, outputTokens: number) => () => ({
  model: "claude-haiku-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text: "ok" }],
  usage: { input_tokens: inputTokens, output_tokens: outputTokens },
});

function fakeClients(script: Record<string, () => any>) {
  const calls: string[] = [];
  __setAnthropicClientFactoryForTests((apiKey: string) => ({
    messages: {
      stream() {
        calls.push(apiKey);
        return { finalMessage: async () => script[apiKey]() };
      },
    },
  }));
  return calls;
}

describe("classes/anthropic — labelled pool and monthly cap", () => {
  let dir = "";
  let now = Date.UTC(2026, 10, 22, 12);
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("ANTHROPIC_") || name === "AI_LLM_PROVIDER" || name === "CLAUDE_CREDIT_KEYS") delete process.env[name];
    }
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "anthropic-usage-"));
    process.env.ANTHROPIC_USAGE_DIR = dir;
    now = Date.UTC(2026, 10, 22, 12);
    __setAnthropicNowForTests(() => now);
    __resetAnthropicForTests();
  });
  afterEach(() => {
    __setAnthropicClientFactoryForTests(null);
    __setAnthropicNowForTests(null);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("reads label=key entries from ANTHROPIC_API_KEYS and CLAUDE_CREDIT_KEYS, any separator", () => {
    process.env.ANTHROPIC_API_KEYS = "shellix=sk-ant-usr-aaaa1111; sk-ant-usr-bbbb2222";
    process.env.CLAUDE_CREDIT_KEYS = "aira=sk-ant-usr-cccc3333\nedu=sk-ant-usr-aaaa1111";
    expect(anthropicKeyPool()).toEqual([
      { label: "shellix", key: "sk-ant-usr-aaaa1111" },
      { label: "…2222", key: "sk-ant-usr-bbbb2222" },
      { label: "aira", key: "sk-ant-usr-cccc3333" },
    ]);
  });

  it("names the key by its label in replies and usage", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "shellix=sk-ant-usr-aaaa1111";
    fakeClients({ "sk-ant-usr-aaaa1111": reply(10, 5) });
    expect((await askClaudePlain("x"))?.keyLabel).toBe("shellix");
    expect(anthropicUsage()[0].key).toBe("shellix");
  });

  it("estimates cost from the model's price per token, unknown models priced high", () => {
    expect(estimateClaudeCostUsd("claude-haiku-5-5", { input_tokens: 100_000, output_tokens: 100_000 })).toBeCloseTo(0.06);
    // Haiku 5.5 bills prompts above 100K tokens at $0.50 / $2.50.
    expect(estimateClaudeCostUsd("claude-haiku-5-5", { input_tokens: 200_000, output_tokens: 0 })).toBeCloseTo(0.1);
    expect(estimateClaudeCostUsd("claude-sonnet-5-5", { input_tokens: 1_000_000, output_tokens: 0 })).toBeCloseTo(2);
    expect(estimateClaudeCostUsd("claude-haiku-5-5", { input_tokens: 0, output_tokens: 0, server_tool_use: { web_search_requests: 3 } })).toBeCloseTo(0.03);
    expect(estimateClaudeCostUsd("claude-something-new", { input_tokens: 1_000_000, output_tokens: 0 })).toBeGreaterThanOrEqual(8);
  });

  it("skips a key once its estimated spend this month reaches the cap", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "a=sk-ant-usr-aaaa1111,b=sk-ant-usr-bbbb2222";
    process.env.ANTHROPIC_KEY_MONTHLY_CAP_USD = "0.001";
    const calls = fakeClients({ "sk-ant-usr-aaaa1111": reply(20_000, 0), "sk-ant-usr-bbbb2222": reply(10, 5) });
    await askClaudePlain("1"); // a: $0.002 > cap
    await askClaudePlain("2"); // b
    await askClaudePlain("3"); // b again: a is capped
    expect(calls).toEqual(["sk-ant-usr-aaaa1111", "sk-ant-usr-bbbb2222", "sk-ant-usr-bbbb2222"]);
  });

  it("a new process reads the month's ledger and still skips the capped key", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "a=sk-ant-usr-aaaa1111,b=sk-ant-usr-bbbb2222";
    process.env.ANTHROPIC_KEY_MONTHLY_CAP_USD = "0.001";
    fakeClients({ "sk-ant-usr-aaaa1111": reply(20_000, 0), "sk-ant-usr-bbbb2222": reply(10, 5) });
    await askClaudePlain("1");
    __resetAnthropicForTests(); // what a fresh cron process sees
    const calls = fakeClients({ "sk-ant-usr-aaaa1111": reply(10, 5), "sk-ant-usr-bbbb2222": reply(10, 5) });
    await askClaudePlain("2");
    await askClaudePlain("3");
    expect(calls).toEqual(["sk-ant-usr-bbbb2222", "sk-ant-usr-bbbb2222"]);
  });

  it("last month's spend does not count against this month", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "a=sk-ant-usr-aaaa1111";
    process.env.ANTHROPIC_KEY_MONTHLY_CAP_USD = "0.001";
    const calls = fakeClients({ "sk-ant-usr-aaaa1111": reply(20_000, 0) });
    await askClaudePlain("1");
    now = Date.UTC(2026, 11, 1, 0, 30);
    __resetAnthropicForTests();
    await askClaudePlain("2");
    expect(calls).toHaveLength(2);
  });

  it("ANTHROPIC_KEY_MONTHLY_CAP_USD=0 turns the cap off", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "a=sk-ant-usr-aaaa1111";
    process.env.ANTHROPIC_KEY_MONTHLY_CAP_USD = "0";
    const calls = fakeClients({ "sk-ant-usr-aaaa1111": reply(20_000_000, 0) });
    await askClaudePlain("1");
    await askClaudePlain("2");
    expect(calls).toHaveLength(2);
  });

  it("the ledger never contains a key, only its label", async () => {
    process.env.CLAUDE_CREDIT_KEYS = "shellix=sk-ant-usr-aaaa1111";
    fakeClients({ "sk-ant-usr-aaaa1111": reply(10, 5) });
    await askClaudePlain("1");
    const files = fs.readdirSync(dir);
    expect(files).toEqual(["2026-11.jsonl"]);
    const text = fs.readFileSync(path.join(dir, files[0]), "utf8");
    expect(text).toContain('"k":"shellix"');
    expect(text).not.toContain("sk-ant");
  });

  it("web search does not send a country the API rejects (live: 'Country code UY is not supported')", () => {
    const tool = webSearchToolFor("claude-haiku-5-5") as any;
    expect(tool.user_location?.country).toBeUndefined();
  });
});
