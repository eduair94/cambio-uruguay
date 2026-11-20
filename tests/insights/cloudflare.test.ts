import { describe, expect, it } from "vitest";
import { sanitizeError } from "../../classes/insights/errors";
import { CfAuthzError, CfBudgetError, cfTokens, createCfClient, isAuthzError } from "../../classes/insights/sources/cloudflare";
import type { HttpLike } from "../../classes/insights/sources/cloudflare";
import { fixture } from "./helpers";

const OK = { status: 200, data: { data: { viewer: { accounts: [{}] } }, errors: null } };
const AUTHZ = { status: 200, data: fixture("cf_graphql_authz_error") };

function fakeHttp(answers: ((token: string) => any)[] | ((token: string) => any)) {
  const calls: { url: string; token: string }[] = [];
  let i = 0;
  const http: HttpLike = {
    post: async (url, _body, config) => {
      const token = String(config.headers.Authorization).replace("Bearer ", "");
      calls.push({ url, token });
      const f = Array.isArray(answers) ? answers[Math.min(i++, answers.length - 1)] : answers;
      return f(token);
    },
    get: async (url, config) => {
      const token = String(config.headers.Authorization).replace("Bearer ", "");
      calls.push({ url, token });
      return token === "t2" ? { status: 200, data: fixture("cf_zone_get") } : { status: 403, data: {} };
    },
  };
  return { http, calls };
}

const noWait = { sleep: async () => undefined, now: () => 0, minIntervalMs: 0 };

describe("tokens de Cloudflare", () => {
  it("en orden: el de analytics primero, sin repetir", () => {
    expect(cfTokens({ CLOUDFLARE_ANALYTICS_TOKEN: "a", CLOUDFLARE_TOKEN: "b" } as any)).toEqual(["a", "b"]);
    expect(cfTokens({ CLOUDFLARE_ANALYTICS_TOKEN: "a", CLOUDFLARE_TOKEN: "a" } as any)).toEqual(["a"]);
    expect(cfTokens({ CLOUDFLARE_TOKEN: "b" } as any)).toEqual(["b"]);
    expect(cfTokens({} as any)).toEqual([]);
  });

  it("detecta el authz del fixture", () => {
    expect(isAuthzError(fixture("cf_graphql_authz_error").errors)).toBe(true);
    expect(isAuthzError(fixture("cf_graphql_field_or_range_error").errors)).toBe(false);
  });

  it("un authz en el token 1 pasa al token 2", async () => {
    const { http, calls } = fakeHttp((t) => (t === "t1" ? AUTHZ : OK));
    const c = createCfClient({ http, tokens: ["t1", "t2"], ...noWait });
    const res = await c.graphql("q", {}, "account");
    expect(res.tokenIndex).toBe(1);
    expect(calls.map((x) => x.token)).toEqual(["t1", "t2"]);
    // La siguiente consulta del mismo alcance arranca por el que sirvió.
    await c.graphql("q", {}, "account");
    expect(calls[calls.length - 1].token).toBe("t2");
    expect(await c.accountId()).toBe("11111111111111111111111111111111");
  });

  it("authz en todos: CfAuthzError, y su texto no lleva ningún token", async () => {
    const { http } = fakeHttp(() => AUTHZ);
    const c = createCfClient({ http, tokens: ["t1", "t2"], ...noWait });
    const err = await c.graphql("q", {}).catch((e) => e);
    expect(err).toBeInstanceOf(CfAuthzError);
    const note = sanitizeError(err, "cloudflareZone");
    expect(note).not.toContain("t1");
    expect(note).not.toContain("com.cloudflare.api.token");
  });

  it("deja ≥ 1,1 s entre consultas", async () => {
    let clock = 0;
    const waits: number[] = [];
    const { http } = fakeHttp(() => OK);
    const c = createCfClient({
      http,
      tokens: ["t1"],
      now: () => clock,
      sleep: async (ms) => {
        waits.push(ms);
        clock += ms;
      },
    });
    await c.graphql("q", {});
    clock += 300;
    await c.graphql("q", {});
    await c.graphql("q", {});
    expect(waits).toEqual([800, 1100]);
  });

  it("la consulta 201 de una corrida tira CfBudgetError", async () => {
    const { http } = fakeHttp(() => OK);
    const c = createCfClient({ http, tokens: ["t1"], ...noWait });
    for (let i = 0; i < 200; i++) await c.graphql("q", {});
    await expect(c.graphql("q", {})).rejects.toBeInstanceOf(CfBudgetError);
    expect(c.queriesUsed()).toBe(200);
  });
});
