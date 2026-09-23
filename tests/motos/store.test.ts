// Las reglas PURAS del límite con la base: historial, retiro por ausencia y corrida flaca.
// Nada de esto necesita una Mongo levantada, que es justo por lo que vive separado de la I/O.
import { describe, expect, it } from "vitest";
import {
  MOTO_COLLAPSE_MIN_PREVIOUS,
  MOTO_META_KEY,
  MOTO_PUBLISH_REFUSAL_KEY,
  MOTO_REPORT_KEY,
  MOTO_THIN_RUN_FLOOR,
  collapseRefusal,
  facetEvidenceOf,
  motoHarvestMetaRecord,
  nextPriceHistory,
  sweepUpdate,
} from "../../classes/motos/store";
import type { MotoHarvestResult, RawMotoListing } from "../../classes/motos/types";

const listing = (price: number, observedAt: string): RawMotoListing => ({
  id: "MLU1",
  source: "mercadolibre",
  brandId: "2102273",
  brand: "Yumbo",
  modelId: "8801",
  model: "GS 200",
  title: "Yumbo Gs 200 Cc",
  year: 2020,
  km: 12_000,
  price,
  currency: "USD",
  fuel: "nafta",
  neighborhood: null,
  department: "Montevideo",
  sellerType: "private",
  sellerId: "1",
  picture: null,
  pictureCount: 1,
  permalink: "https://moto.mercadolibre.com.uy/MLU-1-yumbo-_JM",
  observedAt,
});

const harvest = (over: Partial<MotoHarvestResult> = {}): MotoHarvestResult => ({
  mode: "full",
  startedAt: "2026-09-22T10:00:00.000Z",
  finishedAt: "2026-09-22T10:20:00.000Z",
  listings: [listing(1_500, "2026-09-22T10:05:00.000Z")],
  types: [],
  displacements: [],
  excludedIds: [],
  requests: 500,
  pages: 480,
  failedPages: 0,
  rejectedCards: 3,
  cooldowns: 0,
  completeBrands: ["2102273"],
  gaps: [],
  reportedTotal: 1_391,
  note: null,
  ...over,
});

describe("historial de precio", () => {
  it("no agrega un punto cuando nada cambió", () => {
    const history = [{ price: 1_500, currency: "USD" as const, observedAt: "2026-09-21T10:00:00.000Z" }];
    expect(nextPriceHistory(history, listing(1_500, "2026-09-22T10:00:00.000Z"))).toEqual(history);
  });

  it("agrega un punto cuando cambia el precio o la moneda", () => {
    const history = [{ price: 1_500, currency: "USD" as const, observedAt: "2026-09-21T10:00:00.000Z" }];
    expect(nextPriceHistory(history, listing(1_400, "2026-09-22T10:00:00.000Z"))).toHaveLength(2);
  });

  it("guarda a lo sumo veinte puntos", () => {
    let history = nextPriceHistory([], listing(1_000, "2026-01-01T00:00:00.000Z"));
    for (let index = 1; index <= 30; index++) {
      history = nextPriceHistory(history, listing(1_000 + index, `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`));
    }
    expect(history).toHaveLength(20);
  });
});

describe("retiro por ausencia", () => {
  it("una sola ausencia nunca retira: un barrido puede perder una página", () => {
    expect(sweepUpdate({ missedFullSweeps: 0, retiredAt: null }, "2026-09-22T10:00:00.000Z")).toEqual({
      missedFullSweeps: 1,
      retiredAt: null,
    });
  });

  it("con dos, se retira", () => {
    expect(sweepUpdate({ missedFullSweeps: 1, retiredAt: null }, "2026-09-22T10:00:00.000Z")).toEqual({
      missedFullSweeps: 2,
      retiredAt: "2026-09-22T10:00:00.000Z",
    });
  });

  it("una fecha de retiro ya escrita no se pisa", () => {
    expect(sweepUpdate({ missedFullSweeps: 5, retiredAt: "2026-09-01T00:00:00.000Z" }, "2026-09-22T10:00:00.000Z").retiredAt).toBe(
      "2026-09-01T00:00:00.000Z"
    );
  });
});

