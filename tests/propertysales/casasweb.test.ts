import { describe, expect, it } from "vitest";
import { casaswebSaleUrl, confirmCasaswebSaleCurrencies, harvestCasaswebSales, readCasaswebSaleDetail, readCasaswebSalePage, readCasaswebSalePrice, retainCasaswebDetail } from "../../classes/propertysales/casasweb";

const NOW = "2026-09-06T12:00:00Z";
// Reduced structure of the search and advert pages served after the portal's 2026-10-07 redesign.
function page(options: { operation?: string; saleLabel?: string; title?: string; id?: number; next?: boolean; amount?: string } = {}): string {
  const id = options.id || 123;
  return `<html><body><small class="mb-4">44 Resultados<br></small><form method="post" action="#" id="aspnetForm">
    <select id="ctl00_content_drpNegocio" name="ctl00$content$drpNegocio"><option selected="selected" value="${options.operation || "V"}">Venta</option></select>
    <div class="item-grid"><div class="card"><a href='/VENTA_AGENCIA__APARTAMENTO_CORDON_MONTEVIDEO_CW${id}'>
      <img src='https://casasweb.com/fotos/apto.jpg' class="card-img fondo" />
      <div class="card-body item-info"><div class="tipo-propiedad-zona"><small><b>Apartamento - <i>50m<sup>2</sup></i></b><br />Cordón</small><small class="text-right"><strong>CW${id}</strong><br />Montevideo</small></div>
      <div class="item-title"><h3>${options.title || "Venta apartamento de 2 dormitorios"}</h3></div>
      <div class="item-det"><b>2 Dormitorios</b> Muy bueno <b>Garaje(1)</b></div>
      <div class="item-precio"><div class="col precio"><h3 class="my-1">${options.saleLabel || "VENTA"}</h3><h2 class="my-0"><small>USD</small> ${options.amount || "120.000"}</h2></div>
        <div class="col precio"><h3 class="my-1 cw-alquiler">ALQUILER</h3><h2 class="my-0"><small>$</small> <small>MES</small> 25.000</h2></div></div></div>
      </a><div class="card-footer"><h3>Agencia 099 123 456</h3></div></div></div>
    ${options.next ? `<div id="ctl00_content_pnlPager" class="mb-2" role="group"><a class='btn btn-sm btn-secondary' href='/venta/apartamentos/montevideo' aria-current='page'>1</a><a class='btn btn-sm btn-outline-secondary' href='/venta/apartamentos/montevideo?pag=2'>2</a></div>` : ""}
  </form></body></html>`;
}
const saleHeading = "<h2 class='h3 cw-precio'><span class='cw-op cw-op-venta'>Venta</span> USD 120.000</h2>";

describe("independent Casasweb residential sales source", () => {
  it("reads complete own detail fields and purchase terms, never neighbouring adverts", () => {
    const card = readCasaswebSalePage(page(), NOW)!.listings[0]!;
    const html = '<title>Apartamento de 2 dormitorios - CW123 | Casasweb</title><h1 class="mb-3 my-lg-3">Apartamento de 2 dormitorios</h1>' +
      `<ul class="list-unstyled"><li>Ref: <b>CW123 </b></li></ul>${saleHeading}` +
      "<div class='mb-4 cw-amenities'><ul class='list-unstyled row'><li class='col-sm-6'><img src='assets/svg/check-square.svg' alt='Ascensor'>Ascensor</li></ul></div>" +
      '<div class="mb-4 pb-md-3"><ul class="list-unstyled mb-0 cw-detalles"><li><b>Tipo: </b>\n Apartamento</li><li><b>Metros Edificados :  </b>50</li><li><b>Area total:  </b>60 m²</li>' +
      '<li><b>Dormitorios:  </b>2</li><li><b>Baños:  </b>1</li><li><b>Gastos Comunes:  </b>$3100</li></ul></div>' +
      '<div class="pb-md-3"><h3 class="h4">Descripción</h3><p class="mb-1">Amplio apartamento con terraza. Tiene saldo a ANV.</p></div>' +
      '<a class="gallery-item2" href="https://casasweb.com/fotos/interior.jpg">Foto</a>';
    const detail = readCasaswebSaleDetail(html, card, "2026-09-06T12:10:00Z")!;
    expect(detail).toMatchObject({ bedrooms: 2, bathrooms: 1, expenses: { amount: 3100, currency: "UYU" }, amenities: ["Ascensor"], saleDetailReadAt: "2026-09-06T12:10:00.000Z", area: { value: 60, basis: "reported" } });
    expect(detail.description).toContain("Tiene saldo a ANV");
    expect(detail.description).not.toContain("Dormitorios");
    expect(detail.lastSeen).toBe(card.lastSeen);
    expect(readCasaswebSaleDetail(html.replace("CW123", "CW124"), card, NOW)).toBeNull();
    expect(readCasaswebSaleDetail(html.replace("CW123 |", "CW1234 |"), card, NOW)).toBeNull();
    // Without its own details block the advert cannot prove its type, and stays unpublished.
    expect(readCasaswebSaleDetail(html.replace("cw-detalles", "cw-otros"), card, NOW)).toBeNull();
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
    const detail = `<title>Venta apartamento - CW123 | Casasweb</title><li>Ref: <b>CW123 </b></li>${saleHeading}`;
    expect(readCasaswebSalePrice(detail, "123")).toEqual({ amount: 120000, currency: "USD" });
    expect(readCasaswebSalePrice(detail, "124")).toBeNull();
    expect(readCasaswebSalePrice(detail.replace("cw-op-venta", "cw-op-alquiler"), "123")).toBeNull();
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
    expect(readCasaswebSalePage(page().replace("_MONTEVIDEO_CW123'", "_MONTEVIDEO_CW124'"), NOW)?.listings).toHaveLength(0);
  });
  it("records a source's explicit reserved title without declaring unseen adverts withdrawn", () => {
    const result = readCasaswebSalePage(page({ title: "RESERVADO - Apartamento" }), NOW)!;
    expect(result.listings).toHaveLength(0);
    expect(result.unavailableIds).toEqual(["sale:casasweb:123"]);
  });
  it("follows the pager's own next link from the canonical search page, while validating URL inputs", () => {
    expect(readCasaswebSalePage(page({ next: true }), NOW)!.nextUrl).toBe("https://casasweb.com/venta/apartamentos/montevideo?pag=2");
    expect(readCasaswebSalePage(page(), NOW)!.nextUrl).toBeNull();
    expect(casaswebSaleUrl(19, "c")).toBe("https://casasweb.com/venta/casas/treinta-y-tres");
    expect(() => casaswebSaleUrl(0, "c")).toThrow();
  });
  it("samples both residential types and departments before deeper pages within its request budget", async () => {
    const urls: string[] = [];
    const result = await harvestCasaswebSales({ maxPages: 4, now: () => new Date(NOW), fetchPage: async (url) => {
      urls.push(url); return page({ next: true, id: urls.length });
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
