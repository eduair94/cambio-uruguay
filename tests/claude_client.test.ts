// The Claude client's three defensive behaviours. All three exist because the quota belongs to a
// person, not to a plan.
import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetClaudeForTests,
  askClaude,
  askClaudeJson,
  claudeHasBudget,
  claudeSaturated,
} from "../classes/claude";

const saved = { key: process.env.CLAUDE_AGENT_API_KEY, min: process.env.CLAUDE_AGENT_MIN_REMAINING };

const okPost = (result: string) => ({ status: 200, data: { ok: true, result } });

describe("classes/claude", () => {
  beforeEach(() => {
    process.env.CLAUDE_AGENT_API_KEY = "k";
    __resetClaudeForTests();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    if (saved.key === undefined) delete process.env.CLAUDE_AGENT_API_KEY;
    else process.env.CLAUDE_AGENT_API_KEY = saved.key;
    if (saved.min === undefined) delete process.env.CLAUDE_AGENT_MIN_REMAINING;
    else process.env.CLAUDE_AGENT_MIN_REMAINING = saved.min;
    vi.restoreAllMocks();
    __resetClaudeForTests();
  });

  it("returns the agent's text on a clean call", async () => {
    vi.spyOn(axios, "post").mockResolvedValue(okPost("  la respuesta  ") as any);
    await expect(askClaude("hola")).resolves.toBe("la respuesta");
  });

  it("is a no-op without a key, and does not touch the network", async () => {
    delete process.env.CLAUDE_AGENT_API_KEY;
    const post = vi.spyOn(axios, "post");
    await expect(askClaude("hola")).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it("always sends the anti-caveman instruction — the box's plugin clips every reply otherwise", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue(okPost("x") as any);
    await askClaude("hola");
    const body = post.mock.calls[0]![1] as any;
    expect(body.appendSystemPrompt).toContain("telegrafico");
  });

  it("keeps the caller's own voice rules after the anti-caveman one", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue(okPost("x") as any);
    await askClaude("hola", { appendSystemPrompt: "VOZ PROPIA" });
    const body = post.mock.calls[0]![1] as any;
    expect(body.appendSystemPrompt.indexOf("telegrafico")).toBeLessThan(body.appendSystemPrompt.indexOf("VOZ PROPIA"));
  });

  it("defaults to no tools — the fastest and cheapest shape", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue(okPost("x") as any);
    await askClaude("hola");
    expect((post.mock.calls[0]![1] as any).allowedTools).toEqual([]);
  });

  describe("saturation", () => {
    for (const status of [429, 503, 504]) {
      it(`latches on ${status} and stops calling for the rest of the process`, async () => {
        // The endpoint's own guidance: these all mean stop. A retry loop spends real weekly quota
        // to earn another 429.
        const post = vi.spyOn(axios, "post").mockResolvedValue({ status, data: { error: "x" } } as any);
        await expect(askClaude("uno")).resolves.toBeNull();
        expect(claudeSaturated()).toBe(true);

        post.mockResolvedValue(okPost("ahora si") as any);
        await expect(askClaude("dos")).resolves.toBeNull();
        expect(post).toHaveBeenCalledTimes(1); // the second call never left the process
      });
    }

    it("does not latch on an ordinary error", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({ status: 400, data: { error: "missing_prompt" } } as any);
      await expect(askClaude("x")).resolves.toBeNull();
      expect(claudeSaturated()).toBe(false);
    });

    it("does not latch on a network throw", async () => {
      vi.spyOn(axios, "post").mockRejectedValue(new Error("ECONNREFUSED"));
      await expect(askClaude("x")).resolves.toBeNull();
      expect(claudeSaturated()).toBe(false);
    });
  });

  describe("the human's reserve", () => {
    const health = (remaining: number) => ({ status: 200, data: { ok: true, daily: { remaining, limit: 200 } } });

    it("works while there is room above the reserve", async () => {
      process.env.CLAUDE_AGENT_MIN_REMAINING = "60";
      vi.spyOn(axios, "get").mockResolvedValue(health(120) as any);
      await expect(claudeHasBudget()).resolves.toBe(true);
    });

    it("stands down once the day is down to the reserve", async () => {
      process.env.CLAUDE_AGENT_MIN_REMAINING = "60";
      vi.spyOn(axios, "get").mockResolvedValue(health(40) as any);
      await expect(claudeHasBudget()).resolves.toBe(false);
    });

    it("treats an unreachable endpoint as 'do not call', not as 'unlimited'", async () => {
      vi.spyOn(axios, "get").mockRejectedValue(new Error("down"));
      await expect(claudeHasBudget()).resolves.toBe(false);
    });
  });

  describe("askClaudeJson", () => {
    it("parses the string the service returns — it is not an object", async () => {
      vi.spyOn(axios, "post").mockResolvedValue(okPost('{"relevant":true,"confidence":0.9}') as any);
      await expect(askClaudeJson("x", { type: "object" })).resolves.toEqual({ relevant: true, confidence: 0.9 });
    });

    it("salvages an answer we already paid for when it arrives wrapped in prose", async () => {
      vi.spyOn(axios, "post").mockResolvedValue(okPost('Acá va: {"a":1} listo') as any);
      await expect(askClaudeJson("x", { type: "object" })).resolves.toEqual({ a: 1 });
    });

    it("gives up on something that is not JSON at all", async () => {
      vi.spyOn(axios, "post").mockResolvedValue(okPost("me parece que si") as any);
      await expect(askClaudeJson("x", { type: "object" })).resolves.toBeNull();
    });

    it("passes the schema through so the service enforces it", async () => {
      const post = vi.spyOn(axios, "post").mockResolvedValue(okPost("{}") as any);
      const schema = { type: "object", required: ["a"] };
      await askClaudeJson("x", schema);
      expect((post.mock.calls[0]![1] as any).jsonSchema).toEqual(schema);
    });
  });

  it("sets a client timeout ABOVE the server's, or the server's error is lost and the quota spent anyway", async () => {
    const post = vi.spyOn(axios, "post").mockResolvedValue(okPost("x") as any);
    await askClaude("x", { timeoutMs: 60000 });
    const config = post.mock.calls[0]![2] as any;
    expect(config.timeout).toBeGreaterThan(60000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// El 200 que no es un 200
// ─────────────────────────────────────────────────────────────────────────────
//
// El endpoint contesta 200 siempre que llegó a ejecutar el agente, aunque el agente no haya podido
// hacer nada. El 2026-08-19 la suscripción de la caja quedó deshabilitada y durante días TODO el
// fleet —juez, redactor, investigación de huecos, aduana— escribió con Gemini sin que nadie lo
// notara, porque el cliente imprimía el motivo desde `error`/`message`, que venían vacíos, y el
// motivo real vivía en `result`.
describe("classes/claude — el 200 con ok:false", () => {
  const savedKey = process.env.CLAUDE_AGENT_API_KEY;

  beforeEach(() => {
    process.env.CLAUDE_AGENT_API_KEY = "k";
    __resetClaudeForTests();
  });

  afterEach(() => {
    if (savedKey === undefined) delete process.env.CLAUDE_AGENT_API_KEY;
    else process.env.CLAUDE_AGENT_API_KEY = savedKey;
    vi.restoreAllMocks();
    __resetClaudeForTests();
  });

  const disabled = {
    status: 200,
    data: {
      ok: false,
      result:
        "Your organization has disabled Claude subscription access for Claude Code · Use an Anthropic API key instead, or ask your admin to enable access",
    },
  };

  it("imprime el motivo aunque venga en result y no en error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(axios, "post").mockResolvedValue(disabled as any);

    await expect(askClaude("hola")).resolves.toBeNull();

    const printed = warn.mock.calls.map(c => c.join(" ")).join("\n");
    expect(printed).toContain("disabled Claude subscription access");
    // Lo que NO puede volver a pasar: la línea vacía que hacía invisible el problema.
    expect(printed).not.toMatch(/HTTP 200\s*:?\s*$/m);
  });

  it("deja de llamar en ese proceso: una cuenta apagada no se arregla reintentando", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const post = vi.spyOn(axios, "post").mockResolvedValue(disabled as any);

    await askClaude("uno");
    expect(claudeSaturated()).toBe(true);

    // Cada llamada cuesta la ida y vuelta entera antes de caer a Gemini. Con veinte llamadas por
    // corrida eso son minutos tirados, todas las horas, para siempre.
    await askClaude("dos");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("un ok:false común NO apaga el cliente — puede ser este pedido y no la cuenta", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(axios, "post").mockResolvedValue({
      status: 200,
      data: { ok: false, error: "prompt too long" },
    } as any);

    await expect(askClaude("hola")).resolves.toBeNull();
    expect(claudeSaturated()).toBe(false);
  });
});
