import { describe, expect, it } from "vitest";
import { countRequest, meter, readCounts, readUsage, USAGE_TTL } from "../../classes/apikeys/counters";
import { windowKeys } from "../../classes/apikeys/window";
import { FakeRedis } from "./fakes";

const keys = windowKeys(new Date("2026-09-27T15:04:30Z"));

describe("contadores en Redis", () => {
  it("cuenta minuto y día del mismo sujeto y les pone vencimiento", async () => {
    const redis = new FakeRedis();
    await countRequest(redis, "ip:1.2.3.4", keys);
    const second = await countRequest(redis, "ip:1.2.3.4", keys);
    expect(second).toEqual({ minute: 2, day: 2 });
    expect(redis.ttl.get(`rl:m:ip:1.2.3.4:${keys.minuteBucket}`)).toBe(120);
    expect(redis.ttl.get("rl:d:ip:1.2.3.4:2026-09-27")).toBe(3 * 86400);
    expect(await readCounts(redis, "ip:1.2.3.4", keys)).toEqual({ minute: 2, day: 2 });
  });

  it("si Redis se cae devuelve null en vez de tirar", async () => {
    const redis = new FakeRedis();
    redis.fail = true;
    expect(await countRequest(redis, "ip:1.2.3.4", keys)).toBeNull();
    expect(await readCounts(redis, "ip:1.2.3.4", keys)).toBeNull();
    expect(await meter(redis, "2026-09-27", "site", "/")).toBe(false);
  });

  it("el medidor suma por cliente y ruta en el hash del día, con 40 días de vida", async () => {
    const redis = new FakeRedis();
    await meter(redis, "2026-09-27", "ua:ArboitePanel/1.0", "/exchange/la_favorita");
    await meter(redis, "2026-09-27", "ua:ArboitePanel/1.0", "/exchange/la_favorita");
    expect(await readUsage(redis, "2026-09-27")).toEqual({ "ua:ArboitePanel/1.0|/exchange/la_favorita": 2 });
    expect(redis.ttl.get("usage:2026-09-27")).toBe(USAGE_TTL);
  });
});
