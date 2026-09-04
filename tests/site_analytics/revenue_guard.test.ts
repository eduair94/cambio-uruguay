// El guardarraíl del ingreso, que estaba escrito para atajar el CERO y dejaba pasar el CASI-cero.
//
// Lo que pasó de verdad: el enlace AdSense↔GA4 se creó el 2026-09-02 y no rellena hacia atrás, así
// que la ventana 2026-08-06..09-02 (4.131 vistas de página, con un día de 1.225 sesiones adentro)
// volvió con UNA impresión y USD 0,000122. Con `adImpressions === 0` como única prueba de vacío,
// esa lectura pasaba las tres puertas —`pending`, `revenueIsEmpty` y `revenueWouldRegress`— y se
// guardaba con `pending: false`: el tablero pasó a decir que el sitio no factura nada, que es una
// afirmación, no una medición.
//
// Sin red y sin Mongo: los modelos y la Data API van mockeados.
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../classes/models/SiteRevenueSnapshot", () => ({
  SiteRevenueSnapshotModel: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock("../../classes/models/SiteAnalyticsSnapshot", () => ({
  SiteAnalyticsSnapshotModel: { findOne: vi.fn(), updateOne: vi.fn() },
}));
vi.mock("../../classes/site-analytics/ga4", () => ({
  runReports: vi.fn(),
}));

import { SiteRevenueSnapshotModel } from "../../classes/models/SiteRevenueSnapshot";
import { runReports } from "../../classes/site-analytics/ga4";
import {
  fetchRevenue,
  MIN_AD_IMPRESSIONS,
  MIN_IMPRESSIONS_PER_VIEW,
  revenueIsEmpty,
} from "../../classes/site-analytics/revenue";
import type { RevenueSnapshot } from "../../classes/site-analytics/revenue";
import { revenueWouldRegress } from "../../classes/site-analytics/store";

const snap = (adRevenue: number, adImpressions: number, screenPageViews: number): RevenueSnapshot =>
  ({
    totals: { adRevenue, adImpressions, adClicks: 0, screenPageViews, sessions: 0, rpm: 0 },
  } as RevenueSnapshot);

