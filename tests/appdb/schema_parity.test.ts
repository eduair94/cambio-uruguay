import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { PricePredictionModel } from "../../classes/models/PricePrediction";
import { MoveExplanationModel } from "../../classes/models/MoveExplanation";

const appModel = (name: string): string =>
  fs.readFileSync(path.join(__dirname, "..", "..", "app", "server", "models", `${name}.ts`), "utf8");

/** Top-level field names declared in the app's `new Schema<...>({ ... })` block. */
function appFields(src: string): string[] {
  const body = /new Schema<[^>]+>\(\s*\{([\s\S]*?)\n  \},/.exec(src)?.[1] ?? "";
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

  it("writes the collections the app already reads — not mongoose's guess", () => {
    expect(PricePredictionModel.collection.name).toBe("pricepredictions");
    expect(MoveExplanationModel.collection.name).toBe("moveexplanations");
  });
});