describe("corrida flaca", () => {
  it("una caída de más del 60 % no pisa lo publicado", () => {
    expect(collapseRefusal(1_000, 300, "catálogo de motos")).toMatch(/se conserva lo publicado/);
  });

  it("la primera corrida nunca la dispara", () => {
    expect(collapseRefusal(0, 0, "catálogo de motos")).toBeNull();
    expect(collapseRefusal(null, 5, "catálogo de motos")).toBeNull();
  });

  it("con un catálogo chico, una fracción no prueba nada", () => {
    expect(collapseRefusal(MOTO_COLLAPSE_MIN_PREVIOUS, 1, "catálogo de motos")).toBeNull();
    expect(collapseRefusal(MOTO_COLLAPSE_MIN_PREVIOUS + 1, 1, "catálogo de motos")).not.toBeNull();
  });

  it("el movimiento normal del mercado pasa", () => {
    expect(collapseRefusal(1_000, 1_000 * MOTO_THIN_RUN_FLOOR + 1, "catálogo de motos")).toBeNull();
  });
});

describe("evidencia de las facetas", () => {
  it("junta el tipo y el tramo del mismo aviso en una sola fila, fechada", () => {
    const evidence = facetEvidenceOf(
      harvest({
        types: [{ id: "MLU1", type: "scooter" }],
        displacements: [{ id: "MLU1", band: "hasta-125" }],
      })
    );
    expect(evidence.get("MLU1")).toEqual({
      type: "scooter",
      displacementBand: "hasta-125",
      readAt: "2026-09-22T10:20:00.000Z",
    });
  });

  it("una corrida que no barrió las facetas no produce evidencia — y así no puede borrar la anterior", () => {
    // Es lo que hace la horaria: los dos barridos son ~170 páginas del puente compartido y su
    // presupuesto es de 250 pedidos para todo.
    expect(facetEvidenceOf(harvest({ mode: "fast" })).size).toBe(0);
  });

  it("un aviso que sólo apareció en uno de los dos barridos deja el otro campo en null", () => {
    const evidence = facetEvidenceOf(harvest({ displacements: [{ id: "MLU9", band: "mas-250" }] }));
    expect(evidence.get("MLU9")).toEqual({
      type: null,
      displacementBand: "mas-250",
      readAt: "2026-09-22T10:20:00.000Z",
    });
  });
});

describe("meta de la cosecha", () => {
  it("una corrida completa sin fallas queda ok y fecha la última lectura buena", () => {
    const record = motoHarvestMetaRecord(harvest(), null);
    expect(record.ok).toBe(true);
    expect(record.lastOkAt).toBe("2026-09-22T10:20:00.000Z");
    expect(record.failingSince).toBeNull();
  });

  it("una corrida completa que no trajo nada NO es ok", () => {
    expect(motoHarvestMetaRecord(harvest({ listings: [] }), null).ok).toBe(false);
  });

  it("pero una rápida sin novedades de madrugada sí lo es", () => {
    expect(motoHarvestMetaRecord(harvest({ mode: "fast", listings: [] }), null).ok).toBe(true);
  });

  it("una corrida fallida conserva la fecha de la última buena y recuerda desde cuándo falla", () => {
    const record = motoHarvestMetaRecord(harvest({ failedPages: 3, note: "3 páginas sin respuesta válida" }), {
      lastOkAt: "2026-09-21T10:00:00.000Z",
      failingSince: null,
    });
    expect(record.ok).toBe(false);
    expect(record.lastOkAt).toBe("2026-09-21T10:00:00.000Z");
    expect(record.failingSince).toBe("2026-09-22T10:20:00.000Z");
  });
});

describe("llaves reservadas", () => {
  it("la del informe no la puede producir ningún slug de modelo", () => {
    // `slugify()` nunca emite un guion bajo, así que `_informe` no colisiona con `marca-modelo`.
    expect(MOTO_REPORT_KEY.startsWith("_")).toBe(true);
  });

  it("la negativa vive en su propio documento, separada de la meta del catálogo", () => {
    expect(MOTO_PUBLISH_REFUSAL_KEY).not.toBe(MOTO_META_KEY);
  });
});
