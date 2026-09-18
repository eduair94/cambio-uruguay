import { describe, expect, it } from "vitest";
import { STORES, STORE_BY_KEY, storeNorm } from "../../classes/stores/registry";
import { storeKeyForSeller } from "../../classes/stores/match";

// The registry is curated, not scraped: a Mercado Libre seller name alone never identifies a real
// company (see storeKeyForSeller tests below), and several storefront brand names are common
// Spanish/Portuguese words (`divino`, `tata`, `armo`, `grassi`, `cosmos`, `claro`...) that collide
// constantly with unrelated Reddit chatter. Every assertion here guards that curation.

describe("STORES shape", () => {
  it("has unique keys matching ^[a-z0-9][a-z0-9-]{1,60}$", () => {
    const seen = new Set<string>();
    for (const store of STORES) {
      expect(store.key).toMatch(/^[a-z0-9][a-z0-9-]{1,60}$/);
      expect(seen.has(store.key), `duplicate key: ${store.key}`).toBe(false);
      seen.add(store.key);
    }
    expect(STORES.length).toBeGreaterThan(10); // vacuity guard
  });

  it("indexes every store in STORE_BY_KEY", () => {
    expect(STORE_BY_KEY.size).toBe(STORES.length);
    for (const store of STORES) {
      expect(STORE_BY_KEY.get(store.key)).toBe(store);
    }
  });

  it("includes name in every store's aliases", () => {
    for (const store of STORES) {
      expect(store.aliases, `${store.key} aliases missing its own name`).toContain(store.name);
    }
  });

  it("never repeats a normalized alias across two different stores", () => {
    const ownerByNorm = new Map<string, string>();
    for (const store of STORES) {
      for (const alias of store.aliases) {
        const norm = storeNorm(alias);
        const owner = ownerByNorm.get(norm);
        if (owner) {
          expect(owner, `alias "${alias}" (${norm}) claimed by both ${owner} and ${store.key}`).toBe(
            store.key
          );
        } else {
          ownerByNorm.set(norm, store.key);
        }
      }
    }
  });

  it("gives every tienda-uy a domain", () => {
    for (const store of STORES) {
      if (store.kind === "tienda-uy") {
        expect(store.domain, `${store.key} is tienda-uy without a domain`).toEqual(expect.any(String));
      }
    }
  });

  it("gives a redditMatch to every store queried on Reddit under a common single-word name", () => {
    // These are illustrative common words; not all of them are an actual store `name` in this
    // registry (e.g. no store is literally named "market" or "claro" — those risks are instead
    // handled by leaving `redditTerms` empty for that store). Only assert where it actually applies.
    const COMMON_WORDS = ["divino", "claro", "market", "cosmos", "fama", "armo", "tata", "grassi"];
    for (const store of STORES) {
      if (COMMON_WORDS.includes(storeNorm(store.name)) && store.redditTerms.length > 0) {
        expect(store.redditMatch, `${store.key} queries Reddit under a common word without a redditMatch`).toBeDefined();
      }
    }
  });
});

describe("storeKeyForSeller", () => {
  it("resolves a seller display name via its alias index", () => {
    expect(storeKeyForSeller("TuShopuy")).toBe("tushop");
    expect(storeKeyForSeller("Estación hogar")).toBe("estacion-hogar");
    expect(storeKeyForSeller("Punto Union")).toBe("punto-union");
  });

  it("resolves via retailStoreKey when the seller name alone doesn't decide it", () => {
    expect(storeKeyForSeller("tyt", "tyt")).toBe("tyt");
  });

  it("never treats a generic Mercado Libre seller label as the Mercado Libre store", () => {
    expect(storeKeyForSeller("Mercado Libre")).toBeNull();
  });

  it("returns null for a seller that matches nothing in the registry", () => {
    expect(storeKeyForSeller("Vendedor desconocido")).toBeNull();
  });

  // Movilidad eléctrica (classes/movilidad/registry.ts): the four stores classes/retail/stores.ts
  // added for monopatines/bicicletas eléctricas resolve from the EXACT `name` those adapters publish
  // as `sellerName` (`store.name`, see classes/retail/sources/{woocommerce,shopify}.ts) — not from
  // the retail `key`, which for three of the four differs from the curated key only in that they
  // happen to be spelled the same (`delcar`, `superbikers`, `voltbike`) and for the fourth does not
  // (`loopbikes` retail key vs. `Loop` seller name / `loopbikes` curated key).
  it("resolves the four movilidad stores from their real retail seller name", () => {
    expect(storeKeyForSeller("Delcar Motos")).toBe("delcar");
    expect(storeKeyForSeller("Super Bikers")).toBe("superbikers");
    expect(storeKeyForSeller("Voltbike")).toBe("voltbike");
    expect(storeKeyForSeller("Loop")).toBe("loopbikes");
  });

  // Already curated before this round (Task 2's registry only added the RETAIL entry); confirming
  // it still resolves is the controller's item 3 — it does, via the existing `cover-company` alias.
  it("cover-company already resolves from the retail seller name it publishes", () => {
    expect(storeKeyForSeller("Cover Company")).toBe("cover-company");
  });
});

describe("storeNorm", () => {
  it("lowercases, strips accents and collapses non-alphanumerics to single spaces", () => {
    expect(storeNorm("Estación Hogar")).toBe("estacion hogar");
    expect(storeNorm("Ta-Ta")).toBe("ta ta");
    expect(storeNorm("  TYT  ")).toBe("tyt");
    expect(storeNorm("Géant")).toBe("geant");
  });
});

