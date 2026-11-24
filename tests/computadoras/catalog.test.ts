import { describe, expect, it } from "vitest";
import { buildComputerCatalog, locationOf, readListings, usageOf, usedPartObservations } from "../../classes/computadoras/catalog";
import { buildPartTable } from "../../classes/computadoras/parts";
import type { FacebookComputerDetail, PartObservation, RawComputerListing } from "../../classes/computadoras/types";

const USD_UYU = 40;
let serial = 100000001;
const raw = (title: string, price: number, currency: "UYU" | "USD", over: Partial<RawComputerListing> = {}): RawComputerListing => {
  const id = String(serial++);
  return { slug: `fb-${id}`, source: "facebook", sourceId: id, url: `https://www.facebook.com/marketplace/item/${id}/`, title, price, currency, image: null, location: "Montevideo, Uruguay", category: null, condition: null, officialStore: false, sellerId: null, firstSeen: "2026-11-23", lastSeen: "2026-11-23", ...over };
};
const newObs = (slug: string, role: PartObservation["role"], priceUsd: number, seller: string): PartObservation => ({ slug, role, label: slug, facts: {}, condition: "new", priceUsd, sellerId: seller, title: `${slug} ${seller}`, url: "https://example.invalid", image: null });

describe("el catálogo público", () => {
  const listings = [
    raw("PC Gamer Ryzen 5 5600 | RTX 4060 8GB | 8GB RAM 3600MHz | SSD 1TB NVMe", 950, "UYU"),
    raw("Tarjeta Gráfica - RTX 3060 12GB", 16000, "UYU"),
    raw("Gráfica RTX 3060 12GB poco uso", 15500, "UYU"),
    raw("RTX 3060 12gb impecable", 17000, "UYU"),
    raw("PC gamer", 20000, "UYU"),
    raw("Vendo Smart TV Enxuta 65”", 27000, "UYU"),
    raw("Pc gamer completa", 0, "UYU"),
    raw("Rtx 3090 24gb evga ftw3", 825, "UYU"),
    raw("Laptop dell", 1000, "UYU"),
    raw("Variedad de notebook. Muy buen estado", 123456, "UYU"),
    raw("Notebook LENOVO", 111111, "UYU"),
    raw("Memoria ram 16gb DDR4 Sodimm 3200Mhz", 2000, "UYU"),
  ];
  const details = new Map<string, FacebookComputerDetail>([
    [listings[4]!.sourceId, { id: listings[4]!.sourceId, readAt: "2026-11-23T00:00:00Z", found: true, description: "Procesador i5 10400f\nRTX 3060 12gb\n16gb ram ddr4\nSSD 480gb\nllamame al 099 123 456", attributes: { Condition: "used_good" }, createdAt: "2026-11-20T10:00:00.000Z", gone: false }],
  ]);
  const read = readListings(listings, details);
  const table = new Map(
    buildPartTable({
      newObservations: [
        ...["a", "b", "c"].map((seller, index) => newObs("cpu:ryzen-5-5600", "cpu", 180 + index * 10, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("gpu:rtx-4060", "gpu", 600 + index * 10, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("ram:ddr4:8", "ram", 110 + index, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("storage:nvme:1000", "storage", 250 + index, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("motherboard:socket-am4", "motherboard", 90 + index * 5, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("psu:650", "psu", 70 + index, seller)),
        ...["a", "b", "c"].map((seller, index) => newObs("case:basico", "case", 50 + index * 5, seller)),
      ],
      usedObservations: usedPartObservations(read, USD_UYU),
      previous: [],
      newOk: true,
      day: "2026-11-23",
      usage: usageOf(read),
    }).map((row) => [row.slug, row])
  );
  const rows = buildComputerCatalog({ read, table, notebookRefs: new Map(), usdUyu: USD_UYU });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));

  it("deja afuera lo que no es (un televisor) y lo que no tiene precio", () => {
    expect(bySlug.has(listings[5]!.slug)).toBe(false);
    expect(bySlug.has(listings[6]!.slug)).toBe(false);
  });

  it("nunca publica la descripción, el vendedor ni un teléfono", () => {
    const text = JSON.stringify(rows);
    expect(text).not.toContain("099 123 456");
    expect(text).not.toContain("llamame");
    for (const row of rows) {
      expect(row).not.toHaveProperty("description");
      expect(row).not.toHaveProperty("sellerId");
    }
  });

  it("la PC que sólo cierra en dólares se marca deducida y no tiene veredicto", () => {
    const pc = bySlug.get(listings[0]!.slug)!;
    expect(pc).toMatchObject({ currency: "USD", currencyInferred: true, priceUsd: 950, kind: "desktop" });
    expect(pc.valuation?.newTotalUsd).toBeGreaterThan(0);
    expect(pc.valuation?.verdict).toBeNull();
  });

  it("las piezas sueltas forman el precio usado y se comparan contra él", () => {
    const part = bySlug.get(listings[1]!.slug)!;
    expect(part).toMatchObject({ kind: "gpu", kindGroup: "part", gpuSlug: "gpu:rtx-3060" });
    expect(table.get("gpu:rtx-3060-12gb")?.used).toMatchObject({ n: 3, medianUsd: 400 });
    expect(part.valuation).toMatchObject({ reference: "used", verdict: "parejo" });
  });

  it("la ficha completa lo que el título no dice, y su fecha de publicación manda", () => {
    const pc = bySlug.get(listings[4]!.slug)!;
    expect(pc).toMatchObject({ detailRead: true, condition: "good", ramGb: 16, publishedAt: "2026-11-20T10:00:00.000Z" });
    expect(pc.cpu?.slug).toBe("cpu:i5-10400f");
  });

  it("en pesos chicos sin referencia: una pieza moderna no se publica, un aviso sin piezas sí", () => {
    // «$ 825» por una 3090 serían US$ 20: no se sabe si son pesos o dólares.
    expect(bySlug.has(listings[7]!.slug)).toBe(false);
    expect(bySlug.get(listings[8]!.slug)).toMatchObject({ kind: "notebook", currency: "UYU", currencyInferred: false });
  });

  it("los precios de relleno no entran", () => {
    expect(bySlug.has(listings[10]!.slug)).toBe(false);
  });

  it("una pieza usada sin mediana usada no tiene veredicto: contra la nueva es sólo un porcentaje", () => {
    const ram = bySlug.get(listings[11]!.slug);
    expect(ram?.kind).toBe("ram");
    expect(ram?.valuation?.verdict ?? null).toBeNull();
  });

  it("departamento desde la ubicación de Facebook", () => {
    expect(locationOf(raw("pc", 1, "UYU", { location: "Colonia Nicolich, Canelones, Uruguay" }))).toEqual({ department: "Canelones", city: "Colonia Nicolich" });
    expect(locationOf(raw("pc", 1, "UYU", { location: "Las Piedras, Uruguay" }))).toEqual({ department: "Canelones", city: "Las Piedras" });
    expect(locationOf(raw("pc", 1, "UYU", { location: "Montevideo, Uruguay" }))).toEqual({ department: "Montevideo", city: "Montevideo" });
  });
});
