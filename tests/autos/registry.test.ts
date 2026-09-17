import { describe, expect, it } from "vitest";
import { CAR_SOURCES, CAR_SOURCE_LIST, carKeyFor, safeSourcePermalink, safeSourcePicture } from "../../classes/autos/sources/registry";

describe("car source registry", () => {
  it("builds keys with one prefix per source", () => {
    expect(carKeyFor("mercadolibre", "MLU1")).toBe("ml-MLU1");
    expect(carKeyFor("facebook", "1268374875382121")).toBe("fb-1268374875382121");
    expect(carKeyFor("shoppingdeautos", "153528")).toBe("sda-153528");
    expect(new Set(CAR_SOURCE_LIST.map(source => CAR_SOURCES[source].prefix)).size).toBe(CAR_SOURCE_LIST.length);
  });

  it("accepts only each source's own permalinks", () => {
    expect(safeSourcePermalink("facebook", "https://www.facebook.com/marketplace/item/1268374875382121/")).not.toBeNull();
    expect(safeSourcePermalink("facebook", "https://www.facebook.com/profile.php?id=1")).toBeNull();
    expect(safeSourcePermalink("clasiautos", "https://clasiautos.uy/avisos/toyota-corolla/")).not.toBeNull();
    expect(safeSourcePermalink("clasiautos", "https://auto.mercadolibre.com.uy/MLU-1")).toBeNull();
    expect(safeSourcePermalink("carone", "https://carone.com.uy/chevrolet-nuevo-onix-10-joy-mt-sku4-717444")).not.toBeNull();
    expect(safeSourcePermalink("carone", "http://carone.com.uy/x")).toBeNull();
  });

  it("accepts only each source's picture hosts over https without credentials", () => {
    expect(safeSourcePicture("facebook", "https://scontent-yyz1-1.xx.fbcdn.net/v/t39/x.jpg?stp=1")).not.toBeNull();
    expect(safeSourcePicture("facebook", "https://evil.example/x.jpg")).toBeNull();
    expect(safeSourcePicture("fidocar", "https://f.fcdn.app/imgs/x.jpg")).not.toBeNull();
    expect(safeSourcePicture("carone", "https://cdn.impel.io/swipetospin-viewers/carone/1/thumb-lg.jpg")).not.toBeNull();
    expect(safeSourcePicture("mercadolibre", "https://user:pw@http2.mlstatic.com/D_1.webp")).toBeNull();
    expect(safeSourcePicture("julio", null)).toBeNull();
  });
});
