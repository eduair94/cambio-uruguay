import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchText = vi.fn();
vi.mock("../../classes/rentals/net", () => ({ fetchText: (...args: unknown[]) => fetchText(...args) }));

import { fetchCarDetails, parseCarDetail } from "../../classes/autos/detail";

function page(options: { status?: string; description?: string; ld?: boolean } = {}): string {
  const vehicle = {
    "@context": "https://schema.org", "@type": "Vehicle", name: "Byd New F3 1.5 Mt", brand: "BYD", bodyType: "Sedán",
    color: "Azul", numberOfDoors: "5", fuelType: "Nafta", offers: { "@type": "Offer", price: 9500, priceCurrency: "USD" },
  };
  const attributes = [
    { id: "Marca", text: "BYD" }, { id: "Modelo", text: "F3" }, { id: "Año", text: "2017" },
    { id: "Versión", text: "1.5 Mt" }, { id: "Kilómetros", text: "111.111 km" }, { id: "Motor", text: "1.5" },
  ];
  const state = {
    components: [{ id: "technical_specifications", attributes }],
    description: { id: "description", type: "description", state: "VISIBLE", title: "Descripción", content: options.description ?? "Equipamiento completo.\nNunca chocado." },
    seller: { seller_name: { title: { text: "Olivera Automotores" } } },
    track: { item_status: options.status ?? "active" },
  };
  const ld = options.ld === false ? "" : `<script type="application/ld+json">${JSON.stringify(vehicle)}</script>`;
  return `<html><head>${ld}</head><body><script>window.state=${JSON.stringify(state)}</script></body></html>`;
}

const READ_AT = "2026-09-16T12:00:00.000Z";

// Verbatim fragments pulled 2026-09-16 from the live MLU-700355317-byd-new-f3-15-mt-_JM page: the
// same advert as `page()` above, but rendered as server HTML (`andes-table` spec rows, an
// `ui-pdp-description` paragraph and a seller profile link) instead of the JSON blob the fixture
// above assumes. Added because the JSON-only parser came back with model/year/km/version/engine/
// seller all null against the real page — the ML PDP ships both shapes.
function realPage(): string {
  const ld = `<script type="application/ld+json" nonce="Q/BoeOMeSJQhSVtkuHJJjg=="> {"name":"Byd New F3 1.5 Mt","image":"https:\\u002F\\u002Fhttp2.mlstatic.com\\u002FD_NQ_NP_749321-MLU117708961991_092026-O.webp","offers":{"price":9500,"availability":"https:\\u002F\\u002Fschema.org\\u002FInStock","url":"https:\\u002F\\u002Fauto.mercadolibre.com.uy\\u002FMLU-700355317-byd-new-f3-15-mt-_JM","@type":"Offer","priceCurrency":"USD","priceValidUntil":"2026-09-19"},"brand":"BYD","sku":"MLU700355317","width":"1705 mm","height":"1490 mm","color":"Azul","@context":"https:\\u002F\\u002Fschema.org","@type":"Vehicle","itemCondition":"https:\\u002F\\u002Fschema.org\\u002FUsedCondition","productID":"MLU700355317","bodyType":"Sedán","fuelCapacity":"50 L","fuelType":"Nafta","numberOfDoors":"5","numberOfForwardGears":"5","vehicleEngine":"1.5","vehicleTransmission":"Manual"}</script>`;
  const specTable = `<table class="andes-table"><tbody class="andes-table__body"><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Marca</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_acfhastad9vqpa_"><span id="_R_acfhastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">BYD</span></td></tr><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Modelo</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_acnhastad9vqpa_"><span id="_R_acnhastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">F3</span></td></tr><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Año</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_acvhastad9vqpa_"><span id="_R_acvhastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">2017</span></td></tr><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Versión</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_ad7hastad9vqpa_"><span id="_R_ad7hastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">1.5 Mt</span></td></tr><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Kilómetros</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_adnhastad9vqpa_"><span id="_R_adnhastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">111.111 km</span></td></tr><tr class="andes-table__row ui-vpp-striped-specs__row"><th class="andes-table__header andes-table__header--left ui-vpp-striped-specs__row__column ui-vpp-striped-specs__row__column--id" scope="row"><div class="andes-table__header__container">Motor</div></th><td class="andes-table__column andes-table__column--left andes-table__column--vertical-align-center ui-vpp-striped-specs__row__column" id="_R_aenhastad9vqpa_"><span id="_R_aenhastad9vqpa_-value" class="andes-table__column--value" style="line-clamp:none;-webkit-line-clamp:none">1.5</span></td></tr></tbody></table>`;
  const status = `<script>window.__PRELOADED_STATE__={"listing_type_id":"gold","item_status":"active","deal_ids":[],"catalog_listing":false}</script>`;
  const description = `<div id="description" class="ui-pdp-description"><h2 class="ui-pdp-description__title">Descripción</h2><p class="ui-pdp-description__content">Equipamiento  : \n\n Doble airbag - ABS - Isofix -aire acondicionado - Boton de encendido - tapizado en eco cuero - Volante multifuncion - faros antiniebla - camara de reversa con sensores - camara lateral derecha - Vidrios y espejos electricos  - techo solar electrico - radio multimedia - llantas\n\nCambiar tu Auto nunca fue tan fácil de la mano de …\nOLIVERA AUTOMOTORES\n\nGARANTÍA Y CONFIANZA\n\n1. Experiencia de compra sin complicaciones.\n2. Garantía y confianza con casi 50 años en el mercado y 10 sucursales en todo el país.\n3. Servicios como seguro, financiación propia o a través de bancos, gestión de empadronamiento y escrituras, y asesoramiento personalizado.\n4. Comodidad con el servicio de car delivery.\n5. Proceso de compra fácil, seguro y sin complicaciones.\n6. Tomamos tu auto como forma de pago.\n\nSALTO\nARTIGAS\nYOUNG\nPAYSANDÚ\nMONTEVIDEO\nMALDONADO\n\n7301 COD\nPrecio contado U$S 9.500\nPor precio con permuta CONSULTE!</p></div>`;
  const seller = `<div class="ui-vip-profile-info__info-container"><a class="ui-vip-profile-info__info-link" href="https://perfil.mercadolibre.com.uy/OLIVERA+AUTOMOTORES" target="_blank" rel="noopener noreferrer"><h3 class="ui-pdp-color--BLACK ui-pdp-size--XSMALL ui-pdp-family--REGULAR"><span>Olivera Automotores</span></h3></a></div>`;
  return `<html><head>${ld}</head><body>${status}${specTable}${description}${seller}</body></html>`;
}

