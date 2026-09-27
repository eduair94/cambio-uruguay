import { describe, expect, it } from "vitest";
import { survivesFlush } from "../../classes/redis_cache";

// POST /cache/flush vacía la CACHÉ. El medidor de uso y los contadores de límite viven en el mismo
// Redis pero no son caché: borrarlos pierde uso medido (lo que se factura) y reinicia cuotas.
describe("qué sobrevive a vaciar la caché", () => {
  it("el medidor y los contadores de límite sobreviven", () => {
    expect(survivesFlush("cambio:usage:2026-09-27")).toBe(true);
    expect(survivesFlush("cambio:rl:m:ip:1.2.3.4:29324584")).toBe(true);
    expect(survivesFlush("cambio:rl:d:key:abc:2026-09-27")).toBe(true);
  });

  it("todo lo demás es caché y se borra", () => {
    expect(survivesFlush("cambio:bcu:all")).toBe(false);
    expect(survivesFlush("cambio:intraday:2026-09-27:USD:all:any")).toBe(false);
    expect(survivesFlush("cambio:usage-report")).toBe(false);
  });
});
