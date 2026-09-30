import { describe, expect, it } from "vitest";
import { countRequest, invalidAttempts, meter, noteInvalid, readCounts, readUsage, refundDay, USAGE_TTL } from "../../classes/apikeys/counters";
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

describe("contadores con Redis colgado", () => {
  it("un Redis conectado pero trabado no cuelga el pedido: devuelve null a tiempo", async () => {
    const redis = new FakeRedis();
    redis.hang = true;
    const started = Date.now();
    expect(await countRequest(redis, "ip:1.2.3.4", keys, 20)).toBeNull();
    expect(await readCounts(redis, "ip:1.2.3.4", keys, 20)).toBeNull();
    expect(await invalidAttempts(redis, "1.2.3.4", keys, 20)).toBe(0);
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("devoluciones y claves inválidas", () => {
  it("un pedido cortado por el minuto le devuelve el pedido al día", async () => {
    const redis = new FakeRedis();
    await countRequest(redis, "ip:1.2.3.4", keys);
    await countRequest(redis, "ip:1.2.3.4", keys);
    await refundDay(redis, "ip:1.2.3.4", keys);
    expect(await readCounts(redis, "ip:1.2.3.4", keys)).toEqual({ minute: 2, day: 1 });
  });

  it("cuenta las claves inválidas DISTINTAS por IP y por minuto, no los intentos", async () => {
    const redis = new FakeRedis();
    await noteInvalid(redis, "1.2.3.4", keys, "hash-a");
    await noteInvalid(redis, "1.2.3.4", keys, "hash-b");
    await noteInvalid(redis, "1.2.3.4", keys, "hash-a");
    expect(await invalidAttempts(redis, "1.2.3.4", keys)).toBe(2);
    expect(await invalidAttempts(redis, "5.6.7.8", keys)).toBe(0);
    expect(redis.ttl.get(`rl:inv:1.2.3.4:${keys.minuteBucket}`)).toBe(120);
  });
});
