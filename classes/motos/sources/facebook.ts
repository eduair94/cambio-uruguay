// Facebook Marketplace como segunda fuente del directorio de motos.
//
// No pide NADA nuevo a Facebook: el lector de autos (`classes/autos/facebookRun.ts`) ya recorre la
// categoría «Vehículos» de Marketplace —que incluye motos— y guarda TODAS las tarjetas que ve en la
// colección privada `carfbcards`, aunque sólo las que son autos pasen a su directorio. Medido el
// 2026-11-23: 23.767 tarjetas vistas en cuatro días, ~1.171 con pinta de moto, contra 590 avisos de
// Mercado Libre. Este archivo las convierte en motos con las mismas reglas que autos usa para su
// propia tarjeta de Facebook (`classes/autos/sources/facebook.ts`), cambiando sólo el diccionario.
//
// Lo que Facebook NO trae en Uruguay, igual que en autos: marca, modelo, año ni km como campos (todo
// sale del texto), y la moneda: `listing_price.currency` dice "UYU" aunque el vendedor pida dólares.
// Por eso:
//   * la moto se IDENTIFICA contra un diccionario armado con los avisos de motos de Mercado Libre
//     (marca + modelo, nunca la marca sola: "Honda" es también un auto);
//   * el año es obligatorio (sin año no hay cohorte ni banda);
//   * la moneda es la que el texto declara o, si no, la que hace caer el monto cerca del precio de la
//     misma moto en Mercado Libre. Deducida se marca `currencyInferred` y NUNCA entra en una banda
//     (`bandEligible`), la misma regla que autos.
import { fbDepartment, resolveFbCurrency } from "../../autos/sources/facebook";
import { declaredCurrencyFor, kmFromText, yearFromText } from "../../autos/catalog/match";
import { fold, slugify } from "../../autos/normalize";
import { quantile } from "../../autos/stats";
import { motoHasNoModel, motoRejection, type MotoRejection } from "../identify";
import type { MotoCurrency, MotoDetail, MotoFuel, RawMotoListing } from "../types";

export const FB_MOTO_PERMALINK = /^https:\/\/www\.facebook\.com\/marketplace\/item\/\d{6,20}\/$/;
export const FB_MOTO_PICTURE_HOST = /^scontent[\w.-]*\.fbcdn\.net$/;

/** Lo que se lee de una tarjeta guardada en `carfbcards` (sin el id del vendedor: no hace falta). */
export interface FbMotoCard {
  id: string;
  title: string;
  amount: number | null;
  city: string | null;
  createdAt: string | null;
  picture: string | null;
  isSold: boolean;
  isLive: boolean;
}

export interface FbMotoItem {
  description: string;
  isLive: boolean;
  isSold: boolean;
  readAt?: string;
}

export interface MotoDictionaryModel {
  modelId: string;
  model: string;
  /** Las formas en que un título nombra el modelo, ya normalizadas (` gtr 125 `). */
  names: string[];
  /** Los números del nombre ("125"): una forma corta seguida de OTRO número es otro modelo. */
  numbers: string[];
}

export interface MotoDictionaryBrand {
  brandId: string;
  brand: string;
  aliases: string[];
  models: MotoDictionaryModel[];
}

export interface MotoDictionary {
  brands: MotoDictionaryBrand[];
}

/**
 * Un texto como lo compara el diccionario: minúsculas, sin tildes, y los números despegados de las
 * letras ("Zr200" → "zr 200", "125cc" → "125 cc"), porque los vendedores escriben las dos formas.
 */
export function motoWords(text: string): string {
  const flat = fold(text)
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return ` ${flat} `;
}

/** Cómo escribe la gente las marcas de nombre largo. */
const BRAND_ALIASES: Record<string, string[]> = {
  "harley-davidson": ["harley"],
  "royal-enfield": ["enfield"],
  cfmoto: ["cf moto"],
  "gas-gas": ["gasgas"],
  "mv-agusta": ["agusta"],
};

/**
 * Palabras que no pueden ser la forma corta de un modelo: medido el 2026-11-23, "Suzuki EN 125"
 * acortado a "en" se quedaba con "Suzuki Vitara … en excelente estado".
 */
