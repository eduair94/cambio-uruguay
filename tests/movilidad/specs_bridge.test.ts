import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mlProductId, orderTargets, type FichaQueueRow } from "../../classes/movilidad/specs/queue";
import { readFicha } from "../../classes/movilidad/specs/read";
import { ML_API_BASE } from "../../classes/retail/sources/mercadolibre";

// Medido en producción el 3/11/2026 23:40 UTC, primera corrida del job: desde la IP del VPS toda
// ficha de producto de ML (`/up/MLUU…`, `/p/MLU…` y `articulo.…/MLU-…`) redirige a
// `/gz/account-verification` (el muro de login); `auto.` y `casa.` siguen abiertos. El puente propio
// :9656 contesta `/product/<id>` con la misma tabla (`specifications`) y la descripción.

// Recortado de la respuesta real del puente para MLUU4184398661.
const BRIDGE = {
  id: "MLUU4184398661",
  item_id: "MLU1448262488",
  title: "Monopatín Eléctrico Para Niños Con Luces Rgb Rip Mobility",
  brand: "RIP Mobility",
  model: "HF-SG09",
  description: "Monopatín eléctrico infantil \nmotor 12v 80w\nvelocidad maxima 10km/hra\ntiempo de carga 5-8hra\nautonomía 8km",
  specifications: [
    { group: "Características principales", attributes: [{ id: "Marca", name: "Marca", value: "RIP Mobility" }] },
    {
      group: "Otros",
      attributes: [
        { id: "Velocidad máxima", name: "Velocidad máxima", value: "10 km/h" },
        { id: "Peso máximo soportado", name: "Peso máximo soportado", value: "40 kg" },
        { id: "Autonomía", name: "Autonomía", value: "8 km" },
        { id: "Es plegable", name: "Es plegable", value: "No" },
      ],
    },
  ],
};

describe("mlProductId", () => {
  it("saca el id que acepta el puente: producto de usuario o de catálogo", () => {
    expect(mlProductId("https://www.mercadolibre.com.uy/monopatin-x/up/MLUU4184398661#position=2")).toBe("MLUU4184398661");
    expect(mlProductId("https://www.mercadolibre.com.uy/scooter-xiaomi-6/p/MLU68229650")).toBe("MLU68229650");
    expect(mlProductId("https://articulo.mercadolibre.com.uy/MLU-729315986-monopatin-_JM")).toBeNull();
  });
});

describe("la ficha de ML se lee por el puente", () => {
  it("pide /product/<id> al puente y lee su tabla y su descripción", async () => {
    const urls: string[] = [];
    const read = await readFicha(
      { listingId: "ml:MLU1448262488", url: "https://www.mercadolibre.com.uy/x/up/MLUU4184398661#is_advertising=true", source: "mercadolibre" },
      async (url) => {
        urls.push(url);
        return JSON.stringify(BRIDGE);
      }
    );
    expect(urls).toEqual([`${ML_API_BASE}/product/MLUU4184398661?country=UY`]);
    expect(read).toMatchObject({ ok: true, gone: false, brand: "RIP Mobility", model: "HF-SG09" });
    expect(read.specs).toMatchObject({ rangeKm: 8, maxSpeedKmh: 10, maxLoadKg: 40, foldable: false, motorW: null });
    expect(read.specs?.from.rangeKm).toBe("ficha");
  });

  it("un 404 del puente es un aviso que ya no existe; una respuesta sin tabla es una lectura vacía", async () => {
    const target = { listingId: "ml:1", url: "https://www.mercadolibre.com.uy/x/p/MLU1", source: "mercadolibre" as const };
    const gone = await readFicha(target, async (_url, options) => {
      options?.onFailure?.("HTTP 404");
      return null;
    });
    expect(gone).toMatchObject({ ok: false, gone: true });
    const empty = await readFicha(target, async () => JSON.stringify({ id: "MLU1", specifications: [], description: "" }));
    expect(empty).toMatchObject({ ok: true, specs: null });
    const broken = await readFicha(target, async () => "<html>no es json</html>");
    expect(broken).toMatchObject({ ok: false, gone: false });
  });
});

describe("la cola", () => {
  it("salta los avisos de ML sin id de producto (el puente no los puede leer)", () => {
    const rows: FichaQueueRow[] = [
      { listingId: "ml:1", url: "https://articulo.mercadolibre.com.uy/MLU-1-x-_JM", source: "mercadolibre" },
      { listingId: "ml:2", url: "https://www.mercadolibre.com.uy/x/up/MLUU2", source: "mercadolibre" },
    ];
    expect(orderTargets(rows, new Map(), new Date(), 10).map((row) => row.listingId)).toEqual(["ml:2"]);
  });
});

describe("horario del job", () => {
  it("corre entre los consumidores horarios del puente de Mercado Libre, sin pisar a ninguno", () => {
    const eco = readFileSync(require.resolve("../../ecosystem.config.js"), "utf8");
    const minute = Number(/name: "currency-movilidad-specs"[\s\S]*?cron_restart: "(\d+) /.exec(eco)![1]);
    // movilidad :07, sillas :23, autos :29, celulares :37, motos :44, alquileres :47, equipar :53.
    for (const other of [7, 23, 29, 37, 44, 47, 53]) {
      expect((minute - other + 60) % 60).toBeGreaterThanOrEqual(6);
      expect((other - minute + 60) % 60).toBeGreaterThanOrEqual(5);
    }
  });
});
