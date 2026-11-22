import { APIError } from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  __setAnthropicFetchForTests,
  __setAnthropicNowForTests,
  anthropicConfigured,
  askClaudePlain,
  askClaudeWithImages,
} from "../../classes/anthropic";

const KEYS = ["sk-ant-api-aaaa1111", "sk-ant-api-bbbb2222"];

const reply = (text: string, stop_reason = "end_turn") => ({
  model: "claude-haiku-5-5",
  stop_reason,
  content: [{ type: "text", text }],
  usage: { input_tokens: 1, output_tokens: 1 },
});

function fakeClients(script: Record<string, Array<() => any>>) {
  const calls: Array<{ key: string; options: any }> = [];
  __setAnthropicClientFactoryForTests((apiKey: string) => ({
    messages: {
      stream(_params: any, options?: any) {
        calls.push({ key: apiKey, options });
        const queue = script[apiKey] ?? [];
        const next = queue.length > 1 ? queue.shift()! : queue[0];
        return { finalMessage: async () => next() };
      },
    },
  }));
  return calls;
}

const outage = () => {
  throw APIError.generate(500, { type: "error", error: { type: "api_error", message: "Internal" } }, "Internal", new Headers());
};

describe("classes/anthropic — review fixes", () => {
  let now = 1_000_000;
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if (name.startsWith("ANTHROPIC_") || name === "AI_LLM_PROVIDER") delete process.env[name];
    }
    process.env.ANTHROPIC_API_KEYS = KEYS.join(",");
    now = 1_000_000;
    __setAnthropicNowForTests(() => now);
    __resetAnthropicForTests();
  });
  afterEach(() => {
    __setAnthropicClientFactoryForTests(null);
    __setAnthropicFetchForTests(null);
    __setAnthropicNowForTests(null);
  });

  it("never lets the SDK retry: a 429 reaches the rotation after one request per key", async () => {
    let requests = 0;
    __setAnthropicFetchForTests(async () => {
      requests += 1;
      return new Response(
        JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "slow down" } }),
        { status: 429, headers: { "content-type": "application/json", "retry-after": "2" } }
      );
    });
    const started = Date.now();
    expect(await askClaudePlain("x")).toBeNull();
    expect(requests).toBe(2);
    expect(Date.now() - started).toBeLessThan(1500);
  });

  it("sends every key to api.anthropic.com even if ANTHROPIC_BASE_URL points elsewhere", async () => {
    process.env.ANTHROPIC_BASE_URL = "https://evil.example";
    const hosts: string[] = [];
    __setAnthropicFetchForTests(async (input: any) => {
      hosts.push(new URL(typeof input === "string" ? input : input.url).host);
      return new Response(JSON.stringify({ type: "error", error: { type: "api_error", message: "x" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    });
    await askClaudePlain("x");
    expect(hosts).toEqual(["api.anthropic.com"]);
  });

  it("retires a key on a monthly spend limit (429 enforced_spend_limit_reached)", async () => {
    const calls = fakeClients({
      [KEYS[0]]: [
        () => {
          throw APIError.generate(
            429,
            {
              type: "error",
              error: {
                type: "rate_limit_error",
                message: "This organization has crossed the monthly API usage threshold of its API tier.",
                details: { error_code: "enforced_spend_limit_reached" },
              },
            },
            "spend limit",
            new Headers({ "retry-after": "30" })
          );
        },
        () => reply("a"),
      ],
      [KEYS[1]]: [() => reply("b")],
    });
    expect((await askClaudePlain("1"))?.text).toBe("b");
    now += 3_600_000;
    await askClaudePlain("2");
    await askClaudePlain("3");
    expect(calls.map((c) => c.key)).toEqual([KEYS[0], KEYS[1], KEYS[1], KEYS[1]]);
  });

  it("returns null when the plain answer was cut by max_tokens", async () => {
    fakeClients({ [KEYS[0]]: [() => reply('{"reviews":[{"slug":"a","verdict":"bue', "max_tokens")] });
    expect(await askClaudePlain("x")).toBeNull();
  });

  it("returns null when an image answer without schema was cut by max_tokens", async () => {
    fakeClients({ [KEYS[0]]: [() => reply("una silla de", "max_tokens")] });
    expect(await askClaudeWithImages("x", [{ data: Buffer.from("a"), mimeType: "image/jpeg" }])).toBeNull();
  });

  it("after 3 outages in a row Claude is skipped for 5 minutes", async () => {
    process.env.ANTHROPIC_API_KEYS = KEYS[0];
    const calls = fakeClients({ [KEYS[0]]: [outage, outage, outage, () => reply("ok")] });
    for (let i = 0; i < 3; i++) expect(await askClaudePlain("x")).toBeNull();
    expect(anthropicConfigured()).toBe(false);
    expect(await askClaudePlain("x")).toBeNull();
    expect(calls).toHaveLength(3);
    now += 5 * 60_000 + 1;
    expect(anthropicConfigured()).toBe(true);
    expect((await askClaudePlain("x"))?.text).toBe("ok");
  });

  it("a success resets the outage streak", async () => {
    process.env.ANTHROPIC_API_KEYS = KEYS[0];
    const calls = fakeClients({ [KEYS[0]]: [outage, outage, () => reply("ok"), outage, outage, () => reply("again")] });
    for (let i = 0; i < 6; i++) await askClaudePlain("x");
    expect(calls).toHaveLength(6);
    expect(anthropicConfigured()).toBe(true);
  });

  it("bounds the whole call with an AbortSignal, not only the time to headers", async () => {
    const calls = fakeClients({ [KEYS[0]]: [() => reply("ok")] });
    await askClaudePlain("x", { timeoutMs: 90_000 });
    expect(calls[0].options.signal).toBeInstanceOf(AbortSignal);
    expect(calls[0].options.timeout).toBe(90_000);
  });
});
