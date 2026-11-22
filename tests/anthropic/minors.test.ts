import { APIError } from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  __setAnthropicNowForTests,
  askClaudePlain,
  askClaudeWithImages,
  sniffImageMime,
} from "../../classes/anthropic";

const KEYS = ["sk-ant-api-aaaa1111", "sk-ant-api-bbbb2222"];

const reply = (text = "ok") => ({
  model: "claude-haiku-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text }],
  usage: { input_tokens: 1, output_tokens: 1 },
});

const error = (status: number, type: string, message: string) =>
  APIError.generate(status, { type: "error", error: { type, message } }, message, new Headers());

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46]);
const GIF = Buffer.from("GIF89a\u0001\u0000", "latin1");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const AVIF = Buffer.concat([Buffer.from([0, 0, 0, 0x1c]), Buffer.from("ftypavif")]);

describe("classes/anthropic — minor fixes", () => {
  let now = 1_000_000;
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if ((name.startsWith("ANTHROPIC_") && name !== "ANTHROPIC_USAGE_DIR") || name === "AI_LLM_PROVIDER" || name === "CLAUDE_CREDIT_KEYS") {
        delete process.env[name];
      }
    }
    process.env.ANTHROPIC_API_KEYS = KEYS.join(",");
    now = 1_000_000;
    __setAnthropicNowForTests(() => now);
    __resetAnthropicForTests();
  });
  afterEach(() => {
    __setAnthropicClientFactoryForTests(null);
    __setAnthropicNowForTests(null);
  });

  it("a 429 arriving after a retirement never revives the key", async () => {
    process.env.ANTHROPIC_API_KEYS = KEYS[0];
    const settle: Array<() => void> = [];
    let calls = 0;
    __setAnthropicClientFactoryForTests(() => ({
      messages: {
        stream() {
          const n = ++calls;
          return {
            finalMessage: () =>
              new Promise((_resolve, reject) => {
                settle[n - 1] = () => reject(n === 1 ? error(401, "authentication_error", "revoked") : error(429, "rate_limit_error", "slow"));
              }),
          };
        },
      },
    }));
    const first = askClaudePlain("1");
    const second = askClaudePlain("2");
    await new Promise((r) => setImmediate(r));
    settle[0](); // 401: retired
    await first;
    settle[1](); // the concurrent call's 429 lands afterwards
    await second;
    now += 120_000;
    expect(await askClaudePlain("3")).toBeNull();
    expect(calls).toBe(2);
  });

  it("a 404 (model this account cannot use) moves the call to the next key and retires the key", async () => {
    const used: string[] = [];
    __setAnthropicClientFactoryForTests((apiKey: string) => ({
      messages: {
        stream() {
          used.push(apiKey);
          return {
            finalMessage: async () => {
              if (apiKey === KEYS[0]) throw error(404, "not_found_error", "model: claude-haiku-5-5");
              return reply("b");
            },
          };
        },
      },
    }));
    expect((await askClaudePlain("1"))?.text).toBe("b");
    await askClaudePlain("2");
    await askClaudePlain("3");
    expect(used).toEqual([KEYS[0], KEYS[1], KEYS[1], KEYS[1]]);
  });

  it.each([
    ["png", PNG, "image/png"],
    ["jpeg", JPEG, "image/jpeg"],
    ["gif", GIF, "image/gif"],
    ["webp", WEBP, "image/webp"],
  ])("sniffImageMime recognises %s from its bytes", (_name, bytes, mime) => {
    expect(sniffImageMime(bytes)).toBe(mime);
  });

  it("sniffImageMime returns null for a format Claude does not read (AVIF) or junk", () => {
    expect(sniffImageMime(AVIF)).toBeNull();
    expect(sniffImageMime(Buffer.from("<html>"))).toBeNull();
  });

  it("an image labelled jpeg whose bytes are PNG is sent as image/png", async () => {
    const sent: any[] = [];
    __setAnthropicClientFactoryForTests(() => ({
      messages: {
        stream(params: any) {
          sent.push(params);
          return { finalMessage: async () => reply("una silla") };
        },
      },
    }));
    await askClaudeWithImages("¿qué es?", [{ data: PNG, mimeType: "image/jpeg" }]);
    expect(sent[0].messages[0].content[0].source.media_type).toBe("image/png");
  });

  it("an image labelled jpeg whose bytes are AVIF is not sent (the call goes to Gemini)", async () => {
    let calls = 0;
    __setAnthropicClientFactoryForTests(() => ({
      messages: {
        stream() {
          calls += 1;
          return { finalMessage: async () => reply() };
        },
      },
    }));
    expect(await askClaudeWithImages("¿qué es?", [{ data: AVIF, mimeType: "image/jpeg" }])).toBeNull();
    expect(calls).toBe(0);
  });
});
