// El cruce, que es la razón de ser del job: la cola por plata no es la cola por clics.
import { describe, expect, it } from "vitest";
import type { Opportunity, PageTypeRow } from "../../classes/gsc/types";
import type { RevenueSnapshot } from "../../classes/site-analytics/revenue";
import { DEFEND_KINDS, UPSIDE_KINDS, buildPlanAlerts, familyLedger, priceActions, totalUpside } from "../../classes/revenueplan/plan";
import { MIN_FAMILY_AD_IMPRESSIONS, MIN_FAMILY_VIEWS, UY_RPM_DIVERGENCE, buildValueTable } from "../../classes/revenueplan/value";
import type { RevenueTotals } from "../../classes/site-analytics/revenue";

const site = "https://cambio-uruguay.com";

const opportunity = (over: Partial<Opportunity>): Opportunity => ({
  kind: "striking-distance",
  subject: "consulta",
  impressions: 1000,
  clicks: 1,
  position: 7,
  potentialClicks: 10,
  note: "",
  ...over,
});

const revenue = (): RevenueSnapshot =>
  ({
    key: "site",
    asOf: "2026-09-20",
    currency: "USD",
    range: { start: "2026-08-23", end: "2026-09-19" },
    totals: { adRevenue: 20, adImpressions: 9000, adClicks: 12, screenPageViews: 100000, sessions: 60000, rpm: 0.2 },
    totalsUy: { adRevenue: 18, adImpressions: 8500, adClicks: 11, screenPageViews: 60000, sessions: 36000, rpm: 0.3 },
    families: [
      {
        bucket: "/convertir/*",
        urls: 46,
        adRevenue: 0.4,
        adImpressions: 900,
        adClicks: 0,
        screenPageViews: 40000,
        rpm: 0.01,
        shareOfRevenue: 0.02,
      },
      {
        bucket: "/guias/*",
        urls: 113,
        adRevenue: 16,
        adImpressions: 5000,
        adClicks: 10,
        screenPageViews: 8000,
        rpm: 2,
        shareOfRevenue: 0.8,
      },
    ],
    topPages: [],
    daily: [],
    pending: false,
  } as RevenueSnapshot);

describe("priceActions", () => {
  it("reordena: 200 clics a un conversor valen menos que 20 a una guía", () => {
    const table = buildValueTable(revenue());
    const actions = priceActions(
      [
        opportunity({ subject: "dolar a pesos", potentialClicks: 200, urls: [`${site}/convertir/100-dolares`] }),
        opportunity({ subject: "prestamo sin recibo", potentialClicks: 20, urls: [`${site}/guias/prestamos`] }),
      ],
      table,
      UPSIDE_KINDS
    );

    // Por clics, el conversor iba primero (rankByClicks 1). Por plata, último.
    expect(actions[0].subject).toBe("prestamo sin recibo");
    expect(actions[0].rankByClicks).toBe(2);
    expect(actions[1].rankByClicks).toBe(1);
    // 20 clics × 2 USD/1.000 vistas = 0,04 contra 200 × 0,01/1.000 = 0,002.
    expect(actions[0].expectedUsd).toBeCloseTo(0.04, 4);
    expect(actions[1].expectedUsd).toBeCloseTo(0, 3);
  });

  it("deja afuera lo que no es una acción: `rising`, `new-query` y el peso muerto", () => {
    const table = buildValueTable(revenue());
    const actions = priceActions(
      [
        opportunity({ kind: "rising", potentialClicks: 90 }),
        opportunity({ kind: "new-query", potentialClicks: 0 }),
        opportunity({ kind: "dead-weight", potentialClicks: 0 }),
        opportunity({ kind: "ctr-below-curve", potentialClicks: 12, urls: [`${site}/guias/x`] }),
      ],
      table,
      UPSIDE_KINDS
    );
    expect(actions.map((a) => a.kind)).toEqual(["ctr-below-curve"]);
  });

  it("lo que se está perdiendo tiene su propia cola y también se valúa", () => {
    const table = buildValueTable(revenue());
    const defend = priceActions(
      [opportunity({ kind: "falling", potentialClicks: 30, urls: [`${site}/guias/x`] })],
      table,
      DEFEND_KINDS
    );
    expect(defend).toHaveLength(1);
    expect(defend[0].expectedUsd).toBeCloseTo(0.06, 4);
  });

  it("una oportunidad sin URL no se descarta: se valúa al promedio del sitio", () => {
    const table = buildValueTable(revenue());
    const actions = priceActions([opportunity({ potentialClicks: 50 })], table, UPSIDE_KINDS);
    expect(actions[0].bucket).toBeNull();
    expect(actions[0].expectedUsd).toBeCloseTo(50 * 0.0002, 6);
  });

  it("el techo de la cola es la suma de las estimaciones", () => {
    const table = buildValueTable(revenue());
    const actions = priceActions(
      [
        opportunity({ potentialClicks: 20, urls: [`${site}/guias/a`] }),
        opportunity({ potentialClicks: 20, urls: [`${site}/guias/b`] }),
      ],
      table,
      UPSIDE_KINDS
    );
    expect(totalUpside(actions)).toBeCloseTo(0.08, 4);
  });
});

