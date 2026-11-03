import { describe, expect, it } from "vitest";
import { EMPTY_SPECS, specsFromRows } from "../../classes/movilidad/specs/parse";
import { fichaDue, orderTargets, type FichaQueueRow, type StoredFichaDoc } from "../../classes/movilidad/specs/queue";
import { readFicha } from "../../classes/movilidad/specs/read";
import { buildSpecSnapshot, type SnapshotRow } from "../../classes/movilidad/specs/snapshot";
import { MovilidadSpecSnapshotModel } from "../../classes/models/MovilidadSpecSnapshot";

const NOW = new Date("2026-11-03T12:00:00Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

describe("fichaDue", () => {
  it("lo nunca leído se lee", () => {
    expect(fichaDue(undefined, NOW)).toBe(true);
  });

  it("una ficha buena se relee a los 45 días", () => {
    const ok: StoredFichaDoc = { listingId: "a", ok: true, failures: 0, readAt: daysAgo(44), lastTriedAt: daysAgo(44) };
    expect(fichaDue(ok, NOW)).toBe(false);
    expect(fichaDue({ ...ok, readAt: daysAgo(46), lastTriedAt: daysAgo(46) }, NOW)).toBe(true);
  });

  it("una falla espera 1, 3 y 7 días y a la cuarta se abandona por un mes", () => {
    const failed = (failures: number, days: number): StoredFichaDoc => ({
      listingId: "a",
      ok: false,
      failures,
      readAt: null,
      lastTriedAt: daysAgo(days),
    });
    expect(fichaDue(failed(1, 0.5), NOW)).toBe(false);
    expect(fichaDue(failed(1, 1.1), NOW)).toBe(true);
    expect(fichaDue(failed(2, 2), NOW)).toBe(false);
    expect(fichaDue(failed(2, 3.1), NOW)).toBe(true);
    expect(fichaDue(failed(3, 6), NOW)).toBe(false);
    expect(fichaDue(failed(3, 7.1), NOW)).toBe(true);
    expect(fichaDue(failed(4, 20), NOW)).toBe(false);
  });

  it("un aviso que ya no existe vuelve a mirarse a los 7 días", () => {
    const gone: StoredFichaDoc = { listingId: "a", ok: false, gone: true, failures: 0, readAt: null, lastTriedAt: daysAgo(3) };
    expect(fichaDue(gone, NOW)).toBe(false);
    expect(fichaDue({ ...gone, lastTriedAt: daysAgo(8) }, NOW)).toBe(true);
  });
});

describe("orderTargets", () => {
  const row = (listingId: string, source: FichaQueueRow["source"]): FichaQueueRow => ({
    listingId,
    source,
    // Un aviso de ML necesita un id de producto para que la cola lo pida al puente (`mlProductId`).
    url:
      source === "mercadolibre"
        ? `https://www.mercadolibre.com.uy/x/up/MLUU${[...listingId].map((char) => char.charCodeAt(0)).join("")}`
        : `https://x/${listingId}`,
  });

  it("tiendas primero, después ML nunca leídos, después los vencidos; nunca Facebook", () => {
    const rows = [row("ml:3", "mercadolibre"), row("fb:1", "facebook"), row("ml:1", "mercadolibre"), row("store:a", "store")];
    const stored = new Map<string, StoredFichaDoc>([
      ["ml:3", { listingId: "ml:3", ok: true, failures: 0, readAt: daysAgo(50), lastTriedAt: daysAgo(50) }],
    ]);
    expect(orderTargets(rows, stored, NOW, 10).map((target) => target.listingId)).toEqual(["store:a", "ml:1", "ml:3"]);
    expect(orderTargets(rows, stored, NOW, 2)).toHaveLength(2);
  });

  it("cinco avisos muertos al frente no traban la cola: no vuelven hasta su espera", () => {
    const rows = ["a", "b", "c", "d", "e", "f"].map((id) => row(`ml:${id}`, "mercadolibre"));
    const stored = new Map<string, StoredFichaDoc>(
      ["a", "b", "c", "d", "e"].map((id) => [
        `ml:${id}`,
        { listingId: `ml:${id}`, ok: false, gone: true, failures: 0, readAt: null, lastTriedAt: daysAgo(0.1) },
      ])
    );
    expect(orderTargets(rows, stored, NOW, 5).map((target) => target.listingId)).toEqual(["ml:f"]);
  });
});

describe("readFicha", () => {
  it("sin respuesta del puente es una falla, no un aviso muerto", async () => {
    const read = await readFicha({ listingId: "ml:1", url: "https://www.mercadolibre.com.uy/x/up/MLUU1", source: "mercadolibre" }, async (_url, options) => {
      options?.onFailure?.("tiempo agotado (20000 ms)");
      return null;
    });
    expect(read).toMatchObject({ ok: false, gone: false, failure: "tiempo agotado (20000 ms)" });
  });

  it("una tienda Shopify se lee por su JSON y su vendor es la marca", async () => {
    const urls: string[] = [];
    const read = await readFicha(
      { listingId: "store:voltbike:1", url: "https://voltbike.uy/products/monopatin-air?variant=1", source: "store" },
      async (url) => {
        urls.push(url);
        return JSON.stringify({
          product: { vendor: "VoltBike", body_html: "<p>Autonomía 15 Kms</p><p>Motor 250 W</p><p>Tiempo de Carga Hasta 6hs.</p>" },
        });
      }
    );
    expect(urls).toEqual(["https://voltbike.uy/products/monopatin-air.json"]);
    expect(read).toMatchObject({ ok: true, brand: "VoltBike" });
    expect(read.specs).toMatchObject({ rangeKm: 15, motorW: 250, chargeHours: 6 });
  });

  it("una tienda HTML se lee sin los productos relacionados", async () => {
    const read = await readFicha({ listingId: "store:delcar:1", url: "https://delcar.com.uy/product/x/", source: "store" }, async () =>
      "<main><h1>Monopatín</h1><script>var a='Autonomía 99 km'</script><p>Autonomía 30 kms</p></main><section><h2>Productos relacionados</h2><p>Potencia del motor 2000 W</p></section>"
    );
    expect(read.specs?.rangeKm).toBe(30);
    expect(read.specs?.motorW).toBeNull();
  });
});

const snapRow = (over: Partial<SnapshotRow>): SnapshotRow => ({
  listingId: "ml:1",
  title: "Monopatín",
  url: "https://x",
  image: null,
  price: 20_000,
  currency: "UYU",
  priceUyu: 20_000,
  condition: "new",
  source: "mercadolibre",
  sellerName: "Vendedor",
  brand: "",
  variant: "urbano",
  variantLabel: "Urbano o estándar",
  suspect: false,
  specs: null,
  uyuPerKm: null,
  ...over,
});

describe("buildSpecSnapshot", () => {
  const ficha = (rows: Record<string, string>) => specsFromRows(rows);
  const rows: SnapshotRow[] = [
    ...[20, 25, 30, 35, 40].map((km, index) =>
      snapRow({ listingId: `ml:${index}`, specs: ficha({ Autonomía: `${km} km`, "Velocidad máxima": index === 4 ? "45 km/h" : "25 km/h" }) })
    ),
    snapRow({ listingId: "ml:sus", suspect: true, specs: ficha({ Autonomía: "100 km" }) }),
    snapRow({ listingId: "fb:1", source: "facebook", condition: "used", specs: { ...EMPTY_SPECS, rangeKm: 20, from: { rangeKm: "titulo" } } }),
    snapRow({ listingId: "ml:infantil", variant: "infantil", variantLabel: "Infantil", specs: ficha({ Autonomía: "8 km" }) }),
  ];
  const snapshot = buildSpecSnapshot(rows, "2026-11-03T12:00:00Z");

  it("los candidatos del asesor tienen ficha propia y no son sospechosos", () => {
    expect(snapshot.candidates.map((candidate) => candidate.id).sort()).toEqual(
      ["ml:0", "ml:1", "ml:2", "ml:3", "ml:4", "ml:infantil"].sort()
    );
    expect(snapshot.candidates[0]!.specs).not.toHaveProperty("from");
  });

  it("publica medianas sólo con cinco datos o más", () => {
    const urbano = snapshot.stats.byVariant.find((stats) => stats.variant === "urbano")!;
    expect(urbano.rangeKm).toBe(30);
    expect(urbano.n).toBe(6);
    const infantil = snapshot.stats.byVariant.find((stats) => stats.variant === "infantil")!;
    expect(infantil.rangeKm).toBeNull();
    expect(snapshot.stats.all.maxSpeedKmh).toBe(25);
  });

  it("cuenta cuántos declaran más de 25 km/h y cuántos tienen ficha", () => {
    expect(snapshot.stats.over25).toBe(1);
    expect(snapshot.stats.withSpeed).toBe(5);
    expect(snapshot.stats.withFicha).toBe(6);
    expect(snapshot.stats.total).toBe(7);
  });
});

describe("modelo del snapshot", () => {
  it("vive en movilidadspecsnapshots", () => {
    expect(MovilidadSpecSnapshotModel.collection.name).toBe("movilidadspecsnapshots");
  });
});

describe("arreglos de la revisión final", () => {
  it("una relectura que no trae ficha no borra la ficha buena guardada", async () => {
    const { fichaUpdate } = await import("../../classes/movilidad/specs/write");
    const empty = fichaUpdate({ listingId: "ml:1", url: "https://x", source: "mercadolibre" }, { ok: true, gone: false, specs: null, brand: null, model: null }, "2026-11-03T12:00:00Z");
    expect(empty.$set).not.toHaveProperty("specs");
    expect(empty.$set).not.toHaveProperty("brand");
    expect(empty.$set).toMatchObject({ ok: true, failures: 0, lastTriedAt: "2026-11-03T12:00:00Z" });
    const good = fichaUpdate({ listingId: "ml:1", url: "https://x", source: "mercadolibre" }, { ok: true, gone: false, specs: specsFromRows({ Autonomía: "30 km" }), brand: "Xiaomi", model: "4" }, "2026-11-03T12:00:00Z");
    expect(good.$set).toMatchObject({ brand: "Xiaomi", readAt: "2026-11-03T12:00:00Z" });
    expect(good.$set.specs).toMatchObject({ rangeKm: 30 });
  });

  it("una falla suma una falla y no toca la ficha; un aviso borrado no suma", async () => {
    const { fichaUpdate } = await import("../../classes/movilidad/specs/write");
    const target = { listingId: "ml:1", url: "https://x", source: "mercadolibre" as const };
    const failed = fichaUpdate(target, { ok: false, gone: false, specs: null, brand: null, model: null, failure: "HTTP 500" }, "t");
    expect(failed.$inc).toEqual({ failures: 1 });
    expect(failed.$set).not.toHaveProperty("specs");
    const gone = fichaUpdate(target, { ok: false, gone: true, specs: null, brand: null, model: null }, "t");
    expect(gone.$inc).toBeUndefined();
    expect(gone.$set).toMatchObject({ gone: true });
  });

  it("un aviso de ML sin id de producto no se le pide al puente", async () => {
    let called = false;
    const read = await readFicha({ listingId: "ml:1", url: "https://articulo.mercadolibre.com.uy/MLU-1-x-_JM", source: "mercadolibre" }, async () => {
      called = true;
      return "{}";
    });
    expect(called).toBe(false);
    expect(read).toMatchObject({ ok: false, gone: false });
  });

  it("un aviso abandonado vuelve a probarse a los 30 días", () => {
    const abandoned: StoredFichaDoc = { listingId: "a", ok: false, failures: 4, readAt: null, lastTriedAt: daysAgo(20) };
    expect(fichaDue(abandoned, NOW)).toBe(false);
    expect(fichaDue({ ...abandoned, lastTriedAt: daysAgo(31) }, NOW)).toBe(true);
  });
});
