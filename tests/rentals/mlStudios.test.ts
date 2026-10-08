import { describe, expect, it } from "vitest";
import { studioFromTitle, toRawRental } from "../../classes/rentals/sources/mercadolibre";

// ML's attribute strip prints "2 dormitorios" but leaves out "0 dormitorios": on 2026-10-08, 1.740 of
// the 2.271 ML homes without bedrooms said "monoambiente" in the title, and the directory's
// "Monoambiente" filter (bedrooms = 0) found none of them.
const card = (title: string, texts: string[] = [], category_id = "MLU1473", domain_id = "MLU-APARTMENTS_FOR_RENT") => ({
  metadata: {
    id: "MLU701446219",
    category_id,
    domain_id,
    url_params: new URLSearchParams({ permalink: "https://apartamento.mercadolibre.com.uy/MLU-701446219-monoambiente", title }).toString(),
  },
  components: [
    { type: "price", price: { current_price: { value: 14_000, currency: "UYU" } } },
    { type: "attributes_list", attributes_list: { texts } },
  ],
});

describe("a Mercado Libre studio has zero bedrooms", () => {
  it("reads the zero from a dwelling's title when the strip says nothing", () => {
    expect(toRawRental(card("Alquiler Monoambiente Por Escalera En La Comercial", ["1 baño", "28 m² cubiertos"]))?.bedrooms).toBe(0);
    expect(toRawRental(card("Mono Ambiente Al Frente En Cordón"))?.bedrooms).toBe(0);
  });

  it("never overrides what the strip states", () => {
    expect(toRawRental(card("Monoambiente Amplio Convertible", ["1 dormitorio", "1 baño"]))?.bedrooms).toBe(1);
  });

  it("leaves an advert of several units, or one that is not a home, without bedrooms", () => {
    expect(studioFromTitle("Monoambientes Y Apartamentos De 1 Dormitorio En Pocitos")).toBe(false);
    expect(toRawRental(card("Alquiler Apartamento En Pocitos Nuevo"))?.bedrooms).toBeNull();
    expect(toRawRental(card("Local Ideal Monoambiente Comercial", [], "MLU1482", "MLU-RETAIL_SPACE_FOR_RENT"))?.bedrooms).toBeNull();
  });
});
