// What the chair directory asks the shared retail harvester for.
//
// This file is the whole of "silla" as far as the plumbing is concerned. Everything else in
// `classes/retail` is category-blind, which is why the household directory could be added without
// touching a single adapter.
import { chairCategory, isDeskChair, isDeskChairTitle } from "./normalize";
import type { CategorySpec } from "../retail/types";

/** URLs worth opening on a storefront: the slug has to mention a chair. Keeps PDP fetches in the dozens. */
const CHAIR_URL = /(silla|sillon|butaca)/i;

/** Sillas de Oficina on MLU. Kept alongside the text queries so nothing niche is missed. */
const CHAIR_ML_CATEGORY = "MLU77709";

export const CHAIR_SPEC: CategorySpec = {
  key: "silla-escritorio",
  accept: (title, context) => isDeskChair(title, context ?? ""),
  urlHint: CHAIR_URL,
  // `ft=` and the Store API search take ONE token, and the plural of a word a catalogue only holds
  // in the singular answers `[]` rather than an error, so both forms are listed.
  storeQueries: ["silla", "sillas", "sillon", "sillones"],
  mlQueries: [
    "silla escritorio",
    "silla oficina",
    "silla ergonomica",
    "silla gamer",
    "silla ejecutiva",
    "silla operativa",
    "silla de computadora",
    "silla escritorio malla",
  ],
  mlCategories: [CHAIR_ML_CATEGORY],
  mlCategoryQuery: "silla",
  // A category page is already chair-only, so a row only needs to look like a chair by either test.
  acceptFromCategory: (title, attributes) =>
    chairCategory(title, attributes) !== "unknown" || isDeskChairTitle(title),
  fbQueries: ["silla de escritorio", "silla ergonomica", "silla gamer", "silla oficina"],
};