const NOT_A_MODEL_WORD = new Set([
  "en", "de", "la", "el", "al", "lo", "se", "su", "un", "mi", "tu", "ya", "no", "si", "es", "me", "te", "le", "ni", "x",
  "del", "con", "por", "sin", "muy", "año", "ano", "dia", "moto", "full", "new", "sport",
  "vendo", "permuto", "impecable", "unico", "dueno", "km", "cc", "abs", "rally", "special", "classic", "street",
]);

/**
 * El diccionario, armado con los avisos de Mercado Libre: marca y modelo vienen ahí del filtro
 * aplicado del origen, así que son nombres reales del catálogo uruguayo y no una lista nuestra.
 *
 * Un modelo se nombra entero ("gtr 125") y, cuando su parte de letras es única dentro de la marca,
 * también por ella sola ("gtr"): "Vendo yumbo gtr" es una GTR. Si dos modelos comparten las letras
 * ("Classic 125" y "Classic 150"), la forma corta no existe: no se elige entre los dos.
 */
export function buildMotoDictionary(
  listings: ReadonlyArray<Pick<RawMotoListing, "brandId" | "brand" | "modelId" | "model">>
): MotoDictionary {
  const brands = new Map<string, { brandId: string; brand: string; models: Map<string, { modelId: string; model: string }> }>();
  for (const listing of listings) {
    const slug = slugify(listing.brand);
    // Un aviso sin modelo no enseña ningún modelo: "Sin modelo" no es un nombre del catálogo.
    if (!slug || !listing.model || motoHasNoModel(listing)) continue;
    const entry = brands.get(slug) ?? { brandId: listing.brandId, brand: listing.brand, models: new Map() };
    const modelSlug = slugify(listing.model);
    if (modelSlug && !entry.models.has(modelSlug)) entry.models.set(modelSlug, { modelId: listing.modelId, model: listing.model });
    brands.set(slug, entry);
  }
  const out: MotoDictionaryBrand[] = [];
  for (const [slug, entry] of brands) {
    const models = [...entry.models.values()];
    const alpha = (model: string) => motoWords(model).replace(/\b\d+\b/g, " ").replace(/\s+/g, " ");
    const alphaCount = new Map<string, number>();
    for (const model of models) alphaCount.set(alpha(model.model), (alphaCount.get(alpha(model.model)) ?? 0) + 1);
    out.push({
      brandId: entry.brandId,
      brand: entry.brand,
      aliases: [...new Set([motoWords(entry.brand), ...(BRAND_ALIASES[slug] ?? []).map(motoWords)])].filter(alias => alias.trim()),
      models: models.map(model => {
        const full = motoWords(model.model);
        const letters = alpha(model.model);
        // La forma corta sólo si es única en la marca, tiene dos letras o más ("ZB", "XR", "CG" son
        // modelos) y no es una palabra del idioma ("en", "del"): si no, nombra cualquier cosa.
        const shortOk =
          letters !== full &&
          alphaCount.get(letters) === 1 &&
          letters.replace(/\s/g, "").length >= 2 &&
          !letters.trim().split(" ").every(word => NOT_A_MODEL_WORD.has(word));
        return {
          modelId: model.modelId,
          model: model.model,
          names: [full, ...(shortOk ? [letters] : [])],
          numbers: full.match(/\b\d+\b/g) ?? [],
        };
      }),
    });
  }
  return { brands: out };
}

/**
 * Una expresión de Mongo con todas las marcas del diccionario, para traer de `carfbcards` sólo las
 * tarjetas que nombran una (son ~24.000 en cuatro días y una de cada veinte es de moto).
 */