describe("familyLedger", () => {
  const pageTypes: PageTypeRow[] = [
    { bucket: "/convertir/*", urls: 46, clicks: 53, impressions: 110740, ctr: 0.0005, position: 4 },
    { bucket: "/guias/*", urls: 113, clicks: 900, impressions: 64000, ctr: 0.014, position: 8 },
  ];

  it("cruza porción del tráfico contra porción de la plata", () => {
    const table = buildValueTable(revenue());
    const rows = familyLedger(pageTypes, revenue(), table);
    const convertir = rows.find((r) => r.bucket === "/convertir/*")!;
    const guias = rows.find((r) => r.bucket === "/guias/*")!;

    expect(convertir.shareOfViews).toBeCloseTo(40000 / 48000, 4);
    expect(convertir.shareOfRevenue).toBeCloseTo(0.02, 4);
    // El número que ordena el trabajo: el conversor consume 83 % del tráfico y deja 2 % de la plata.
    expect(convertir.gap).toBeLessThan(-0.5);
    expect(guias.gap).toBeGreaterThan(0.5);
    expect(convertir.searchClicks).toBe(53);
  });

  it("una familia que Search Console ve y GA4 no sigue apareciendo", () => {
    const table = buildValueTable(revenue());
    const rows = familyLedger([...pageTypes, { bucket: "/importar/*", urls: 20, clicks: 30, impressions: 900, ctr: 0.03, position: 6 }], revenue(), table);
    expect(rows.map((r) => r.bucket)).toContain("/importar/*");
  });
});

