// Which sources a run reads, and the single entrypoint for the website readers.
import type { CarSource, CarSourceResult } from "../types";
import { harvestCarOne } from "./carone";
import type { WebCarContext } from "./common";
import { harvestDuenoDirecto } from "./duenodirecto";
import { fenicioStore, harvestFenicio } from "./fenicio";
import { harvestWooCars, WOO_SITES } from "./woo";
import { harvestClasiautos, harvestJulio } from "./wordpress";

export const WEB_SOURCES: readonly CarSource[] = [
  "clasiautos", "julio", "shoppingdeautos", "carper", "fidocar", "carone", "motorlider", "duenodirecto",
];

/** `AUTOS_SOURCES=a,b` limits a run; `AUTOS_<SOURCE>_ENABLED=0` (Facebook: `AUTOS_FB_ENABLED`) switches one off without a deploy. */
export function sourceEnabled(source: CarSource, env: NodeJS.ProcessEnv = process.env): boolean {
  const only = String(env.AUTOS_SOURCES || "").split(",").map(item => item.trim()).filter(Boolean);
  if (only.length && !only.includes(source)) return false;
  const flag = source === "facebook" ? env.AUTOS_FB_ENABLED : source === "mercadolibre" ? env.AUTOS_ML_ENABLED : env[`AUTOS_${source.toUpperCase()}_ENABLED`];
  return flag !== "0";
}

export async function harvestWebSource(source: CarSource, context: WebCarContext): Promise<CarSourceResult> {
  switch (source) {
    case "clasiautos":
      return harvestClasiautos(context);
    case "julio":
      return harvestJulio(context);
    case "shoppingdeautos":
    case "carper":
      return harvestWooCars(WOO_SITES.find(site => site.source === source)!, context);
    case "fidocar":
    case "motorlider":
      return harvestFenicio(fenicioStore(source), context);
    case "duenodirecto":
      return harvestDuenoDirecto(context);
    case "carone":
      return harvestCarOne(context);
    default:
      throw new Error(`${source} is not a website source`);
  }
}