const REAL_DESCRIPTION =
  "Equipamiento  : \n\n Doble airbag - ABS - Isofix -aire acondicionado - Boton de encendido - tapizado en eco cuero - Volante multifuncion - faros antiniebla - camara de reversa con sensores - camara lateral derecha - Vidrios y espejos electricos  - techo solar electrico - radio multimedia - llantas\n\nCambiar tu Auto nunca fue tan fácil de la mano de …\nOLIVERA AUTOMOTORES\n\nGARANTÍA Y CONFIANZA\n\n1. Experiencia de compra sin complicaciones.\n2. Garantía y confianza con casi 50 años en el mercado y 10 sucursales en todo el país.\n3. Servicios como seguro, financiación propia o a través de bancos, gestión de empadronamiento y escrituras, y asesoramiento personalizado.\n4. Comodidad con el servicio de car delivery.\n5. Proceso de compra fácil, seguro y sin complicaciones.\n6. Tomamos tu auto como forma de pago.\n\nSALTO\nARTIGAS\nYOUNG\nPAYSANDÚ\nMONTEVIDEO\nMALDONADO\n\n7301 COD\nPrecio contado U$S 9.500\nPor precio con permuta CONSULTE!";

describe("parseCarDetail", () => {
  it("reads the real MLU-700355317 page, which ships specs as server HTML rather than the JSON blob", () => {
    expect(parseCarDetail(realPage(), READ_AT)).toEqual({
      readAt: READ_AT, price: 9500, currency: "USD", active: true, brand: "BYD", model: "F3", year: 2017, km: 111111,
      version: "1.5 Mt", engineText: "1.5", sellerName: "Olivera Automotores", bodyType: "Sedán", color: "Azul", doors: 5,
      flags: [], description: REAL_DESCRIPTION,
    });
  });
  it("reads price, specs, seller and description from the vehicle page", () => {
    expect(parseCarDetail(page(), READ_AT)).toEqual({
      readAt: READ_AT, price: 9500, currency: "USD", active: true, brand: "BYD", model: "F3", year: 2017, km: 111111,
      version: "1.5 Mt", engineText: "1.5", sellerName: "Olivera Automotores", bodyType: "Sedán", color: "Azul", doors: 5,
      flags: [], description: "Equipamiento completo.\nNunca chocado.",
    });
  });
  it("flags a damaged car and a closed advert", () => {
    expect(parseCarDetail(page({ description: "Motor fundido, se vende como está" }), READ_AT)?.flags).toEqual(["damaged"]);
    expect(parseCarDetail(page({ status: "closed" }), READ_AT)?.active).toBe(false);
  });
  it("refuses a page that is not a vehicle advert", () => {
    expect(parseCarDetail(page({ ld: false }), READ_AT)).toBeNull();
    expect(parseCarDetail("<html>Publicación finalizada</html>", READ_AT)).toBeNull();
  });
});

describe("fetchCarDetails", () => {
  beforeEach(() => {
    fetchText.mockReset();
  });
  it("separates read pages, removed adverts and failures, and only reads ML permalinks", async () => {
    fetchText.mockImplementation(async (url: string, options: { onFailure?: (reason: string) => void }) => {
      if (url.includes("MLU-1-")) return page();
      if (url.includes("MLU-2-")) { options.onFailure?.("HTTP 404"); return null; }
      options.onFailure?.("tiempo agotado (25000 ms)");
      return null;
    });
    const result = await fetchCarDetails([
      { key: "ml-MLU1", permalink: "https://auto.mercadolibre.com.uy/MLU-1-a-_JM" },
      { key: "ml-MLU2", permalink: "https://auto.mercadolibre.com.uy/MLU-2-b-_JM" },
      { key: "ml-MLU3", permalink: "https://auto.mercadolibre.com.uy/MLU-3-c-_JM" },
      { key: "ml-MLU4", permalink: "https://evil.example/MLU-4" },
    ], { max: 10, maxDurationMs: 60_000, now: () => new Date(READ_AT) });
    expect([...result.details.keys()]).toEqual(["ml-MLU1"]);
    expect(result.gone).toEqual(["ml-MLU2"]);
    expect(result.failed).toBe(1);
    expect(fetchText).toHaveBeenCalledTimes(3);
    expect(fetchText.mock.calls[0]![1].headers["user-agent"]).toMatch(/CambioUruguayBot/);
  });
  it("honours the read budget", async () => {
    fetchText.mockResolvedValue(page());
    const targets = Array.from({ length: 5 }, (_, i) => ({ key: `ml-MLU${i}`, permalink: `https://auto.mercadolibre.com.uy/MLU-${i}-x-_JM` }));
    const result = await fetchCarDetails(targets, { max: 2, maxDurationMs: 60_000 });
    expect(result.details.size).toBe(2);
  });
});