// Each store with a hand-written `redditMatch` gets its own positive/negative case here, run
// against text already run through `storeNorm` — the shape the Reddit filter actually feeds it.
describe("redditMatch disambiguators", () => {
  const norm = (s: string) => storeNorm(s);

  it("divino: matches an actual store mention, not the adjective", () => {
    const divino = STORE_BY_KEY.get("divino")!;
    expect(divino.redditMatch!.test(norm("Compré en Divino la semana pasada"))).toBe(true);
    expect(divino.redditMatch!.test(norm("Divino tienda de muebles"))).toBe(true);
    expect(divino.redditMatch!.test(norm("Que vestido tan divino"))).toBe(false);
  });

  it("el-dorado: matches the store, not the legendary city", () => {
    const elDorado = STORE_BY_KEY.get("el-dorado")!;
    expect(elDorado.redditMatch!.test(norm("Fui al super El Dorado a comprar"))).toBe(true);
    expect(elDorado.redditMatch!.test(norm("Vi El Dorado tienda de electrodomésticos")))
      .toBe(true);
    expect(elDorado.redditMatch!.test(norm("El Dorado de la leyenda"))).toBe(false);
  });

  it("loi: matches the store, not an unrelated mention", () => {
    const loi = STORE_BY_KEY.get("loi")!;
    expect(loi.redditMatch!.test(norm("Fui a LOi ayer"))).toBe(true);
    expect(loi.redditMatch!.test(norm("LOi tiene envío a domicilio"))).toBe(true);
    expect(loi.redditMatch!.test(norm("Hoy vi una película sobre LOI"))).toBe(false);
  });

  it("tata: matches the supermarket, not the family word", () => {
    const tata = STORE_BY_KEY.get("tata")!;
    expect(tata.redditMatch!.test(norm("Fui al Ta-Ta a comprar"))).toBe(true);
    expect(tata.redditMatch!.test(norm("TaTa tiene pedidos online"))).toBe(true);
    expect(tata.redditMatch!.test(norm("Mi tata me regaló un juguete"))).toBe(false);
  });

  // Fix round F1, item 4: five terms the final review flagged as an everyday word/name/genre with
  // no guard, plus one found sweeping the rest of the registry for the same categories.

  it("dimm: matches the store, not the RAM module jargon", () => {
    const dimm = STORE_BY_KEY.get("dimm")!;
    expect(dimm.redditMatch!.test(norm("Compré en DIMM una notebook"))).toBe(true);
    expect(dimm.redditMatch!.test(norm("Fui a DIMM a comprar una pc"))).toBe(true);
    expect(dimm.redditMatch!.test(norm("Necesito un dimm de 16gb ddr4 para mi pc"))).toBe(false);
  });

  it("tech-house: matches the store, not the music genre", () => {
    const techHouse = STORE_BY_KEY.get("tech-house")!;
    expect(techHouse.redditMatch!.test(norm("Compré un cargador en Tech House ayer"))).toBe(true);
    // Fix round F2, item A: the reviewer's own probe-validated phrasing (fixprobe.js) — the previous
    // phrasing here ("Tech House tiene buenos precios en notebooks") only ever passed because of the
    // bug this fix removes (an unbounded "(en|de|a) tech house" branch); the corrected regex needs
    // an actual commerce word adjacent to the term, so the sentence spells one out explicitly.
    expect(techHouse.redditMatch!.test(norm("Tech House tiene buenos precios, compré ahi"))).toBe(true);
    expect(techHouse.redditMatch!.test(norm("Me gusta el tech house y el techno"))).toBe(false);
  });

  // Fix round F2, item A: "la-tentacion" no longer carries a `redditMatch` at all — see the
  // registry's own comment on that entry. The reviewer-probed commerce-context regex still matched
  // this idiom's own normal grammar ("sentí la tentación de comprar un auto nuevo" — the idiom's
  // MOST common construction is literally "la tentación de comprar <algo>"), and tightening it
  // enough to exclude that construction dropped real store mentions in the same probe ("Vi ofertas
  // en La Tentación"). `mentionMatches` (tests/stores/reddit.test.ts) covers the resulting
  // `redditTerms: []` behaviour: this store is never queried on Reddit, full stop.

  it("carlos-gutierrez: matches the store, not the common person name", () => {
    const carlosGutierrez = STORE_BY_KEY.get("carlos-gutierrez")!;
    expect(carlosGutierrez.redditMatch!.test(norm("Compré la heladera en Carlos Gutiérrez"))).toBe(true);
    expect(carlosGutierrez.redditMatch!.test(norm("Carlos Gutiérrez fue el ministro que dijo eso"))).toBe(false);
  });

  it("caribe-sur-store: matches the store, not the everyday geography phrase", () => {
    const caribeSur = STORE_BY_KEY.get("caribe-sur-store")!;
    expect(caribeSur.redditMatch!.test(norm("Compré un celular en Caribe Sur"))).toBe(true);
    expect(caribeSur.redditMatch!.test(norm("Viaje al caribe sur"))).toBe(false);
  });

  it("mercado-libre: matches the marketplace, not the economic term for 'free market'", () => {
    const mercadoLibre = STORE_BY_KEY.get("mercado-libre")!;
    expect(mercadoLibre.redditMatch!.test(norm("Compré en mercadolibre ayer"))).toBe(true);
    expect(mercadoLibre.redditMatch!.test(norm("Vendí mi bici en Mercado Libre"))).toBe(true);
    expect(
      mercadoLibre.redditMatch!.test(
        norm("En un mercado libre los precios los pone la oferta y la demanda")
      )
    ).toBe(false);
  });
});
