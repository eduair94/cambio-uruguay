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
  });
});
