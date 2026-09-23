import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { PricePredictionModel } from "../../classes/models/PricePrediction";
import { MoveExplanationModel } from "../../classes/models/MoveExplanation";
import { ChairTierSnapshotModel } from "../../classes/models/ChairTierSnapshot";
import { ChairCatalogProductModel } from "../../classes/models/ChairCatalogProduct";
import { ChairCatalogMetaModel } from "../../classes/models/ChairCatalogMeta";
import { SiteAnalyticsSnapshotModel } from "../../classes/models/SiteAnalyticsSnapshot";
import { RedditBotStatsModel } from "../../classes/models/RedditBotStats";
import { RentalListingModel } from "../../classes/models/RentalListing";
import { RentalMetaModel } from "../../classes/models/RentalMeta";
import { PropertyOpportunitySnapshotModel } from "../../classes/models/PropertyOpportunitySnapshot";
import { SearchConsoleSnapshotModel } from "../../classes/models/SearchConsoleSnapshot";
import { SiteRevenueSnapshotModel } from "../../classes/models/SiteRevenueSnapshot";
import { SearchDemandQueueModel } from "../../classes/models/SearchDemandQueue";
import { RevenuePlanSnapshotModel } from "../../classes/models/RevenuePlanSnapshot";
import { EquiparItemModel } from "../../classes/models/EquiparItem";
import { EquiparMetaModel } from "../../classes/models/EquiparMeta";
import { EquiparListingModel } from "../../classes/models/EquiparListing";
import { MovilidadItemModel } from "../../classes/models/MovilidadItem";
import { MovilidadMetaModel } from "../../classes/models/MovilidadMeta";
import { MovilidadListingModel } from "../../classes/models/MovilidadListing";
import { CharruaTextModel } from "../../classes/models/CharruaText";
import { CharruaSnapshotModel } from "../../classes/models/CharruaSnapshot";
import { CarCatalogMetaModel } from "../../classes/models/CarCatalogMeta";
import { CarMarketSnapshotModel } from "../../classes/models/CarMarketSnapshot";
import { CarOpportunitySnapshotModel } from "../../classes/models/CarOpportunitySnapshot";
import { StoreProfileModel } from "../../classes/models/StoreProfile";
import { PriceEventSnapshotModel } from "../../classes/models/PriceEventSnapshot";
import { PhoneModelModel } from "../../classes/models/PhoneModel";
import { PhoneMetaModel } from "../../classes/models/PhoneMeta";
import { PriceChangeSnapshotModel } from "../../classes/models/PriceChangeSnapshot";
import { SeoIndexAllowlistModel } from "../../classes/models/SeoIndexAllowlist";

const appModel = (name: string): string =>
  fs.readFileSync(path.join(__dirname, "..", "..", "app", "server", "models", `${name}.ts`), "utf8");

/** Top-level field names declared in the app's `new Schema<...>({ ... })` block. */
function appFields(src: string): string[] {
  const body = /new Schema(?:<[^>]+>)?\(\s*\{([\s\S]*?)\n  \},/.exec(src)?.[1] ?? "";
  return [...body.matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]!);
}

