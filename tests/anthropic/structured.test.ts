import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __resetAnthropicForTests,
  __setAnthropicClientFactoryForTests,
  askClaudeJSON,
  askClaudeWithImages,
  toClaudeSchema,
} from "../../classes/anthropic";

function fakeClient(answer: (params: any) => any) {
  const calls: any[] = [];
  __setAnthropicClientFactoryForTests(() => ({
    messages: {
      stream(params: any) {
        calls.push(params);
        return { finalMessage: async () => answer(params) };
      },
    },
  }));
  return calls;
}

const message = (text: string, stop_reason = "end_turn") => ({
  model: "claude-haiku-5-5",
  stop_reason,
  content: [{ type: "text", text }],
  usage: { input_tokens: 1, output_tokens: 1 },
});

// Copied verbatim from classes/autos/llm/vision.ts: the schema that actually travels.
const CAR_VISION_SCHEMA = {
  type: "object",
  properties: {
    matchesAdvert: { type: "string", enum: ["si", "no", "no_se"] },
    damage: { type: "string", enum: ["ninguno", "leve", "grave", "no_se_ve"] },
    catalogPhotos: { type: "boolean" },
    note: { type: "string" },
  },
  required: ["matchesAdvert", "damage", "catalogPhotos", "note"],
};

describe("toClaudeSchema", () => {
  it("closes every object and lowercases Gemini types", () => {
    const out = toClaudeSchema({
      type: "OBJECT",
      properties: {
        a: { type: "STRING" },
        b: { type: "ARRAY", items: { type: "OBJECT", properties: { c: { type: "INTEGER", minimum: 0 } } } },
      },
      propertyOrdering: ["a", "b"],
    });
    expect(out).toEqual({
      type: "object",
      additionalProperties: false,
      properties: {
        a: { type: "string" },
        b: { type: "array", items: { type: "object", additionalProperties: false, properties: { c: { type: "integer" } } } },
      },
    });
  });

  it("maps nullable to anyOf with null", () => {
    expect(toClaudeSchema({ type: "string", nullable: true, maxLength: 20 })).toEqual({
      anyOf: [{ type: "string" }, { type: "null" }],
    });
  });

  it("accepts the car-vision schema unchanged except additionalProperties", () => {
    expect(toClaudeSchema(CAR_VISION_SCHEMA)).toEqual({ ...CAR_VISION_SCHEMA, additionalProperties: false });
  });

  it("does not mutate its input", () => {
    const input = JSON.parse(JSON.stringify(CAR_VISION_SCHEMA));
    toClaudeSchema(input);
    expect(input).toEqual(CAR_VISION_SCHEMA);
  });
});

describe("askClaudeJSON / askClaudeWithImages", () => {
  beforeEach(() => {
    for (const name of Object.keys(process.env)) {
      if ((name.startsWith("ANTHROPIC_") && name !== "ANTHROPIC_USAGE_DIR") || name === "AI_LLM_PROVIDER" || name === "CLAUDE_CREDIT_KEYS") delete process.env[name];
    }
    process.env.ANTHROPIC_API_KEYS = "sk-ant-api-test0001";
    __resetAnthropicForTests();
  });
  afterEach(() => __setAnthropicClientFactoryForTests(null));

  it("askClaudeJSON sends output_config.format json_schema and parses the text", async () => {
    const calls = fakeClient(() => message('{"matchesAdvert":"si","damage":"leve","catalogPhotos":false,"note":"ok"}'));
    const out = await askClaudeJSON<{ damage: string }>("mirá", CAR_VISION_SCHEMA, { system: "perito" });
    expect(out).toEqual({
      value: { matchesAdvert: "si", damage: "leve", catalogPhotos: false, note: "ok" },
      model: "claude-haiku-5-5",
    });
    expect(calls[0].output_config).toEqual({
      effort: "low",
      format: { type: "json_schema", schema: { ...CAR_VISION_SCHEMA, additionalProperties: false } },
    });
    expect(calls[0].system).toBe("perito");
  });

  it("askClaudeJSON salvages an object wrapped in prose", async () => {
    fakeClient(() => message('Acá va:\n```json\n{"a":1}\n```'));
    expect((await askClaudeJSON<{ a: number }>("x", { type: "object", properties: { a: { type: "integer" } } }))?.value).toEqual({ a: 1 });
  });

  it("askClaudeJSON returns null on stop_reason max_tokens", async () => {
    fakeClient(() => message('{"a":', "max_tokens"));
    expect(await askClaudeJSON("x", { type: "object" })).toBeNull();
  });

  it("askClaudeWithImages sends base64 image blocks before the text", async () => {
    const calls = fakeClient(() => message("una silla"));
    const out = await askClaudeWithImages("¿qué es?", [{ data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg" }]);
    expect(out?.text).toBe("una silla");
    expect(calls[0].messages[0].content).toEqual([
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64") } },
      { type: "text", text: "¿qué es?" },
    ]);
  });

  it("askClaudeWithImages with a schema returns the parsed value", async () => {
    fakeClient(() => message('{"matchesAdvert":"no_se","damage":"no_se_ve","catalogPhotos":true,"note":"render"}'));
    const out = await askClaudeWithImages("x", [{ data: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), mimeType: "image/png" }], { schema: CAR_VISION_SCHEMA });
    expect(out?.value).toMatchObject({ catalogPhotos: true });
  });

  it("askClaudeWithImages caches the system prompt only when asked to", async () => {
    const calls = fakeClient(() => message("x"));
    const jpeg = [{ data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg" }];
    await askClaudeWithImages("x", jpeg, { system: "perito fijo", cacheSystem: true });
    await askClaudeWithImages("x", jpeg, { system: "perito fijo" });
    expect(calls[0].system).toEqual([{ type: "text", text: "perito fijo", cache_control: { type: "ephemeral" } }]);
    expect(calls[1].system).toBe("perito fijo");
  });

  it("askClaudeWithImages reports the tokens and the estimated cost of the call", async () => {
    fakeClient(() => ({
      ...message("ok"),
      usage: { input_tokens: 4000, output_tokens: 200, cache_read_input_tokens: 2500, cache_creation_input_tokens: 0 },
    }));
    const out = await askClaudeWithImages("x", [{ data: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), mimeType: "image/jpeg" }]);
    expect(out?.usage).toEqual({ input: 4000, output: 200, cacheRead: 2500, cacheWrite: 0 });
    // Haiku 5.5: 4000 × 0.1 + 2500 × 0.01 + 200 × 0.5, per million.
    expect(out?.costUsd).toBeCloseTo((4000 * 0.1 + 2500 * 0.01 + 200 * 0.5) / 1e6, 12);
  });

  it("askClaudeWithImages returns null (without calling) when a mime is unsupported", async () => {
    const calls = fakeClient(() => message("x"));
    expect(await askClaudeWithImages("x", [{ data: Buffer.from("a"), mimeType: "image/avif" }])).toBeNull();
    expect(calls).toHaveLength(0);
  });
});
