// Los fixtures son los términos REALES que Mercado Pago sirvió el 2026-09-10, recortados al
// párrafo operativo (con un <style> adentro a propósito, para que el test pruebe que el parser lo
// descarta). Cada aserción de abajo se puede contrastar contra `rawTerms`, que viaja entero.
import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

import {
  extractCampaignIds,
  isUnavailable,
  parseTerms,
  promoStatus,
  saturationUyu,
  termsUrlFor,
} from "../../classes/mercadopago/parse";

const FIXTURES = join(__dirname, "fixtures");
const load = (id: string) => readFileSync(join(FIXTURES, `${id}.html`), "utf8");
const parse = (id: string) => parseTerms(id, load(id));

describe("extractCampaignIds", () => {
  it("saca los identificadores de los enlaces de T&C, sin repetir y en orden", () => {
    const html = `
      <a href="https://api.mercadopago.com/v2/discounts/campaign/14063740/terms/html">T&C</a>
      <a href="https://api.mercadopago.com/v2/discounts/campaign/13613532/terms/html">T&C</a>
      <a href="https://api.mercadopago.com/v2/discounts/campaign/14063740/terms/html">T&C</a>
    `;
    expect(extractCampaignIds(html)).toEqual(["14063740", "13613532"]);
  });

  it("no encuentra nada donde no hay campañas", () => {
    expect(extractCampaignIds("<p>sin promociones</p>")).toEqual([]);
  });
});

describe("campañas que Mercado Pago ya no sirve", () => {
  it("reconoce la respuesta de campaña caída", () => {
    expect(isUnavailable(load("12445280"))).toBe(true);
  });

  it("no la parsea como si fuera una promoción", () => {
    expect(parse("12445280")).toBeNull();
  });

  it("las vivas no se confunden con caídas", () => {
    expect(isUnavailable(load("14063740"))).toBe(false);
  });
});

describe("parseTerms", () => {
  it("lee la promoción de McDonald's completa, incluidos los días", () => {
    const p = parse("14063740")!;
    expect(p.percent).toBe(20);
    expect(p.capUyu).toBe(300);
    expect(p.capPeriod).toBe("mes");
    expect(p.minPaymentUyu).toBe(1);
    // El dato que el mapa de Bankos publica como `availableDays: null`.
    expect(p.days).toBe("lunes a viernes");
    expect(p.brands).toContain("McDonald's");
    expect(p.channels).toContain("dinero_en_cuenta");
    expect(p.channels).toContain("qr");
    expect(p.startsAt).toBe("2026-08-05T09:10:00.000Z");
    expect(p.endsAt).toBe("2026-09-30T23:59:00.000Z");
    expect(p.datesInconsistent).toBe(false);
    expect(p.termsUrl).toBe(termsUrlFor("14063740"));
  });

  it("lee Subway con el tope escrito al revés ('por mes por Usuario')", () => {
    const p = parse("13613532")!;
    expect(p.percent).toBe(20);
    expect(p.capUyu).toBe(300);
    expect(p.capPeriod).toBe("mes");
    expect(p.brands).toContain("Subway");
  });

  it("lee el tope de $ 500 de Mundo Canino y La Hacienda", () => {
    const p = parse("13037960")!;
    expect(p.percent).toBe(15);
    expect(p.capUyu).toBe(500);
    expect(p.capPeriod).toBe("mes");
    expect(p.brands).toEqual(expect.arrayContaining(["Mundo Canino", "La Hacienda"]));
  });

  it("distingue el tope POR CAMPAÑA del tope por mes", () => {
    // 13535609 dice "$ 10000 por Usuario de Mercado Pago", sin "por mes": es por campaña.
    const p = parse("13535609")!;
    expect(p.capUyu).toBe(10_000);
    expect(p.capPeriod).toBe("campania");
    expect(p.percent).toBe(10);
  });

  it("lee TaTa", () => {
    const p = parse("13424690")!;
    expect(p.percent).toBe(10);
    expect(p.capUyu).toBe(300);
    expect(p.brands.join(" ")).toMatch(/Tata/i);
  });

  it("lee Radio Taxi 141 sin arrastrar el RUT al nombre de la marca", () => {
    const p = parse("13025745")!;
    expect(p.percent).toBe(10);
    expect(p.brands.join(" ")).toMatch(/Radio Taxi 141/);
    expect(p.brands.join(" ")).not.toMatch(/Rut/i);
  });

  it("marca la web como canal cuando el texto la ofrece", () => {
    const p = parse("13126893")!;
    expect(p.channels).toContain("web");
    expect(p.capUyu).toBe(500);
  });

  it("las once campañas vivas se parsean todas", () => {
    const ids = [
      "12297789",
      "13025745",
      "13037960",
      "13126893",
      "13173706",
      "13317324",
      "13424690",
      "13535609",
      "13613532",
      "13753764",
      "14063740",
    ];
    const parsed = ids.map(parse);
    expect(parsed.every(p => p !== null)).toBe(true);
    for (const p of parsed) {
      expect(p!.rawTerms.length).toBeGreaterThan(200);
      expect(p!.minPaymentUyu).not.toBeNull();
      expect(p!.percent).not.toBeNull();
      expect(p!.capUyu).not.toBeNull();
    }
  });

  it("todas topean, y ese es el punto: ninguna es un porcentaje libre", () => {
    const caps = ["12297789", "13025745", "13037960", "13173706", "13424690", "13613532", "14063740"]
      .map(id => parse(id)!.capUyu);
    expect(caps.every(c => c !== null && c <= 500)).toBe(true);
  });

  it("no inventa una promoción donde no hay párrafo", () => {
    expect(parseTerms("1", "<html><body><p>hola</p></body></html>")).toBeNull();
  });
});

describe("promoStatus", () => {
  const AHORA = new Date("2026-09-10T12:00:00Z");

  it("una campaña dentro de su ventana está vigente", () => {
    expect(promoStatus(parse("14063740")!, AHORA)).toBe("vigente");
  });

  it("la campaña cuyo fin cae ANTES del inicio no se declara ni vigente ni vencida", () => {
    // 13753764: "del 01/06/2026 11:11 al 31/03/2026 23:59". El texto oficial se contradice.
    const p = parse("13753764")!;
    expect(p.datesInconsistent).toBe(true);
    expect(promoStatus(p, AHORA)).toBe("indeterminado");
  });

  it("reconoce una vencida y una futura", () => {
    const base = { datesInconsistent: false };
    expect(
      promoStatus({ ...base, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-02-01T00:00:00.000Z" }, AHORA)
    ).toBe("vencida");
    expect(
      promoStatus({ ...base, startsAt: "2026-12-01T00:00:00.000Z", endsAt: "2027-01-01T00:00:00.000Z" }, AHORA)
    ).toBe("futura");
  });

  it("sin fechas no adivina", () => {
    expect(promoStatus({ startsAt: null, endsAt: null, datesInconsistent: false }, AHORA)).toBe(
      "indeterminado"
    );
  });
});

describe("saturationUyu", () => {
  it("un 20 % con tope de $ 300 se agota a los $ 1.500 de consumo mensual", () => {
    expect(saturationUyu({ percent: 20, capUyu: 300 })).toBe(1_500);
  });

  it("el mismo tope con 10 % rinde el doble de consumo", () => {
    expect(saturationUyu({ percent: 10, capUyu: 300 })).toBe(3_000);
  });

  it("sin porcentaje o sin tope no hay saturación que calcular", () => {
    expect(saturationUyu({ percent: null, capUyu: 300 })).toBeNull();
    expect(saturationUyu({ percent: 20, capUyu: null })).toBeNull();
  });
});
