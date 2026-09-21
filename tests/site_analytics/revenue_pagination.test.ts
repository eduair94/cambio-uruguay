// Datos sintéticos: se verifica la aritmética y la integridad, nunca facturación del sitio.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Ga4Report } from "../../classes/site-analytics/ga4";

vi.mock("../../classes/site-analytics/ga4", () => ({ runReports: vi.fn() }));
import { runReports } from "../../classes/site-analytics/ga4";
import { fetchRevenue } from "../../classes/site-analytics/revenue";

const run = vi.mocked(runReports);
const row = (path: string, revenue = 0, views = 1) => ({
  dimensionValues: [{ value: path }],
  metricValues: [revenue, revenue ? 100 : 0, 0, views].map((n) => ({ value: String(n) })),
});
const firstRows = () => Array.from({ length: 2000 }, (_, i) => row(`/guias/a-${String(i).padStart(4, "0")}`));
const report = (rows: NonNullable<Ga4Report["rows"]>, rowCount = rows.length): Ga4Report => ({ rows, rowCount });
const initial = (pages: Ga4Report): Ga4Report[] => [
  { rows: [{ metricValues: [8, 200, 0, 2102, 2100].map((n) => ({ value: String(n) })) }] },
  pages,
  { rows: [] },
];
const fetch = () => fetchRevenue("2026-09-01", "2026-09-07", "2026-09-08T12:00:00Z");

beforeEach(() => run.mockReset());

describe("ingreso por familia con todas sus vistas", () => {
  it("cuenta la cola sin ingreso y ordena las páginas rentables después de paginar", async () => {
    const first = firstRows();
    first[0] = row("/guias/a-0000", 3, 100);
    run.mockResolvedValueOnce(initial(report(first, 2002)));
    run.mockResolvedValueOnce([report([row("/guias/z-final", 5, 1), row("/guias/zz-sin-anuncios", 0, 2)], 2002)]);

    const result = await fetch();
    const family = result.families.find((f) => f.bucket === "/guias/*")!;
    expect(family).toMatchObject({ urls: 2002, screenPageViews: 2102, adRevenue: 8, adImpressions: 200 });
    expect(family.rpm).toBeCloseTo(8000 / 2102);
    expect(result.topPages.map((p) => p.path)).toEqual(["/guias/z-final", "/guias/a-0000"]);
    const request = run.mock.calls[0][0][1];
    expect(request.orderBys).toEqual([{ dimension: { dimensionName: "pagePath", orderType: "ALPHANUMERIC" } }]);
    expect(run.mock.calls[1][0]).toEqual([{ ...request, offset: 2000 }]);
  });

  it("un múltiplo exacto no pide una página adicional", async () => {
    run.mockResolvedValueOnce(initial(report(firstRows())));
    expect((await fetch()).families[0].urls).toBe(2000);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("el informe vacío real puede omitir rowCount cero", async () => {
    run.mockResolvedValueOnce([{}, {}, {}]);
    expect((await fetch()).families).toEqual([]);
  });

  it("un desglose vacío con totales positivos no reemplaza una lectura completa", async () => {
    run.mockResolvedValueOnce(initial({}));
    await expect(fetch()).rejects.toThrow(/empty page report contradicts totals/);
  });

  it("un reporte ausente no equivale a un reporte vacío", async () => {
    run.mockResolvedValueOnce([]);
    await expect(fetch()).rejects.toThrow(/rowCount/);
  });

  it.each([
    ["página final vacía", report([], 2001)],
    ["URL repetida", report([row("/guias/a-0000")], 2001)],
    ["total que cambió", report([row("/guias/z")], 2002)],
    ["total omitido con filas", { rows: [row("/guias/z")] }],
  ])("rechaza %s en vez de devolver un snapshot parcial", async (_name, last) => {
    run.mockResolvedValueOnce(initial(report(firstRows(), 2001)));
    run.mockResolvedValueOnce([last]);
    await expect(fetch()).rejects.toThrow(/GA4 revenue:/);
  });

  it("propaga el error de una página posterior", async () => {
    run.mockResolvedValueOnce(initial(report(firstRows(), 2001)));
    run.mockRejectedValueOnce(new Error("API unavailable"));
    await expect(fetch()).rejects.toThrow("API unavailable");
  });

  it("rechaza superar el presupuesto antes de hacer más peticiones", async () => {
    run.mockResolvedValueOnce(initial(report(firstRows(), 100001)));
    await expect(fetch()).rejects.toThrow(/out-of-budget/);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
