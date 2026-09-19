import { describe, expect, it } from "vitest";
import { rankStoresByRatio } from "../../classes/precios/present";

const entry = (storeId: number, ratio: number | null, over: Partial<any> = {}) => ({
  storeId,
  store: { name: `Local ${storeId}`, department: "Maldonado", chain: "Cadena", address: `Calle ${storeId}` },
  ratio,
  coverage: 0.8,
  qualified: true,
  ...over,
});

describe("rankStoresByRatio", () => {
  it("ordena todos los calificados del nivel más bajo al más alto", () => {
    const out = rankStoresByRatio([entry(1, 1.05), entry(2, 0.9), entry(3, 0.97)]);
    expect(out.map((s) => s.storeId)).toEqual([2, 3, 1]);
  });

  it("deja afuera al que no califica o no tiene ratio medible", () => {
    const out = rankStoresByRatio([
      entry(1, 0.9, { qualified: false }),
      entry(2, null),
      entry(3, Number.NaN),
      entry(4, 1),
    ]);
    expect(out.map((s) => s.storeId)).toEqual([4]);
  });

  it("empata por id, así dos corridas iguales publican el mismo orden", () => {
    const out = rankStoresByRatio([entry(9, 0.95), entry(3, 0.95)]);
    expect(out.map((s) => s.storeId)).toEqual([3, 9]);
  });

  it("trae departamento, cadena y dirección, y NO el total parcial", () => {
    const [store] = rankStoresByRatio([{ ...entry(5, 0.93), cost: 4200 } as any]);
    expect(store).toEqual({
      storeId: 5,
      storeName: "Local 5",
      department: "Maldonado",
      chain: "Cadena",
      address: "Calle 5",
      ratio: 0.93,
      coverage: 0.8,
    });
    expect((store as any).cost).toBeUndefined();
  });

  it("un local sin ficha en el catálogo sale con textos vacíos, no con undefined", () => {
    const [store] = rankStoresByRatio([{ storeId: 7, ratio: 0.9, coverage: 0.75, qualified: true }]);
    expect(store.storeName).toBe("");
    expect(store.department).toBe("");
  });
});
