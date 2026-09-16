import { describe, expect, it } from "vitest";
import { STORES } from "../../classes/stores/registry";
import { storeKeyForSeller } from "../../classes/stores/match";
import { STORE_DIRECTORY, storeSlugForSeller } from "../../app/utils/storeDirectory";

// app/ is a separate package (own build, own deploy) that cannot import from the repo root, so
// STORE_DIRECTORY is a hand-kept mirror of STORES. This test is the only thing keeping the two in
// sync: a store added on one side and forgotten on the other silently breaks seller-name linking
// on whichever side lags.

describe("STORE_DIRECTORY mirrors STORES", () => {
  it("has the same keys, in the same order", () => {
    expect(STORE_DIRECTORY.map((s) => s.key)).toEqual(STORES.map((s) => s.key));
  });

  it("agrees on name, domain, kind, rubros and aliases for every store", () => {
    expect(STORE_DIRECTORY.length).toBe(STORES.length);
    STORES.forEach((store, i) => {
      const mirror = STORE_DIRECTORY[i]!;
      expect(mirror.key).toBe(store.key);
      expect(mirror.name).toBe(store.name);
      expect(mirror.domain).toBe(store.domain);
      expect(mirror.kind).toBe(store.kind);
      expect(mirror.rubros).toEqual(store.rubros);
      expect(mirror.aliases).toEqual(store.aliases);
    });
  });
});

describe("storeSlugForSeller / storeKeyForSeller parity", () => {
  it("agree for every alias in the registry", () => {
    for (const store of STORES) {
      for (const alias of store.aliases) {
        expect(storeSlugForSeller(alias), `alias "${alias}" (${store.key})`).toBe(
          storeKeyForSeller(alias)
        );
      }
    }
  });

  it("both refuse the generic Mercado Libre seller label", () => {
    expect(storeSlugForSeller("Mercado Libre")).toBeNull();
    expect(storeKeyForSeller("Mercado Libre")).toBeNull();
  });

  it("both return null for an unknown seller", () => {
    expect(storeSlugForSeller("Vendedor desconocido")).toBeNull();
    expect(storeKeyForSeller("Vendedor desconocido")).toBeNull();
  });
});
