import { APIConnectionError, APIError } from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  __setAnthropicNowForTests,
  anthropicConfigured,
  anthropicKeys,
  anthropicUsage,
  askClaudePlain,
} from "../../classes/anthropic";

type Behaviour = (params: any) => any;

/** One fake client per key; each call pops the key's next behaviour (the last one repeats). */
function fakeClients(script: Record<string, Behaviour[]>) {
  const calls: Array<{ key: string; params: any }> = [];
  __setAnthropicClientFactoryForTests((apiKey: string) => ({
    messages: {
      stream(params: any) {
        calls.push({ key: apiKey, params });
        const queue = script[apiKey] ?? [];
        const next = queue.length > 1 ? queue.shift()! : queue[0];
        return {
          finalMessage: async () => {
            if (!next) throw new Error(`no behaviour for ${apiKey}`);
            return next(params);
          },
        };
      },
    },
  }));
  return calls;
}

const reply =
  (text: string, stop_reason = "end_turn") =>
  () => ({
    model: "claude-haiku-5-5",
    stop_reason,
    content: [{ type: "text", text }],
    usage: { input_tokens: 10, output_tokens: 5 },
  });

const fail = (status: number, type: string, message: string, headers: Record<string, string> = {}) => () => {
  throw APIError.generate(status, { type: "error", error: { type, message } }, message, new Headers(headers));
};

const KEYS = ["sk-ant-api-aaaa1111", "sk-ant-api-bbbb2222", "sk-ant-api-cccc3333"];

