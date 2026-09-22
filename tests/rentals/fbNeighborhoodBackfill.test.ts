import { describe, expect, it } from "vitest";
import { planFbNeighborhood } from "../../scripts/oneoff/backfill_rental_fb_neighborhoods";

const fb = (title: string, identity: Record<string, unknown> = {}) => ({
  _id: "x", key: "k", offers: [{ source: "facebook", listingId: "facebook:1", title, identity: { version: 1, department: "Montevideo", neighborhood: "", ...identity } }],
});

describe("planFbNeighborhood", () => {
  it("fills only the empty barrio of a single Marketplace advert, from its own title", () => {
    expect(planFbNeighborhood(fb("Alquiler de Apartamento en Buceo ( 1 Dormitorio)")).row?.set)
      .toEqual({ "offers.0.identity.neighborhood": "Buceo", neighborhood: "Buceo" });
    expect(planFbNeighborhood(fb("Alquiler apartamento 2 dormitorios")).skip).toBe("title_names_nothing");
    expect(planFbNeighborhood(fb("Alquiler en Buceo", { neighborhood: "Pocitos" })).skip).toBe("already_named");
  });

  it("names the department only when the advert had none and the locality is unique", () => {
    expect(planFbNeighborhood(fb("Alquiler anual casa en Piriápolis", { department: "" })).row?.set).toEqual({
      "offers.0.identity.neighborhood": "Piriápolis", neighborhood: "Piriápolis",
      "offers.0.identity.department": "Maldonado", department: "Maldonado",
    });
    expect(planFbNeighborhood(fb("Alquiler en Bella Vista", { department: "" })).skip).toBe("title_names_nothing");
  });

  it("never touches a merged property, another portal or a legacy advert without identity", () => {
    const merged = { ...fb("Alquiler en Buceo"), offers: [fb("Alquiler en Buceo").offers[0], { source: "mercadolibre", listingId: "mercadolibre:2", title: "x", identity: { version: 1 } }] };
    expect(planFbNeighborhood(merged).skip).toBe("not_single_advert");
    expect(planFbNeighborhood({ ...fb("Alquiler en Buceo"), offers: [{ ...fb("Alquiler en Buceo").offers[0], source: "infocasas" }] }).skip).toBe("not_facebook");
    expect(planFbNeighborhood({ ...fb("Alquiler en Buceo"), offers: [{ ...fb("Alquiler en Buceo").offers[0], identity: undefined }] }).skip).toBe("no_identity");
  });
});