describe("alertas", () => {
  const table = buildValueTable(revenue());

  it("avisa cuando el snapshot de Search Console quedó viejo", () => {
    const alerts = buildPlanAlerts({
      table,
      families: [],
      actions: [],
      gscAsOf: "2026-09-10",
      revenueAsOf: "2026-09-20",
      today: "2026-09-20",
    });
    expect(alerts.map((a) => a.code)).toContain("gsc-stale");
  });

  it("sin snapshot de Search Console la alerta es crítica", () => {
    const alerts = buildPlanAlerts({
      table,
      families: [],
      actions: [],
      gscAsOf: null,
      revenueAsOf: "2026-09-20",
      today: "2026-09-20",
    });
    expect(alerts.find((a) => a.code === "gsc-missing")?.level).toBe("critical");
  });

  it("delata al propio tramo cuando la medición lo contradice", () => {
    const families = familyLedger(
      [],
      revenue(),
      buildValueTable({
        ...revenue(),
        families: [
          {
            bucket: "/convertir/*",
            urls: 46,
            adRevenue: 9,
            adImpressions: 4000,
            adClicks: 6,
            screenPageViews: 20000,
            rpm: 0.45,
            shareOfRevenue: 0.45,
          },
        ],
      } as RevenueSnapshot)
    );
    const alerts = buildPlanAlerts({
      table,
      families,
      actions: [],
      gscAsOf: "2026-09-20",
      revenueAsOf: "2026-09-20",
      today: "2026-09-20",
    });
    // 0,45 medido contra 0,2 del sitio = 2,25×, y su tramo asume 1×. No llega al umbral de 3×.
    expect(alerts.map((a) => a.code)).not.toContain("tier-drift");
  });

  describe("views-without-impressions: el RPM uruguayo delata vistas que no ven anuncios", () => {
    const uy = (over: Partial<RevenueTotals>): RevenueTotals => ({ ...revenue().totalsUy, ...over });
    const alertsFor = (totalsUy: RevenueTotals | undefined) => {
      const snap = { ...revenue(), totalsUy } as RevenueSnapshot;
      if (!totalsUy) delete (snap as Partial<RevenueSnapshot>).totalsUy;
      return buildPlanAlerts({
        table: buildValueTable(snap),
        families: [],
        actions: [],
        gscAsOf: "2026-09-20",
        revenueAsOf: "2026-09-20",
        today: "2026-09-20",
      });
    };

    it("con audiencia real las dos lecturas se parecen y no avisa", () => {
      // 0,3 contra 0,2 es 1,5× justo y el umbral es inclusivo: un pelo por debajo no dispara.
      expect(alertsFor(uy({ rpm: 0.2 * UY_RPM_DIVERGENCE - 0.001 })).map((a) => a.code)).not.toContain(
        "views-without-impressions"
      );
    });

    it("cuando el sitio suma vistas que Uruguay no tiene, avisa con las dos proporciones y sin montos", () => {
      // El escenario de robots: la plata está en Uruguay (RPM 0,9) y el sitio la divide entre
      // cinco veces más vistas (RPM 0,2).
      const alerts = alertsFor(uy({ rpm: 0.9, screenPageViews: 20000 }));
      const alert = alerts.find((a) => a.code === "views-without-impressions")!;
      expect(alert.level).toBe("warn");
      expect(alert.message).toMatch(/4\.5× el del sitio entero/);
      expect(alert.message).toMatch(/Uruguay es el 20 % de las vistas/);
      expect(alert.message).toMatch(/9\.0 impresiones cada 100 vistas/);
      expect(alert.message).toMatch(/no se bloquea ningún país/);
      expect(alert.message).not.toMatch(/USD|\$/);
    });

    it("exige la misma muestra que una familia: con pocas vistas uruguayas el cociente es ruido", () => {
      expect(
        alertsFor(uy({ rpm: 9, screenPageViews: MIN_FAMILY_VIEWS - 1, adImpressions: 5000 })).map((a) => a.code)
      ).not.toContain("views-without-impressions");
      expect(
        alertsFor(uy({ rpm: 9, screenPageViews: 5000, adImpressions: MIN_FAMILY_AD_IMPRESSIONS - 1 })).map((a) => a.code)
      ).not.toContain("views-without-impressions");
    });

    it("un snapshot sin `totalsUy` (anterior al campo) no avisa ni rompe", () => {
      expect(alertsFor(undefined).map((a) => a.code)).not.toContain("views-without-impressions");
    });

    it("avisa, no filtra: el RPM del sitio y el precio de cada familia no cambian", () => {
      const bots = buildValueTable({ ...revenue(), totalsUy: uy({ rpm: 0.9, screenPageViews: 20000 }) } as RevenueSnapshot);
      const clean = buildValueTable(revenue());
      expect(bots.siteRpm).toBe(clean.siteRpm);
      expect(bots.siteUsdPerClick).toBe(clean.siteUsdPerClick);
      expect(bots.byBucket.get("/guias/*")).toEqual(clean.byBucket.get("/guias/*"));
    });
  });

  it("dice cuántas filas del top 10 no estaban en el top 10 por clics", () => {
    const actions = priceActions(
      Array.from({ length: 12 }, (_, i) =>
        opportunity({
          subject: `q${i}`,
          potentialClicks: 100 - i,
          urls: [`${site}${i > 8 ? "/guias/x" : "/convertir/x"}`],
        })
      ),
      table,
      UPSIDE_KINDS
    );
    const alerts = buildPlanAlerts({
      table,
      families: [],
      actions,
      gscAsOf: "2026-09-20",
      revenueAsOf: "2026-09-20",
      today: "2026-09-20",
    });
    const reorder = alerts.find((a) => a.code === "reorder")!;
    // Las tres guías estaban en los puestos 10, 11 y 12 por clics y pasan a encabezar. Sólo dos
    // "entraron" al top 10: la que ya estaba décima no se cuenta, que es lo correcto — el alerta
    // mide cuánto trabajo nuevo aparece, no cuánto se movió de lugar.
    expect(reorder.message).toMatch(/^2 de las 10/);
    expect(actions.slice(0, 3).every((a) => a.bucket === "/guias/*")).toBe(true);
  });
});