describe("app-Mongo schema parity", () => {
  // These two collections are an ARCHIVE. A field the backend forgets is a field the app stops
  // seeing on every row written from today on — and there is no way to recompute it later.
  it("PriceChangeSnapshot declares exactly the app's top-level fields", () => {
    // La foto de /cambios-de-precio-uruguay. Un campo que el backend escriba y el app no declare se
    // guarda igual pero no llega nunca a la pantalla, y la página queda diciendo menos de lo que sabe.
    expect(Object.keys(PriceChangeSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("PriceChangeSnapshot")).sort()
    );
    expect(PriceChangeSnapshotModel.collection.name).toBe("pricechangesnapshots");
  });

  it("PricePrediction declares exactly the app's top-level fields", () => {
    expect(Object.keys(PricePredictionModel.schema.obj).sort()).toEqual(appFields(appModel("PricePrediction")).sort());
  });

  it("MoveExplanation declares exactly the app's top-level fields", () => {
    expect(Object.keys(MoveExplanationModel.schema.obj).sort()).toEqual(appFields(appModel("MoveExplanation")).sort());
  });

  it("ChairTierSnapshot declares exactly the app's top-level fields", () => {
    expect(Object.keys(ChairTierSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("ChairTierSnapshot")).sort()
    );
  });

  it("ChairCatalogProduct declares exactly the app's top-level fields", () => {
    expect(Object.keys(ChairCatalogProductModel.schema.obj).sort()).toEqual(
      appFields(appModel("ChairCatalogProduct")).sort()
    );
  });

  it("ChairCatalogMeta declares exactly the app's top-level fields", () => {
    expect(Object.keys(ChairCatalogMetaModel.schema.obj).sort()).toEqual(
      appFields(appModel("ChairCatalogMeta")).sort()
    );
  });

  it("SiteAnalyticsSnapshot declares exactly the app's top-level fields", () => {
    expect(Object.keys(SiteAnalyticsSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("SiteAnalyticsSnapshot")).sort()
    );
  });

  it("RedditBotStats declares exactly the app's top-level fields", () => {
    // La foto pública del bot de Reddit. Un campo que el backend deja de escribir es una sección de
    // /estadisticas-reddit que se vacía en silencio, y —peor— es histórico que no se puede
    // recalcular después si el ledger ya se limpió.
    expect(Object.keys(RedditBotStatsModel.schema.obj).sort()).toEqual(
      appFields(appModel("RedditBotStats")).sort()
    );
  });

  it("RentalListing declares exactly the app's top-level fields", () => {
    // El directorio de alquileres: un campo que el backend deja de escribir es una columna que
    // /alquileres-uruguay deja de filtrar, y el filtro no falla — devuelve cero resultados, que es
    // indistinguible de "no hay nada en ese barrio".
    expect(Object.keys(RentalListingModel.schema.obj).sort()).toEqual(appFields(appModel("RentalListing")).sort());
  });

  it("RentalMeta declares exactly the app's top-level fields", () => {
    expect(Object.keys(RentalMetaModel.schema.obj).sort()).toEqual(appFields(appModel("RentalMeta")).sort());
  });

  it("PropertyOpportunitySnapshot declares exactly the app's public snapshot fields", () => {
    expect(Object.keys(PropertyOpportunitySnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("PropertyOpportunitySnapshot")).sort()
    );
    expect(PropertyOpportunitySnapshotModel.collection.name).toBe("propertyopportunitysnapshots");
  });

  it("SearchConsoleSnapshot declares exactly the app's top-level fields", () => {
    // El panel privado de Search Console: un campo que el backend agregue y el app no declare se
    // guarda igual pero no llega nunca a la pantalla, y la oportunidad que describe no existe para
    // quien la tiene que trabajar.
    expect(Object.keys(SearchConsoleSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("SearchConsoleSnapshot")).sort()
    );
  });

  it("SearchDemandQueue declares exactly the app's top-level fields", () => {
    // La cola de qué escribir. Un campo que el backend agregue y el app no declare se guarda pero
    // no llega a la pantalla, y esta cola sólo existe para que alguien la lea.
    expect(Object.keys(SearchDemandQueueModel.schema.obj).sort()).toEqual(
      appFields(appModel("SearchDemandQueue")).sort()
    );
  });

  it("RevenuePlanSnapshot declares exactly the app's top-level fields", () => {
    // El plan de ingreso. Mismo riesgo que sus dos vecinos y uno propio: si el app no declara
    // `families`, la tabla que dice qué familia consume tráfico sin pagarlo se renderiza vacía y
    // parece que no hay brecha.
    expect(Object.keys(RevenuePlanSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("RevenuePlanSnapshot")).sort()
    );
  });

  it("SiteRevenueSnapshot declares exactly the app's top-level fields", () => {
    expect(Object.keys(SiteRevenueSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("SiteRevenueSnapshot")).sort()
    );
  });

  it("EquiparItem declares exactly the app's top-level fields", () => {
    expect(Object.keys(EquiparItemModel.schema.obj).sort()).toEqual(appFields(appModel("EquiparItem")).sort());
  });

  it("EquiparMeta declares exactly the app's top-level fields", () => {
    expect(Object.keys(EquiparMetaModel.schema.obj).sort()).toEqual(appFields(appModel("EquiparMeta")).sort());
  });

  it("MovilidadItem declares exactly the app's top-level fields", () => {
    // El directorio de monopatines/bicicletas eléctricas comparte forma con EquiparItem
    // (buildEquiparCatalog produce EquiparItem sea cual sea el registro inyectado), pero vive en su
    // propia colección — un campo que el backend agregue y el app no declare no llega a la ficha.
    expect(Object.keys(MovilidadItemModel.schema.obj).sort()).toEqual(appFields(appModel("MovilidadItem")).sort());
    expect(MovilidadItemModel.collection.name).toBe("movilidaditems");
  });

  it("MovilidadMeta declares exactly the app's top-level fields", () => {
    expect(Object.keys(MovilidadMetaModel.schema.obj).sort()).toEqual(appFields(appModel("MovilidadMeta")).sort());
    expect(MovilidadMetaModel.collection.name).toBe("movilidadmeta");
  });

  it("MovilidadListing declares exactly the app's top-level fields", () => {
    // Una fila por aviso del directorio con filtros de monopatines/bicicletas. Un campo que el
    // backend escriba y el app no declare es un filtro o una tarjeta que se queda sin ese dato.
    expect(Object.keys(MovilidadListingModel.schema.obj).sort()).toEqual(
      appFields(appModel("MovilidadListing")).sort()
    );
    expect(MovilidadListingModel.collection.name).toBe("movilidadlistings");
  });

  it("CharruaText declares exactly the app's top-level fields", () => {
    // El corpus del buscador de /mercado-it-uruguay: un campo que el backend escribe y el app no
    // declara es un filtro que devuelve cero resultados sin avisar.
    expect(Object.keys(CharruaTextModel.schema.obj).sort()).toEqual(appFields(appModel("CharruaText")).sort());
    expect(CharruaTextModel.collection.name).toBe("charruadevstexts");
  });

  it("CharruaSnapshot declares exactly the app's top-level fields", () => {
    expect(Object.keys(CharruaSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("CharruaSnapshot")).sort()
    );
    expect(CharruaSnapshotModel.collection.name).toBe("charruadevssnapshots");
  });

  it("PhoneModel declares exactly the app's top-level fields", () => {
    // El directorio de celulares: un campo que el backend escribe y el app no declara es un dato que
    // la ficha nunca muestra, sin error — y `ambiguousConditions`/`ambiguousDropped` son justo el
    // campo que decide si una página se publica (ver classes/phones/catalog.ts).
    expect(Object.keys(PhoneModelModel.schema.obj).sort()).toEqual(appFields(appModel("PhoneModel")).sort());
    expect(PhoneModelModel.collection.name).toBe("phonemodels");
  });

  it("PhoneMeta declares exactly the app's top-level fields", () => {
    expect(Object.keys(PhoneMetaModel.schema.obj).sort()).toEqual(appFields(appModel("PhoneMeta")).sort());
    expect(PhoneMetaModel.collection.name).toBe("phonemeta");
  });

  it("the used-car public models declare exactly the app's fields", () => {
    // El directorio de autos: un campo que el backend escribe y el app no declara es un dato que la
    // página nunca muestra, sin error.
    expect(Object.keys(CarCatalogMetaModel.schema.obj).sort()).toEqual(appFields(appModel("CarCatalogMeta")).sort());
    expect(Object.keys(CarMarketSnapshotModel.schema.obj).sort()).toEqual(appFields(appModel("CarMarketSnapshot")).sort());
    expect(Object.keys(CarOpportunitySnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("CarOpportunitySnapshot")).sort()
    );
    expect(CarCatalogMetaModel.collection.name).toBe("carcatalogmetas");
    expect(CarMarketSnapshotModel.collection.name).toBe("carmarketsnapshots");
    expect(CarOpportunitySnapshotModel.collection.name).toBe("caropportunitysnapshots");
  });

  it("StoreProfile declares exactly the app's top-level fields", () => {
    // Las fichas de /tiendas-online-uruguay: una señal que el backend guarda y el app no declara es
    // un bloque de la ficha que desaparece sin error, y la ficha pasa a decir menos de lo que sabemos.
    expect(Object.keys(StoreProfileModel.schema.obj).sort()).toEqual(appFields(appModel("StoreProfile")).sort());
  });
  it("PriceEventSnapshot declares exactly the app's top-level fields", () => {
    // El snapshot de CyberLunes/Black Friday: un campo que el backend deja de escribir es una
    // columna que /ciberlunes-y-black-friday-uruguay deja de mostrar, sin error visible.
    expect(Object.keys(PriceEventSnapshotModel.schema.obj).sort()).toEqual(
      appFields(appModel("PriceEventSnapshot")).sort()
    );
    expect(PriceEventSnapshotModel.collection.name).toBe("priceeventsnapshots");
  });

  it("writes the collections the app already reads — not mongoose's guess", () => {
    expect(PricePredictionModel.collection.name).toBe("pricepredictions");
    expect(MoveExplanationModel.collection.name).toBe("moveexplanations");
    expect(ChairTierSnapshotModel.collection.name).toBe("chairtiersnapshots");
    expect(ChairCatalogProductModel.collection.name).toBe("chaircatalogproducts");
    expect(ChairCatalogMetaModel.collection.name).toBe("chaircatalogmeta");
    expect(RedditBotStatsModel.collection.name).toBe("redditbotstats");
    expect(SiteAnalyticsSnapshotModel.collection.name).toBe("siteanalyticssnapshots");
    expect(RentalListingModel.collection.name).toBe("rentallistings");
    expect(RentalMetaModel.collection.name).toBe("rentalmetas");
    expect(SearchConsoleSnapshotModel.collection.name).toBe("searchconsolesnapshots");
    expect(SiteRevenueSnapshotModel.collection.name).toBe("siterevenuesnapshots");
    expect(EquiparItemModel.collection.name).toBe("equiparitems");
    expect(EquiparMetaModel.collection.name).toBe("equiparmeta");
    expect(StoreProfileModel.collection.name).toBe("storeprofiles");
    expect(PhoneModelModel.collection.name).toBe("phonemodels");
    expect(PhoneMetaModel.collection.name).toBe("phonemeta");
  });
  it("EquiparListing declares exactly the app's top-level fields", () => {
    // Una fila por aviso para /equipar-casa-uruguay/productos. Un campo que el backend deja de
    // escribir es un filtro del directorio que se vacía en silencio.
    expect(Object.keys(EquiparListingModel.schema.obj).sort()).toEqual(
      appFields(appModel("EquiparListing")).sort()
    );
  });


  it("SeoIndexAllowlist declares exactly the app's top-level fields", () => {
    // La lista blanca de indexación de las fichas de alquiler: un campo que el backend escriba y el
    // app no declare nunca llega al lector, y acá el lector decide qué se desindexa.
    expect(Object.keys(SeoIndexAllowlistModel.schema.obj).sort()).toEqual(
      appFields(appModel("SeoIndexAllowlist")).sort()
    );
    expect(SeoIndexAllowlistModel.collection.name).toBe("seoindexallowlists");
  });
});
