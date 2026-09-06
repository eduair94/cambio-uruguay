import { describe, expect, it } from "vitest";
import { casaswebSaleUrl, confirmCasaswebSaleCurrencies, harvestCasaswebSales, readCasaswebSaleDetail, readCasaswebSalePage, readCasaswebSalePrice, retainCasaswebDetail } from "../../classes/propertysales/casasweb";

const NOW = "2026-09-06T12:00:00Z";
function page(options: { operation?: string; saleLabel?: string; title?: string; id?: number; next?: boolean; amount?: string } = {}): string {
  const id = options.id || 123;
  return `<html><body>44 Resultados<form>
    <input type="hidden" name="__VIEWSTATE" value="server-issued-state">
    <select id="content_drpNegocio" name="content$drpNegocio"><option value="${options.operation || "V"}" selected>Venta</option></select>
    <input id="btnP1" name="page1" type="submit" class="btn-secondary" value="1">
    ${options.next ? '<input id="btnP2" name="page2" type="submit" value="2">' : ""}
    <article><a href="VENTA_APARTAMENTO_CW${id}"><img class="card-img" style="background-image:url('https://casasweb.com/fotos/apto.jpg')">
      <div class="item-info"><div class="tipo-propiedad-zona"><small><b>Apartamento - <i>50m2</i></b>Cordón</small><small><strong>CW${id}</strong>Montevideo</small></div>
      <div class="item-title"><h3>${options.title || "Venta apartamento de 2 dormitorios"}</h3></div>
      <div class="item-det">2 Dormitorios Garaje(1) Muy bueno</div>
      <div class="item-precio"><div class="precio"><h3>${options.saleLabel || "VENTA"}</h3><h2><small>USD</small>${options.amount || "120.000"}</h2></div>
        <div class="precio"><h3>ALQUILER</h3><h2><small>$</small>MES 25.000</h2></div></div></div>
      </a><footer class="card-footer"><h3>Agencia 099 123 456</h3></footer></article>
  </form></body></html>`;
}

