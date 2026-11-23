// Facebook Marketplace como segunda fuente de motos. Los títulos son reales: salen de las tarjetas de
// la categoría Vehículos que el lector de autos guardó entre el 19 y el 23/11/2026.
import { describe, expect, it } from "vitest";
import { buildMotoCatalog, publicMotoListing } from "../../classes/motos/catalog";
import { enrichMotoListing, motoKey } from "../../classes/motos/enrich";
import {
  buildMotoDictionary,
  fbBrandPattern,
  fbCardToMoto,
  motoReferenceFrom,
  motoWords,
  type FbMotoCard,
} from "../../classes/motos/sources/facebook";

const ML = [
  { brandId: "b-zanella", brand: "Zanella", modelId: "m-zr125", model: "ZR 125", year: 2024, price: 1300, currency: "USD", fuel: "nafta" },
  { brandId: "b-zanella", brand: "Zanella", modelId: "m-zr125", model: "ZR 125", year: 2023, price: 1200, currency: "USD", fuel: "nafta" },
  { brandId: "b-zanella", brand: "Zanella", modelId: "m-zr125", model: "ZR 125", year: 2024, price: 1250, currency: "USD", fuel: "nafta" },
  { brandId: "b-honda", brand: "Honda", modelId: "m-xre300", model: "XRE 300", year: 2018, price: 5200, currency: "USD", fuel: "nafta" },
  { brandId: "b-honda", brand: "Honda", modelId: "m-xre300", model: "XRE 300", year: 2019, price: 5600, currency: "USD", fuel: "nafta" },
  { brandId: "b-honda", brand: "Honda", modelId: "m-xre300", model: "XRE 300", year: 2017, price: 4900, currency: "USD", fuel: "nafta" },
  { brandId: "b-suzuki", brand: "Suzuki", modelId: "m-en125", model: "EN 125", year: 2017, price: 1500, currency: "USD", fuel: "nafta" },
  { brandId: "b-yumbo", brand: "Yumbo", modelId: "m-eco70", model: "Eco 70", year: 2011, price: 15000, currency: "UYU", fuel: "nafta" },
  { brandId: "b-yumbo", brand: "Yumbo", modelId: "m-eco70", model: "Eco 70", year: 2012, price: 17000, currency: "UYU", fuel: "nafta" },
  { brandId: "b-yumbo", brand: "Yumbo", modelId: "m-eco70", model: "Eco 70", year: 2010, price: 16000, currency: "UYU", fuel: "nafta" },
] as const;

const dictionary = buildMotoDictionary(ML);
const context = { dictionary, usdUyu: 41.8, maxYear: 2027, referenceUsd: motoReferenceFrom(ML, 41.8) };
const card = (title: string, amount: number | null = 5300, over: Partial<FbMotoCard> = {}): FbMotoCard => ({
  id: "1234567890",
  title,
  amount,
  city: "Durazno, Uruguay",
  createdAt: null,
  picture: "https://scontent.fmvd1-1.fna.fbcdn.net/v/t45/foto.jpg",
  isSold: false,
  isLive: true,
  ...over,
});
const convert = (title: string, amount?: number | null, over?: Partial<FbMotoCard>) =>
  fbCardToMoto(card(title, amount, over), null, "2026-11-23T12:00:00.000Z", context);

describe("una tarjeta de Marketplace que es una moto", () => {
  it("identifica marca, modelo, año, moneda y departamento", () => {
    const result = convert("Vendo Honda XRE300 año 2018");
    expect(result).toMatchObject({
      listing: {
        source: "facebook",
        brand: "Honda",
        model: "XRE 300",
        year: 2018,
        price: 5300,
        currency: "USD",
        currencyInferred: true,
        department: "Durazno",
        sellerType: null,
        permalink: "https://www.facebook.com/marketplace/item/1234567890/",
      },
    });
  });

  it("la moneda declarada en el texto no se deduce", () => {
    const result = convert("2018 HONDA XRE300 precio usd 5.300", 5300);
    expect(result).toMatchObject({ listing: { currency: "USD", currencyInferred: false } });
  });

  it("deduce pesos cuando el monto en dólares sería absurdo para esa moto", () => {
    expect(convert("Moto Yumbo ECO 70 del año 2011", 16000)).toMatchObject({ listing: { currency: "UYU", currencyInferred: true } });
  });
});