export function fbBrandPattern(dictionary: MotoDictionary): string {
  const words = new Set<string>();
  for (const brand of dictionary.brands) {
    for (const alias of brand.aliases) {
      const first = alias.trim().split(" ")[0];
      if (first && first.length >= 3) words.add(first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
  }
  return words.size ? `\\b(${[...words].sort().join("|")})` : "";
}

/** La marca nombrada en el texto (el alias más largo gana: "harley davidson" antes que "harley"). */
function findBrand(text: string, dictionary: MotoDictionary): MotoDictionaryBrand | null {
  let best: MotoDictionaryBrand | null = null;
  let length = 0;
  for (const brand of dictionary.brands) {
    for (const alias of brand.aliases) {
      if (alias.length > length && text.includes(alias)) {
        best = brand;
        length = alias.length;
      }
    }
  }
  return best;
}

/** El modelo de esa marca nombrado en el texto: el más largo; dos distintos con la misma forma, ninguno. */
function findModel(text: string, brand: MotoDictionaryBrand): MotoDictionaryModel | null {
  let best: MotoDictionaryModel[] = [];
  let length = 0;
  for (const model of brand.models) {
    for (const name of model.names) {
      const at = text.indexOf(name);
      if (at < 0) continue;
      // La forma corta seguida de OTRO número es otro modelo: "zr 200" no es la "ZR 125".
      if (name !== model.names[0]) {
        const next = /^(\d+) /.exec(text.slice(at + name.length));
        const value = next ? Number(next[1]) : null;
        if (value !== null && value >= 50 && value <= 2500 && !model.numbers.includes(next![1]!)) continue;
      }
      if (name.length > length) {
        best = [model];
        length = name.length;
      } else if (name.length === length && !best.includes(model)) {
        best.push(model);
      }
    }
  }
  return best.length === 1 ? best[0]! : null;
}

/**
 * El modelo que nombra un título, entre los modelos de UNA marca ya conocida. Lo usa el barrido de
 * Mercado Libre para los avisos que no tienen modelo cargado (./mercadolibre.ts): la marca viene del
 * filtro aplicado y sólo falta el modelo.
 */
export function motoModelInTitle(title: string, brandModels: MotoDictionary): { modelId: string; model: string } | null {
  const brand = brandModels.brands[0];
  if (!brand) return null;
  const model = findModel(motoWords(title), brand);
  return model ? { modelId: model.modelId, model: model.model } : null;
}

/**
 * Un aviso que no vende una moto aunque nombre una: el vendedor ofrece otra cosa a cambio de una
 * moto ("Permuto por zanella", "Busco moto"). Sólo al principio del título: "Permuto Yumbo speed 150"
 * sí ofrece la moto.
 */
const NO_VENDE = /^\s*(?:permuto|permuta|cambio|busco|compro|se busca|necesito)\b[^.]*?\bpor\b|^\s*(?:busco|compro|se busca|necesito)\b/;
const TITULO_ELECTRICA = /\b(electric[oa]s?|electronica|litio)\b/;
/**
 * Un AUTO en la categoría Vehículos que nombra una marca que también hace motos (Suzuki, Honda,
 * BMW): la cilindrada en litros ("1.6"), la carrocería o la caja lo delatan.
 */
const ES_UN_AUTO = /\b(camioneta|automovil|auto|sedan|hatch\w*|4x4|4x2|2wd|4wd|awd|pick ?up|furgon\w*|minivan|suv|automatic[oa]|caja automatica)\b/;
/**
 * La cilindrada en LITROS es de auto: "1.6", "2.4i", "1,0 turbo". Ninguna moto se anuncia así. Va
 * aparte de las palabras porque "2.4i" tiene la letra pegada y un `\b` no la separa: medido el
 * 23/11/2026, «2004 Honda CR-V 2.4I LX AT» entró como moto «Honda CR250» por esa rendija. Un monto
 * con punto de miles ("5.300") no matchea: el decimal tiene que ser una sola cifra.
 */
const LITROS_DE_AUTO = /(?:^|[^\d.,])[1-6][.,]\d(?![\d.,])/;

export type FbMotoRejection =
  | "vendido"
  | "no-identificada"
  | "no-vende"
  | "sin-anio"
  | "sin-precio"
  | "moneda-dudosa"
  | "es-un-auto"
  | MotoRejection;

export interface FbMotoContext {
  dictionary: MotoDictionary;
  usdUyu: number;
  maxYear: number;
  /**
   * El precio de referencia en dólares de esa marca+modelo (y año, si alcanza), o null. Por NOMBRE y
   * no por id: el mismo modelo llega con el id de la faceta de ML o con uno derivado de la ficha.
   */
  referenceUsd: (brand: string, model: string, year: number) => number | null;
}

export interface FbMotoResult {
  listing: RawMotoListing & { currencyInferred: boolean };
  detail: MotoDetail | null;
}

export function fbCardToMoto(
  card: FbMotoCard,
  item: FbMotoItem | null,
  observedAt: string,
  context: FbMotoContext
): FbMotoResult | { rejected: FbMotoRejection } {
  if (card.isSold || item?.isSold || item?.isLive === false || card.isLive === false) return { rejected: "vendido" };
  const title = String(card.title || "");
  // El título manda para decidir QUÉ es: las descripciones dicen "acepto moto" o "cambio por auto".
  const rejection = motoRejection(title);
  if (rejection) return { rejected: rejection };
  if (NO_VENDE.test(fold(title))) return { rejected: "no-vende" };
  if (ES_UN_AUTO.test(fold(title)) || LITROS_DE_AUTO.test(fold(title))) return { rejected: "es-un-auto" };
  const words = motoWords(title);
  const brand = findBrand(words, context.dictionary);
  const model = brand ? findModel(words, brand) : null;
  if (!brand || !model) return { rejected: "no-identificada" };
  const text = `${title} ${item?.description ?? ""}`;
  const year = yearFromText(text, context.maxYear);
  if (!year) return { rejected: "sin-anio" };
  const amount = card.amount;
  if (!amount || !(amount > 0)) return { rejected: "sin-precio" };
  const currency = resolveFbCurrency(
    amount,
    declaredCurrencyFor(text, amount),
    context.referenceUsd(brand.brand, model.model, year),
    context.usdUyu
  );
  if (!currency) return { rejected: "moneda-dudosa" };
  const picture = card.picture && safeFbPicture(card.picture) ? card.picture : null;
  const fuel: MotoFuel | null = TITULO_ELECTRICA.test(fold(title)) ? "electrica" : null;
  const listing: RawMotoListing & { currencyInferred: boolean } = {
    id: card.id,
    source: "facebook",
    brandId: brand.brandId,
    brand: brand.brand,
    modelId: model.modelId,
    model: model.model,
    title,
    year,
    km: kmFromText(text, { minKm: 2 }),
    price: amount,
    currency: currency.currency as MotoCurrency,
    fuel,
    neighborhood: null,
    department: fbDepartment(card.city),
    // Marketplace no dice quién vende: no se rotula ni "particular" ni "agencia".
    sellerType: null,
    sellerId: null,
    picture,
    pictureCount: picture ? 1 : null,
    permalink: `https://www.facebook.com/marketplace/item/${card.id}/`,
    observedAt,
    currencyInferred: currency.inferred,
  };
  // La descripción, cuando el lector de autos abrió la ficha: sirve para lo que declara el vendedor.
  const detail: MotoDetail | null = item?.description
    ? {
        readAt: item.readAt ?? observedAt,
        price: amount,
        currency: currency.currency as MotoCurrency,
        // Un aviso vendido o dado de baja ya salió arriba: lo que llega acá está activo.
        active: true,
        specs: {},
        displacement: null,
        typeText: null,
        color: null,
        pictures: [],
        description: item.description.slice(0, 5_000),
      }
    : null;
  return { listing, detail };
}

export function safeFbPicture(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && FB_MOTO_PICTURE_HOST.test(parsed.host);
  } catch {
    return false;
  }
}

/**
 * La referencia en dólares para deducir la moneda: la mediana de Mercado Libre de la misma
 * marca+modelo en años cercanos (±2) si hay al menos tres avisos, si no la del modelo entero con
 * tres o más. Sin referencia no se deduce: el aviso queda afuera ("moneda-dudosa").
 */
export function motoReferenceFrom(
  listings: ReadonlyArray<Pick<RawMotoListing, "brand" | "model" | "modelId" | "year" | "price" | "currency" | "fuel">>,
  usdUyu: number
): FbMotoContext["referenceUsd"] {
  const keyOf = (brand: string, model: string) => `${slugify(brand)}|${slugify(model)}`;
  const byModel = new Map<string, Array<{ year: number; usd: number }>>();
  for (const listing of listings) {
    if (listing.fuel === "electrica" || motoHasNoModel(listing)) continue;
    const usd = listing.currency === "USD" ? listing.price : listing.price / Math.max(1, usdUyu);
    if (!(usd > 0)) continue;
    const key = keyOf(listing.brand, listing.model);
    const list = byModel.get(key) ?? [];
    list.push({ year: listing.year, usd });
    byModel.set(key, list);
  }
  return (brand, model, year) => {
    const all = byModel.get(keyOf(brand, model)) ?? [];
    const near = all.filter(entry => Math.abs(entry.year - year) <= 2);
    if (near.length >= 3) return quantile(near.map(entry => entry.usd), 0.5);
    if (all.length >= 3) return quantile(all.map(entry => entry.usd), 0.5);
    return null;
  };
}