describe("independent Casasweb residential sales source", () => {
  it("reads complete own detail fields and purchase terms, never neighbouring adverts", () => {
    const card = readCasaswebSalePage(page(), NOW)!.listings[0]!;
    const html = '<title>CW123 Venta apartamento</title><h1>Apartamento de 2 dormitorios</h1><li>Ref: <b>CW123</b></li><h2><span class="venta">Venta</span> USD 120.000</h2>' +
      '<div><h3>Detalles</h3><ul><li><b>Tipo:</b>Apartamento</li><li><b>Dormitorios:</b>2</li><li><b>Baños:</b>1</li><li><b>Metros Edificados:</b>50</li><li><b>Area total:</b>60 m²</li><li><b>Gastos Comunes:</b>$3100</li></ul></div>' +
      '<div><h3>Descripción</h3><p>Amplio apartamento con terraza. Tiene saldo a ANV.</p></div><div><h3>Amenities</h3><ul><li>Ascensor</li></ul></div>' +
      '<a class="gallery-item2" href="https://casasweb.com/fotos/interior.jpg">Foto</a>';
    const detail = readCasaswebSaleDetail(html, card, "2026-09-06T12:10:00Z")!;
    expect(detail).toMatchObject({ bedrooms: 2, bathrooms: 1, expenses: { amount: 3100, currency: "UYU" }, amenities: ["Ascensor"], saleDetailReadAt: "2026-09-06T12:10:00.000Z", area: { value: 60, basis: "reported" } });
    expect(detail.description).toContain("Tiene saldo a ANV");
    expect(detail.description).not.toContain("Detalles");
    expect(detail.lastSeen).toBe(card.lastSeen);
    expect(readCasaswebSaleDetail(html.replace("CW123", "CW124"), card, NOW)).toBeNull();
  });
  it("retains a previous full read for an unchanged card without washing dates; changed money requires a new detail", () => {
    const card = readCasaswebSalePage(page(), NOW)!.listings[0]!;
    const previous = { ...card, saleDetailReadAt: "2026-09-05T12:05:00Z", lastSeen: "2026-09-05T12:00:00Z", description: "Own full description" };
    expect(retainCasaswebDetail(previous, card)).toBe(previous);
    expect(retainCasaswebDetail(previous, { ...card, price: { amount: 100000, currency: "USD" } })).not.toBe(previous);
    expect(retainCasaswebDetail(previous, { ...card, title: "Completely changed advert" })).not.toBe(previous);
    expect(retainCasaswebDetail({ ...previous, saleDetailReadAt: "2026-08-01" }, card)).toBe(card);
  });
  it("corroborates ambiguous card currency exclusively against the same advert's sale heading", async () => {
    const detail = '<title>CW123 Venta apartamento</title><li>Ref: <b>CW123</b></li><h2><span class="venta">Venta</span> USD 120.000</h2>';
    expect(readCasaswebSalePrice(detail, "123")).toEqual({ amount: 120000, currency: "USD" });
    expect(readCasaswebSalePrice(detail, "124")).toBeNull();
    expect(readCasaswebSalePrice(detail.replace("class=\"venta\"", "class=\"alquiler\""), "123")).toBeNull();
    const listing = readCasaswebSalePage(page(), NOW)!.listings[0]!;
    const harvest = { source: "casasweb", operation: "sale", ok: true, complete: false, readAt: NOW, unavailableIds: [],
      listings: [{ ...listing, price: { amount: 120000, currency: "UYU" } }], pagesRequested: 1, pagesRead: 1, failedPages: 0 } as any;
    const confirmed = await confirmCasaswebSaleCurrencies(harvest, { fetchDetail: async () => detail });
    expect(confirmed.listings[0]!.price).toEqual({ amount: 120000, currency: "USD" });
    expect(confirmed.listings[0]!.lastSeen).toBe(listing.lastSeen);
    const failed = await confirmCasaswebSaleCurrencies(harvest, { fetchDetail: async () => null });
    expect(failed.listings[0]!.price.currency).toBe("UYU");
    expect(failed.priceChecks).toMatchObject({ confirmedUsd: 0, withheld: 1 });
    const changedAmount = await confirmCasaswebSaleCurrencies(harvest, { fetchDetail: async () => detail.replace("120.000", "150.000") });
    expect(changedAmount.listings[0]!.price.currency).toBe("UYU");
  });
  it("reads the own sale price and reported area without inventing monthly expenses, bath count or built area", () => {
    const row = readCasaswebSalePage(page(), NOW)!.listings[0]!;
    expect(row).toMatchObject({ source: "casasweb", id: "sale:casasweb:123", price: { amount: 120000, currency: "USD" },
      expenses: null, bedrooms: 2, bathrooms: null, parkingSpaces: 1, area: { value: 50, basis: "reported" },
      areas: { built: null, total: null, land: null, terrace: null, reported: 50 }, geo: null, sellerName: "Agencia", lastSeen: "2026-09-06T12:00:00.000Z" });
    expect(row.description).not.toContain("25000");
  });
  it("rejects a rental search, rent-only card, finance text and another identifier", () => {
    expect(readCasaswebSalePage(page({ operation: "A" }), NOW)).toBeNull();
    expect(readCasaswebSalePage(page({ saleLabel: "TEMPORAL" }), NOW)?.listings).toHaveLength(0);
    expect(readCasaswebSalePage(page({ amount: "Entrega 20.000" }), NOW)?.listings).toHaveLength(0);
    expect(readCasaswebSalePage(page().replace("href=\"VENTA_APARTAMENTO_CW123\"", "href=\"VENTA_APARTAMENTO_CW124\""), NOW)?.listings).toHaveLength(0);
  });
  it("records a source's explicit reserved title without declaring unseen adverts withdrawn", () => {
    const result = readCasaswebSalePage(page({ title: "RESERVADO - Apartamento" }), NOW)!;
    expect(result.listings).toHaveLength(0);
    expect(result.unavailableIds).toEqual(["sale:casasweb:123"]);
  });
  it("preserves the public sale form state verbatim for next page, while validating URL inputs", () => {
    const params = new URLSearchParams(readCasaswebSalePage(page({ next: true }), NOW)!.nextBody!);
    expect(params.get("__VIEWSTATE")).toBe("server-issued-state");
    expect(params.get("content$drpNegocio")).toBe("V");
    expect(params.get("page2")).toBe("2");
    expect(casaswebSaleUrl(19, "c")).toContain("n=V&t=c&x=19");
    expect(() => casaswebSaleUrl(0, "c")).toThrow();
  });
  it("samples both residential types and departments before deeper pages within its request budget", async () => {
    const urls: string[] = [];
    const result = await harvestCasaswebSales({ maxPages: 4, now: () => new Date(NOW), fetchPage: async (url, body) => {
      urls.push(url); expect(body).toBeNull(); return page({ next: true, id: urls.length });
    } });
    expect(result.pagesRequested).toBe(4); expect(result.complete).toBe(false);
    expect(urls).toEqual([casaswebSaleUrl(1, "a"), casaswebSaleUrl(1, "c"), casaswebSaleUrl(2, "a"), casaswebSaleUrl(2, "c")]);
    expect(result.listings).toHaveLength(4);
  });
  it("stops after three consecutive failed pages without inventing a successful read", async () => {
    const result = await harvestCasaswebSales({ maxPages: 120, now: () => new Date(NOW), fetchPage: async () => null });
    expect(result).toMatchObject({ ok: false, failedPages: 3, pagesRequested: 3, pagesRead: 0, listings: [], unavailableIds: [] });
  });
});
