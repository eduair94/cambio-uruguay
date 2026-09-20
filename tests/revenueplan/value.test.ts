// El precio del clic por familia: de dónde sale y cuándo el job se niega a inventarlo.
import { describe, expect, it } from "vitest";
import type { RevenueSnapshot } from "../../classes/site-analytics/revenue";
import {
  MIN_FAMILY_AD_IMPRESSIONS,
  MIN_FAMILY_VIEWS,
  TIER_CONTENIDO,
  TIER_DATO_VIVO,
  TIER_DIRECTORIO,
  TIER_OTRO,
  buildValueTable,
  tierOf,
  valueOf,
} from "../../classes/revenueplan/value";

const revenue = (over: Partial<RevenueSnapshot> = {}): RevenueSnapshot =>
  ({
    key: "site",
    asOf: "2026-09-20",
    currency: "USD",
    range: { start: "2026-08-23", end: "2026-09-19" },
    totals: { adRevenue: 20, adImpressions: 9000, adClicks: 12, screenPageViews: 100000, sessions: 60000, rpm: 0.2 },
    families: [],
    topPages: [],
    daily: [],
    pending: false,
    ...over,
  } as RevenueSnapshot);

const family = (bucket: string, over: Record<string, number> = {}) => ({
  bucket,
  urls: 10,
  adRevenue: 0,
  adImpressions: 0,
  adClicks: 0,
  screenPageViews: 0,
  rpm: 0,
  shareOfRevenue: 0,
  ...over,
});

describe("tramos", () => {
  it("una guía es contenido y un conversor es dato vivo", () => {
    expect(tierOf("/guias/*")).toBe(TIER_CONTENIDO);
    expect(tierOf("/convertir/*")).toBe(TIER_DATO_VIVO);
    expect(tierOf("/historico/*")).toBe(TIER_DATO_VIVO);
    expect(tierOf("/")).toBe(TIER_DATO_VIVO);
  });

  it("un directorio de producto es su propio tramo, aunque termine igual que una guía", () => {
    // `/alquileres-uruguay` y `/plan-de-vida-uruguay` terminan las dos en `-uruguay` y son tramos
    // opuestos: por eso la lista es explícita y no una heurística de sufijo.
    expect(tierOf("/alquileres-uruguay")).toBe(TIER_DIRECTORIO);
    expect(tierOf("/autos-usados-uruguay")).toBe(TIER_DIRECTORIO);
    expect(tierOf("/plan-de-vida-uruguay")).toBe(TIER_OTRO);
  });

  it("los espejos en inglés y portugués heredan el tramo de la sección que replican", () => {
    expect(tierOf("/en/guias/*")).toBe(TIER_CONTENIDO);
    expect(tierOf("/pt/convertir/*")).toBe(TIER_DATO_VIVO);
  });

  it("lo que no está clasificado vale el promedio, nunca más", () => {
    // La regla que protege la cola: una página nueva no puede encabezarla por una suposición.
    expect(tierOf("/algo-que-nadie-clasifico").multiplier).toBe(1);
  });
});

describe("buildValueTable", () => {
  it("usa el RPM medido cuando la familia tiene muestra propia", () => {
    const table = buildValueTable(
      revenue({
        families: [
          family("/guias/*", {
            screenPageViews: MIN_FAMILY_VIEWS,
            adImpressions: MIN_FAMILY_AD_IMPRESSIONS,
            rpm: 3,
            adRevenue: 1.5,
          }),
        ],
      })
    );
    const guias = valueOf(table, "/guias/*");
    expect(guias.basis).toBe("medido");
    expect(guias.usdPerClick).toBeCloseTo(0.003, 6);
    expect(guias.measuredMultiplier).toBeCloseTo(15, 3);
  });

  it("con muestra flaca cae al tramo, aunque el RPM medido sea altísimo", () => {
    // El caso real: una familia con 40 vistas y una impresión da un RPM espectacular y falso. Si
    // ese número entrara, encabezaría la cola para siempre con el ruido de un solo lector.
    const table = buildValueTable(
      revenue({
        families: [family("/guias/*", { screenPageViews: 40, adImpressions: 1, rpm: 90, adRevenue: 3.6 })],
      })
    );
    const guias = valueOf(table, "/guias/*");
    expect(guias.basis).toBe("tramo");
    expect(guias.multiplier).toBe(TIER_CONTENIDO.multiplier);
    // El RPM medido se PUBLICA igual, para que se pueda ver por qué no se usó.
    expect(guias.measuredRpm).toBe(90);
  });

  it("sin ingreso medido la tabla sigue ordenando: el multiplicador no depende de que haya plata", () => {
    const table = buildValueTable(revenue({ pending: true, totals: { ...revenue().totals, rpm: 0, adRevenue: 0 } }));
    expect(table.siteRpm).toBe(0);
    expect(valueOf(table, "/guias/*").multiplier).toBe(TIER_CONTENIDO.multiplier);
    expect(valueOf(table, "/alquileres-uruguay").multiplier).toBe(TIER_DIRECTORIO.multiplier);
    expect(valueOf(table, "/guias/*").usdPerClick).toBe(0);
  });

  it("marca la ventana como provisional mientras el ingreso sea de centavos", () => {
    const thin = buildValueTable(revenue({ totals: { ...revenue().totals, adRevenue: 2.8 } }));
    expect(thin.provisional).toBe(true);
    expect(buildValueTable(revenue({ totals: { ...revenue().totals, adRevenue: 120 } })).provisional).toBe(false);
  });

  it("una oportunidad sin URL atribuida vale el promedio, ni premio ni castigo", () => {
    const table = buildValueTable(revenue());
    expect(valueOf(table, null).multiplier).toBe(1);
    expect(valueOf(table, null).tier).toBe("sin-atribuir");
  });

  it("una familia que GA4 nunca vio hereda su tramo en vez de desaparecer", () => {
    const table = buildValueTable(revenue());
    const importar = valueOf(table, "/importar/*");
    expect(importar.basis).toBe("tramo");
    expect(importar.usdPerClick).toBeCloseTo((0.2 * TIER_CONTENIDO.multiplier) / 1000, 8);
  });
});

describe("lo que encontró la primera corrida contra producción (2026-09-20)", () => {
  it("un espejo de una RUTA suelta hereda su tramo, no sólo el de una familia", () => {
    // `/en/alquileres-uruguay/*` replica `/alquileres-uruguay`, que es una ruta suelta y no una
    // familia `/x/*`. Caía en "otro" y un directorio quedaba valuado 5 veces por encima.
    expect(tierOf("/en/alquileres-uruguay/*")).toBe(TIER_DIRECTORIO);
    expect(tierOf("/en/alquileres/*")).toBe(TIER_DIRECTORIO);
    expect(tierOf("/pt/guias/*")).toBe(TIER_CONTENIDO);
  });

  it("la portada de cada espejo es una portada", () => {
    expect(tierOf("/en")).toBe(TIER_DATO_VIVO);
    expect(tierOf("/pt")).toBe(TIER_DATO_VIVO);
  });

  it("las páginas de problema sueltas que la alerta encontró ya están clasificadas", () => {
    for (const path of [
      "/tarjetas-de-credito-uruguay",
      "/sala-vip-aeropuerto-uruguay",
      "/alquilar-estando-en-clearing",
      "/mejores-bancos-uruguay",
    ]) {
      expect(tierOf(path)).toBe(TIER_CONTENIDO);
    }
  });

  it("y un directorio sigue siendo directorio aunque se parezca a una de ellas", () => {
    expect(tierOf("/alquileres-uruguay")).toBe(TIER_DIRECTORIO);
  });
});