/** Lo que devuelve `SiteRevenueSnapshotModel.findOne(...).lean().exec()`. */
function stored(previous: RevenueSnapshot | null) {
  (SiteRevenueSnapshotModel.findOne as any).mockReturnValue({
    lean: () => ({ exec: async () => previous }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("revenueIsEmpty: el piso es un umbral, no un cero exacto", () => {
  it("la lectura medida del enlace recién creado (4.131 vistas, 1 impresión) todavía no es una medición", () => {
    expect(revenueIsEmpty(snap(0.000122, 1, 4131))).toBe(true);
  });

  it("todo en cero sigue siendo 'todavía no', como antes", () => {
    expect(revenueIsEmpty(snap(0, 0, 4131))).toBe(true);
  });

  it("un día flojo de verdad NO se marca como pendiente", () => {
    // Poco tráfico y poca plata, pero cobertura de anuncios normal: eso es una medición real.
    expect(revenueIsEmpty(snap(0.04, 260, 200))).toBe(false);
  });

  it("con impresiones y sin ingreso sigue sin estar vacío — eso es un día malo de verdad", () => {
    expect(revenueIsEmpty(snap(0, 1200, 100))).toBe(false);
  });

  it("un puñado de impresiones no alcanza aunque la tasa dé bien", () => {
    // 10 impresiones sobre 40 vistas es 25 % de cobertura, pero 10 impresiones no dicen nada.
    expect(revenueIsEmpty(snap(0.01, 10, 40))).toBe(true);
  });

  it("los dos pisos están donde dice el comentario", () => {
    expect(MIN_AD_IMPRESSIONS).toBe(50);
    expect(MIN_IMPRESSIONS_PER_VIEW).toBe(0.01);
  });
});

describe("fetchRevenue marca `pending` con el MISMO criterio", () => {
  const report = (metricValues: string[][], dimensionValues: string[][] = []) => ({
    metadata: { currencyCode: "USD" },
    rows: metricValues.map((values, i) => ({
      dimensionValues: (dimensionValues[i] || []).map((value) => ({ value })),
      metricValues: values.map((value) => ({ value })),
    })),
  });

  it("la lectura artefacto queda pendiente", async () => {
    (runReports as any).mockResolvedValue([
      report([["0.000122", "1", "0", "4131", "2100"]]),
      report([["0.000122", "1", "4131"]], [["/"]]),
      report([["0.000122", "1"]], [["20260902"]]),
    ]);
    const out = await fetchRevenue("2026-08-06", "2026-09-02", "2026-09-03T00:00:00.000Z");
    expect(out.totals.adImpressions).toBe(1);
    expect(out.pending).toBe(true);
    expect(out.pending).toBe(revenueIsEmpty(out));
  });

  it("una lectura real no queda pendiente", async () => {
    (runReports as any).mockResolvedValue([
      report([["12.5", "9000", "40", "4131", "2100"]]),
      report([["12.5", "9000", "4131"]], [["/"]]),
      report([["12.5", "9000"]], [["20260902"]]),
    ]);
    const out = await fetchRevenue("2026-08-06", "2026-09-02", "2026-09-03T00:00:00.000Z");
    expect(out.pending).toBe(false);
  });
});

describe("revenueWouldRegress: una lectura flaca no pisa una buena", () => {
  const good = snap(12.5, 9000, 4131);

  it("la lectura de 1 impresión no pisa el snapshot bueno", async () => {
    stored(good);
    expect(await revenueWouldRegress(snap(0.000122, 1, 4131))).toBe(true);
  });

  it("todo en cero tampoco lo pisa", async () => {
    stored(good);
    expect(await revenueWouldRegress(snap(0, 0, 4131))).toBe(true);
  });

  it("la primera vez el vacío SÍ se guarda: es el estado real, no una pérdida", async () => {
    stored(null);
    expect(await revenueWouldRegress(snap(0, 0, 4131))).toBe(false);
  });

  it("un pendiente guardado se deja pisar por otro pendiente", async () => {
    stored(snap(0, 0, 4131));
    expect(await revenueWouldRegress(snap(0.000122, 1, 4131))).toBe(false);
  });

  it("una lectura real se guarda", async () => {
    stored(good);
    expect(await revenueWouldRegress(snap(13.1, 9400, 4200))).toBe(false);
  });

  it("un derrumbe a menos de la mitad de lo guardado tampoco pisa", async () => {
    // Las dos ventanas son de 28 días: perder la mitad de las impresiones es un reporte roto, no
    // estacionalidad. Mismo criterio que el job de videos.
    stored(good);
    expect(await revenueWouldRegress(snap(5.9, 4000, 4131))).toBe(true);
  });

  it("una caída normal se guarda igual", async () => {
    stored(good);
    expect(await revenueWouldRegress(snap(9.8, 7000, 4131))).toBe(false);
  });
});

describe("revenueWouldRegress: la negativa caduca", () => {
  // Sin caducidad el guardarraíl se muerde la cola: rechazar deja `previous` donde está, así que la
  // corrida siguiente compara contra la MISMA cifra vieja y vuelve a rechazar, para siempre. Y una
  // baja duradera de verdad existe — AdSense limita la publicidad de un sitio mientras investiga.
  const stamped = (
    adRevenue: number,
    adImpressions: number,
    asOf: string
  ): RevenueSnapshot =>
    ({
      asOf,
      totals: { adRevenue, adImpressions, adClicks: 0, screenPageViews: 4131, sessions: 0, rpm: 0 },
    }) as RevenueSnapshot;

  it("el derrumbe se sigue rechazando mientras lo guardado es reciente", async () => {
    stored(stamped(12.4, 8800, "2026-09-01T10:00:00.000Z"));
    expect(await revenueWouldRegress(stamped(5.9, 4000, "2026-09-04T10:00:00.000Z"))).toBe(true);
  });

  it("pasados los siete días el derrumbe deja de ser sospecha y pasa a ser el dato", async () => {
    stored(stamped(12.4, 8800, "2026-09-01T10:00:00.000Z"));
    expect(await revenueWouldRegress(stamped(5.9, 4000, "2026-09-09T10:00:00.000Z"))).toBe(false);
  });

  it("una fecha ilegible nunca autoriza el sobrescrito", async () => {
    stored(stamped(12.4, 8800, "no es una fecha"));
    expect(await revenueWouldRegress(stamped(5.9, 4000, "2026-09-30T10:00:00.000Z"))).toBe(true);
  });

  it("caducar no deja pasar una lectura que todavía no es una medición", async () => {
    // La caducidad levanta la defensa del derrumbe, no el piso: un casi-cero sigue sin publicarse.
    stored(stamped(12.4, 8800, "2026-09-01T10:00:00.000Z"));
    expect(await revenueWouldRegress(stamped(0.000122, 1, "2026-10-01T10:00:00.000Z"))).toBe(true);
  });
});
