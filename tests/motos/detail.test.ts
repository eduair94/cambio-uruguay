// La ficha propia del aviso de moto y la cola que decide cuáles leer.
import { describe, expect, it } from "vitest";
import { parseMotoDetail } from "../../classes/motos/detail";
import { motoDetailQueueSummary, motoDetailRunBroken, motoDetailTargets } from "../../classes/motos/detailQueue";
import type { MotoDetail, StoredMoto } from "../../classes/motos/types";

const row = (label: string, value: string) =>
  `<tr><th><div class="andes-table__header__container">${label}</div></th><td class="x"><span class="andes-table__column--value">${value}</span></td></tr>`;

const page = (over: { status?: string; rows?: string; ld?: Record<string, unknown> | null } = {}) => `
<html><head>
${over.ld === null ? "" : `<script type="application/ld+json">${JSON.stringify({
  "@type": "Vehicle",
  name: "Yumbo Gtr 125",
  color: "Rojo",
  offers: { price: 1200, priceCurrency: "USD" },
  ...(over.ld ?? {}),
})}</script>`}
</head><body>
"item_status":"${over.status ?? "active"}"
<table>${over.rows ?? [row("Tipo de moto", "Naked"), row("Cilindrada", "1.590 cc"), row("Color", "Rojo"), row("Motor", "4 tiempos"), row("Único dueño", "Sí")].join("")}</table>
<img data-zoom="https://http2.mlstatic.com/D_NQ_NP_1-O.webp"><img data-zoom="https://http2.mlstatic.com/D_NQ_NP_2-O.webp">
<img data-zoom="https://otro.host/foto.webp">
<div id="description" class="ui-pdp-description"><h2>Descripción</h2><p class="ui-pdp-description__content">Debe patente 2025.<br>Impecable.</p></div>
</body></html>`;

describe("parseMotoDetail", () => {
  it("lee precio, tabla, cilindrada, color, tipo, galería y descripción", () => {
    const detail = parseMotoDetail(page(), "2026-11-23T12:00:00.000Z")!;
    expect(detail).toMatchObject({
      readAt: "2026-11-23T12:00:00.000Z",
      price: 1200,
      currency: "USD",
      active: true,
      displacement: 1590,
      typeText: "Naked",
      color: "Rojo",
    });
    expect(detail.specs["Único dueño"]).toBe("Sí");
    expect(detail.pictures).toEqual(["https://http2.mlstatic.com/D_NQ_NP_1-O.webp", "https://http2.mlstatic.com/D_NQ_NP_2-O.webp"]);
    expect(detail.description).toBe("Debe patente 2025.\nImpecable.");
  });

  it("un aviso pausado o finalizado no está activo", () => {
    expect(parseMotoDetail(page({ status: "paused" }), "x")!.active).toBe(false);
  });

  it("sin ficha de vehículo con precio no hay ficha", () => {
    expect(parseMotoDetail(page({ ld: null }), "x")).toBeNull();
    expect(parseMotoDetail(page({ ld: { offers: { price: 0, priceCurrency: "USD" } } }), "x")).toBeNull();
  });

  it("una cilindrada ilegible queda en null, la tabla se guarda igual", () => {
    const detail = parseMotoDetail(page({ rows: row("Cilindrada", "no sé") }), "x")!;
    expect(detail.displacement).toBeNull();
    expect(detail.specs.Cilindrada).toBe("no sé");
    expect(detail.color).toBe("Rojo");
  });
});

const NOW = new Date("2026-11-23T12:00:00.000Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();
const stored = (key: string, over: Partial<StoredMoto> = {}): StoredMoto =>
  ({
    key,
    firstSeen: ago(10),
    lastSeen: ago(0),
    listing: { permalink: `https://moto.mercadolibre.com.uy/MLU-${key}-x-_JM` },
    priceHistory: [],
    retiredAt: null,
    missedFullSweeps: 0,
    ...over,
  }) as StoredMoto;
const detail = (readAt: string) => ({ readAt }) as MotoDetail;

describe("motoDetailRunBroken", () => {
  it("una falla suelta con la cola casi vacía no es una caída; cinco sin una sola lectura sí", () => {
    expect(motoDetailRunBroken({ targets: 1, read: 0, failed: 1 })).toBe(false);
    expect(motoDetailRunBroken({ targets: 120, read: 0, failed: 5 })).toBe(true);
    expect(motoDetailRunBroken({ targets: 120, read: 3, failed: 117 })).toBe(false);
    expect(motoDetailRunBroken({ targets: 0, read: 0, failed: 0 })).toBe(false);
  });
});

describe("motoDetailTargets", () => {
  it("los nunca leídos primero, los vistos más recientemente arriba; después las fichas viejas", () => {
    const targets = motoDetailTargets(
      [
        stored("1", { detail: detail(ago(40)) }),
        stored("2", { lastSeen: ago(2) }),
        stored("3"),
        stored("4", { detail: detail(ago(3)) }),
        stored("5", { detail: detail(ago(60)) }),
      ],
      { now: NOW, refreshDays: 30 }
    );
    expect(targets.map(target => target.key)).toEqual(["3", "2", "5", "1"]);
    expect(motoDetailQueueSummary(targets)).toEqual({ nuevo: 2, vencido: 2 });
  });

  it("un error espera un día, una baja una semana, un retirado o viejo no entra", () => {
    const targets = motoDetailTargets(
      [
        stored("err-hoy", { detailError: { at: ago(0.5), reason: "HTTP 503" } }),
        stored("err-ayer", { detailError: { at: ago(1.5), reason: "HTTP 503" } }),
        stored("baja", { detailGoneAt: ago(3) }),
        stored("retirado", { retiredAt: ago(1) }),
        stored("viejo", { lastSeen: ago(9) }),
        stored("otro-host", { listing: { permalink: "https://auto.mercadolibre.com.uy/MLU-1" } as never }),
      ],
      { now: NOW, refreshDays: 30 }
    );
    expect(targets.map(target => target.key)).toEqual(["err-ayer"]);
  });
});
