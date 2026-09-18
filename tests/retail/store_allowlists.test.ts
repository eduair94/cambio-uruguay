import { describe, expect, it } from "vitest";
import { CHAIR_STORE_KEYS } from "../../classes/chairs/sources/registry";
import { EQUIPAR_STORE_KEYS } from "../../classes/equipar/budget";
import { PHONE_STORE_KEYS } from "../../classes/phones/spec";
import { RETAIL_STORES } from "../../classes/retail/stores";

/**
 * `retailStores()` with no keys returns every ENABLED store in the shared registry. That was fine
 * while the registry only held furniture/appliance sellers for chairs and equipar; the moment
 * phone-only stores joined it (2026-09-17), any consumer still calling `retailStores()` bare would
 * silently start reading stores it has no spec that could ever accept, for nothing. These tests
 * hold the fix: every consumer reads its OWN explicit allowlist, and a store added for one category
 * never lands in another's by omission.
 */
describe("asignación de tiendas por consumidor", () => {
  const byKey = new Set(RETAIL_STORES.map((store) => store.key));

  const PHONE_ONLY_KEYS = ["claro", "zonatecno", "nstore", "zonalaptop", "market", "digitalworld"];

  it("las tiendas exclusivas de celulares no están en la lista de sillas ni en la de equipar", () => {
    for (const key of PHONE_ONLY_KEYS) {
      expect(CHAIR_STORE_KEYS, key).not.toContain(key);
      expect(EQUIPAR_STORE_KEYS, key).not.toContain(key);
    }
  });

  it("toda clave de CHAIR_STORE_KEYS existe en RETAIL_STORES", () => {
    for (const key of CHAIR_STORE_KEYS) expect(byKey.has(key), key).toBe(true);
  });

  it("toda clave de EQUIPAR_STORE_KEYS existe en RETAIL_STORES", () => {
    for (const key of EQUIPAR_STORE_KEYS) expect(byKey.has(key), key).toBe(true);
  });

  it("CHAIR_STORE_KEYS es exactamente el conjunto de 16 tiendas previo a celulares", () => {
    const preBranchKeys = [
      "bertoni",
      "divino",
      "electroventas",
      "lacuevamuebles",
      "clemur",
      "soysantander",
      "dimm",
      "armo",
      "grassi",
      "covercompany",
      "americanmesh",
      "prontometal",
      "puntounion",
      "tyt",
      "ufficio",
      "eldorado",
    ];
    expect([...CHAIR_STORE_KEYS].sort()).toEqual([...preBranchKeys].sort());
  });

  it("EQUIPAR_STORE_KEYS es el mismo conjunto de sillas más magiccenter", () => {
    expect([...EQUIPAR_STORE_KEYS].sort()).toEqual([...CHAIR_STORE_KEYS, "magiccenter"].sort());
  });

  it("PHONE_STORE_KEYS no repite claves y todas existen en RETAIL_STORES", () => {
    expect(new Set(PHONE_STORE_KEYS).size).toBe(PHONE_STORE_KEYS.length);
    for (const key of PHONE_STORE_KEYS) expect(byKey.has(key), key).toBe(true);
  });
});