describe("classes/anthropic client", () => {
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("ANTHROPIC_") || name === "AI_LLM_PROVIDER") delete process.env[name];
    }
    process.env.ANTHROPIC_API_KEYS = KEYS.join(",");
    __resetAnthropicForTests();
  });

  afterEach(() => {
    __setAnthropicClientFactoryForTests(null);
    __setAnthropicNowForTests(null);
  });

  it("reads keys from ANTHROPIC_API_KEYS, numbered vars and the bare var, deduplicated", () => {
    process.env.ANTHROPIC_API_KEYS = " k1 , k2,k1 ";
    process.env.ANTHROPIC_API_KEY_1 = "k3";
    process.env.ANTHROPIC_API_KEY_2 = "k2";
    process.env.ANTHROPIC_API_KEY = "k4";
    expect(anthropicKeys()).toEqual(["k1", "k2", "k3", "k4"]);
  });

  it("is unconfigured without keys", () => {
    delete process.env.ANTHROPIC_API_KEYS;
    expect(anthropicConfigured()).toBe(false);
  });

  it("returns text, model and key label from the first usable key", async () => {
    fakeClients({ [KEYS[0]]: [reply("hola")] });
    const out = await askClaudePlain("decí hola");
    expect(out).toEqual({ text: "hola", model: "claude-haiku-5-5", keyLabel: "…1111" });
  });

  it("round-robins across keys", async () => {
    const calls = fakeClients({ [KEYS[0]]: [reply("a")], [KEYS[1]]: [reply("b")], [KEYS[2]]: [reply("c")] });
    await askClaudePlain("1");
    await askClaudePlain("2");
    await askClaudePlain("3");
    expect(calls.map((c) => c.key)).toEqual(KEYS);
  });

  it.each([
    [401, "authentication_error", "invalid x-api-key"],
    [403, "permission_error", "Your organization has been disabled"],
    [402, "billing_error", "payment required"],
    [400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API."],
    [400, "invalid_request_error", "You have reached your specified API usage limits."],
  ])("retires a key for the process on %i %s and the same call is answered by the next key", async (status, type, message) => {
    const calls = fakeClients({ [KEYS[0]]: [fail(status, type, message)], [KEYS[1]]: [reply("b")], [KEYS[2]]: [reply("c")] });
    expect((await askClaudePlain("x"))?.text).toBe("b");
    await askClaudePlain("y");
    await askClaudePlain("z");
    expect(calls.map((c) => c.key)).toEqual([KEYS[0], KEYS[1], KEYS[2], KEYS[1]]);
  });

  it("on 429 rests the key 60 s and then uses it again", async () => {
    let now = 1_000_000;
    __setAnthropicNowForTests(() => now);
    process.env.ANTHROPIC_API_KEYS = KEYS.slice(0, 2).join(",");
    const calls = fakeClients({
      [KEYS[0]]: [fail(429, "rate_limit_error", "rate limited"), reply("a")],
      [KEYS[1]]: [reply("b")],
    });
    expect((await askClaudePlain("1"))?.text).toBe("b");
    now += 59_000;
    await askClaudePlain("2");
    expect(calls.at(-1)?.key).toBe(KEYS[1]);
    now += 2_000;
    await askClaudePlain("3");
    await askClaudePlain("4");
    expect(calls.slice(-2).map((c) => c.key).sort()).toEqual([KEYS[0], KEYS[1]].sort());
  });

  it("honours retry-after on 429", async () => {
    let now = 0;
    __setAnthropicNowForTests(() => now);
    process.env.ANTHROPIC_API_KEYS = KEYS.slice(0, 2).join(",");
    const calls = fakeClients({
      [KEYS[0]]: [fail(429, "rate_limit_error", "slow down", { "retry-after": "300" }), reply("a")],
      [KEYS[1]]: [reply("b")],
    });
    await askClaudePlain("1");
    now += 120_000;
    await askClaudePlain("2");
    await askClaudePlain("3");
    expect(calls.slice(1).every((c) => c.key === KEYS[1])).toBe(true);
  });

  it.each([
    ["overloaded 529", fail(529, "overloaded_error", "Overloaded")],
    ["server 500", fail(500, "api_error", "Internal")],
    [
      "network",
      () => {
        throw new APIConnectionError({ message: "socket hang up" });
      },
    ],
  ])("on %s returns null without retiring the key", async (_label, behaviour) => {
    process.env.ANTHROPIC_API_KEYS = KEYS[0];
    const calls = fakeClients({ [KEYS[0]]: [behaviour, reply("ok")] });
    expect(await askClaudePlain("1")).toBeNull();
    expect((await askClaudePlain("2"))?.text).toBe("ok");
    expect(calls).toHaveLength(2);
  });

  it("when every key is retired returns null without calling the client", async () => {
    const calls = fakeClients({
      [KEYS[0]]: [fail(401, "authentication_error", "bad")],
      [KEYS[1]]: [fail(401, "authentication_error", "bad")],
      [KEYS[2]]: [fail(401, "authentication_error", "bad")],
    });
    expect(await askClaudePlain("1")).toBeNull();
    expect(calls).toHaveLength(3);
    expect(await askClaudePlain("2")).toBeNull();
    expect(calls).toHaveLength(3);
    expect(anthropicConfigured()).toBe(false);
  });

  it("returns null on stop_reason refusal", async () => {
    fakeClients({ [KEYS[0]]: [reply("no", "refusal")] });
    expect(await askClaudePlain("x")).toBeNull();
  });

  it("AI_LLM_PROVIDER=gemini makes it unconfigured and never calls", async () => {
    process.env.AI_LLM_PROVIDER = "gemini";
    const calls = fakeClients({ [KEYS[0]]: [reply("a")] });
    expect(anthropicConfigured()).toBe(false);
    expect(await askClaudePlain("x")).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it("sends the configured model, low effort, no sampling parameters", async () => {
    process.env.ANTHROPIC_MODEL = "claude-sonnet-5-5";
    const calls = fakeClients({ [KEYS[0]]: [reply("a")] });
    await askClaudePlain("x", { system: "sé breve" });
    const params = calls[0].params;
    expect(params.model).toBe("claude-sonnet-5-5");
    expect(params.output_config).toEqual({ effort: "low" });
    expect(params.system).toBe("sé breve");
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("top_p");
    expect(params).not.toHaveProperty("thinking");
  });

  it("defaults to claude-haiku-5-5", async () => {
    const calls = fakeClients({ [KEYS[0]]: [reply("a")] });
    await askClaudePlain("x");
    expect(calls[0].params.model).toBe("claude-haiku-5-5");
  });

  it("counts usage per key", async () => {
    fakeClients({ [KEYS[0]]: [reply("a")], [KEYS[1]]: [fail(401, "authentication_error", "bad")] });
    await askClaudePlain("1");
    await askClaudePlain("2");
    const usage = anthropicUsage();
    expect(usage.find((u) => u.key === "…1111")).toMatchObject({ calls: 1, inputTokens: 10, outputTokens: 5, failures: 0 });
    expect(usage.find((u) => u.key === "…2222")).toMatchObject({ calls: 0, failures: 1 });
  });
});