describe("lo que no entra, medido", () => {
  it("un auto de una marca que también hace motos («Suzuki … en excelente estado»)", () => {
    expect(convert("2017 Suzuki vitara gl plus automático 1.6 año 2017 impecable! en color gris", 12990)).toEqual({ rejected: "es-un-auto" });
    expect(convert("Camioneta Suzuki modelo Ertiga año 2020 en excelente estado", 14800)).toEqual({ rejected: "es-un-auto" });
  });

  it("la forma corta de un modelo nunca es una palabra del idioma", () => {
    expect(convert("Suzuki celerio año 2020 en buen estado", 6000)).toEqual({ rejected: "no-identificada" });
  });

  it("la forma corta seguida de OTRO número es otro modelo («zr200» no es la ZR 125)", () => {
    expect(convert("Zanella zr200 años 2025 en venta", 70000)).toEqual({ rejected: "no-identificada" });
    expect(convert("Moto Zanella ZR 125 AÑO 2024", 50000)).toMatchObject({ listing: { model: "ZR 125", year: 2024 } });
  });

  it("quien busca o permuta POR una moto no la vende", () => {
    expect(convert("Permuto por zanella zr 125 2020", 25000)).toEqual({ rejected: "no-vende" });
    expect(convert("Busco honda xre 300 2018", 5000)).toEqual({ rejected: "no-vende" });
  });

  it("sin año no hay cohorte, sin precio no hay aviso, y un precio que no cierra en ninguna moneda se descarta", () => {
    expect(convert("Vendo honda xre 300 impecable")).toEqual({ rejected: "sin-anio" });
    expect(convert("Honda xre 300 2018", null)).toEqual({ rejected: "sin-precio" });
    expect(convert("Honda xre 300 2018", 31)).toEqual({ rejected: "moneda-dudosa" });
  });

  it("vendido, repuesto o cuatriciclo, afuera", () => {
    expect(convert("Honda xre 300 2018", 5300, { isSold: true })).toEqual({ rejected: "vendido" });
    expect(convert("Escape honda xre 300 2018", 300)).toEqual({ rejected: "pieza" });
  });
});

describe("del aviso de Facebook al catálogo público", () => {
  it("clave fb-, permalink y foto de Facebook validados, y la moneda deducida viaja", () => {
    const result = convert("Vendo Honda XRE300 año 2018");
    if ("rejected" in result) throw new Error(result.rejected);
    expect(motoKey(result.listing.id, "facebook")).toBe("fb-1234567890");
    const listing = enrichMotoListing(result.listing, {
      usdUyu: 41.8,
      firstSeen: "2026-11-23T12:00:00.000Z",
      lastSeen: "2026-11-23T12:00:00.000Z",
      priceHistory: [],
    });
    expect(listing.currencyInferred).toBe(true);
    const row = publicMotoListing(listing)!;
    // Sin un literal `key: "fb-<dígitos>"`: el gate de secretos (gitleaks) lo toma por una clave.
    expect(row.key).toBe(motoKey(result.listing.id, "facebook"));
    expect(row).toMatchObject({ source: "facebook", sourceName: "Facebook Marketplace" });
    expect(row.picture).toMatch(/fbcdn\.net/);
    // Una foto de otro host no cruza.
    expect(publicMotoListing({ ...listing, picture: "https://evil.example/x.jpg" })!.picture).toBeNull();
    // Y un permalink que no es de Marketplace saca al aviso entero.
    expect(publicMotoListing({ ...listing, permalink: "https://evil.example/marketplace/item/1/" })).toBeNull();
    const catalog = buildMotoCatalog([listing], {
      now: new Date("2026-11-23T13:00:00.000Z"),
      generatedAt: "2026-11-23T13:00:00.000Z",
      usdUyu: 41.8,
      lastFullReadAt: null,
      lastReadAt: null,
      reportedTotal: null,
      sources: [],
    });
    expect(catalog.listings).toHaveLength(1);
  });

  it("el filtro de la base trae sólo tarjetas que nombran una marca de motos", () => {
    const pattern = new RegExp(fbBrandPattern(dictionary), "i");
    expect(pattern.test("Vendo Honda XRE300")).toBe(true);
    expect(pattern.test("Peugeot 208 2019")).toBe(false);
  });

  it("los números se despegan de las letras como los escriben los vendedores", () => {
    expect(motoWords("Zanella ZR200cc")).toBe(" zanella zr 200 cc ");
  });
});
